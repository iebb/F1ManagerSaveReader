import {Tab, Tabs} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {getDriverName, teamNames} from "@/js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {
  PartCalculationStatsV,
  PartFactorsV,
  PartStatsV,
} from "./consts";


export default function CarAnalysis() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const {driverMap, teamMap } = basicInfo;

  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [partStats, setPartStats] = useState([]);
  const [partPanel, setPartPanel] = useState(0);

  const PartCalculationStats = PartCalculationStatsV[version];
  const PartStats = PartStatsV[version];
  const PartFactors = PartFactorsV[version];


  useEffect(() => {



    const contributions = PartCalculationStats.map(
      stat => {
        let totalValue = 0;
        for(const v of Object.keys(stat.contributors)) {
          totalValue += stat.contributors[v];
        }
        let contributionValue = {};
        for(const v of Object.keys(stat.contributors)) {
          contributionValue[v] = stat.contributors[v] / totalValue;
        }
        return {
          ...stat,
          contributionValue,
        };
      }
    )



    const partStats = {};
    try {
      let DSVTable =  version === 2 ? "Parts_DesignStatValues" : "Parts_Designs_StatValues";
      let [{ columns, values }] = database.exec(
        `SELECT *, Parts_CarLoadout.TeamID as TeamID, Parts_CarLoadout.LoadOutID as LoadOutID, Parts_CarLoadout.DesignID as CL_DesignID, ${DSVTable}.Value as Value FROM Parts_CarLoadout 
LEFT JOIN (
    SELECT TeamID, PartType, MAX(DesignID) as LatestDesign FROM Parts_Designs WHERE ValidFrom <= ${basicInfo.player.CurrentSeason} AND (DayCompleted > 0 OR DayCreated < 0) GROUP BY TeamID, PartType
) as LatestDesign ON LatestDesign.TeamID = Parts_CarLoadout.TeamID AND LatestDesign.PartType = Parts_CarLoadout.PartType
LEFT JOIN Parts_Designs ON Parts_Designs.DesignID = COALESCE(Parts_CarLoadout.DesignID, LatestDesign.LatestDesign)
LEFT JOIN ${DSVTable} ON Parts_Designs.DesignID = ${DSVTable}.DesignID`
      );

      for(const r of values) {
        let row = {};
        r.map((x, _idx) => {row[columns[_idx]] = x});
        let carID = row.TeamID * 2 + row.LoadOutID;
        if (!partStats[carID]) {
          partStats[carID] = {};
        }
        const statId = version === 2 ? row.StatID : row.PartStat;
        const factor = PartFactors[statId][row.PartType];
        if (!partStats[carID]["stat_" + statId]) {
          partStats[carID]["stat_" + statId] = 0;
        }
        partStats[carID]["stat_" + statId] += row.Value * factor;
      }


      let loadouts = [];
      for(let teamId = 1; teamId <= 10; teamId++) {
        for(let loadoutId = 1; loadoutId <= 2; loadoutId++) {
          const loadOut = {
            id: teamId * 2 + loadoutId - 2,
            TeamID: teamId,
            TeamCarID: loadoutId,
            ...partStats[teamId * 2 + loadoutId],
          }

          loadOut.stat_1500 = (20000 - loadOut.stat_15) / 20; // conversion between lifespan and kg

          for(const carStat of contributions) {
            let value = 0;
            for(const v of Object.keys(carStat.contributionValue)) {
              value += carStat.contributionValue[v] * loadOut["stat_" + v] / 1000.0;
            }
            loadOut["calc_" + carStat.id] = value;
          }

          loadouts.push(loadOut);
        }
      }

      setPartStats(loadouts);

    } catch (e) {
      console.error(e);
    }

  }, [database, updated, partPanel])

  if (process.env.NODE_ENV !== 'development') {
    if (version === 2) return (
      "Car Analysis for 2022 isn't implemented."
    )
  }

  return (
    <div>
      <Tabs value={partPanel} onChange={(event, newValue) => {
        setPartPanel(newValue);
      }} aria-label="basic tabs example">
        <Tab label="Car Performance" key={0} />
        <Tab label="Car Attributes" key={1} />
      </Tabs>
      <DataGrid
        key={partPanel}
        rows={partStats}
        getRowId={r => r.id}
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
                    {
                      getDriverName(driverMap[teamMap[row.TeamID][`Driver${row.TeamCarID}ID`]])
                    }
                  </div>
                </div>
              )
            }
          },
          ...partPanel === 1 ? (
            /* raw attributes */
            PartStats.filter(x => !x.hideInVersions || (!x.hideInVersions.includes(version)) ).map(stat => ({ // engine knowledge is meaningless
              field: `stat_` + stat.id,
              headerName: stat.name,
              type: 'number',
              flex: 1,
              valueGetter: ({value}) => Number(value),
              renderCell: ({row, value}) => {
                return (
                  <div style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
                    <span>{stat.render ? stat.render(value) : Number(value).toFixed(stat.displayDigits)}</span>
                  </div>
                )
              },
            }))
          ) : (
            /* calculated values */
            PartCalculationStats.filter(x => !x.hideInVersions || (!x.hideInVersions.includes(version)) ).map(stat => ({ // engine knowledge is meaningless
              field: `calc_` + stat.id,
              headerName: stat.name,
              type: 'number',
              flex: 1,
              renderCell: ({row, value}) => {
                const transformedValue = Number(value) * (stat.bounds[1] - stat.bounds[0]) + stat.bounds[0];
                return (
                  <div style={{textAlign: "right", padding: 6, fontVariantNumeric: 'tabular-nums'}}>
                    <span>{stat.render ? stat.render(transformedValue) : Number(transformedValue).toFixed(stat.displayDigits)}</span>
                    <br/>
                    <span style={{
                      fontSize: 12, color: "#777"
                    }}>{Number(value * 100).toFixed(4)}%</span>
                  </div>
                )
              },
            }))
          ),
        ]}
        hideFooter
      />
    </div>
  );
}