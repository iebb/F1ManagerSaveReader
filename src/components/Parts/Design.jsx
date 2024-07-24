import {TeamName} from "@/components/Localization/Localization";
import {Tab, Tabs, Typography} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {getDriverName, teamNames} from "@/js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {PartCalculationStatsV, PartFactorsV, PartNames, PartStatsCategorizedV,} from "./consts";

import {statRenderer, unitValueToValue, valueToDeltaUnitValue} from "./consts_2023";


export default function DesignView() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);

  const {driverMap, teamMap, teamIds } = basicInfo;

  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [partStats, setPartStats] = useState([]);
  const [partPanel, setPartPanel] = useState(1);
  const [reverseContrib, setReverseContrib] = useState([]);

  const PartFactor = PartFactorsV[version];
  const PartStatsCategorized = PartStatsCategorizedV[version];
  const PartInfo = PartStatsCategorized[partPanel];
  const PartStatsCategorizedPage = PartStatsCategorized[partPanel].stats;
  const PartTypePage = PartStatsCategorized[partPanel].parts;


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


      const sql = `SELECT *, Parts_CarLoadout.TeamID as TeamID, Parts_CarLoadout.LoadOutID as LoadOutID, 
Parts_CarLoadout.DesignID as CL_DesignID, ${DSVTable}.Value as Value FROM Parts_CarLoadout 
LEFT JOIN (
    SELECT TeamID, PartType, MAX(DesignID) as LatestDesign FROM Parts_Designs WHERE ValidFrom <= ${basicInfo.player.CurrentSeason} AND (DayCompleted > 0 OR DayCreated < 0) GROUP BY TeamID, PartType
) as LatestDesign ON LatestDesign.TeamID = Parts_CarLoadout.TeamID AND LatestDesign.PartType = Parts_CarLoadout.PartType
LEFT JOIN Parts_Designs ON Parts_Designs.DesignID = COALESCE(Parts_CarLoadout.DesignID, LatestDesign.LatestDesign)
LEFT JOIN ${DSVTable} ON Parts_Designs.DesignID = ${DSVTable}.DesignID
LEFT JOIN Parts_Items ON Parts_Items.ItemID = Parts_CarLoadout.ItemID WHERE Parts_Designs.PartType IN (${PartTypePage.join(",")})`;

      let partRow = {};

      for(const row of database.getAllRows(sql)) {
        let carID = row.TeamID * 2 + row.LoadOutID;
        if (!partStats[carID]) {
          partStats[carID] = {};
        }
        const statId = version === 2 ? row.StatID : row.PartStat;
        partStats[carID][`val_${row.PartType}_${statId}`] = row.Value;
        partStats[carID][`unit_${row.PartType}_${statId}`] = row.UnitValue;
        partStats[carID][`condition_${row.PartType}`] = row.Condition;
        partStats[carID][`knowledge_${row.PartType}`] = row.PartKnowledge;
        partRow[carID] = {
          ...row,
          Part: {},
        };

        partRow[carID].Part[row.PartType] = row;
      }
      let loadouts = [];
      for(const teamId of teamIds) {
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

  return (
    <div>
      <Tabs value={partPanel} onChange={(event, newValue) => {
        setPartPanel(newValue);
      }} aria-label="basic tabs example">
        {
          PartStatsCategorized.map(p => (
            <Tab label={p.category} key={p.id} />
          ))
        }
      </Tabs>
      <DataGrid
        key={partPanel}
        rows={partStats}
        getRowId={r => r.id}
        isCellEditable={({ row, field, value }) => {
          if (field.startsWith("condition_")) {
            return value > 0;
          }
          return true;
        }}
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
            if (oldRow['knowledge_' + partId] !== newRow['knowledge_' + partId]) {
              database.exec(`UPDATE Parts_Designs SET PartKnowledge = :condition WHERE DesignID = :itemID`, {
                ":condition": newRow['knowledge_' + partId],
                ":itemID": part.DesignID,
              })
            }
          }


          for (const stat of PartStatsCategorizedPage) {
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
            width: 140,
            renderCell: ({ value, row }) => {
              return (
                <TeamName
                  TeamID={value}
                  type="fanfare"
                  posInTeam={row.TeamCarID}
                  description={
                    getDriverName(driverMap[teamMap[value][`Driver${row.TeamCarID}ID`]])
                  }
                />
              )
            }
          },
          {
            field: 'DesignNumber',
            headerName: "Design",
            width: 100,
            renderCell: ({ value, row }) => {
              return (
                <TeamName
                  TeamID={row.TeamID}
                  type="fanfare"
                  header={row.DesignNumber ? `${PartInfo.prefix}-${row.DesignNumber}` : `Missing Part`}
                  description={row.DesignID ? `Part #${row.ManufactureNumber}` : <span style={{color: "white"}}>
                      Not Installed
                  </span>}
                />
              )
            }
          },
          ...PartInfo.parts.map(part => ({
            field: `condition_` + part,
            headerName: (PartInfo.parts.length > 1 ? PartNames[part] : "") + " Condition",
            type: 'number',
            width: 120,
            valueGetter: ({value}) => value === null ? null : Number(value),
            renderCell: ({value}) => value === null ? "N/A" : `${(value * 100).toFixed(2)}%`,
            editable: true,
          })),

          ...PartInfo.parts.map(part => ({
            field: `knowledge_` + part,
            headerName:  (PartInfo.parts.length > 1 ? PartNames[part] : "") + " Knowledge",
            type: 'number',
            width: 120,
            valueGetter: ({value}) => Number(value),
            renderCell: ({row, value}) => `${(value * 100).toFixed(2)}%`,
            editable: true,
          })),

          ...PartStatsCategorizedPage.map(stat => ({ // engine knowledge is meaningless
            field: `unit_` + stat.id,
            headerName: stat.name,
            type: 'number',
            width: 150,
            valueGetter: ({value}) => Number(value).toFixed(stat.digits),
            renderCell: ({row, value}) => {
              return (
                <div style={{textAlign: "right", padding: 6}}>
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
      {
        version >= 3 && (
          <Typography variant="p" component="p" style={{ color: "#ccc", margin: 12, flex: 1, flexBasis: 720 }}>
            Effects per 100 attribute (10%) in {PartInfo.category}: <br/>
            {
              PartStatsCategorizedPage.filter(
                stat => reverseContrib[stat.stat === 15 ? 1500 : stat.stat]?.length && PartFactor[stat.stat][PartInfo.parts[0]]
              ).map(stat => (
                <p key={stat.id}>
                  per {
                    (stat.statRenderer ? stat.statRenderer : statRenderer[stat.stat])(
                      (stat.valueToDeltaUnitValue ? (
                        stat.valueToDeltaUnitValue
                      ) : (
                        valueToDeltaUnitValue[stat.stat]
                      )) * 100
                    )
                  } {stat.name}: {
                  reverseContrib[stat.stat === 15 ? 1500 : stat.stat]?.map(r =>
                      <span key={r.id} style={{ color: '#777', marginRight: 10 }}>
                  {r.name} {stat.stat === 15 ? "-" : "+"}{r.render(
                        0.1 * r.contribution * PartFactor[stat.stat][PartInfo.parts[0]] * (r.bounds[1] - r.bounds[0])
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