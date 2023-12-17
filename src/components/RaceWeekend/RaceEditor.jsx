import {getDriverName} from "@/js/localization";
import {Button} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {teamNames} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";


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

export default function RaceEditor() {

  const database = useContext(DatabaseContext);
  const env = useContext(EnvContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);

  const [rows, setRows] = useState([]);
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


          for (const tyreX of ["Front", "Back"]) {
            for (const tyreY of ["Left", "Right"]) {
              if (newRow[`${tyreX}${tyreY}Wear`] !== oldRow[`${tyreX}${tyreY}Wear`]) {
                database.exec(`UPDATE Save_CarTyreAllocation SET ${tyreX}${tyreY}Wear = :wear WHERE CarId = :CarID AND TyreSetID = :TyreSetID`, {
                  ":wear": newRow[`${tyreX}${tyreY}Wear`],
                  ":CarID": newRow.CarIndex,
                  ":TyreSetID": newRow.CurrentActiveTyreID,
                })
              }
            }
          }
          return newRow;
        }}
        columns={[
          {
            field: 'RacePosition',
            headerName: "#",
            valueGetter: ({ value }) => value + 1,
            renderCell: ({ value, row }) => {
              if (row.RaceCompleteState === 3) return "DNF";
              return value;
            },
            width: 70,
          },
          {
            field: 'TeamID',
            headerName: "Team / Driver",
            width: 140,
            renderCell: ({ value, row }) => {
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
            valueGetter: ({ value }) => Number(value.toFixed(6)),
            type: "number",
            renderCell: ({ value }) => value.toFixed(4),
            width: 120,
            editable: true,
          },
          {
            field: 'FrontLeftWear',
            headerName: "Front Left",
            valueGetter: ({ value }) => Number(value.toFixed(6)),
            type: "number",
            renderCell: ({ value }) => (100 * value).toFixed(2) + "%",
            width: 120,
            editable: true,
          },
          {
            field: 'FrontRightWear',
            headerName: "Front Right",
            valueGetter: ({ value }) => Number(value.toFixed(6)),
            type: "number",
            renderCell: ({ value }) => (100 * value).toFixed(2) + "%",
            width: 120,
            editable: true,
          },
          {
            field: 'BackLeftWear',
            headerName: "Rear Left",
            valueGetter: ({ value }) => Number(value.toFixed(6)),
            type: "number",
            renderCell: ({ value }) => (100 * value).toFixed(2) + "%",
            width: 120,
            editable: true,
          },
          {
            field: 'BackRightWear',
            headerName: "Rear Right",
            valueGetter: ({ value }) => Number(value.toFixed(6)),
            type: "number",
            renderCell: ({ value }) => (100 * value).toFixed(2) + "%",
            width: 120,
            editable: true,
          },
          {
            field: '__',
            headerName: "",
            flex: 1,
          },
          {
            field: '_',
            headerName: "Position Swap",
            width: 140,
            renderCell: ({ row }) => {
              return (
                <div>
                  <Button
                    disabled={(!RacePositions[row.RacePosition - 1]) || RacePositions[row.RacePosition - 1].RaceCompleteState !== 0 || row.RaceCompleteState !== 0 }
                    onClick={
                      () => swapPositions(row, RacePositions[row.RacePosition - 1])
                    }>▲</Button>
                  <Button
                    disabled={(!RacePositions[row.RacePosition + 1]) || RacePositions[row.RacePosition + 1].RaceCompleteState !== 0 || row.RaceCompleteState !== 0 }
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