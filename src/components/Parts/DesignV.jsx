import {Tab, Tabs} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {teamNames} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "../Contexts";
import {PartStatsCategorizedV} from "./consts";

export default function DesignView() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [partStats, setPartStats] = useState([]);
  const [partPanel, setPartPanel] = useState(1);

  const PartInfo = PartStatsCategorizedV[version][partPanel];
  const PartStatsCategorizedPage = PartStatsCategorizedV[version][partPanel].stats;
  const PartTypePage = PartStatsCategorizedV[version][partPanel].parts;



  useEffect(() => {
    const partStats = {};
    try {
      let DSVTable =  version === 2 ? "Parts_DesignStatValues" : "Parts_Designs_StatValues";
      let [{ columns, values }] = database.exec(
        `SELECT *, Parts_CarLoadout.TeamID as TeamID, Parts_CarLoadout.LoadOutID as LoadOutID, Parts_CarLoadout.DesignID as CL_DesignID, ${DSVTable}.Value as Value FROM Parts_CarLoadout 
LEFT JOIN (
    SELECT TeamID, PartType, MAX(DesignID) as LatestDesign FROM Parts_Designs WHERE ValidFrom <= ${basicInfo.player.CurrentSeason} AND (DayCompleted > 0 OR DayCreated < 0) GROUP BY TeamID, PartType
) as LatestDesign ON LatestDesign.TeamID = Parts_CarLoadout.TeamID AND LatestDesign.PartType = Parts_CarLoadout.PartType
LEFT JOIN Parts_Designs ON Parts_Designs.DesignID = COALESCE(Parts_CarLoadout.DesignID, LatestDesign.LatestDesign)
LEFT JOIN ${DSVTable} ON Parts_Designs.DesignID = ${DSVTable}.DesignID
LEFT JOIN Parts_Items ON Parts_Items.ItemID = Parts_CarLoadout.ItemID WHERE Parts_Designs.PartType IN (${PartTypePage.join(",")})`
      );

      let partRow = {};
      for(const r of values) {
        let row = {};
        r.map((x, _idx) => {row[columns[_idx]] = x});
        if (!partStats[row.TeamID * 2 + row.LoadOutID]) {
          partStats[row.TeamID * 2 + row.LoadOutID] = {};
        }
        const statId = version === 2 ? row.StatID : row.PartStat;
        partStats[row.TeamID * 2 + row.LoadOutID][`val_${row.PartType}_${statId}`] = row.Value;
        partStats[row.TeamID * 2 + row.LoadOutID][`condition_${row.PartType}`] = row.Condition;
        partStats[row.TeamID * 2 + row.LoadOutID][`knowledge_${row.PartType}`] = row.PartKnowledge;
        if (row.PartType !== 1 && row.PartType !== 2) {
          partRow[row.TeamID * 2 + row.LoadOutID] = {
            ...row,
            Part: {},
          };
        }

        partRow[row.TeamID * 2 + row.LoadOutID].Part[row.PartType] = row;
      }
      let loadouts = [];
      for(let teamId = 1; teamId <= 10; teamId++) {
        for(let loadout = 1; loadout <= 2; loadout++) {
          loadouts.push({
            id: teamId * 2 + loadout - 2,
            TeamID: teamId,
            CarID: loadout,
            ...partRow[teamId * 2 + loadout],
            ...partStats[teamId * 2 + loadout],
          });
        }
      }

      setPartStats(loadouts);

    } catch (e) {
      console.error(e);
    }

  }, [database, updated, partPanel])

  return (
    <div>
      <Tabs value={partPanel} onChange={(event, newValue) => {
        setPartPanel(newValue);
      }} aria-label="basic tabs example">
        {
          PartStatsCategorizedV[version].map(p => (
            <Tab label={p.category} key={p.id} />
          ))
        }
      </Tabs>
      <DataGrid
        key={partPanel}
        rows={partStats}
        getRowId={r => r.id}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          for (const partId of PartInfo.parts) {
            const part = newRow.Part[partId]
            if (oldRow['condition_' + partId] !== newRow['condition_' + partId]) {
              database.exec(`UPDATE Parts_Items SET Condition = :condition WHERE ItemID = :itemID`, {
                ":condition": newRow['condition_' + partId],
                ":itemID": part.ItemID,
              })
            }
            if (oldRow['condition_' + partId] !== newRow['condition_' + partId]) {
              database.exec(`UPDATE Parts_Items SET Condition = :condition WHERE ItemID = :itemID`, {
                ":condition": newRow['condition_' + partId],
                ":itemID": part.ItemID,
              })
            }
          }


          for (const stat of PartStatsCategorizedPage) {
            const [partType, partStat] = stat.id.split("_");
            const part = newRow.Part[partType]


            if (newRow['val_' + stat.id] !== oldRow['val_' + stat.id]) {
              database.exec(
                version === 2 ? (
                  `UPDATE Parts_DesignStatValues SET Value = :value WHERE DesignID = :designID AND StatID = :partStat`
                ) : (
                  `UPDATE Parts_Designs_StatValues SET Value = :value WHERE DesignID = :designID AND PartStat = :partStat`
                ), {
                  ":value": newRow['val_' + stat.id],
                  ":designID": part.DesignID,
                  ":partStat": partStat,
                })

            }
          }
          refresh();
          return newRow;
        }}
        columns={[
          {
            field: 'id',
            headerName: "#",
            width: 70,
          },
          {
            field: 'TeamID',
            headerName: "Team",
            width: 120,
            renderCell: ({ value, row }) => {
              return (
                <div style={{color: `rgb(var(--team${value}-triplet)`}}>
                  {teamNames(value, version)}
                  <div>
                    {row.DesignID ? `Design ${row.DesignID}` : "Not Installed"}
                  </div>
                </div>
              )
            }
          },
          {
            field: 'CarID',
            headerName: "Car",
            width: 120,
            renderCell: ({ value, row }) => {
              return (
                <div style={{color: `rgb(var(--team${row.TeamID}-triplet)`}}>
                  Car {row.CarID}
                  <div>
                    {row.DesignNumber ? `${PartInfo.prefix}-${row.DesignNumber}` : `Missing Part`}
                  </div>
                </div>
              )
            }
          },

          ...PartStatsCategorizedPage.filter(x => !x.hideInVersions || (!x.hideInVersions.includes(version)) ).map(stat => ({ // engine knowledge is meaningless
            field: `val_` + stat.id,
            headerName: stat.name,
            type: 'number',
            width: 120,
            valueGetter: ({value}) => Number(value).toFixed(stat.digits),
            renderCell: ({row, value}) => {
              return (
                <div style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
                  <span>{Number(row[`val_` + stat.id]).toFixed(stat.displayDigits)}</span>
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
          // {
          //   field: '__',
          //   headerName: 'Commands',
          //   width: 140,
          //   renderCell: ({row}) => {
          //     return (
          //       <div>
          //         <Button variant="outlined" color="warning" onClick={
          //           () => {
          //             for (const stat of PartStatsCategorizedPage) {
          //               const [partType, partStat] = stat.id.split("_");
          //               database.exec(`UPDATE Parts_TeamExpertise SET Expertise = :value WHERE PartType = :partType AND PartStat = :partStat`, {
          //                 ":value": row['val_' + stat.id],
          //                 ":partType": partType,
          //                 ":partStat": partStat,
          //               })
          //             }
          //             refresh();
          //           }
          //         }>equalize</Button>
          //       </div>
          //     )
          //   }
          // },
        ]}
        hideFooter
      />
    </div>
  );
}