import {Tabs, Typography} from "@mui/material";
import Tab from "@mui/material/Tab";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {getDriverName, teamNames} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext, VersionContext} from "../Contexts";
import {
  PartCalculationStatsV, PartFactorsV,
  PartStatsListV,
} from "./consts";

import {
  PartNames,
  statRenderer,
  unitValueToValue, valueToDeltaUnitValue
} from "./consts_2023";


export default function DesignView() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);

  const {driverMap, teamMap } = basicInfo;

  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [partStats, setPartStats] = useState([]);
  const [partPanel, setPartPanel] = useState(1);
  const [reverseContrib, setReverseContrib] = useState([]);

  const PartFactor = PartFactorsV[version];
  const PartStatsList = PartStatsListV[version];
  const PartInfo = PartStatsList[partPanel];
  const PartStatsListPage = PartStatsList[partPanel].stats;
  const PartTypePage = PartStatsList[partPanel].parts;


  const PartCalculationStats = PartCalculationStatsV[version];


  useEffect(() => {

    let reverseContribution = {};
    for (const stat of PartCalculationStats) {
      let totalValue = 0;
      for (const v of Object.keys(stat.contributors)) {
        totalValue += stat.contributors[v];
      }
      for (const v of Object.keys(stat.contributors)) {
        if (!reverseContribution[v]) {
          reverseContribution[v] = [];
        }
        reverseContribution[v].push({
          ...stat,
          contribution: stat.contributors[v] / totalValue
        })
      }
    }

    setReverseContrib(reverseContribution);
  }, [version])


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
        let carID = row.TeamID * 2 + row.LoadOutID;
        if (!partStats[carID]) {
          partStats[carID] = {};
        }
        const statId = version === 2 ? row.StatID : row.PartStat;
        partStats[carID][`val_${row.PartType}_${statId}`] = row.Value;
        partStats[carID][`unit_${row.PartType}_${statId}`] = row.UnitValue;
        partStats[carID][`condition_${row.PartType}`] = row.Condition;
        partStats[carID][`knowledge_${row.PartType}`] = row.PartKnowledge;
        if (row.PartType !== 1 && row.PartType !== 2) {
          partRow[carID] = {
            ...row,
            Part: {},
          };
        }

        partRow[carID].Part[row.PartType] = row;
      }
      let loadouts = [];
      for(let teamId = 1; teamId <= 10; teamId++) {
        for(let loadout = 1; loadout <= 2; loadout++) {
          loadouts.push({
            id: teamId * 2 + loadout - 2,
            TeamID: teamId,
            TeamCarID: loadout,
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

  console.log(reverseContrib);

  return (
    <div>
      <Tabs value={partPanel} onChange={(event, newValue) => {
        setPartPanel(newValue);
      }} aria-label="basic tabs example">
        {
          PartStatsList.map(p => (
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


          for (const stat of PartStatsListPage) {
            const [partType, partStat] = stat.id.split("_");
            const part = newRow.Part[partType]


            if (newRow['unit_' + stat.id] !== oldRow['unit_' + stat.id]) {
              const fn = (stat.unitValueToValue || unitValueToValue[partStat]);
              const resultValue = fn(newRow['unit_' + stat.id]);
              database.exec(
                version === 2 ? (
                  `UPDATE Parts_DesignStatValues SET UnitValue = :uvalue, Value = :value WHERE DesignID = :designID AND StatID = :partStat`
                ) : (
                  `UPDATE Parts_Designs_StatValues SET UnitValue = :uvalue, Value = :value WHERE DesignID = :designID AND PartStat = :partStat`
                ), {
                  ":uvalue": newRow['unit_' + stat.id],
                  ":value": resultValue,
                  ":designID": part.DesignID,
                  ":partStat": partStat,
                })

            }

            // const deltaFactor = stat.valueToDeltaUnitValue || valueToDeltaUnitValue[partStat];
            // const resultValue = oldRow['val_' + stat.id] + (newRow['unit_' + stat.id] - oldRow['unit_' + stat.id]) / deltaFactor;
            // database.exec(
            //   version === 2 ? (
            //     `UPDATE Parts_DesignStatValues SET UnitValue = UnitValue + :duvalue, Value = Value + :dvalue WHERE DesignID = :designID AND PartStat = :partStat`
            //   ) : (
            //     `UPDATE Parts_Designs_StatValues SET UnitValue = UnitValue + :duvalue, Value = Value + :dvalue WHERE DesignID = :designID AND PartStat = :partStat`
            //   ), {
            //     ":duvalue": newRow['unit_' + stat.id] - oldRow['unit_' + stat.id],
            //     ":dvalue": (newRow['unit_' + stat.id] - oldRow['unit_' + stat.id]) / deltaFactor,
            //     ":designID": part.DesignID,
            //     ":partStat": partStat,
            //   })
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
                  {teamNames(value, metadata.version)}
                  <div>
                    {row.DesignID ? `D-${row.DesignID}` : <span style={{ color: "white" }}>
                      Not Installed
                    </span>}
                  </div>
                </div>
              )
            }
          },
          {
            field: 'TeamCarID',
            headerName: "Car",
            width: 120,
            renderCell: ({ value, row }) => {
              return (
                <div style={{color: `rgb(var(--team${row.TeamID}-triplet)`}}>
                  {
                    getDriverName(driverMap[teamMap[row.TeamID][`Driver${row.TeamCarID}ID`]])
                  }
                  <div>
                    {row.DesignNumber ? `${PartInfo.prefix}-${row.DesignNumber}` : `Missing Part`}
                  </div>
                </div>
              )
            }
          },
          ...PartInfo.parts.map(part => ({
            field: `condition_` + part,
            headerName:  (PartInfo.parts.length > 1 ? PartNames[part] : "") + " Condition",
            type: 'number',
            width: 120,
            valueGetter: ({value}) => Number(value),
            renderCell: ({row, value}) => `${(value * 100).toFixed(2)}%`,
            editable: true,
          })),

          ...partPanel === 0 ? [] : PartInfo.parts.map(part => ({
            field: `knowledge_` + part,
            headerName:  (PartInfo.parts.length > 1 ? PartNames[part] : "") + " Knowledge",
            type: 'number',
            width: 120,
            valueGetter: ({value}) => Number(value),
            renderCell: ({row, value}) => `${(value * 100).toFixed(2)}%`,
            editable: true,
          })),

          ...PartStatsListPage.map(stat => ({ // engine knowledge is meaningless
            field: `unit_` + stat.id,
            headerName: stat.name,
            type: 'number',
            width: 120,
            valueGetter: ({value}) => Number(value).toFixed(stat.digits),
            renderCell: ({row, value}) => {
              return (
                <div style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
                  <span>{value ?
                    stat.statRenderer ? (
                      stat.statRenderer(Number(value))
                    ) : (
                      statRenderer[stat.stat] ? statRenderer[stat.stat](Number(value)) : "" // default renderer
                    )
                    : ""}</span>
                  <br/>
                  <span style={{
                    fontSize: 12, color: "#777"
                  }}>{Number(row[`val_` + stat.id]).toFixed(stat.displayDigits)}</span>
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
          //             for (const stat of PartStatsListPage) {
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
      {
        version === 3 && (
          <Typography variant="p" component="p" style={{ color: "#ccc", margin: 12, flex: 1, flexBasis: 720 }}>
            Effects per 100 (10%) in {PartInfo.category}: <br/>
            {
              PartStatsListPage.filter(
                stat => reverseContrib[stat.stat === 15 ? 1500 : stat.stat].length
              ).map(stat => (
                <p key={stat.id}>
                  {
                    (stat.statRenderer ? stat.statRenderer : statRenderer[stat.stat])(
                      (stat.valueToDeltaUnitValue ? (
                        stat.valueToDeltaUnitValue
                      ) : (
                        valueToDeltaUnitValue[stat.stat]
                      )) * 100
                    )
                  } {stat.name}: <br />{
                  reverseContrib[stat.stat === 15 ? 1500 : stat.stat]?.map(r =>
                      <span key={r.id} style={{ color: '#777', marginRight: 10 }}>
                  {r.name} {stat.stat === 15 ? "-" : "+"}{r.render(
                        0.1 * r.contribution * PartFactor[stat.stat][PartInfo.parts[0]] *
                        (r.bounds[1] - r.bounds[0])
                      )}
                </span>
                  )
                }</p>
              ))
            }
          </Typography>
        )
      }
    </div>
  );
}