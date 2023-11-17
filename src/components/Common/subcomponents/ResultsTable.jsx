import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Image from "next/image";
import {useContext} from "react";
import * as React from "react";
import {getCountryFlag} from "../../../js/countries";
import {getDriverCode, getDriverName, raceAbbrevs, raceFlags, teamColors, teamNames} from "../../../js/localization";
import {BasicInfoContext, DatabaseContext, VersionContext} from "../../Contexts";

export default function ResultsTable(ctx) {
  const version = useContext(VersionContext);
  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);

  const { driverMap } = basicInfo;

  const { formulae, driverTeams, championDriverID, raceSchedule, driverStandings, driverResults, fastestLapOfRace } = ctx;

  return (
    <TableContainer component={Paper} className={`table_f${formulae}`}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell
              className={`race_header_cell`}
              sx={{ py: 0.2 }}
              colSpan={3}
            >Race</TableCell>
            {
              raceSchedule.map(({type, race, span}) => {
                if (span === 0) return null;
                return <TableCell
                  align="center"
                  key={race.RaceID + type}
                  className={`nopad race_header_cell`}
                  colSpan={ span }
                >
                  <Image
                    src={require(`../../../assets/flags/${raceFlags[race.TrackID]}.svg`)}
                    key={race.TrackID}
                    width={20} height={15}
                    alt={race.Name}
                  />
                  <br />
                  <span style={{ fontSize: 12 }}>{raceAbbrevs[race.TrackID]}</span>
                </TableCell>
              })
            }
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              sx={{ py: 0.25 }}
              className={`race_cell_driver`}
            >Driver</TableCell>
            <TableCell
              sx={{ py: 0.25 }}
              className={`race_cell_team`}
            >Team</TableCell>
            <TableCell sx={{ py: 0 }}>pts</TableCell>
            {
              raceSchedule.map(({type, race}) => {
                return <TableCell
                  align="center"
                  key={race.RaceID + type}
                  className={`race_cell_${type}`}
                  sx={{ p: 0, fontSize: 12 }}
                >
                  {type.substring(0, 3)}
                </TableCell>
              })
            }
            <TableCell sx={{ py: 0 }}>pts</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {driverStandings.map((row) => (
            <TableRow
              key={`${row.DriverID}`}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell
                component="th"
                scope="row"
                sx={{ py: 0.2 }}
                className={`race_cell_driver`}
              >
                <img
                  src={getCountryFlag(driverMap[row.DriverID].Nationality)}
                  style={{ width: 24, margin: "-7px 4px -7px 0" }}
                  alt={driverMap[row.DriverID].Nationality}
                />
                {
                  formulae === 1 ? (` ${
                    (championDriverID === row.DriverID && driverMap[row.DriverID].WantsChampionDriverNumber) ? 1 : driverMap[row.DriverID].PernamentNumber
                  }`) : (
                    `${row.DriverAssignedNumber}`
                  )
                }. {getDriverCode(driverMap[row.DriverID])}
                <br />
                <span style={{ fontSize: "80%" }}>{getDriverName(driverMap[row.DriverID])}</span>
              </TableCell>
              <TableCell
                sx={{ py: 0.2 }}
                className={`race_cell_team`}
              >
                <div>
                  <div style={{
                    width: 12, height: 12, borderRadius: 6,
                    display: "inline-block", marginRight: 3,
                    background: `var(--team${driverTeams[row.DriverID]})`,
                  }} />
                  {/*<div style={{*/}
                  {/*  width: 12, height: 12, borderRadius: 6,*/}
                  {/*  display: "inline-block", marginRight: 3,*/}
                  {/*  background: `var(--team${driverTeams[row.DriverID]}-fanfare1)`,*/}
                  {/*}} />*/}
                  <div style={{
                    width: 12, height: 12, borderRadius: 6,
                    display: "inline-block", marginRight: 3,
                    background: `var(--team${driverTeams[row.DriverID]}-fanfare2)`,
                  }} />
                </div>
                <span style={{ fontSize: 12 }}>{teamNames(driverTeams[row.DriverID], version)}</span>
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
                    sx={{ p: 0.25 }}
                    style={
                      basicInfo.player.TeamID === result.TeamID ? {
                        background: `repeating-linear-gradient(0deg, 
                            rgba(var(--team${result.TeamID}-triplet), 0.5), rgba(var(--team${result.TeamID}-triplet), 0.3) 8px, 
                            rgba(var(--team${result.TeamID}-triplet), 0.15) 100%)`
                      } : {
                        background: `repeating-linear-gradient(0deg,
                            rgba(var(--team${result.TeamID}-triplet), 0.5), rgba(var(--team${result.TeamID}-triplet), 0.3) 8px, 
                            rgba(var(--team${result.TeamID}-triplet), 0.15) 13px, transparent 20px, transparent 100%)`
                      }
                    }
                  >
                    <div style={{borderTop: `4px solid ${color}`, display: "block"}}>
                      {fastest && (
                        <span style={{
                          background: "#9700ff",
                          borderRadius: 2, fontSize: "75%", padding: "0 2px",
                          margin: "3px 0 0 1px", float: "left"}}>F</span>
                      )}
                      <span style={{ color: result.Points > 0 ? "#fff" : "#777" }}>
                            <span style={{ fontSize: "80%" }}>{result.DNF ? "DNF" : "P"}</span>
                        {
                          !result.DNF && result.FinishingPos
                        }
                          </span>
                    </div>
                    <div style={{display: "block"}}>
                      { ((result.PolePositionPoints !== undefined ) || (version === 2 && result.StartingPos === 1)) && (
                        <span style={{
                          background: result.PolePositionPoints ? "#f05" : "#804054" ,
                          borderRadius: 2, fontSize: "75%", padding: "0 2px",
                          margin: "3px 0 0 1px", float: "left"
                        }}>P</span>
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
  )
}