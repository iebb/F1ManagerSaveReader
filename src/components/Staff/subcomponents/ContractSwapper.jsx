import {TeamName} from "@/components/Localization/Localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {getDriverName} from "@/js/localization";
import {Alert, AlertTitle, Autocomplete, Box, Button, Divider, Grid, Modal, TextField, Typography} from "@mui/material";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {assignRandomRaceNumber, fireDriverContract, getStaff} from "../commons/drivers";

export default function ContractSwapper(props) {
  const { swapRow, setSwapRow, refresh } = props;
  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);
  const { player } = basicInfo;

  const ctx = { database, version, basicInfo };
  const [swapDriver, setSwapDriver] = useState(null);

  const [_drivers, setDrivers] = useState([]);
  const [updated, setUpdated] = useState(0);
  const _refresh = () => setUpdated(+new Date());

  useEffect(() => {
    if (swapRow) {
      setDrivers(getStaff(ctx, swapRow.StaffType)[1]);
    }
  }, [swapRow, updated]);

  if (!swapRow) return null;

  const swapDriverUpdated = _drivers.filter(d => d.StaffID === swapDriver?.id)?.[0];


  /* swap contracts */
  const swapContracts = (staff1, staff2, permanentSwap = true) => {

    const season = basicInfo.player.CurrentSeason;
    const staff1ID = staff1.StaffID;
    const staffType = staff1.StaffType;
    const staff2ID = staff2.StaffID;
    let results;

    let columns, values;

    [{ values }] = database.exec(`SELECT Min(Day), Max(Day) FROM 'Seasons_Deadlines' WHERE SeasonID = ${season}`);
    const [seasonStart, seasonEnd] = values[0];

    let staff1Team, staff2Team;
    let staff1StartDay, staff2StartDay;
    let staff1PIT, staff2PIT;

    results = database.exec(`SELECT StartDay, TeamID, PosInTeam FROM Staff_Contracts WHERE ContractType = 0 AND StaffID = ${staff1ID}`);
    if (results) {
      [[staff1StartDay, staff1Team, staff1PIT]] = results[0].values;
    }

    results = database.exec(`SELECT StartDay, TeamID, PosInTeam FROM Staff_Contracts WHERE ContractType = 0 AND StaffID = ${staff2ID}`);
    if (results) {
      [[staff2StartDay, staff2Team, staff2PIT]] = results[0].values;
    }


    database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1ID}, ContractType = 130 WHERE StaffID = ${staff2ID} AND ContractType = 3`);
    database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2ID}, ContractType = 130 WHERE StaffID = ${staff1ID} AND ContractType = 3`);
    database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1ID}, ContractType = 120 WHERE StaffID = ${staff2ID} AND ContractType = 2`);
    database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2ID}, ContractType = 120 WHERE StaffID = ${staff1ID} AND ContractType = 2`);

    if (permanentSwap) { // add a record in history
      /* contracts */
      database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1ID}, ContractType = 100, StartDay = ${player.Day} WHERE StaffID = ${staff2ID} AND ContractType = 0`);
      database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2ID}, ContractType = 100, StartDay = ${player.Day} WHERE StaffID = ${staff1ID} AND ContractType = 0`);

      database.exec(`DELETE FROM Staff_CareerHistory WHERE EndDay <= StartDay`);

      if (version === 2) {
        if (staff1.StartDay !== player.Day && staff1Team) {
          database.exec(`INSERT INTO Staff_CareerHistory VALUES (${staff1ID}, ${staff1Team}, ${staff1StartDay}, ${player.Day})`);
        }
        if (staff2.StartDay !== player.Day && staff2Team) {
          database.exec(`INSERT INTO Staff_CareerHistory VALUES (${staff2ID}, ${staff2Team}, ${staff2StartDay}, ${player.Day})`);
        }
      } else {
        if (staff1.StartDay !== player.Day && staff1Team) {
          database.exec(`INSERT INTO Staff_CareerHistory VALUES (${staff1ID}, ${staff1Team}, ${staff1StartDay}, ${player.Day}, ${staff1PIT})`);
        }
        if (staff2.StartDay !== player.Day && staff2Team) {
          database.exec(`INSERT INTO Staff_CareerHistory VALUES (${staff2ID}, ${staff2Team}, ${staff2StartDay}, ${player.Day}, ${staff2PIT})`);
        }
      }


    } else {

      /* contracts */
      database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1ID}, ContractType = 100 WHERE StaffID = ${staff2ID} AND ContractType = 0`);
      database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2ID}, ContractType = 100 WHERE StaffID = ${staff1ID} AND ContractType = 0`);

    }

    database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 0 WHERE ContractType = 100`);
    database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 2 WHERE ContractType = 120`);
    // future contracts are not affected
    database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 3 WHERE ContractType = 130`);


    if (staffType === 0) {
      let [{values: [[AssignedCarNumberA]]}] = database.exec(`SELECT AssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${staff1ID}`);
      let [{values: [[AssignedCarNumberB]]}] = database.exec(`SELECT AssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${staff2ID}`);

      /* car numbers */
      database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = :acn WHERE StaffID = ${staff2ID}`, {":acn": AssignedCarNumberA});
      database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = :acn WHERE StaffID = ${staff1ID}`, {":acn": AssignedCarNumberB});

      const driverPairs = [[staff1ID, staff2ID, AssignedCarNumberA], [staff2ID, staff1ID, AssignedCarNumberB]]
      for(const [A, B, acn] of driverPairs) {
        /* B -> A */

        /* race engineers */
        results = database.exec(`SELECT RaceEngineerID FROM Staff_RaceEngineerDriverAssignments WHERE IsCurrentAssignment = 1 AND DriverID = ${A}`);
        if (results.length) {
          let [{values: [[engineerA]]}] = results;
          database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 0 WHERE RaceEngineerID = ${engineerA} AND DriverID = ${A}`);

          /* check if paired before */
          results = database.exec(`SELECT DaysTogether FROM Staff_RaceEngineerDriverAssignments WHERE RaceEngineerID = ${engineerA} AND DriverID = ${B}`);
          if (results.length) {
            database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 3 WHERE RaceEngineerID = ${engineerA} AND DriverID = ${B}`);
          } else {
            database.exec(`INSERT INTO Staff_RaceEngineerDriverAssignments VALUES (${engineerA}, ${B}, 0, 50, 3)`);
          }
        }

        /* standings */
        // TODO: 3rd driver in F1 does not need to be included
        if (acn) {


          switch (version) {
            case 2:

              results = database.exec(`SELECT 1 FROM Races_DriverStandings WHERE DriverID = ${A} AND SeasonID = ${season}`);
              if (results.length) {
                /* Version 2 only have F1 */
                results = database.exec(`SELECT 1 FROM Races_DriverStandings WHERE DriverID = ${B} AND SeasonID = ${season}`);
                if (!results.length) { // to be added
                  let [{values: [[Position]]}] = database.exec(`SELECT MAX(Position) + 1 FROM Races_DriverStandings WHERE SeasonID = ${season}`);
                  database.exec(`INSERT INTO Races_DriverStandings VALUES (${season}, ${B}, 0, ${Position}, 0, 0)`);
                }
                results = database.exec(`SELECT * FROM Races_Results LEFT JOIN Races On Races.RaceID = Races_Results.RaceID WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd}`);
                if (!results.length) {
                  database.exec(`DELETE FROM Races_DriverStandings WHERE SeasonID = ${season} AND DriverID = ${A}`);
                }
              }


              break;
            case 3:
              results = database.exec(`SELECT RaceFormula FROM Races_DriverStandings WHERE DriverID = ${A} AND SeasonID = ${season}`);
              if (results.length) {
                for(let {values: [[RaceFormula]]} of results) {

                  let racesCompleted = false;
                  if (RaceFormula === 1) {
                    // Competed in Race
                    results = database.exec(`SELECT * FROM Races_Results LEFT JOIN Races On Races.RaceID = Races_Results.RaceID 
WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd}`);
                    if (results.length) {
                      racesCompleted = true;
                    }
                  } else {
                    results = database.exec(`SELECT * FROM Races_FeatureRaceResults LEFT JOIN Races On Races.RaceID = Races_FeatureRaceResults.RaceID 
WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd} AND RaceFormula = ${RaceFormula}`);
                    if (results.length) {
                      racesCompleted = true;
                    }
                  }

                  if (!racesCompleted) {
                    // Competed in Sprint
                    results = database.exec(`SELECT * FROM Races_SprintResults LEFT JOIN Races On Races.RaceID = Races_SprintResults.RaceID 
WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd} AND RaceFormula = ${RaceFormula}`);
                    if (results.length) {
                      racesCompleted = true;
                    }
                  }
//
//                   if (!racesCompleted) {
//                     // Competed in Quali
//                     results = database.exec(`SELECT * FROM Races_QualifyingResults LEFT JOIN Races On Races.RaceID = Races_QualifyingResults.RaceID
// WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd} AND RaceFormula = ${RaceFormula}`);
//                     if (results.length) {
//                       racesCompleted = true;
//                     }
//                   }

                  if (racesCompleted) {
                    results = database.exec(`SELECT RaceFormula FROM Races_DriverStandings WHERE DriverID = ${B} AND SeasonID = ${season} AND RaceFormula = ${RaceFormula}`);
                    if (!results.length) { // to be added
                      let [{values: [[Position]]}] = database.exec(`SELECT MAX(Position) + 1 FROM Races_DriverStandings WHERE SeasonID = ${season} AND RaceFormula = ${RaceFormula}`);
                      database.exec(`INSERT INTO Races_DriverStandings VALUES (${season}, ${B}, 0, ${Position}, 0, 0, ${RaceFormula})`);
                    }
                  } else {
                    database.exec(`DELETE FROM Races_DriverStandings WHERE SeasonID = ${season} AND DriverID = ${A} AND RaceFormula = ${RaceFormula}`);
                  }

                }
              }


          }
        }
      }

      database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 1 WHERE IsCurrentAssignment = 3`);
    } else if (staffType === 2) { // race engineer
      const raceEngineerPairs = [[staff1ID, staff2ID], [staff2ID, staff1ID]]
      for(const [A, B] of raceEngineerPairs) {
        /* race engineers */
        results = database.exec(`SELECT DriverID FROM Staff_RaceEngineerDriverAssignments WHERE IsCurrentAssignment = 1 AND RaceEngineerID = ${A}`);
        if (results.length) {
          let [{values: [[engineerA]]}] = results;
          database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 0 WHERE DriverID = ${engineerA} AND RaceEngineerID = ${A}`);
          /* check if paired before */
          results = database.exec(`SELECT DaysTogether FROM Staff_RaceEngineerDriverAssignments WHERE DriverID = ${engineerA} AND RaceEngineerID = ${B}`);
          if (results.length) {
            database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 3 WHERE DriverID = ${engineerA} AND RaceEngineerID = ${B}`);
          } else {
            database.exec(`INSERT INTO Staff_RaceEngineerDriverAssignments VALUES (${B}, ${engineerA}, 0, 50, 3)`);
          }
        }
      }
      database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 1 WHERE IsCurrentAssignment = 3`);
    }
    _refresh();
  }
  return (
    <Modal
      open={swapRow}
      onClose={() => setSwapRow(null)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#333',
        border: '2px solid #000',
        boxShadow: 24,
        padding: 15,
        borderRadius: 20,
      }}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          Contract Swap for {getDriverName(swapRow)}
        </Typography>

        <Alert severity="info" sx={{ my: 2 }}>
          <AlertTitle>Info</AlertTitle>
          <p>Temporary: Won't affect Career History until driver changes team in-game.</p>
          <p>Permanent: Career History will be updated and separated.</p>
        </Alert>
        <Divider variant="fullWidth" sx={{ my: 2 }} />
        <Grid direction="row" container spacing={1}>
          <Grid item style={{ flex: 1 }}>
            <Autocomplete
              disablePortal
              options={_drivers.filter(x => x.StaffID !== swapRow.StaffID).map(r => ({
                label: getDriverName(r), id: r.StaffID, number: r.CurrentNumber, driver: r
              }))}
              value={swapDriver}
              sx={{ width: 240, m: 0, display: "inline-block" }}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onChange={ (e, nv) => setSwapDriver(nv)}
              renderInput={(params) => <TextField {...params} label="Swap with" autoComplete="off" />}
            />
          </Grid>
          <Grid item style={{ flex: 1 }}>
            {
              swapDriverUpdated?.TeamID && (
                <TeamName
                  TeamID={swapDriverUpdated?.TeamID}
                  type="posinteam"
                  PosInTeam={swapDriverUpdated?.PosInTeam}
                  description={`Contract until ${swapDriverUpdated.EndSeason}`}
                />
              )
            }
          </Grid>
        </Grid>
        <Divider variant="fullWidth" sx={{ my: 1 }} />
        <Grid direction="row" container spacing={1}>
          <Grid item>
            <Button color="error" variant="contained" sx={{ m: 1 }} onClick={() => {
              fireDriverContract(ctx, swapRow.StaffID);
              refresh();
            }}>Fire {getDriverName(swapRow)}</Button>
          </Grid>
          <Grid item>
            <Button color="secondary" variant="contained" sx={{ m: 1 }} onClick={() => {
              if (swapDriver && (swapRow.StaffID !== swapDriver.id)) {
                if (swapRow.StaffType === swapRow.StaffType) {
                  if (swapRow.StaffType === 0 && !swapDriver.number) {
                    assignRandomRaceNumber(ctx, swapDriver.id);
                  }
                  swapContracts(swapRow, swapDriver.driver, false);
                  _refresh();
                }
                refresh();
              }
            }} disabled={!swapDriver || (swapRow.StaffID === swapDriver.id)}>Temporary Swap</Button>
          </Grid>
          <Grid item>
            <Button color="warning" variant="contained" sx={{ m: 1 }} onClick={() => {
              if (swapDriver && (swapRow.StaffID !== swapDriver.id)) {
                if (swapRow.StaffType === swapRow.StaffType) {
                  if (swapRow.StaffType === 0 && !swapDriver.number) {
                    assignRandomRaceNumber(ctx, swapDriver.id);
                  }
                  swapContracts(swapRow, swapDriver.driver, true);
                  _refresh();
                }
                refresh();
              }
            }} disabled={!swapDriver || (swapRow.StaffID === swapDriver.id)}>Permanent Swap</Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  )
}