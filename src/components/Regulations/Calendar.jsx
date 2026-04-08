import {
  CheckCircle,
  CopyAll,
  Delete,
  KeyboardDoubleArrowDown,
  KeyboardDoubleArrowUp,
  NotStarted,
  PlayCircle
} from "@mui/icons-material";
import * as React from "react";
import { useContext, useEffect, useState } from "react";
import { circuitNames, dayToDate, raceFlags } from "@/js/localization";
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

  const updateRaceField = (raceId, field, value) => {
    database.exec(`UPDATE Races SET ${field} = :value WHERE RaceID = :raceId`, {
      ":value": value,
      ":raceId": raceId,
    });
    refresh();
  };

  const renderWeatherCell = (row, field) => {
    const editable = row.State === 0;
    const value = row[field];
    const options = [
      { value: 1, label: "Sunny" },
      { value: 2, label: "Partly Cloudy" },
      { value: 4, label: "Cloudy" },
      { value: 8, label: "Light Rain" },
      { value: 16, label: "Moderate Rain" },
      { value: 32, label: "Heavy Rain" },
    ];

    if (!editable) {
      return (
        <div className="flex justify-center" title={options.find((option) => option.value === value)?.label || ""}>
          <span>{weathers[value]}</span>
        </div>
      );
    }

    return (
      <select
        value={value}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          const suffix = field.replace("WeatherState", "");
          database.exec(`UPDATE Races SET ${field} = :value, Rain${suffix} = :rainValue WHERE RaceID = :raceId`, {
            ":value": nextValue,
            ":rainValue": nextValue >= 8 ? 1 : 0,
            ":raceId": row.RaceID,
          });
          refresh();
        }}
        className="w-11 border border-white/10 bg-black/20 px-1 py-1 text-center text-sm text-white outline-none"
        title="Weather"
      >
        {options.map((option) => (
          <option key={`${field}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  const renderTemperatureCell = (row, field) => {
    const editable = row.State === 0;
    if (!editable) {
      return <div className="text-right text-sm text-slate-300">{Number(row[field]).toFixed(2)}</div>;
    }
    return (
      <input
        type="number"
        step="0.01"
        value={Number(row[field]).toFixed(2)}
        onChange={(event) => updateRaceField(row.RaceID, field, Number(event.target.value))}
        className="w-16 border border-white/10 bg-black/20 px-2 py-1 text-right text-sm text-white outline-none"
      />
    );
  };

  const actionButtonClass = "inline-flex h-7 w-7 items-center justify-center border border-white/10 bg-white/[0.03] text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-35";



  const weatherConfigs = [];
  for (const event of EventSuffix) {
    weatherConfigs.push({
      field: 'WeatherState' + event,
      headerName: EventToDay[event],
      width: 48,
    });
    weatherConfigs.push({
      field: 'Temperature' + event,
      headerName: '°C',
      width: 65,
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
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-white/[0.03]">
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Race</th>
                <th className="border-b border-white/10 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Circuit</th>
                {version >= 3 ? <th className="border-b border-white/10 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">F1</th> : null}
                {version !== 2 ? <th className="border-b border-white/10 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">F2</th> : null}
                {version !== 2 ? <th className="border-b border-white/10 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">F3</th> : null}
                <th className="border-b border-white/10 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Date</th>
                {version >= 4 ? <th className="border-b border-white/10 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Sat</th> : null}
                <th className="border-b border-white/10 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Actions</th>
                {weatherConfigs.map((config) => (
                  <th
                    key={config.field}
                    className="border-b border-white/10 px-2 py-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400"
                  >
                    {config.headerName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {races.map((row, index) => {
                const stateIcon = [
                  <NotStarted sx={{ color: "#33b8ff", fontSize: 16 }} />,
                  <PlayCircle sx={{ color: "#fff533", fontSize: 16 }} />,
                  <CheckCircle sx={{ color: "#33ff66", fontSize: 16 }} />,
                ][row.State];
                const editable = row.State === 0;
                const isSaturday = (row.Day % 7) === 0;
                let nextAvailableDuplicateWeek = -1;
                for (let w = Math.max(playerWeek, row.week + 1); w <= 51; w++) {
                  if (!weeks[w]) {
                    nextAvailableDuplicateWeek = w;
                    break;
                  }
                }

                return (
                  <tr key={row.RaceID} className="odd:bg-white/[0.03]">
                    <td className="border-b border-white/5 px-3 py-2 text-sm text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">{stateIcon}</span>
                        <span className="w-5 text-center text-xs font-semibold text-slate-300">{index + 1}</span>
                        <img
                          src={`/flags/${raceFlags[row.TrackID]}.svg`}
                          width={20}
                          height={15}
                          alt={row.Name}
                          className="shrink-0"
                        />
                      </div>
                    </td>
                    <td className="border-b border-white/5 px-3 py-2 text-sm text-slate-200">
                      {editable ? (
                        <select
                          value={row.TrackID}
                          onChange={(event) => updateRaceField(row.RaceID, "TrackID", event.target.value)}
                          className="w-[180px] border border-white/10 bg-black/20 px-2 py-1 text-sm text-white outline-none"
                        >
                          {Object.keys(raceTemplates).map((trackId) => (
                            <option key={`track-${trackId}`} value={trackId}>{circuitNames[trackId]}</option>
                          ))}
                        </select>
                      ) : (
                        circuitNames[row.TrackID]
                      )}
                    </td>
                    {version >= 3 ? (
                      <td className="border-b border-white/5 px-3 py-2 text-sm text-slate-200">
                        {editable ? (
                          <select
                            value={row.WeekendType}
                            onChange={(event) => updateRaceField(row.RaceID, "WeekendType", Number(event.target.value))}
                            className="w-24 border border-white/10 bg-black/20 px-2 py-1 text-sm text-white outline-none"
                          >
                            {(version === 3 ? [
                              { value: 0, label: "Normal" },
                              { value: 1, label: "Sprint" },
                              { value: 2, label: "ATA" },
                            ] : [
                              { value: 0, label: "Normal" },
                              { value: 1, label: "Sprint" },
                            ]).map((option) => (
                              <option key={`weekend-${option.value}`} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span>{row.WeekendType === 1 ? "Sprint" : row.WeekendType === 2 ? "ATA" : "Normal"}</span>
                        )}
                      </td>
                    ) : null}
                    {version !== 2 ? (
                      <td className="border-b border-white/5 px-3 py-2 text-center text-sm text-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            database.exec(`UPDATE Races_Tracks SET IsF2Race = ${1 - row.IsF2Race} WHERE TrackID = ${row.TrackID};`);
                            refresh();
                          }}
                          className="text-xs font-semibold text-sky-200"
                        >
                          {row.IsF2Race ? "F2" : "-"}
                        </button>
                      </td>
                    ) : null}
                    {version !== 2 ? (
                      <td className="border-b border-white/5 px-3 py-2 text-center text-sm text-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            database.exec(`UPDATE Races_Tracks SET IsF3Race = ${1 - row.IsF3Race} WHERE TrackID = ${row.TrackID};`);
                            refresh();
                          }}
                          className="text-xs font-semibold text-sky-200"
                        >
                          {row.IsF3Race ? "F3" : "-"}
                        </button>
                      </td>
                    ) : null}
                    <td className="border-b border-white/5 px-3 py-2 text-sm text-slate-300">
                      W{row.week}: {dayToDate(row.Day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    {version >= 4 ? (
                      <td className="border-b border-white/5 px-3 py-2 text-center">
                        <button
                          type="button"
                          disabled={!editable}
                          onClick={() => {
                            const nextDow = isSaturday ? 1 : 0;
                            database.exec(`UPDATE Races SET Day = Day + :n WHERE RaceID = :raceId;`, {
                              ":n": nextDow - (row.Day % 7),
                              ":raceId": row.RaceID,
                            });
                            refresh();
                          }}
                          className={`mx-auto flex h-5 w-5 items-center justify-center border text-[10px] transition ${!editable
                            ? `cursor-default border-white/10 bg-white/[0.03] ${isSaturday ? "text-slate-500" : "text-transparent"}`
                            : isSaturday
                              ? "border-sky-300/50 bg-sky-500/15 text-sky-100"
                              : "border-white/15 bg-black/10 text-transparent hover:border-white/25 hover:bg-white/[0.05]"
                            }`}
                          title={isSaturday ? "Saturday race" : "Sunday race"}
                        >
                          ✓
                        </button>
                      </td>
                    ) : null}
                    <td className="border-b border-white/5 px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className={actionButtonClass}
                          disabled={row.State !== 0 || row.Day - 7 - 2 <= player.Day || row.week <= 2}
                          title="Expedite"
                          onClick={() => {
                            if (weeks[row.week - 1]) {
                              database.exec(`UPDATE Races SET Day = Day + 7 WHERE RaceID = ${weeks[row.week - 1]};
                                           UPDATE Races SET Day = Day - 7 WHERE RaceID = ${row.RaceID};`);
                            } else {
                              database.exec(`UPDATE Races SET Day = Day - 7 WHERE RaceID = ${row.RaceID}`);
                            }
                            refresh();
                          }}
                        >
                          <KeyboardDoubleArrowUp fontSize="small" />
                        </button>
                        <button
                          type="button"
                          className={actionButtonClass}
                          disabled={row.State !== 0 || row.week >= 51}
                          title="Postpone"
                          onClick={() => {
                            if (weeks[row.week + 1]) {
                              database.exec(`UPDATE Races SET Day = Day - 7 WHERE RaceID = ${weeks[row.week + 1]};
                                           UPDATE Races SET Day = Day + 7 WHERE RaceID = ${row.RaceID};`);
                            } else {
                              database.exec(`UPDATE Races SET Day = Day + 7 WHERE RaceID = ${row.RaceID}`);
                            }
                            refresh();
                          }}
                        >
                          <KeyboardDoubleArrowDown fontSize="small" />
                        </button>
                        <button
                          type="button"
                          className={actionButtonClass}
                          disabled={row.State !== 0 || races.length < 2}
                          title="Delete"
                          onClick={() => {
                            database.exec(`DELETE FROM Races WHERE RaceID = ${row.RaceID}`);
                            refresh();
                          }}
                        >
                          <Delete fontSize="small" />
                        </button>
                        <button
                          type="button"
                          className={actionButtonClass}
                          disabled={nextAvailableDuplicateWeek === -1}
                          title="Duplicate"
                          onClick={() => {
                            let [{ columns, values }] = database.exec(`select * from Races WHERE RaceID = ${row.RaceID}`);
                            const r = values[0].map(x => typeof x === "number" ? x : `"${x}"`);
                            const targetWeekDelta = nextAvailableDuplicateWeek - row.week;
                            let reverseColumns = {};
                            for (let i = 0; i < columns.length; i++) reverseColumns[columns[i]] = i;

                            r[reverseColumns.RaceID] = "NULL";
                            r[reverseColumns.Day] += 7 * targetWeekDelta;
                            r[reverseColumns.State] = 0;

                            const RT = raceTemplates[r[3]];
                            for (const suffix of EventSuffix) {
                              const rain = Math.random() < RT.RainMax ? 1 : 0;
                              const weather = 1 << (Math.floor(Math.random() * 3) + rain * 3);
                              const temperature = Math.random() * (RT.TemperatureMax - RT.TemperatureMin) + RT.TemperatureMin;
                              r[reverseColumns["Rain" + suffix]] = rain;
                              r[reverseColumns["WeatherState" + suffix]] = weather;
                              r[reverseColumns["Temperature" + suffix]] = temperature;
                            }
                            database.exec(`INSERT INTO Races SELECT ${r.join(",")} WHERE NOT EXISTS (SELECT 1 FROM Races WHERE Day = ${r[reverseColumns.Day]});`);
                            refresh();
                          }}
                        >
                          <CopyAll fontSize="small" />
                        </button>
                      </div>
                    </td>
                    {weatherConfigs.map((config) => (
                      <td key={`${row.RaceID}-${config.field}`} className="border-b border-white/5 px-2 py-2 text-center text-sm text-slate-200">
                        {config.field.startsWith("WeatherState")
                          ? renderWeatherCell(row, config.field)
                          : renderTemperatureCell(row, config.field)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
