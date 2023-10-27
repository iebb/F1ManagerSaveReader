import {raceAbbrevs, raceFlags} from "@/js/localization";
import {Divider, Typography} from "@mui/material";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import * as React from "react";
import {useEffect, useState} from "react";
import Image from "next/image";
import TableBody from "@mui/material/TableBody";
import {getDriverCode, getDriverName} from "../../js/localization";


export default function RaceResults22({ database, basicInfo }) {

  const [raceSchedule, setRaceSchedule] = useState([]);
  const [driverStandings, setDriverStandings] = useState([]);
  const [driverResults, setDriverResults] = useState([]);
  // const [currentSeason, setCurrentSeason] = useState(2023);

  const {driverMap, teamMap, weekend, player, races, currentSeasonRaces } = basicInfo;


  useEffect(() => {
    let raceSchedule = [];
    for(const race of currentSeasonRaces) {
      if (race.WeekendType === 1) {
        raceSchedule.push({ type: "sprint", race })
      } // 2 is ATA
      raceSchedule.push({ type: "race", race })
    }


    let columns, values;
    let driverResults = {};
    let driverStandings = [];
    try {
      [{ columns, values }] = database.exec(
        `SELECT * FROM 'Races_DriverStandings' WHERE SeasonID = ${player.CurrentSeason} ORDER BY Position ASC`
      );

      for(const r of values) {
        let driverStanding = {};
        r.map((x, _idx) => {
          driverStanding[columns[_idx]] = x;
        });
        driverStandings.push(driverStanding);
      }

      [{ columns, values }] = database.exec(
        `SELECT * FROM 'Races_Results' WHERE Season = ${player.CurrentSeason} ORDER BY RaceID ASC`
      );
      for(const r of values) {
        let raceResult = {};
        r.map((x, _idx) => {
          raceResult[columns[_idx]] = x;
        });
        if (!driverResults[raceResult.DriverID]) {
          driverResults[raceResult.DriverID] = {
            race: {},
            sprint: {},
          }
        }
        driverResults[raceResult.DriverID].race[raceResult.RaceID] = raceResult;
      }

      // [{ columns, values }] = database.exec(
      //   `SELECT *, ChampionshipPoints as Points FROM 'Races_SprintResults' WHERE SeasonID = ${player.CurrentSeason} AND RaceFormula = 1 ORDER BY RaceID ASC`
      // );
      // for(const r of values) {
      //   let raceResult = {};
      //   r.map((x, _idx) => {
      //     raceResult[columns[_idx]] = x;
      //   });
      //   if (!driverResults[raceResult.DriverID]) {
      //     driverResults[raceResult.DriverID] = {
      //       race: {},
      //       sprint: {},
      //     }
      //   }
      //   driverResults[raceResult.DriverID].sprint[raceResult.RaceID] = raceResult;
      // }

      setRaceSchedule(raceSchedule);
      setDriverStandings(driverStandings);
      setDriverResults(driverResults);


    } catch (e) {
      console.error(e);
    }

  }, [database])

  return (
    <div>
      <Typography variant="h5" component="h5">
        Race Results Overview for Season {player.CurrentSeason}
      </Typography>
      <Divider variant="fullWidth" sx={{ m: 1 }} />
      <div style={{ overflowX: "auto" }}>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell sx={{ py: 0.2 }}>Race</TableCell>
                {
                  raceSchedule.map(({type, race}) => {
                    return <TableCell align="right" key={race.RaceID + type} sx={{ p: 0 }}>
                      <Image
                        src={require(`../../assets/flags/${raceFlags[race.TrackID]}.svg`)}
                        key={race.TrackID}
                        width={24} height={18}
                        alt={race.Name}
                      />
                    </TableCell>
                  })
                }
              </TableRow>
              <TableRow>
                <TableCell>Driver</TableCell>
                <TableCell sx={{ py: 0.2 }}>Points</TableCell>
                {
                  raceSchedule.map(({type, race}) => {
                    return <TableCell align="right" key={race.RaceID + type} sx={{ p: 0, fontSize: 12, fontFamily: "monospace" }}>
                      {raceAbbrevs[race.TrackID]}
                      <br/>{type.substring(0, 3)}
                    </TableCell>
                  })
                }
                <TableCell sx={{ py: 0.2 }}>Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {driverStandings.map((row) => (
                <TableRow
                  key={`${row.DriverID}`}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  style={basicInfo.player.TeamID === row.TeamID ? { background: "#333333" } : {}}
                >
                  <TableCell component="th" scope="row" sx={{ py: 0.2 }}>
                    {getDriverCode(driverMap[row.DriverID])} #{driverMap[row.DriverID].Number}
                    <br />
                    <sub>{getDriverName(driverMap[row.DriverID])}</sub>
                  </TableCell>
                  <TableCell sx={{ py: 0.2 }}>{row.Points}</TableCell>
                  {
                    raceSchedule.map(({type, race}) => {
                      if (!driverResults[row.DriverID][type][race.RaceID]) {
                        return <TableCell sx={{p: 0.2, minWidth: 36}}/>;
                      }
                      const result = driverResults[row.DriverID][type][race.RaceID];
                      let color = "auto";
                      if (result.FinishingPos === 1) {
                        color = "#ab6a01";
                      } else if (result.FinishingPos <= 3) {
                        color = "#4b4b4b";
                      } else if (result.Points > 0) {
                        color = "#003424";
                      }
                      return <TableCell align="right" key={race.RaceID + type} sx={{ p: 0.2, pr: 0.5, minWidth: 36, background: color }}>
                        <span>{result.DNF ? "DNF" : "P" + result.FinishingPos}</span>
                        <br />
                        <sub>{result.Points > 0 ? `+${result.Points}`: "-"}</sub>
                      </TableCell>
                    })
                  }
                  <TableCell sx={{ py: 0.2 }}>{row.Points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}