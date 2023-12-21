import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {teamNames} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "../Contexts";
import {TeamName} from "../Localization/Localization";

const PitCrewStatsList = {
  2: [
    {id: 32, digits: 6, displayDigits: 6, name: "Jacks"},
    {id: 33, digits: 6, displayDigits: 6, name: "Tyres"},
    {id: 34, digits: 6, displayDigits: 6, name: "Wings"},
    {id: 35, digits: 6, displayDigits: 6, name: "Car Release"},
  ],
  3: [
    {id: 32, digits: 6, displayDigits: 6, name: "Jacks"},
    {id: 41, digits: 6, displayDigits: 6, name: "Tyres Off"},
    {id: 42, digits: 6, displayDigits: 6, name: "Tyres On"},
    {id: 40, digits: 6, displayDigits: 6, name: "Wheel Gun"},
    {id: 35, digits: 6, displayDigits: 6, name: "Car Release"},
    {id: 39, digits: 6, displayDigits: 6, name: "Car Building"},
    // {id: 33,	name: "Tyres"},
    {id: 34, digits: 0, displayDigits: 0, name: "Wings"},
    //  {id: 37,	name: "Consistency"},

    {id: 36, digits: 6, displayDigits: 6, name: "Speed"},
    {id: 38, digits: 6, displayDigits: 6, negative: true, name: "Fatigue"},
  ]
}

export default function PitcrewView() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext);
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [pitCrewStats, setPitCrewStats] = useState([]);


  useEffect(() => {
    const pitCrewStats = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];
    try {
      let [{ columns, values }] = database.exec(
        `select * from Staff_PitCrew_PerformanceStats`
      );
      for(const r of values) {
        pitCrewStats[r[0] /* TeamID */ ]["stat_" + r[1] /* StatID */ ] = r[2];
        pitCrewStats[r[0] /* TeamID */ ]["month_start_stat_" + r[1] /* StatID */ ] = r[3];
      }
      setPitCrewStats(
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
          teamIndex => ({
            id: teamIndex,
            TeamID: teamIndex,
            ...pitCrewStats[teamIndex]
          })
        )
      );

    } catch {

    }

  }, [database, updated])

  return (
    <div>
      <DataGrid
        rows={pitCrewStats}
        getRowId={r => r.TeamID}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          for (const stat of PitCrewStatsList[version]) {

            if (version === 2) {
              database.exec(`UPDATE Staff_PitCrew_PerformanceStats SET Val = :value WHERE TeamID = :teamID AND StatID = :statID`, {
                ":teamID": newRow.TeamID,
                ":value": newRow['stat_' + stat.id],
                ":statID": stat.id,
              })
            } else if (version === 3) {
              if (newRow['stat_' + stat.id] !== oldRow['stat_' + stat.id]) {
                let delta = (newRow['stat_' + stat.id] - oldRow['stat_' + stat.id]);
                if (stat.id === 38) {
                  database.exec(`UPDATE Staff_PitCrew_RaceWeekendFatigue SET Val = Val + :value WHERE TeamID = :teamID`, {
                    ":teamID": newRow.TeamID,
                    ":value": delta,
                  })
                }

                database.exec(`UPDATE Staff_PitCrew_PerformanceStats SET Val = :value, MonthStartVal = :ms_value WHERE TeamID = :teamID AND StatID = :statID`, {
                  ":teamID": newRow.TeamID,
                  ":value": newRow['stat_' + stat.id],
                  ":ms_value": newRow['month_start_stat_' + stat.id] + delta,
                  ":statID": stat.id,
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
          ...PitCrewStatsList[version].map(stat => ({
            field: `stat_` + stat.id,
            headerName: stat.name,
            type: 'number',
            flex: 1,
            valueGetter: ({value}) => Number(value).toFixed(stat.digits),
            renderCell: ({row, value}) => {
              const delta = value - row["month_start_stat_" + stat.id];
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
          }))
        ]}
        hideFooter
      />
    </div>
  );
}