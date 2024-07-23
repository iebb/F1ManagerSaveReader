import {
  CheckCircle,
  CopyAll,
  Delete,
  KeyboardDoubleArrowDown,
  KeyboardDoubleArrowUp, NotStarted,
  PlayCircle
} from "@mui/icons-material";
import {Alert, AlertTitle} from "@mui/material";
import {Divider, Typography} from "@mui/material";
import {DataGrid, GridActionsCellItem} from "@mui/x-data-grid";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {dayToDate, formatDate} from "@/js/localization";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {raceFlags, raceAbbrevs, countryNames, circuitNames} from "@/js/localization";

const rainTypes = ["dry", "wet"];

const nextRain = {
  1: 0,
  0: 1,
}
const weathers = {
  1: "☀️",
  2: "⛅",
  4: "☁️",
  8: "🌦️",
  16: "🌧️",
  32: "⛈️",
}

const WeatherPrefix = ["Rain", "WeatherState", "Temperature"];
const EventSuffix = ["Practice", "Qualifying", "Race"];
const EventToDay = {
  Practice: "Fri",
  Qualifying: "Sat",
  Race: "Sun",
};

export default function CustomCalendar() {

  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const metadata = useContext(MetadataContext);
  const {version, gameVersion} = metadata;

  const {player} = basicInfo;

  const [races, setRaces] = useState([]);
  const [raceTemplates, setRaceTemplates] = useState([]);
  const [weeks, setWeeks] = useState({});
  const [updated, setUpdated] = useState(0);
  const refresh = () => {
    const metaProperty = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0];
    metaProperty.Properties[0].Properties.forEach(x => {
      if (x.Name === 'RacesInSeason') {
        x.Property = races.length + 1;
      }
    });
    basicInfoUpdater({ metadata });
    setUpdated(+new Date());
  }



  useEffect(() => {
    let races = [];
    let raceTemplates = {};
    let weeks = {};
    const {CurrentSeason} = player;
    try {
      let [{ columns, values }] = database.exec(
        `select * from Races_Templates JOIN Races_Tracks ON Races_Templates.TrackID = Races_Tracks.TrackID`
      );
      for(const r of values) {
        let raceTemplate = {};
        r.map((x, _idx) => {raceTemplate[columns[_idx]] = x;})
        raceTemplates[raceTemplate.TrackID] = raceTemplate;
      }
      setRaceTemplates(raceTemplates);


      [{ columns, values }] = database.exec(
        `select * from Races JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID WHERE SeasonID = ${CurrentSeason} order by Day ASC`
      );
      for(const r of values) {
        let race = {};
        r.map((x, _idx) => {
          race[columns[_idx]] = x;
        })
        race.week = dayToDate(race.Day).getWeek()
        weeks[race.week] = race.RaceID;
        races.push(race)
      }
      setRaces(races);
      setWeeks(weeks);
    } catch {

    }

  }, [database, updated])

  const playerWeek = dayToDate(player.Day).getWeek()



  const weatherConfigs = [];
  for(const event of EventSuffix) {
    weatherConfigs.push({
      field: 'Rain' + event,
      headerName: EventToDay[event],
      width: 50,
      renderCell: ({ row, value }) => {
        if (row.State !== 0) return <span>{rainTypes[value]}</span>
        return (
          <a className="noselect" onClick={() => {
            database.exec(`UPDATE Races SET Rain${event} = ${nextRain[value]} WHERE RaceID = ${row.RaceID}`);
            refresh();
          }}>{rainTypes[value]}</a>
        )
      },
    });
    weatherConfigs.push({
      field: 'WeatherState' + event,
      headerName: 'Weather',
      width: 120,
      type: "singleSelect",
      editable: true,
      valueOptions: [
        {value: 1, label: "Sunny"},
        {value: 2, label: "Partly Cloudy"},
        {value: 4, label: "Cloudy"},
        {value: 8, label: "Light Rain"},
        {value: 16, label: "Moderate Rain"},
        {value: 32, label: "Heavy Rain"},
      ],
      renderCell: ({ value, formattedValue }) => {
        return <span>{weathers[value]} <span style={{ fontSize: 12 }}>{formattedValue}</span></span>
      },
    });
    weatherConfigs.push({
      field: 'Temperature' + event,
      headerName: '°C',
      width: 65,
      type: "number",
      editable: true,
      valueGetter: ({ value }) => Number(value).toFixed(2),
    });

  }

  return (
    <div>
      <Typography variant="h5" component="h5">
        Calendar Editor
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      {
        version >= 3 && (
          <Alert severity="warning" sx={{ my: 2 }}>
            <AlertTitle>Warning</AlertTitle>
            Feeder Series race are based on <b>Track</b> rather than <b>Race</b>. Enabling F2 and F3 races for unsupported tracks might result in weird lap times.
          </Alert>
        )
      }
      <DataGrid
        getRowId={r => r.RaceID}
        rows={races.map((x, _idx) => ({id: _idx + 1, ...x}))}
        hideFooter
        isCellEditable={({ row }) => {
          return row.State === 0;
        }}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          if (newRow.State > 0) {
            return oldRow;
          }
          if (newRow.TrackID !== oldRow.TrackID) {
            database.exec(`UPDATE Races SET TrackID = ${newRow.TrackID} WHERE RaceID = ${newRow.RaceID};`);
            refresh();
          }
          if (newRow.WeekendType !== oldRow.WeekendType) {
            database.exec(`UPDATE Races SET WeekendType = ${newRow.WeekendType} WHERE RaceID = ${newRow.RaceID};`);
            refresh();
          }
          for(const prefix of WeatherPrefix) {
            for(const suffix of EventSuffix) {
              if (newRow[prefix + suffix] !== oldRow[prefix + suffix]) {
                database.exec(`UPDATE Races SET ${prefix + suffix} = ${newRow[prefix + suffix]} WHERE RaceID = ${newRow.RaceID};`);
                refresh();
              }
            }
          }
          return newRow;
        }}
        columns={[
          {
            field: 'State',
            headerName: '',
            width: 25,
            renderCell: ({ value }) => [
              <NotStarted sx={{ color: "#33b8ff", fontSize: 18 }} />,
              <PlayCircle sx={{ color: "#fff533", fontSize: 18 }} />,
              <CheckCircle sx={{ color: "#33ff66", fontSize: 18 }} />,
            ][value]
          },
          {
            field: 'CurrentNumber',
            headerName: 'R',
            valueGetter: ({ row }) => row.id,
            width: 25,
          },
          {
            field: 'Flag',
            headerName: 'Flag',
            valueGetter: ({ row }) => raceFlags[row.TrackID],
            width: 100,
            renderCell: ({ row }) => {
              return (
                <>
                  <img
                    src={require(`../../assets/flags/${raceFlags[row.TrackID]}.svg`).default.src}
                    width={24} height={18}
                    alt={row.Name}
                    style={{ opacity: row.Day >= row.Day ? 1 : 0.3 }}
                  />{" "}
                  <span style={{ marginLeft: 10 }}>
                    {raceAbbrevs[row.TrackID]}
                  </span>
                </>
              )
            }
          },
          {
            field: 'TrackID',
            headerName: 'Circuit / Country',
            width: 250,
            editable: true,
            type: 'singleSelect',
            valueOptions: Object.keys(raceTemplates).map(
              rt => ({ value: rt, label: `${circuitNames[rt]}, ${countryNames[rt]}` })
            ),
            renderCell: ({ value }) => {
              return `${circuitNames[value]}, ${countryNames[value]}`
            }
          },
          ...(version !== 2) ? [
            {
              field: 'IsF2Race',
              headerName: 'F2',
              width: 30,
              renderCell: ({ row, value }) => {
                return (
                  <a className="noselect" onClick={() => {
                    database.exec(`UPDATE Races_Tracks SET IsF2Race = ${1 - value} WHERE TrackID = ${row.TrackID};`);
                    refresh();
                  }}>{value ? "F2" : "-"}</a>
                )
              }
            },
            {
              field: 'IsF3Race',
              headerName: 'F3',
              width: 30,
              renderCell: ({ row, value }) => {
                return (
                  <a className="noselect" onClick={() => {
                    database.exec(`UPDATE Races_Tracks SET IsF3Race = ${1 - value} WHERE TrackID = ${row.TrackID};`);
                    refresh();
                  }}>{value ? "F3" : "-"}</a>
                )
              }
            },
          ] : [],
          {
            field: '_Date',
            headerName: 'Date',
            width: 120,
            renderCell: ({ row }) => {
              return (
                <>
                  W{row.week}: {dayToDate(row.Day).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                </>
              )
            }
          },
          {
            field: '_actions',
            headerName: 'Actions',
            headerAlign: 'center',
            sortable: false,
            filterable: false,
            width: 150,
            renderCell: ({ row }) => {
              let nextAvailableDuplicateWeek = -1;
              for(let w = Math.max(playerWeek, row.week + 1); w <= 51; w++) {
                if (!weeks[w]) {
                  nextAvailableDuplicateWeek = w;
                  break;
                }
              }

              return (
                <div>
                  <GridActionsCellItem
                    icon={<KeyboardDoubleArrowUp />}
                    disabled={row.State !== 0 || row.Day - 7 - 2 /* race weekend */ <= player.Day || row.week <= 2}
                    label="Expedite"
                    onClick={() => {
                      if (weeks[row.week - 1]) {
                        database.exec(`UPDATE Races SET Day = ${row.Day} WHERE RaceID = ${weeks[row.week - 1]};UPDATE Races SET Day = ${row.Day - 7} WHERE RaceID = ${row.RaceID};`);
                      } else {
                        database.exec(`UPDATE Races SET Day = ${row.Day - 7} WHERE RaceID = ${row.RaceID}`);
                      }
                      refresh();
                    }}
                  />
                  <GridActionsCellItem
                    icon={<KeyboardDoubleArrowDown />}
                    disabled={row.State !== 0 || row.week >= 51}
                    label="Postpone"
                    onClick={() => {
                      if (weeks[row.week + 1]) {
                        database.exec(`UPDATE Races SET Day = ${row.Day} WHERE RaceID = ${weeks[row.week + 1]};UPDATE Races SET Day = ${row.Day + 7} WHERE RaceID = ${row.RaceID};`);
                      } else {
                        database.exec(`UPDATE Races SET Day = ${row.Day + 7} WHERE RaceID = ${row.RaceID}`);
                      }
                      refresh();
                    }}
                  />
                  <GridActionsCellItem
                    icon={<Delete />}
                    disabled={row.State !== 0 || races.length < 2}
                    label="Delete"
                    onClick={() => {
                      database.exec(`DELETE FROM Races WHERE RaceID = ${row.RaceID}`);
                      refresh();
                    }}
                  />
                  <GridActionsCellItem
                    icon={<CopyAll />}
                    disabled={nextAvailableDuplicateWeek === -1}
                    label="Duplicate"
                    onClick={(event) => {
                      let [{ columns, values }] = database.exec(`select * from Races WHERE RaceID = ${row.RaceID}`);
                      const r = values[0].map(x => typeof x === 'number'? x : `"${x}"`);
                      const targetWeekDelta = nextAvailableDuplicateWeek - row.week;
                      let reverseColumns = {};
                      for(let i = 0; i < columns.length; i++) reverseColumns[columns[i]] = i;

                      r[reverseColumns.RaceID] = "NULL";
                      r[reverseColumns.Day] += 7 * targetWeekDelta;
                      r[reverseColumns.State] = 0;

                      const RT = raceTemplates[r[3]]; // TrackID
                      for(const suffix of EventSuffix) {
                        const rain = Math.random() < RT.RainMax ? 1 : 0;
                        const weather = 1 << (Math.floor(Math.random() * 3) + rain * 3);
                        const temperature = Math.random() * (RT.TemperatureMax - RT.TemperatureMin) + RT.TemperatureMin;
                        r[reverseColumns["Rain" + suffix]] = rain;
                        r[reverseColumns["WeatherState" + suffix]] = weather;
                        r[reverseColumns["Temperature" + suffix]] = temperature;
                      }
                      database.exec(`INSERT INTO Races SELECT ${r.join(",")} WHERE NOT EXISTS (SELECT 1 FROM Races WHERE Day = ${r[reverseColumns.Day]});`);

                      // database.exec(`INSERT INTO Races VALUES (${r.join(",")});`);
                      refresh();
                    }}
                  />
                </div>
              )
            }
          },
          ...(version >= 3) ? [{
            field: 'WeekendType',
            headerName: 'Weekend',
            type: 'singleSelect',
            editable: true,
            valueOptions: [
              {value: 0, label: "Normal"},
              {value: 1, label: "Sprint"},
              {value: 2, label: "ATA"},
            ],
            width: 100,
          }] : [],
          ...weatherConfigs
        ]}
        density="compact"
      />
    </div>
  );
}