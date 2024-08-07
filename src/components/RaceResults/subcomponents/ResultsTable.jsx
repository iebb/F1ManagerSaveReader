import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {getDriverCode, getDriverName, raceAbbrevs, raceFlags} from "@/js/localization";
import {getCountryFlag} from "@/js/localization/ISOCountries";
import {Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from "@mui/material";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {TeamName} from "../../Localization/Localization";

export default function ResultsTable(ctx) {
  const {version, gameVersion} = useContext(MetadataContext)
  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);
  const [raceSchedule, setRaceSchedule] = useState([]);

  const { driverMap } = basicInfo;
  const { formulae, driverTeams, championDriverID, raceSchedule: _raceSchedule, driverStandings, driverResults, fastestLapOfRace } = ctx;

  useEffect(() => {
    const playerTeams = version >= 3 ? database.getAllRows(`SELECT * FROM Player_History`) : [];
    const playerTeamIDFromDay = (day) =>  {
      if (version === 2) return basicInfo.player.TeamID;
      const filter = playerTeams.filter(
        p => p.StartDay <= day && (p.EndDay >= day || !p.EndDay)
      );
      if (filter.length) {
        return filter[0].TeamID;
      }
      return basicInfo.player.TeamID;
    }

    setRaceSchedule(_raceSchedule.map(r => {
      r.race.PlayerTeamID = playerTeamIDFromDay(r.race.Day);
      return r;
    }));
  }, [database, _raceSchedule]);


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
                  className={`nopad race_header_cell race_cell_${type}`}
                  colSpan={ span }
                >
                  <img
                    src={`/flags/${raceFlags[race.TrackID]}.svg`}
                    key={race.TrackID}
                    width={20} height={15}
                    alt={race.Name}
                    className="inline-block"
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
              component="th"
              sx={{ py: 0 }}
              style={{ width: 80 }}
            >#</TableCell>
            <TableCell
              sx={{ py: 0.25 }}
              className={`race_cell_driver`}
            >Driver</TableCell>
            <TableCell
              sx={{ py: 0.25 }}
              className={`race_cell_team`}
            >Team</TableCell>
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
            <TableCell sx={{ py: 0 }}>Pts</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {driverStandings.map((row) => (
            <TableRow
              key={`${row.DriverID}`}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell
                scope="row"
                sx={{ py: 0.2 }}
                style={{ maxWidth: 50 }}
              >
                {row.Position}
              </TableCell>
              <TableCell
                component="th"
                scope="row"
                sx={{ py: 0.2 }}
                className={`race_cell_driver`}
              >
                <img
                  src={getCountryFlag(driverMap[row.DriverID].Nationality)}
                  style={{ width: 24, margin: "-7px 4px -7px 0", display: "inline-block" }}
                  alt={driverMap[row.DriverID].Nationality}
                />
                {
                  formulae === 1 ? (` ${
                    (championDriverID === row.DriverID && driverMap[row.DriverID].WantsChampionDriverNumber) ? 1 : driverMap[row.DriverID].PernamentNumber || 'N/A'
                  }`) : (
                    `${row.DriverAssignedNumber}`
                  )
                }. {getDriverCode(driverMap[row.DriverID])}
                <br />
                <span style={{ fontSize: "80%" }}>{getDriverName(driverMap[row.DriverID])}</span>
              </TableCell>
              <TableCell
                sx={{ py: 0.5 }}
                className={`race_cell_team overflow-hidden`}
              >
                <div className="w-[500px]">
                  <TeamName TeamID={driverTeams[row.DriverID]} type="fanfare" />
                </div>
              </TableCell>
              {
                raceSchedule.map(({type, race, span}) => {

                  if (
                    !driverResults[row.DriverID] ||
                    !driverResults[row.DriverID][type][race.RaceID]
                  ) {
                    if (span > 0 && (driverResults[row.DriverID]?.practice && driverResults[row.DriverID].practice[race.RaceID])) {
                      const result = driverResults[row.DriverID].practice[race.RaceID];
                      return (
                        <TableCell
                          className={`race_cell_${type}`}
                          align="right"
                          key={race.RaceID + type}
                          sx={{ p: 0.25 }}
                          style={
                            {
                              ...race.PlayerTeamID === result.TeamID ? {
                                background: `repeating-linear-gradient(0deg, 
                            rgba(var(--team${result.TeamID}-triplet), 0.5), rgba(var(--team${result.TeamID}-triplet), 0.3) 5px, 
                            rgba(var(--team${result.TeamID}-triplet), 0.15) 100%)`
                              } : {
                                background: `repeating-linear-gradient(0deg,
                            rgba(var(--team${result.TeamID}-triplet), 0.5), rgba(var(--team${result.TeamID}-triplet), 0.3) 5px, 
                            rgba(var(--team${result.TeamID}-triplet), 0.15) 10px, transparent 15px, transparent 100%)`
                              },
                              fontSize: "80%",
                              color: "#ff7",
                            }
                          }
                        >
                          TD
                        </TableCell>
                      );
                    }
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
                    className={`race_cell_${type}`}
                    align="right"
                    key={race.RaceID + type}
                    sx={{ p: 0.25 }}
                    style={
                      race.PlayerTeamID === result.TeamID ? {
                        background: `repeating-linear-gradient(0deg, 
                            rgba(var(--team${result.TeamID}-triplet), 0.5), rgba(var(--team${result.TeamID}-triplet), 0.3) 5px, 
                            rgba(var(--team${result.TeamID}-triplet), 0.15) 100%)`
                      } : {
                        background: `repeating-linear-gradient(0deg,
                            rgba(var(--team${result.TeamID}-triplet), 0.5), rgba(var(--team${result.TeamID}-triplet), 0.3) 8px, 
                            rgba(var(--team${result.TeamID}-triplet), 0.15) 10px, transparent 15px, transparent 100%)`
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