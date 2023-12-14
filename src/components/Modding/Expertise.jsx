import {Button, Tabs} from "@mui/material";
import Tab from "@mui/material/Tab";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {teamNames} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext, VersionContext} from "../Contexts";

const PartStats2023 = [
  {
    id: 0,
    category: "Powertrains",
    stats: [
      {id: "0_6", digits: 0, displayDigits: 0, name: "Fuel Efficiency"},
      {id: "0_10", digits: 0, displayDigits: 0, name: "Power"},
      {id: "0_11", digits: 0, displayDigits: 0, name: "Power Loss Thr"},
      {id: "0_12", digits: 0, displayDigits: 0, name: "Wear Resist"},
      {id: "0_14", digits: 0, displayDigits: 0, name: "Thermal Resist"},
      {id: "1_15", digits: 0, displayDigits: 0, name: "ERS Lifespan"},
      {id: "2_15", digits: 0, displayDigits: 0, name: "Gearbox Lifespan"},
    ],
  },
  {
    id: 1,
    category: "Front Wing",
    stats: [
      {id: "4_0", digits: 4, displayDigits: 4, name: "Airflow Front"},
      {id: "4_1", digits: 4, displayDigits: 4, name: "Air Sensitivity"},
      {id: "4_2", digits: 4, displayDigits: 4, name: "Brake Cooling"},
      {id: "4_7", digits: 4, displayDigits: 4, name: "Low Speed"},
      {id: "4_8", digits: 4, displayDigits: 4, name: "Med Speed"},
      {id: "4_9", digits: 4, displayDigits: 4, name: "High Speed"},
    ],
  },
  {
    id: 2,
    category: "Rear Wing",
    stats: [
      {id: "5_1", digits: 4, displayDigits: 4, name: "Air Sensitivity"},
      {id: "5_3", digits: 4, displayDigits: 4, name: "DRS Delta"},
      {id: "5_4", digits: 4, displayDigits: 4, name: "Drag Reduction"},
      {id: "5_7", digits: 4, displayDigits: 4, name: "Low Speed"},
      {id: "5_8", digits: 4, displayDigits: 4, name: "Med Speed"},
      {id: "5_9", digits: 4, displayDigits: 4, name: "High Speed"},
    ],
  },
  {
    id: 3,
    category: "Bodyworks",
    stats: [
      {id: "3_4", digits: 4, displayDigits: 4, name: "Drag Reduction"},
      {id: "3_5", digits: 4, displayDigits: 4, name: "Engine Cooling"},
      {id: "3_13", digits: 4, displayDigits: 4, name: "Airflow Middle"},
    ],
  },
  {
    id: 4,
    category: "Sidepods",
    stats: [
      {id: "6_0", digits: 4, displayDigits: 4, name: "Airflow Front"},
      {id: "6_4", digits: 4, displayDigits: 4, name: "Drag Reduction"},
      {id: "6_5", digits: 4, displayDigits: 4, name: "Engine Cooling"},
      {id: "6_13", digits: 4, displayDigits: 4, name: "AirFlowMiddle"},
    ],
  },
  {
    id: 5,
    category: "Underfloor",
    stats: [
      {id: "7_1", digits: 4, displayDigits: 4, name: "Air Sensitivity"},
      {id: "7_4", digits: 4, displayDigits: 4, name: "Drag Reduction"},
      {id: "7_7", digits: 4, displayDigits: 4, name: "Low Speed"},
      {id: "7_8", digits: 4, displayDigits: 4, name: "Med Speed"},
      {id: "7_9", digits: 4, displayDigits: 4, name: "High Speed"},
    ],
  },
  {
    id: 6,
    category: "Suspension",
    stats: [
      {id: "8_0", digits: 4, displayDigits: 4, name: "Air Front"},
      {id: "8_2", digits: 4, displayDigits: 4, name: "Brake Cooling"},
      {id: "8_4", digits: 4, displayDigits: 4, name: "Drag Reduction"},
      {id: "8_7", digits: 4, displayDigits: 4, name: "Low Speed"},
      {id: "8_8", digits: 4, displayDigits: 4, name: "Med Speed"},
      {id: "8_9", digits: 4, displayDigits: 4, name: "High Speed"},
    ],
  },
];

const PartStatsList = {
  2: PartStats2023,
  3: PartStats2023
}

export default function ExpertiseView() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [partStats, setPartStats] = useState([]);
  const [partPanel, setPartPanel] = useState(1);

  const PartStatsListPage = PartStatsList[version][partPanel].stats;



  useEffect(() => {
    const partStats = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
    try {
      let [{ columns, values }] = database.exec(
        version === 2 ? (
          `Select TeamID, PartType, StatID, Expertise, NextSeasonExpertise, SeasonStartExpertise from Parts_TeamExpertise`
        ) : (
          `Select TeamID, PartType, PartStat, Expertise, NextSeasonExpertise, SeasonStartExpertise from Parts_TeamExpertise`
        )
      );
      for(const r of values) {
        partStats[r[0] /* TeamID */ ]["stat_" + r[1] + "_" + r[2] /* PartStat */ ] = r[3];
        // partStats[r[0] /* TeamID */ ]["stat_" + r[1] + "_" + r[2] /* PartStat */ ] = r[4];
        partStats[r[0] /* TeamID */ ]["season_start_stat_" + r[1] + "_" + r[2] /* PartStat */ ] = r[5];
      }
      setPartStats(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
          teamIndex => ({
            id: teamIndex,
            TeamID: teamIndex,
            ...partStats[teamIndex]
          })
        )
      );

    } catch {

    }

  }, [database, updated])

  return (
    <div>
      <Tabs value={partPanel} onChange={(event, newValue) => {
        setPartPanel(newValue);
      }} aria-label="basic tabs example">
        {
          PartStatsList[version].map(p => (
            <Tab label={p.category} key={p.id} />
          ))
        }
      </Tabs>
      <DataGrid
        rows={partStats}
        getRowId={r => r.TeamID}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          for (const stat of PartStatsListPage) {
            const [partType, partStat] = stat.id.split("_");

            database.exec(
              version === 2 ? (
                `UPDATE Parts_TeamExpertise SET Expertise = :value WHERE TeamID = :teamID AND PartType = :partType AND StatID = :partStat`
              ) : (
                `UPDATE Parts_TeamExpertise SET Expertise = :value WHERE TeamID = :teamID AND PartType = :partType AND PartStat = :partStat`
              ), {
              ":teamID": newRow.TeamID,
              ":value": newRow['stat_' + stat.id],
              ":partType": partType,
              ":partStat": partStat,
            })
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
            renderCell: ({ value }) => {
              return (
                <div style={{color: `rgb(var(--team${value}-triplet)`}}>
                  {teamNames(value, metadata.version)}
                  <div>
                    <div style={{
                      width: 12, height: 12, borderRadius: 6,
                      display: "inline-block", marginRight: 3,
                      background: `var(--team${value}-fanfare1)`,
                    }}/>
                    <div style={{
                      width: 12, height: 12, borderRadius: 6,
                      display: "inline-block", marginRight: 3,
                      background: `var(--team${value}-fanfare2)`,
                    }}/>
                  </div>
                </div>
              )
            }
          },
          ...PartStatsListPage.map(stat => ({
            field: `stat_` + stat.id,
            headerName: stat.name,
            type: 'number',
            width: 140,
            valueGetter: ({value}) => Number(value).toFixed(stat.digits),
            renderCell: ({row, value}) => {
              const delta = value - row["season_start_stat_" + stat.id];
              return (
                <div style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
                  <span>{Number(value).toFixed(stat.displayDigits)}</span>
                  <br />
                  {
                    (version !== 2 && delta) ? (
                      <span style={{
                        fontSize: "90%",
                        color: (stat.negative ? delta < 0 : delta >= 0) ? "lightgreen" : "pink"
                      }}>{
                        delta > 0 ? "▲" : "▼"
                      } {Number(Math.abs(delta)).toFixed(3)}</span>
                    ) : (
                      "-"
                    )
                  }
                </div>
              )
            },
            editable: true,
          })),
          {
            field: '_',
            headerName: '',
            flex: 1,
          },
          {
            field: '__',
            headerName: 'Commands',
            width: 140,
            renderCell: ({ row }) => {
              return (
                <div>
                  <Button variant="outlined" color="warning" onClick={
                    () => {
                      for (const stat of PartStatsListPage) {
                        const [partType, partStat] = stat.id.split("_");
                        database.exec(`UPDATE Parts_TeamExpertise SET Expertise = :value WHERE PartType = :partType AND PartStat = :partStat`, {
                          ":value": row['stat_' + stat.id],
                          ":partType": partType,
                          ":partStat": partStat,
                        })
                      }
                      refresh();
                    }
                  }>equalize</Button>
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