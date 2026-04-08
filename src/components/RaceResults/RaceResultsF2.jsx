import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {yearToDateRange} from "@/js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import ResultsTable from "./subcomponents/ResultsTable";
import SeriesSwitch from "./SeriesSwitch";


export default function RaceResultsF2({ formulae = 2, seriesOptions = [], activeSeries = 2, onSeriesChange = null }) {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);

  const { driverMap, player, misc } = basicInfo;

  const [championDriverID, setChampionDriverID] = useState(0);
  const [raceSchedule, setRaceSchedule] = useState([]);
  const [driverStandings, setDriverStandings] = useState([]);
  const [driverResults, setDriverResults] = useState([]);
  const [driverTeams, setDriverTeams] = useState({});
  const [fastestLapOfRace, setFastestLapOfRace] = useState([]);

  // const [formulae, setFormulae] = useState(2);

  const [season, setSeason] = useState(player.CurrentSeason);
  const [seasons, setSeasons] = useState([]);

  useEffect(() => {
    let seasonList = [];
    for(let s = player.StartSeason; s <= player.CurrentSeason; s++) {
      seasonList.push(s);
    }
    setSeasons(seasonList);
    setSeason(player.CurrentSeason);
  }, [player.CurrentSeason, player.StartSeason]);

  const teamNumbers = (
    formulae === 2
  ) ? (
    misc.Formula2Number19Retired ? [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
      [11, 12],
      [14, 15],
      [16, 17],
      [18, 19],
      [20, 21],
      [22, 23],
    ] : [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
      [11, 12],
      [14, 15],
      [16, 17],
      [20, 21],
      [22, 23],
      [24, 25],
    ]
  ) : (
    [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
      [14, 15, 16],
      [17, 18, 19],
      [20, 21, 22],
      [23, 24, 25],
      [26, 27, 28],
      [29, 30, 31],
    ]
  )




  useEffect(() => {

    // let season = player.CurrentSeason;

    let columns, values;
    let results;

    let raceSchedule = [];

    for(const race of database.getAllRows(
      `select * from Races 
         LEFT JOIN (select RaceID as FR_RaceID, RaceFormula from Races_FeatureRaceResults WHERE RaceFormula = ${formulae} GROUP BY RaceID) as FR ON (
            Races.RaceID = FR.FR_RaceID
         )
         LEFT JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID 
         WHERE SeasonID = ${season} AND (
            (IsF${formulae}Race = 1 AND State IN (0, 1))
            OR 
            (FR.RaceFormula = ${formulae} AND State = 2)
         )
        order by Day ASC`
    )) {
      raceSchedule.push({ type: "sprint", race, span: 0 })
      raceSchedule.push({ type: "feature", race, span: 2 })
    }

    let driverTeams = {};
    let driverResults = {};
    let driverPosInTeam = {};
    let driverStandings = [];
    let fastestLapOfRace = {};
    let polePositionPoints = {};
    let teamStandings = {};
    try {

      [{ columns, values }] = database.exec(
        `SELECT TeamID, Position FROM 'Races_TeamStandings' WHERE SeasonID = ${season - 1} AND RaceFormula = ${formulae}`
      );

      for(const [TeamID, Position] of values) {
        teamStandings[TeamID] = Position;
      }

      [{ columns, values }] = database.exec(
        version >= 3 ?
          `SELECT * FROM 'Races_DriverStandings' WHERE SeasonID = ${season} AND RaceFormula = ${formulae} ORDER BY Position ASC` :
          `SELECT * FROM 'Races_DriverStandings' WHERE SeasonID = ${season} ORDER BY Position ASC`
      );



      for(const r of values) {
        let driverStanding = {};
        r.map((x, _idx) => {
          driverStanding[columns[_idx]] = x;
        });
        driverStandings.push(driverStanding);
      }


      results = database.exec(
        `SELECT RaceID, DriverID, ChampionshipPoints FROM 'Races_QualifyingResults' 
WHERE SeasonID = ${season} AND RaceFormula = ${formulae} AND QualifyingStage = 1 AND ChampionshipPoints > 0 ORDER BY RaceID ASC` // only F1 has Q3
      );
      if (results.length) {
        [{ columns, values }] = results;
        for(const [RaceID, DriverID, ChampionshipPoints] of values) {
          polePositionPoints[RaceID] = [DriverID, ChampionshipPoints]
        }
      }

      results = database.exec(
        `SELECT * FROM 'Races_FeatureRaceResults' WHERE SeasonID = ${season} AND RaceFormula = ${formulae} ORDER BY RaceID ASC`
      );
      if (results.length) {
        [{ columns, values }] = results;
        for(const r of values) {
          let raceResult = {};
          r.map((x, _idx) => {
            raceResult[columns[_idx]] = x;
          });
          if (!fastestLapOfRace[raceResult.RaceID] || fastestLapOfRace[raceResult.RaceID] > raceResult.FastestLap && raceResult.FastestLap > 0) {
            fastestLapOfRace[raceResult.RaceID] = raceResult.FastestLap
          }
          if (!driverResults[raceResult.DriverID]) {
            driverResults[raceResult.DriverID] = {
              feature: {},
              sprint: {},
            }
          }
          raceResult.Points = raceResult.ChampionshipPoints
          if (polePositionPoints[raceResult.RaceID] && polePositionPoints[raceResult.RaceID][0] === raceResult.DriverID) {
            raceResult.PolePositionPoints = polePositionPoints[raceResult.RaceID][1];
            raceResult.Points += polePositionPoints[raceResult.RaceID][1];
          }
          driverResults[raceResult.DriverID].feature[raceResult.RaceID] = raceResult;
          driverTeams[raceResult.DriverID] = raceResult.TeamID;
        }
      }

      try {
        [{columns, values}] = database.exec(
          `SELECT *, ChampionshipPoints as Points FROM 'Races_SprintResults' WHERE SeasonID = ${season} AND RaceFormula = ${formulae} ORDER BY RaceID ASC`
        );
        for (const r of values) {
          let raceResult = {};
          r.map((x, _idx) => {
            raceResult[columns[_idx]] = x;
          });
          if (!driverResults[raceResult.DriverID]) {
            driverResults[raceResult.DriverID] = {
              feature: {},
              sprint: {},
            }
          }
          driverResults[raceResult.DriverID].sprint[raceResult.RaceID] = raceResult;
          driverTeams[raceResult.DriverID] = raceResult.TeamID;
        }
      } catch (e) {

      }



      try {
        for(const d of driverStandings) {

          let [sd, ed] = yearToDateRange(season);

          d.DriverAssignedNumber = "N/A";
          console.log(season, player.CurrentSeason);

          if (season === player.CurrentSeason) {
            try {
              [{ columns, values }] = database.exec(
                `SELECT Staff_Contracts.TeamID, PosInTeam FROM 'Staff_Contracts' LEFT JOIN Teams ON Teams.TeamID = Staff_Contracts.TeamID WHERE Staff_Contracts.StaffID = ${d.DriverID} AND ContractType = 0 
AND StartDay <= ${player.Day} AND EndSeason >= ${season} AND ContractType = 0 AND Formula = ${formulae} ORDER BY StartDay DESC`
              );
              const [TeamID, Position] = values[0];
              const teamOrder = teamStandings[TeamID] - 1;
              if (!Position) {
                d.DriverAssignedNumber = teamNumbers[teamOrder].join("/");
              } else {
                d.DriverAssignedNumber = teamNumbers[teamOrder][Position - 1];
              }
              driverTeams[d.DriverID] = TeamID;
            } catch (e) {
              console.log(e);
              const TeamID = driverTeams[d.DriverID];
              const teamOrder = teamStandings[TeamID] - 1;
              d.DriverAssignedNumber = teamNumbers[teamOrder].join("/");
            }
          } else {
            try {
              [{ columns, values }] = database.exec(
                `SELECT TeamID, PosInTeam FROM 'Staff_CareerHistory' WHERE StaffID = ${d.DriverID} AND StartDay <= ${sd} AND EndDay >= ${ed} ORDER BY StartDay DESC`
              );
              // console.log(`SELECT TeamID, PosInTeam FROM 'Staff_CareerHistory' WHERE StaffID = ${d.DriverID} AND EndDay <= ${e} ORDER BY StartDay DESC`);
              const [TeamID, Position] = values[0];
              const teamOrder = teamStandings[TeamID] - 1;
              if (!Position) {
                d.DriverAssignedNumber = teamNumbers[teamOrder].join("/");
              } else {
                d.DriverAssignedNumber = teamNumbers[teamOrder][Position - 1];
              }
              driverTeams[d.DriverID] = TeamID;
            } catch (e) {
              const TeamID = driverTeams[d.DriverID];
              const teamOrder = teamStandings[TeamID] - 1;
              d.DriverAssignedNumber = teamNumbers[teamOrder].join("/");
            }
          }
        }

      } catch (e) {

      }



      setRaceSchedule(raceSchedule);
      setDriverStandings(driverStandings);
      setDriverResults(driverResults);
      setDriverTeams(driverTeams);
      setFastestLapOfRace(fastestLapOfRace);


    } catch (e) {
      console.error(e);
    }

  }, [database, season, formulae])

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.015] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Formula {formulae}</div>
            <h3 className="mt-2 text-base font-bold text-white">Drivers Championship Overview</h3>
            <p className="mt-2 max-w-[780px] text-sm text-slate-400">
              Standings table with feature-race and sprint-race scoring across the feeder series calendar.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {onSeriesChange ? (
              <SeriesSwitch options={seriesOptions} value={activeSeries} onChange={onSeriesChange} />
            ) : null}
            <label className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-300">Season</span>
              <select
                value={season}
                onChange={(event) => setSeason(Number(event.target.value))}
                className="border border-white/10 bg-black/10 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300/50"
              >
                {seasons.map((value) => (
                  <option key={value} value={value} className="bg-[#182026] text-white">
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>
      <div className="overflow-x-auto border border-white/10 bg-white/[0.015]">
        <ResultsTable
          key={season}
          version={version}
          raceSchedule={raceSchedule}
          formulae={formulae}
          championDriverID={championDriverID}
          driverTeams={driverTeams}
          driverStandings={driverStandings}
          driverResults={driverResults}
          fastestLapOfRace={fastestLapOfRace}
        />
      </div>
    </div>
  );
}
