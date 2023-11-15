import {raceAbbrevs, raceFlags, teamColors} from "@/js/localization";
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
import {getCountryFlag, getCountryShort} from "../../js/countries";
import {getDriverCode, getDriverName} from "../../js/localization";
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';


export default function RaceResults({ database, basicInfo, version }) {

  const {driverMap, player } = basicInfo;

  const [championDriverID, setChampionDriverID] = useState(0);
  const [raceSchedule, setRaceSchedule] = useState([]);
  const [driverStandings, setDriverStandings] = useState([]);
  const [driverResults, setDriverResults] = useState([]);
  const [fastestLapOfRace, setFastestLapOfRace] = useState([]);

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

  // const [currentSeason, setCurrentSeason] = useState(2023);

  const handleChange = (event) => {
    setSeason(event.target.value);
  };




  useEffect(() => {

    // let season = player.CurrentSeason;

    let columns, values;
    let results;

    let raceSchedule = [];
    [{ columns, values }] = database.exec(
      `select * from Races JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID WHERE SeasonID = ${season} order by Day ASC`
    );
    for(const r of values) {
      let race = {};
      r.map((x, _idx) => {
        race[columns[_idx]] = x;
      })
      if (version === 3 && race.WeekendType === 1) {
        raceSchedule.push({ type: "sprint", race })
      } // 2 is ATA
      raceSchedule.push({ type: "race", race })
    }

    let driverResults = {};
    let driverStandings = [];
    let fastestLapOfRace = {};
    try {

      [{ columns, values }] = database.exec(
        version === 3 ?
          `SELECT DriverID FROM 'Races_DriverStandings' WHERE SeasonID = ${season - 1} AND RaceFormula = 1 AND Position = 1` :

          `SELECT DriverID FROM 'Races_DriverStandings' WHERE SeasonID = ${season - 1} AND Position = 1`
      );


      let [championDriverID] = values[0]; // for Car Number 1
      [{ columns, values }] = database.exec(
        version === 3 ?
          `SELECT * FROM 'Races_DriverStandings' WHERE SeasonID = ${season} AND RaceFormula = 1 ORDER BY Position ASC` :
          `SELECT * FROM 'Races_DriverStandings' WHERE SeasonID = ${season} ORDER BY Position ASC`
      );
      setChampionDriverID(championDriverID);



      for(const r of values) {
        let driverStanding = {};
        r.map((x, _idx) => {
          driverStanding[columns[_idx]] = x;
        });
        driverStandings.push(driverStanding);
      }

      results = database.exec(
        `SELECT * FROM 'Races_Results' WHERE Season = ${season} ORDER BY RaceID ASC`
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
              race: {},
              sprint: {},
            }
          }
          driverResults[raceResult.DriverID].race[raceResult.RaceID] = raceResult;
        }
      }

      if (version === 3) {

        try {
          [{columns, values}] = database.exec(
            `SELECT *, ChampionshipPoints as Points FROM 'Races_SprintResults' WHERE SeasonID = ${season} AND RaceFormula = 1 ORDER BY RaceID ASC`
          );
          for (const r of values) {
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
            driverResults[raceResult.DriverID].sprint[raceResult.RaceID] = raceResult;
          }
        } catch (e) {

        }

      }

      setRaceSchedule(raceSchedule);
      setDriverStandings(driverStandings);
      setDriverResults(driverResults);
      setFastestLapOfRace(fastestLapOfRace);


    } catch (e) {
      console.error(e);
    }

  }, [database, season])

  return (
    <div>
      <Typography variant="h5" component="h5">
        Race Results Overview for <FormControl variant="standard" sx={{ minWidth: 120, m: -0.5, p: -0.5, ml: 2 }}>
          <InputLabel id="demo-simple-select-standard-label">Season</InputLabel>
          <Select
            labelId="demo-simple-select-standard-label"
            id="demo-simple-select-standard"
            value={season}
            onChange={handleChange}
            label="Season"
          >
            {seasons.map(s => <MenuItem value={s} key={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
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
                <TableCell></TableCell>
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
                >
                  <TableCell component="th" scope="row" sx={{ py: 0.2 }}>
                    <img
                      src={getCountryFlag(driverMap[row.DriverID].Nationality)}
                      style={{ width: 24, margin: "-7px 4px -7px 0" }}
                      alt={driverMap[row.DriverID].Nationality}
                    />
                    {getDriverCode(driverMap[row.DriverID])} #{
                      (championDriverID === row.DriverID && driverMap[row.DriverID].WantsChampionDriverNumber) ? 1 : driverMap[row.DriverID].PernamentNumber
                    }
                    <br />
                    <span style={{ fontSize: "80%" }}>{getDriverName(driverMap[row.DriverID])}</span>
                  </TableCell>
                  <TableCell sx={{ py: 0.2 }}>{row.Points}</TableCell>
                  {
                    raceSchedule.map(({type, race}) => {
                      if (!driverResults[row.DriverID] || !driverResults[row.DriverID][type][race.RaceID]) {
                        return <TableCell
                          key={race.RaceID + type}
                          sx={{p: 0.2, minWidth: 36}}
                        />;
                      }
                      const result = driverResults[row.DriverID][type][race.RaceID];
                      let color = "auto";
                      if (result.FinishingPos === 1) {
                        color = "#ffd700";
                      } else if (result.FinishingPos <= 2) {
                        color = "#b7b7b7";
                      } else if (result.FinishingPos <= 3) {
                        color = "#cd7f32";
                      } else if (result.Points > 0) {
                        color = "#059372";
                      } else {
                        color = "transparent";
                      }
                      let fastest =
                        result.FastestLap === fastestLapOfRace[race.RaceID];
                      return <TableCell
                        align="right"
                        key={race.RaceID + type}
                        sx={{ p: 0.25, width: 40 }}
                        style={
                          basicInfo.player.TeamID === result.TeamID ? {
                            background: `repeating-linear-gradient(0deg, 
                            ${teamColors(result.TeamID)}70, ${teamColors(result.TeamID)}50 8px, ${teamColors(result.TeamID)}20 100%)`
                          } : {
                            background: `repeating-linear-gradient(0deg,
                            ${teamColors(result.TeamID)}70, ${teamColors(result.TeamID)}50 6px, ${teamColors(result.TeamID)}30 13px, transparent 20px, transparent 100%)`
                          }
                        }
                      >
                        <div style={{borderTop: `4px solid ${color}`, display: "block"}}>
                          {fastest && (
                            <span style={{ background: "#9700ff" , borderRadius: 2, fontSize: "75%", padding: "0 3px", margin: "3px 0 0 2px", float: "left"}}>F</span>
                          )}
                          <span style={{ color: result.Points > 0 ? "#fff" : "#777" }}>
                            <span style={{ fontSize: "80%" }}>{result.DNF ? "DNF" : "P"}</span>
                            {
                              !result.DNF && result.FinishingPos
                            }
                          </span>
                        </div>
                        <div style={{display: "block"}}>
                          {result.StartingPos === 1 && (
                            <span style={{ background: "#ff0059" , borderRadius: 2, fontSize: "75%", padding: "0 3px", margin: "3px 0 0 2px", float: "left"}}>P</span>
                          )}
                          <span style={{ fontSize: "80%" }}>{result.Points > 0 ? `+${result.Points}`: " "}</span>
                        </div>
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