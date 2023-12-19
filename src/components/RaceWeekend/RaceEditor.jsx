import {getDriverName} from "@/js/localization";
import {Button, ButtonGroup, Grid, Typography} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {teamNames} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import {PartNames} from "../Parts/consts";


const affectedCarIndexTables = [
  `Save_RaceSimCars`,
  `Save_RaceSimCars_Incident`,
  `Save_RaceSimCars_Misc`,
  `Save_RaceSimCars_Overtake`,
  `Save_SimpleSimCars`,
  `Save_TimingManager_Laps`,
  `Save_TimingManager_Sectors`,
  `Save_TimingManager_TrackCheckpoints`,
]

const affectedCarIDTables = [
  `Save_CarAI_Race`,
]


const Tyres = ["", "FrontLeft", "FrontRight", "BackLeft", "BackRight"];
const DamageParts = ["Body", "FrontWing", "RearWing", "SidePods", "Floor", "Suspension"];

export default function RaceEditor() {

  const database = useContext(DatabaseContext);
  const env = useContext(EnvContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);

  const [rows, setRows] = useState([]);
  const [raceState, setRaceState] = useState({});
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const {driverMap, teamMap, weekend, player, races } = basicInfo;

  const swapPositions = (driver1, driver2) => {
    const driver1ID = driver1.CarIndex;
    const driver2ID = driver2.CarIndex;
    if (driver1ID !== driver2ID) {
      // const [{ values: [[Fuel1, CurrentActiveTyreID1]] }] = database.exec(`SELECT Fuel, CurrentActiveTyreID FROM Save_RaceSimCars WHERE CarIndex = ${driver1ID}`);
      // const [{ values: [[Fuel2, CurrentActiveTyreID2]] }] = database.exec(`SELECT Fuel, CurrentActiveTyreID FROM Save_RaceSimCars WHERE CarIndex = ${driver2ID}`);

      for(const table of affectedCarIndexTables) {
        database.exec(`UPDATE ${table} SET CarIndex = 200 WHERE CarIndex = ${driver1ID}`);
        database.exec(`UPDATE ${table} SET CarIndex = ${driver1ID} WHERE CarIndex = ${driver2ID}`);
        database.exec(`UPDATE ${table} SET CarIndex = ${driver2ID} WHERE CarIndex = 200`);
      }
      for(const table of affectedCarIDTables) {
        database.exec(`UPDATE ${table} SET CarID = 200 WHERE CarID = ${driver1ID}`);
        database.exec(`UPDATE ${table} SET CarID = ${driver1ID} WHERE CarID = ${driver2ID}`);
        database.exec(`UPDATE ${table} SET CarID = ${driver2ID} WHERE CarID = 200`);
      }

      database.exec(`UPDATE Save_RaceSimCars SET CurrentActiveTyreID = ${driver1.CurrentActiveTyreID}, Fuel = ${driver1.Fuel} WHERE CarIndex = ${driver1ID}`);
      database.exec(`UPDATE Save_RaceSimCars SET CurrentActiveTyreID = ${driver2.CurrentActiveTyreID}, Fuel = ${driver2.Fuel} WHERE CarIndex = ${driver2ID}`);

      refresh();
    }
  }


  useEffect(() => {
    let columns, values;
    try {
      let r = database.exec(`
        SELECT * FROM Save_RaceSimCars 
        LEFT JOIN Save_RaceSimCars_Parts ON 
            Save_RaceSimCars.CarIndex = Save_RaceSimCars_Parts.CarIndex
        LEFT JOIN Save_CarConfig ON 
            Save_RaceSimCars.CarIndex = (Save_CarConfig.TeamID * 2 + Save_CarConfig.LoadoutID - 2)
        LEFT JOIN Save_CarTyreAllocation ON 
            Save_RaceSimCars.CarIndex = Save_CarTyreAllocation.CarID AND 
            Save_RaceSimCars.CurrentActiveTyreID = Save_CarTyreAllocation.TyreSetID
        ORDER BY RacePosition ASC`)
      let _rows = [];
      if (r.length) {
        [{columns, values}] = r;
        for (const r of values) {
          let row = {};
          r.map((x, _idx) => {
            row[columns[_idx]] = x
          });
          row.id = row.CarIndex;
          row.TeamID = (row.CarIndex >> 1) + 1;
          row.TeamCarID = (row.CarIndex & 1) + 1;
          _rows.push(row);
        }
      }

      let raceState = {};
      r = database.exec(`SELECT * FROM Save_RaceControl`)
      if (r.length) {
        [{columns, values}] = r;
        for (const r of values) {
          r.map((x, _idx) => {raceState[columns[_idx]] = x});
        }
      }
      r = database.exec(`SELECT * FROM Save_RaceSimManager`)
      if (r.length) {
        [{columns, values}] = r;
        for (const r of values) {
          r.map((x, _idx) => {raceState[columns[_idx]] = x});
        }
      }

      console.log(raceState);

      setRaceState(raceState);
      setRows(_rows);
    } catch {

    }

  }, [database, updated, ])


  let RacePositions = {};
  for(const row of rows) RacePositions[row.RacePosition] = row;


  if (weekend.WeekendStage < 8) {
    return (
      <div>
       <span style={{ color: "yellow", fontSize: 18 }}>
          You are not in a Race or Sprint.
        </span>
        <br/>
      </div>
    )
  }
  return (
    <div>
      <Typography variant="h5" component="h5">
        Race Control
      </Typography>
      <Grid container spacing={2} alignItems="center" sx={{py: 2}}>
        <Grid item>
          <Button
            variant="contained"
            disabled={raceState.RaceEventFlags === 0}
            onClick={() => {
              database.exec('UPDATE Save_RaceSimManager SET RaceEventFlags = 0, SafetyCarState = 0');
              refresh();
            }}
          >
            Clear All
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="error"
            disabled={(raceState.RaceEventFlags & (256)) !== 0}
            onClick={() => {
              database.exec('UPDATE Save_RaceSimManager SET RaceEventFlags = 256');
              refresh();
            }}
          >
            Red Flag
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="warning"
            disabled={(raceState.RaceEventFlags & (64 | 256)) !== 0}
            onClick={() => {
              database.exec(`UPDATE Save_RaceSimManager SET SafetyCarState = 2, RaceEventFlags = 2115; UPDATE Save_RaceControl SET SafetyCarReleasedSimTime = ${raceState.SimTime}`);
              refresh();
            }}
          >
            Deploy Safety Car
          </Button>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="warning"
            disabled={!(
              (raceState.RaceEventFlags & 64) === 64
              &&
              raceState.SafetyCarReleasedSimTime > 0
              &&
              (raceState.SafetyCarState === 5 || raceState.SafetyCarState === 2)
            )}
            onClick={() => {
              database.exec('UPDATE Save_RaceSimManager SET SafetyCarState = 4');
              refresh();
            }}
          >
            End Safety Car
          </Button>
        </Grid>
        <Grid item>
          <ButtonGroup
            variant="contained"
            color="warning"
            disabled={(raceState.RaceEventFlags & (64 | 256)) !== 0}
          >
            <Button
              onClick={() => {
                database.exec(`UPDATE Save_RaceSimManager SET RaceEventFlags = 7`); // won't end
                refresh();
              }}
            >
              VSC
            </Button>
            <Button
              onClick={() => {
                database.exec(`UPDATE Save_RaceSimManager SET RaceEventFlags = 4`);
                database.exec(`UPDATE Save_RaceControl SET VscEnding = 1, VscEndSimTime = ${raceState.SimTime + 60}`);
                refresh();
              }}
            >
              60s
            </Button>
            <Button
              onClick={() => {
                database.exec(`UPDATE Save_RaceSimManager SET RaceEventFlags = 4`);
                database.exec(`UPDATE Save_RaceControl SET VscEnding = 1, VscEndSimTime = ${raceState.SimTime + 120}`);
                refresh();
              }}
            >
              120s
            </Button>
            <Button
              onClick={() => {
                database.exec(`UPDATE Save_RaceSimManager SET RaceEventFlags = 4`);
                database.exec(`UPDATE Save_RaceControl SET VscEnding = 1, VscEndSimTime = ${raceState.SimTime + 120}`);
                refresh();
              }}
            >
              180s
            </Button>
          </ButtonGroup>
        </Grid>
        <Grid item>
          <Button
            variant="outlined"
            disabled={(raceState.RaceEventFlags & 256) === 256}
            onClick={() => {
              database.exec('UPDATE Save_RaceSimCars_PitStop SET PitStopState = 0 WHERE PitLaneReason != 5'); // maybe = 8?
              refresh();
            }}
          >
            Force Cars Out of Pit
          </Button>
        </Grid>
      </Grid>

      <p style={{color: "yellow", fontSize: 18, marginBottom: 10}}>
        When cars stuck in the pit after swapping positions, try save again and use "Force cars out of Pit".
      </p>
      <DataGrid
        rows={rows}
        getRowId={r => r.id}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          if (newRow.Fuel !== oldRow.Fuel) {
            database.exec(`UPDATE Save_RaceSimCars SET Fuel = :fuel WHERE CarIndex = :carIndex`, {
              ":fuel": newRow.Fuel,
              ":carIndex": newRow.CarIndex,
            })
          }

          for (const part of DamageParts) {
            if (newRow[`${part}DamageLevel`] !== oldRow[`${part}DamageLevel`]) {
              database.exec(`UPDATE Save_RaceSimCars_Parts SET ${part}DamageLevel = :wear WHERE CarIndex = :CarID`, {
                ":wear": newRow[`${part}DamageLevel`],
                ":CarID": newRow.CarIndex,
              })
            }
          }

          for (let tyreId = 1; tyreId <= 4; tyreId++) {
            if (newRow[`Tyre${tyreId}Condition`] !== oldRow[`Tyre${tyreId}Condition`]) {
              let tyreName = Tyres[tyreId];
              database.exec(`UPDATE Save_CarTyreAllocation SET ${tyreName}Wear = :wear WHERE CarId = :CarID AND TyreSetID = :TyreSetID`, {
                ":wear": newRow[`${tyreName}Wear`],
                ":CarID": newRow.CarIndex,
                ":TyreSetID": newRow.CurrentActiveTyreID,
              })
              database.exec(`UPDATE Save_RaceSimCars_Parts SET Tyre${tyreId}Condition = :wear WHERE CarIndex = :CarID`, {
                ":wear": newRow[`${tyreX}${tyreY}Wear`],
                ":CarID": newRow.CarIndex,
              })
            }
          }
          return newRow;
        }}
        columns={[
          {
            field: 'RacePosition',
            headerName: "#",
            valueGetter: ({value}) => value + 1,
            renderCell: ({value, row}) => {
              if (row.RaceCompleteState === 3) return "DNF";
              return value;
            },
            width: 70,
          },
          {
            field: 'TeamID',
            headerName: "Team / Driver",
            width: 140,
            renderCell: ({value, row}) => {
              return (
                <div style={{color: `rgb(var(--team${value}-triplet)`}}>
                  {teamNames(value, metadata.version)} {row.TeamCarID}
                  <div>{getDriverName(driverMap[teamMap[row.TeamID][`Driver${row.TeamCarID}ID`]])}</div>
                </div>
              )
            }
          },
          {
            field: 'LapCount',
            headerName: "Lap",
            width: 70,
          },
          {
            field: 'Fuel',
            headerName: "Fuel / L",
            valueGetter: ({value}) => Number(value.toFixed(6)),
            type: "number",
            renderCell: ({value}) => value.toFixed(4),
            width: 120,
            editable: true,
          },
          ...[1, 2, 3, 4].map(tyre => (
            {
              field: Tyres[tyre] + 'Wear',
              headerName: Tyres[tyre],
              valueGetter: ({value}) => Number(value.toFixed(6)),
              type: "number",
              align: 'right',
              headerAlign: 'right',
              renderCell: ({value}) => (100 * value).toFixed(2) + "%",
              width: 100,
              editable: true,
            }
          )),
          ...[3, 4, 5, 6, 7, 8].map(idx => (
            {
              field: DamageParts[idx - 3] + "DamageLevel",
              headerName: PartNames[idx],
              type: 'singleSelect',
              align: 'right',
              headerAlign: 'right',
              valueOptions: [
                {value: 0, label: "Good"},
                {value: 1, label: "Minor"},
                {value: 2, label: "Major"},
                {value: 3, label: "Fatal"},
              ],
              width: 100,
              editable: true,
              renderCell: ({value, formattedValue}) => {
                return <span style={{
                  color: [
                    "#555",
                    "#bbbb33",
                    "#ff9933",
                    "#ff3333"][value]
                }}>{formattedValue}</span>
              }
            }
          )),
          {
            field: '__',
            headerName: "",
            flex: 1,
          },
          {
            field: '_',
            headerName: "Position Swap",
            width: 140,
            renderCell: ({row}) => {
              return (
                <div>
                  <Button
                    disabled={(!RacePositions[row.RacePosition - 1]) || RacePositions[row.RacePosition - 1].RaceCompleteState !== 0 || row.RaceCompleteState !== 0}
                    onClick={
                      () => swapPositions(row, RacePositions[row.RacePosition - 1])
                    }>▲</Button>
                  <Button
                    disabled={(!RacePositions[row.RacePosition + 1]) || RacePositions[row.RacePosition + 1].RaceCompleteState !== 0 || row.RaceCompleteState !== 0}
                    onClick={
                      () => swapPositions(row, RacePositions[row.RacePosition + 1])
                    }>▼</Button>
                </div>
              )
            }
          },
        ]}
        hideFooter
      />
    </div>
  );
}