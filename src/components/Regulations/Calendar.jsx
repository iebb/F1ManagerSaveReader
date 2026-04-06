import {
  CheckCircle,
  CopyAll,
  Delete,
  KeyboardDoubleArrowDown,
  KeyboardDoubleArrowUp,
  NotStarted,
  PlayCircle
} from "@mui/icons-material";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { circuitNames, countryNames, dayToDate, raceAbbrevs, raceFlags } from "@/js/localization";
import { BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext } from "@/js/Contexts";

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
  const { version, gameVersion } = metadata;

  const { player } = basicInfo;

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
    const { CurrentSeason } = player;
    try {
      let [{ columns, values }] = database.exec(
        `select * from Races_Templates JOIN Races_Tracks ON Races_Templates.TrackID = Races_Tracks.TrackID`
      );
      for (const r of values) {
        let raceTemplate = {};
        r.map((x, _idx) => { raceTemplate[columns[_idx]] = x; })
        raceTemplates[raceTemplate.TrackID] = raceTemplate;
      }
      setRaceTemplates(raceTemplates);


      [{ columns, values }] = database.exec(
        `select * from Races JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID WHERE SeasonID = ${CurrentSeason} order by Day ASC`
      );
      for (const r of values) {
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
  const completedRaces = races.filter((race) => race.State === 2).length;
  const upcomingRaces = races.filter((race) => race.State === 0).length;
  const activeRace = races.find((race) => race.State === 1) || null;



  const weatherConfigs = [];
  for (const event of EventSuffix) {
    weatherConfigs.push({
      field: 'WeatherState' + event,
      headerName: EventToDay[event],
      width: 48,
      type: "singleSelect",
      editable: true,
      valueOptions: [
        { value: 1, label: "Sunny" },
        { value: 2, label: "Partly Cloudy" },
        { value: 4, label: "Cloudy" },
        { value: 8, label: "Light Rain" },
        { value: 16, label: "Moderate Rain" },
        { value: 32, label: "Heavy Rain" },
      ],
      renderCell: ({ value, formattedValue }) => {
        return <span title={formattedValue}>{weathers[value]}</span>
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
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Season Workspace</div>
            <h2 className="mt-2 text-lg font-bold text-white">Calendar Editor</h2>
            <p className="mt-2 max-w-[880px] text-sm text-slate-400">
              Reorder race weekends, duplicate events into open weeks, and tune weather conditions without leaving the current season.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[440px]">
            {[
              { label: "Races", value: races.length },
              { label: "Completed", value: completedRaces },
              { label: "Upcoming", value: upcomingRaces },
              { label: "Active Week", value: `W${playerWeek}` },
            ].map((item) => (
              <div key={item.label} className="border border-white/10 bg-black/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                <div className="mt-1 text-base font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="border border-white/10 bg-black/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Current Position</div>
            <div className="mt-2 text-sm text-slate-200">
              {activeRace
                ? `${circuitNames[activeRace.TrackID]} is currently in progress`
                : "No race weekend is currently active"}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Player day sits in week {playerWeek}, so past and active events remain protected from unsafe edits.
            </div>
          </div>
          <div className="border border-white/10 bg-black/10 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Editing Notes</div>
            <div className="mt-2 text-sm text-slate-300">
              Use the action column to shift weekends forward or backward. Toggle weather and feeder support directly in the grid for open weekends.
            </div>
          </div>
        </div>
      </section>

      {version >= 3 ? (
        <div className="border border-amber-400/20 bg-amber-500/8 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">Feeder Series Note</div>
          <div className="mt-2 text-sm text-slate-300">
            F2 and F3 support is tied to the selected track template rather than the race entry itself. Enabling feeder races on unsupported tracks can produce broken lap-time behavior.
          </div>
        </div>
      ) : null}

      <section className="border border-white/10 bg-white/[0.015]">
        <DataGrid
          getRowId={r => r.RaceID}
          rows={races.map((x, _idx) => ({ id: _idx + 1, ...x }))}
          hideFooter
          isCellEditable={({ row }) => {
            return row.State === 0;
          }}
          onProcessRowUpdateError={e => console.error(e)}
          processRowUpdate={(newRow, oldRow) => {
            if (newRow.State > 0) {
              return oldRow;
            }
            if (newRow._DOW !== undefined) {
              if (newRow._DOW !== (oldRow.Day % 7)) {
                database.exec(`UPDATE Races SET Day = Day + :n WHERE RaceID = ${newRow.RaceID};`, {
                  ":n": newRow._DOW - (oldRow.Day % 7)
                });
                refresh();
              }
            }
            if (newRow.TrackID !== oldRow.TrackID) {
              database.exec(`UPDATE Races SET TrackID = ${newRow.TrackID} WHERE RaceID = ${newRow.RaceID};`);
              refresh();
            }
            if (newRow.WeekendType !== oldRow.WeekendType) {
              database.exec(`UPDATE Races SET WeekendType = ${newRow.WeekendType} WHERE RaceID = ${newRow.RaceID};`);
              refresh();
            }
            for (const prefix of WeatherPrefix) {
              for (const suffix of EventSuffix) {
                if (newRow[prefix + suffix] !== oldRow[prefix + suffix]) {
                  database.exec(`UPDATE Races SET ${prefix + suffix} = ${newRow[prefix + suffix]} WHERE RaceID = ${newRow.RaceID};`);
                  if (prefix === "WeatherState") {
                    const rainValue = newRow[prefix + suffix] >= 8 ? 1 : 0;
                    database.exec(`UPDATE Races SET Rain${suffix} = ${rainValue} WHERE RaceID = ${newRow.RaceID};`);
                  }
                  refresh();
                }
              }
            }
            return newRow;
          }}
          columns={[
            {
              field: 'Race',
              headerName: 'Race',
              width: 92,
              renderCell: ({ row }) => {
                const stateIcon = [
                  <NotStarted sx={{ color: "#33b8ff", fontSize: 16 }} />,
                  <PlayCircle sx={{ color: "#fff533", fontSize: 16 }} />,
                  <CheckCircle sx={{ color: "#33ff66", fontSize: 16 }} />,
                ][row.State];
                return (
                  <div className="flex items-center gap-2">
                    <span className="shrink-0">{stateIcon}</span>
                    <span className="w-5 text-center text-xs font-semibold text-slate-300">{row.id}</span>
                    <img
                      src={`/flags/${raceFlags[row.TrackID]}.svg`}
                      width={20} height={15}
                      alt={row.Name}
                      className="shrink-0"
                    />
                  </div>
                )
              }
            },
            {
              field: 'TrackID',
              headerName: 'Circuit',
              width: 180,
              editable: true,
              type: 'singleSelect',
              valueOptions: Object.keys(raceTemplates).map(
                rt => ({ value: rt, label: `${circuitNames[rt]}` })
              ),
              renderCell: ({ value }) => {
                return `${circuitNames[value]}`
              }
            },
            ...(version >= 3) ? [{
              field: 'WeekendType',
              headerName: 'F1',
              type: 'singleSelect',
              editable: true,
              valueOptions: version === 3 ? [
                { value: 0, label: "Normal" },
                { value: 1, label: "Sprint" },
                { value: 2, label: "ATA" },
              ] : [
                { value: 0, label: "Normal" },
                { value: 1, label: "Sprint" },
              ],
              width: 100,
            }] : [],
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
            ...(version >= 4 ? [{
              field: '_DOW',
              headerName: 'Sat',
              width: 56,
              renderCell: ({ row }) => {
                const isSaturday = (row.Day % 7) === 0;
                const disabled = row.State !== 0;
                return (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const nextDow = isSaturday ? 1 : 0;
                      database.exec(`UPDATE Races SET Day = Day + :n WHERE RaceID = ${row.RaceID};`, {
                        ":n": nextDow - (row.Day % 7)
                      });
                      refresh();
                    }}
                    className={`flex h-5 w-5 items-center justify-center border text-[10px] transition ${disabled
                      ? `cursor-default border-white/10 bg-white/[0.03] ${isSaturday ? "text-slate-500" : "text-transparent"}`
                      : isSaturday
                        ? "border-sky-300/50 bg-sky-500/15 text-sky-100"
                        : "border-white/15 bg-black/10 text-transparent hover:border-white/25 hover:bg-white/[0.05]"
                      }`}
                    title={isSaturday ? "Saturday race" : "Sunday race"}
                  >
                    ✓
                  </button>
                );
              },
            }] : []),
            {
              field: '_actions',
              headerName: 'Actions',
              headerAlign: 'center',
              sortable: false,
              filterable: false,
              width: 150,
              renderCell: ({ row }) => {
                let nextAvailableDuplicateWeek = -1;
                for (let w = Math.max(playerWeek, row.week + 1); w <= 51; w++) {
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
                          database.exec(`UPDATE Races SET Day = Day + 7 WHERE RaceID = ${weeks[row.week - 1]};
                                       UPDATE Races SET Day = Day - 7 WHERE RaceID = ${row.RaceID};`);
                        } else {
                          database.exec(`UPDATE Races SET Day = Day - 7 WHERE RaceID = ${row.RaceID}`);
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
                          database.exec(`UPDATE Races SET Day = Day - 7 WHERE RaceID = ${weeks[row.week + 1]};
                                       UPDATE Races SET Day = Day + 7 WHERE RaceID = ${row.RaceID};`);
                        } else {
                          database.exec(`UPDATE Races SET Day = Day + 7 WHERE RaceID = ${row.RaceID}`);
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
                        const r = values[0].map(x => typeof x === 'number' ? x : `"${x}"`);
                        const targetWeekDelta = nextAvailableDuplicateWeek - row.week;
                        let reverseColumns = {};
                        for (let i = 0; i < columns.length; i++) reverseColumns[columns[i]] = i;

                        r[reverseColumns.RaceID] = "NULL";
                        r[reverseColumns.Day] += 7 * targetWeekDelta;
                        r[reverseColumns.State] = 0;

                        const RT = raceTemplates[r[3]]; // TrackID
                        for (const suffix of EventSuffix) {
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
            ...weatherConfigs
          ]}
          density="compact"
          rowHeight={38}
          columnHeaderHeight={40}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaders": {
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.03)",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgb(148 163 184)",
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            },
            "& .MuiDataGrid-row:nth-of-type(2n)": {
              backgroundColor: "rgba(255,255,255,0.015)",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "rgba(255,255,255,0.035)",
            },
            "& .MuiDataGrid-actionsCell": {
              gap: "2px",
            },
          }}
        />
      </section>
    </div>
  );
}
