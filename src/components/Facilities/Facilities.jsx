import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import {Tab, Tabs} from "@mui/material";
import {DataGrid, GridActionsCellItem} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {DatabaseContext, MetadataContext} from "../Contexts";
import {TeamName} from "../Localization/Localization";

export const BuildingsCategorized = [
  {
    id: 0,
    category: "Car Development",
    buildings: [
      {id: 3, name: "Factory"}, // [Building_Factory0]
      {id: 2, name: "Design Centre"}, // [Building_DesignCentre0]
      {id: 5, name: "Wind Tunnel"}, // [Building_WindTunnel0]
      {id: 6, name: "CFD Simulator"}, // [Building_CFDSim0]
      {id: 7, name: "Suspension Sim"}, // [Building_SuspensionSim0]
      {id: 8, name: "Car Part Test"}, // [Building_TestAndDevCentre0]
    ],
  },
  {
    id: 1,
    category: "Staff",
    buildings: [
      {id: 9, name: "Team Hub"}, // [Building_StaffFacility0]
      {id: 14, name: "Scouting Dept"}, // [Building_ScoutingSubDepartment0]
      {id: 4, name: "Race Simulator"}, // [Building_DriverInLoopSimulator0]
      {id: 16, name: "Health Centre"}, // [Building_MedicalBayUpgrade0]
    ],
  },
  {
    id: 2,
    category: "Operations",
    buildings: [
      {id: 15, name: "Board Room"}, // [Building_BoardroomUpgrade0]
      {id: 13, name: "Hospitality Area"}, // [Building_UpgradedHospitality0]
      {id: 1, name: "Weather Centre"}, // [Building_DataCentre0]
      {id: 10, name: "Helipad"}, // [Building_Helipad0]
      {id: 11, name: "Memorabilia"}, // [Building_TrophyRoom0]
      {id: 12, name: "Tour Centre"}, // [Building_TourCentre0]
    ],
  },
]
export default function Facilities() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [buildings, setBuildings] = useState([]);
  const [partPanel, setPartPanel] = useState(0);

  const BuildingsCategorizedPage = BuildingsCategorized[partPanel].buildings;



  useEffect(() => {
    const buildings = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
    try {
      let [{ columns, values }] = database.exec(
        `SELECT Buildings_HQ.*, Buildings.*, 
            NextLevel.BuildingID as NextBuildingID, PrevLevel.BuildingID as PrevBuildingID, NextLevel.ConstructionWork as NextConstructionWork FROM Buildings_HQ 
            LEFT JOIN Buildings ON Buildings_HQ.BuildingID = Buildings.BuildingID
            LEFT JOIN Buildings as NextLevel ON Buildings.Type = NextLevel.Type AND Buildings.UpgradeLevel + 1 = NextLevel.UpgradeLevel
            LEFT JOIN Buildings as PrevLevel ON Buildings.Type = PrevLevel.Type AND Buildings.UpgradeLevel - 1 = PrevLevel.UpgradeLevel
            `
      );
      for(const r of values) {
        let row = {};
        r.map((x, _idx) => {row[columns[_idx]] = x});
        buildings[row.TeamID]["building_" + row.BuildingType] = row;
        buildings[row.TeamID]["UpgradeLevel_" + row.BuildingType] = row.UpgradeLevel;
        buildings[row.TeamID]["DegradationValue_" + row.BuildingType] = row.DegradationValue;
      }
      setBuildings(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
          teamIndex => ({
            id: teamIndex,
            TeamID: teamIndex,
            ...buildings[teamIndex]
          })
        )
      );

    } catch {

    }

  }, [database, updated])

  const columns = [];
  for(const stat of BuildingsCategorizedPage) {
    columns.push({
      field: `UpgradeLevel_` + stat.id,
      headerName: stat.name,
      width: 120,
      type: 'singleSelect',
      align: 'right',
      headerAlign: 'right',
      valueOptions: [
        {value: 0, label: "Not Built"},
        {value: 1, label: "Lv 1"},
        {value: 2, label: "Lv 2"},
        {value: 3, label: "Lv 3"},
        {value: 4, label: "Lv 4"},
        {value: 5, label: "Lv 5"},
      ],
      valueGetter: ({value}) => Number(value),
      renderCell: ({row, value}) => {
        const b = row["building_" + stat.id];
        return (
          <div style={{ color: `hsl(${value * 50}, 75%, 60%)`, paddingRight: 6, textAlign: "right"}}>
            {value ? "▰▰▰▰▰".slice(0, value) : "None"}
            <br />
            <span style={{ fontSize: 12 }}>{
              [
                "",
                `🡹 ${b.WorkDone}%`,
                "-",
                `🗘 ${b.WorkDone}/${b.RefurbishWork}`,
                `🡹 ${b.WorkDone}/${b.NextConstructionWork}`, // next level
              ][b.BuildingState]
            }</span>
          </div>
        )
      },
      editable: true,
    })
    columns.push({
      field: `DegradationValue_` + stat.id,
      headerName: "%",
      width: 80,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueGetter: ({value}) => Number(value).toFixed(3),
      renderCell: ({row, value}) => {
        const b = row["building_" + stat.id];
        return (
          <div style={{ textAlign: "right", paddingRight: 6, fontVariantNumeric: 'tabular-nums' }}>
            <p>
              {Number(value * 100).toFixed(1) + "%"}
            </p>
            <div>
              <GridActionsCellItem
                icon={<KeyboardDoubleArrowUpIcon />}
                style={{ width: 18, height: 18 }}
                disabled={!b.NextBuildingID}
                label="Upgrade"
                onClick={() => {
                  database.exec(`UPDATE Buildings_HQ SET BuildingID = :value WHERE TeamID = :teamID AND BuildingType = :bType`, {
                    ":teamID": row.TeamID,
                    ":bType": stat.id,
                    ":value": b.NextBuildingID,
                  })
                  if (b.UpgradeLevel === 4 && b.BuildingState === 4) {
                    database.exec(
                      `UPDATE Buildings_HQ SET BuildingState = 2, DegradationValue = 1, WorkDone = 0 WHERE TeamID = :teamID AND BuildingType = :bType`, {
                        ":teamID": row.TeamID,
                        ":bType": stat.id,
                      })
                  }
                  refresh();
                }}
              />
              <GridActionsCellItem
                icon={<RefreshIcon />}
                disabled={value >= 1}
                style={{ width: 18, height: 18 }}
                label="Refurbish"
                onClick={() => {
                  database.exec(`UPDATE Buildings_HQ SET DegradationValue = :value WHERE TeamID = :teamID AND BuildingType = :bType`, {
                    ":teamID": row.TeamID,
                    ":bType": stat.id,
                    ":value": 1,
                  })
                  refresh();
                }}
              />
              <GridActionsCellItem
                icon={<KeyboardDoubleArrowDownIcon />}
                style={{ width: 18, height: 18 }}
                disabled={!b.PrevBuildingID}
                label="Downgrade"
                onClick={() => {
                  database.exec(`UPDATE Buildings_HQ SET BuildingID = :value WHERE TeamID = :teamID AND BuildingType = :bType`, {
                    ":teamID": row.TeamID,
                    ":bType": stat.id,
                    ":value": b.PrevBuildingID,
                  })
                  refresh();
                }}
              />
            </div>
          </div>

        )
      },
      editable: true,
    })
  }




  return (
    <div>
      <Tabs value={partPanel} onChange={(event, newValue) => {
        setPartPanel(newValue);
      }} aria-label="basic tabs example">
        {BuildingsCategorized.map(p => <Tab label={p.category} key={p.id} />)}
      </Tabs>
      <DataGrid
        rows={buildings}
        getRowId={r => r.TeamID}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          for (const stat of BuildingsCategorizedPage) {
            if (newRow['DegradationValue_' + stat.id] !== oldRow['DegradationValue_' + stat.id]) {
              database.exec(
                `UPDATE Buildings_HQ SET DegradationValue = :value WHERE TeamID = :teamID AND BuildingType = :Type`, {
                  ":teamID": newRow.TeamID,
                  ":value": newRow['DegradationValue_' + stat.id],
                  ":Type": newRow['building_' + stat.id].BuildingType,
                })
            }
            if (newRow['UpgradeLevel_' + stat.id] !== oldRow['UpgradeLevel_' + stat.id]) {
              const newBuildingID = newRow['building_' + stat.id].BuildingType * 10 + newRow['UpgradeLevel_' + stat.id];
              database.exec(
                `UPDATE Buildings_HQ SET BuildingID = :value WHERE TeamID = :teamID AND BuildingType = :Type`, {
                  ":teamID": newRow.TeamID,
                  ":value": newBuildingID,
                  ":Type": newRow['building_' + stat.id].BuildingType,
                })
              if (newRow['UpgradeLevel_' + stat.id] === 5 && newRow['building_' + stat.id].BuildingState === 4) {
                database.exec(
                  `UPDATE Buildings_HQ SET BuildingState = 2, DegradationValue = 1, WorkDone = 0 WHERE TeamID = :teamID AND BuildingType = :Type`, {
                    ":teamID": newRow.TeamID,
                    ":Type": newRow['building_' + stat.id].BuildingType,
                  })
              }
            }
          }
          refresh();
          return newRow;
        }}
        columns={[
          {
            field: 'id',
            headerName: "#",
            width: 50,
          },
          {
            field: 'TeamID',
            headerName: "Team",
            width: 120,
            renderCell: ({ value }) => <TeamName TeamID={value} type="fanfare" />,
          },
          ...columns,
        ]}
        hideFooter
      />
    </div>
  );
}