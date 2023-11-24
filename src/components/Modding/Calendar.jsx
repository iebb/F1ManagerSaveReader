import {Divider, Typography} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {dayToDate, formatDate} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext, VersionContext} from "../Contexts";
import {raceFlags, raceAbbrevs, countryNames, circuitNames} from "@/js/localization";

const rainTypes = ["dry", "wet"];

const nextRain = {
  1: 0,
  0: 1,
}

const nextWeather = {
  1: 2,
  2: 4,
  4: 8,
  8: 16,
  16: 32,
  32: 1,
}

const weathers = {
  1: "☀️",
  2: "⛅",
  4: "☁️",
  8: "🌦️",
  16: "🌧️",
  32: "⛈️",
}

export default function CustomCalendar() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);

  const {player} = basicInfo;
  const {CurrentSeason} = player;

  const { enqueueSnackbar } = useSnackbar();

  const [races, setRaces] = useState([]);
  const [weeks, setWeeks] = useState({});
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());


  useEffect(() => {
    let races = [];
    let weeks = {};
    let [{ columns, values }] = database.exec(
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

  }, [database, updated])




  return (
    <div>
      <Typography variant="h5" component="h5">
        Custom Calendar
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <DataGrid
        rows={races.map((x, _idx) => ({id: _idx + 1, ...x}))}
        columns={[
          {
          field: 'CurrentNumber',
          headerName: '#',
          valueGetter: ({ row }) => row.id,
          width: 40,
          renderCell: ({ row }) => {
            return (
              <div style={{ fontSize: "90%" }}>{row.id}</div>
            )
          }
        },
          {
            field: 'TrackID',
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
            field: 'Country',
            headerName: 'Country',
            valueGetter: ({ row }) => raceFlags[row.TrackID],
            width: 250,
            renderCell: ({ row }) => {
              return (
                <>
                  {circuitNames[row.TrackID]}, {countryNames[row.TrackID]}
                </>
              )
            }
          },
          {
            field: '_',
            headerName: 'Date',
            width: 180,
            renderCell: ({ row }) => {
              return (
                <>
                  Week {row.week}: {dayToDate(row.Day).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                </>
              )
            }
          },
          {
            field: '_expedite',
            headerName: 'expedite',
            width: 100,
            renderCell: ({ row }) => {
              if (row.State !== 0 || row.Day - 7 <= player.Day || row.week <= 2) {
                return null;
              }
              if (weeks[row.week - 1]) {
                return (
                  <a className="noselect" onClick={() => {
                    database.exec(
                      `UPDATE Races SET Day = ${row.Day} WHERE RaceID = ${weeks[row.week - 1]};UPDATE Races SET Day = ${row.Day - 7} WHERE RaceID = ${row.RaceID};`
                    );
                    refresh();
                  }}>swap up</a>
                )
              }
              return (
                <a className="noselect" onClick={() => {
                  database.exec(
                    `UPDATE Races SET Day = ${row.Day - 7} WHERE RaceID = ${row.RaceID}`
                  );
                  refresh();
                }}>expedite</a>
              )
            }
          },
          {
            field: '_postpone',
            headerName: 'postpone',
            width: 100,
            renderCell: ({ row }) => {
              if (row.State !== 0 || row.week >= 51) {
                return null;
              }
              if (weeks[row.week + 1]) {
                return (
                  <a className="noselect" onClick={() => {
                    database.exec(
                      `UPDATE Races SET Day = ${row.Day} WHERE RaceID = ${weeks[row.week + 1]};UPDATE Races SET Day = ${row.Day + 7} WHERE RaceID = ${row.RaceID};`
                    );
                    refresh();
                  }}>swap down</a>
                )
              }
              return (
                <a className="noselect" onClick={() => {
                  database.exec(
                    `UPDATE Races SET Day = ${row.Day + 7} WHERE RaceID = ${row.RaceID}`
                  );
                  refresh();
                }}>postpone</a>
              )
            }
          },
          {
            field: '_delete',
            headerName: 'cancel',
            width: 100,
            renderCell: ({ row }) => {
              if (row.State !== 0) {
                return null;
              }
              return (
                <a className="noselect" onClick={() => {
                  database.exec(
                    `DELETE FROM Races WHERE RaceID = ${row.RaceID}`
                  );
                  refresh();
                }}>cancel</a>
              )
            }
          },
          {
            field: '_duplicate',
            headerName: 'duplicate',
            width: 100,
            renderCell: ({ row }) => {
              if (row.State === 2 || row.week >= 51 || weeks[row.week + 1]) { // 1 is possible
                return null;
              }
              return (
                <a className="noselect" onClick={() => {
                  let [{ values }] = database.exec(`select * from Races WHERE RaceID = ${row.RaceID}`);
                  const r = values[0].map(x => typeof x === 'number'? x : `"${x}"`);
                  r[0] = "NULL";
                  r[2] += 7;
                  database.exec(`INSERT INTO Races VALUES (${r.join(",")});`);
                  refresh();
                }}>duplicate</a>
              )
            }
          },
          {
            field: '_weekendtype',
            headerName: 'weekend',
            width: 100,
            renderCell: ({ row }) => {
              const types = ["normal", "sprint", "ata quali"];
              if (row.State !== 0) {
                return (
                  <span>{types[row.WeekendType]}</span>
                )
              }
              return (
                <a className="noselect" onClick={() => {
                  database.exec(
                    `UPDATE Races SET WeekendType = ${(row.WeekendType + 1) % 3} WHERE RaceID = ${row.RaceID}`
                  );
                  refresh();
                }}>{types[row.WeekendType]}</a>
              )
            }
          },
          {
            field: 'RainPractice',
            headerName: 'fri',
            width: 50,
            renderCell: ({ row }) => {
              if (row.State !== 0) return <span>{rainTypes[row.RainPractice]}</span>
              return (
                <a className="noselect" onClick={() => {
                  database.exec(`UPDATE Races SET RainPractice = ${nextRain[row.RainPractice]} WHERE RaceID = ${row.RaceID}`);
                  refresh();
                }}>{rainTypes[row.RainPractice]}</a>
              )
            }
          },
          {
            field: 'WeatherStatePractice',
            headerName: '',
            width: 50,
            renderCell: ({ row }) => {
              if (row.State !== 0) return <span>{weathers[row.WeatherStatePractice]}</span>
              return (
                <a className="noselect" onClick={() => {
                  database.exec(`UPDATE Races SET WeatherStatePractice = ${nextWeather[row.WeatherStatePractice]} WHERE RaceID = ${row.RaceID}`);
                  refresh();
                }}>{weathers[row.WeatherStatePractice]}</a>
              )
            }
          },
          {
            field: 'RainQualifying',
            headerName: 'sat',
            width: 50,
            renderCell: ({ row }) => {
              if (row.State !== 0) return <span>{rainTypes[row.RainQualifying]}</span>
              return (
                <a className="noselect" onClick={() => {
                  database.exec(`UPDATE Races SET RainQualifying = ${nextRain[row.RainQualifying]} WHERE RaceID = ${row.RaceID}`);
                  refresh();
                }}>{rainTypes[row.RainQualifying]}</a>
              )
            }
          },
          {
            field: 'WeatherStateQualifying',
            headerName: '',
            width: 50,
            renderCell: ({ row }) => {
              if (row.State !== 0) return <span>{weathers[row.WeatherStateQualifying]}</span>
              return (
                <a className="noselect" onClick={() => {
                  database.exec(`UPDATE Races SET WeatherStateQualifying = ${nextWeather[row.WeatherStateQualifying]} WHERE RaceID = ${row.RaceID}`);
                  refresh();
                }}>{weathers[row.WeatherStateQualifying]}</a>
              )
            }
          },
          {
            field: 'RainRace',
            headerName: 'sun',
            width: 50,
            renderCell: ({ row }) => {
              if (row.State !== 0) return <span>{rainTypes[row.RainRace]}</span>
              return (
                <a className="noselect" onClick={() => {
                  database.exec(`UPDATE Races SET RainRace = ${nextRain[row.RainRace]} WHERE RaceID = ${row.RaceID}`);
                  refresh();
                }}>{rainTypes[row.RainRace]}</a>
              )
            }
          },
          {
            field: 'WeatherStateRace',
            headerName: '',
            width: 50,
            renderCell: ({ row }) => {
              if (row.State !== 0) return <span>{weathers[row.WeatherStateRace]}</span>
              return (
                <a className="noselect" onClick={() => {
                  database.exec(`UPDATE Races SET WeatherStateRace = ${nextWeather[row.WeatherStateRace]} WHERE RaceID = ${row.RaceID}`);
                  refresh();
                }}>{weathers[row.WeatherStateRace]}</a>
              )
            }
          },
        ]}
        density="compact"
        initialState={{
          pagination: { paginationModel: { pageSize: 30 } },
        }}
        pageSizeOptions={[10, 20, 30]}
      />
    </div>
  );
}