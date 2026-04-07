import {Button} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useCallback, useContext, useEffect, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {TeamName} from "../Localization/Localization";
import {PartStatsCategorizedV} from "./consts";


export default function ExpertiseView({ type = 'current' }) {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const {teamIds} = useContext(BasicInfoContext);
  const [partStats, setPartStats] = useState([]);
  const [partPanel, setPartPanel] = useState(1);

  const PartStatsCategorized = PartStatsCategorizedV[version];
  const PartStatsCategorizedPage = PartStatsCategorized[partPanel].stats;


  const field = type === 'next' ? 'NextSeasonExpertise' : 'Expertise';

  const loadPartStats = useCallback(() => {
    const partStats = {};
    try {
      let [{ columns, values }] = database.exec(
        version === 2 ? (
          `Select TeamID, PartType, StatID, Expertise, NextSeasonExpertise, SeasonStartExpertise from Parts_TeamExpertise`
        ) : (
          `Select TeamID, PartType, PartStat, Expertise, NextSeasonExpertise, SeasonStartExpertise from Parts_TeamExpertise`
        )
      );
      for(const r of values) {
        if (!partStats[r[0]]) {
          partStats[r[0]] = {};
        }
        partStats[r[0] /* TeamID */ ]["stat_" + r[1] + "_" + r[2] /* PartStat */ ] = (type === 'next' ? r[4] : r[3]);
        // partStats[r[0] /* TeamID */ ]["stat_" + r[1] + "_" + r[2] /* PartStat */ ] = r[4];
        partStats[r[0] /* TeamID */ ]["season_start_stat_" + r[1] + "_" + r[2] /* PartStat */ ] = (type === 'next' ? r[3] : r[5]);
      }
      setPartStats(
        teamIds.map(
          teamIndex => ({
            id: teamIndex,
            TeamID: teamIndex,
            ...partStats[teamIndex]
          })
        )
      );

    } catch {

    }
  }, [database, teamIds, type, version]);

  useEffect(() => {
    loadPartStats();
  }, [loadPartStats])

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-black/10 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Expertise Category</div>
            <div className="mt-1 text-base font-semibold text-white">{PartStatsCategorized[partPanel].category}</div>
            <p className="mt-2 max-w-[760px] text-sm text-slate-400">
              Compare teams on one part group at a time, then adjust the selected expertise values directly in the grid.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            {PartStatsCategorized.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPartPanel(p.id)}
                className={`border px-3 py-2 text-left transition ${
                  p.id === partPanel
                    ? "border-sky-300/50 bg-sky-500/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <div className="text-sm font-semibold">{p.category}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-500">
                  {p.stats.filter((x) => !x.hideInExpertise).length} stats
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="min-w-0 overflow-x-auto border border-white/10 bg-black/10">
      <DataGrid
        rows={partStats}
        getRowId={r => r.TeamID}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          for (const stat of PartStatsCategorizedPage) {
            const [partType, partStat] = stat.id.split("_");

            if (newRow['stat_' + stat.id]) {
                database.exec(
                version === 2 ? (
                  `UPDATE Parts_TeamExpertise SET ${field} = :value WHERE TeamID = :teamID AND PartType = :partType AND StatID = :partStat`
                ) : (
                  `UPDATE Parts_TeamExpertise SET ${field} = :value WHERE TeamID = :teamID AND PartType = :partType AND PartStat = :partStat`
                ), {
                  ":teamID": newRow.TeamID,
                  ":value": newRow['stat_' + stat.id],
                  ":partType": partType,
                  ":partStat": partStat,
                })
            }

          }
          loadPartStats();
          return newRow;
        }}
        rowHeight={58}
        columnHeaderHeight={46}
        columns={[
          {
            field: 'TeamID',
            headerName: "Team",
            width: 180,
            renderCell: ({ value }) => (
              <div className="min-w-0">
                <TeamName TeamID={value} type="fanfare" />
              </div>
            ),
          },
          ...PartStatsCategorizedPage.filter(x => !x.hideInExpertise).map(stat => ({
            field: `stat_` + stat.id,
            headerName: stat.name,
            type: 'number',
            width: 132,
            valueGetter: ({value}) => Number(value).toFixed(stat.digits),
            renderCell: ({row, value}) => {
              const delta = value - row["season_start_stat_" + stat.id];
              return (
                <div className="w-full px-1 text-right">
                  <div className="text-sm font-semibold text-white">{Number(value).toFixed(stat.displayDigits)}</div>
                  <div className={`mt-0.5 text-[11px] uppercase tracking-[0.08em] ${
                    version !== 2 && delta
                      ? ((stat.negative ? delta < 0 : delta >= 0) ? "text-emerald-300" : "text-rose-300")
                      : "text-slate-500"
                  }`}>
                    {version !== 2 && delta ? `${delta > 0 ? "▲" : "▼"} ${Number(Math.abs(delta)).toFixed(3)}` : "No delta"}
                  </div>
                </div>
              )
            },
            editable: true,
          })),
          {
            field: '__',
            headerName: 'Actions',
            width: 132,
            renderCell: ({ row }) => {
              return (
                <div className="flex w-full justify-center">
                  <Button size="small" variant="outlined" color="warning" onClick={
                    () => {
                      for (const stat of PartStatsCategorizedPage) {
                        const [partType, partStat] = stat.id.split("_");
                        database.exec(
                          version === 2 ? (
                            `UPDATE Parts_TeamExpertise SET ${field} = :value WHERE PartType = :partType AND StatID = :partStat`
                          ) : (
                            `UPDATE Parts_TeamExpertise SET ${field} = :value WHERE PartType = :partType AND PartStat = :partStat`
                          ),
                          {
                          ":value": row['stat_' + stat.id],
                          ":partType": partType,
                          ":partStat": partStat,
                          }
                        )
                      }
                      loadPartStats();
                    }
                  }>equalize</Button>
                </div>
              )
            }
          },
        ]}
        hideFooter
        disableRowSelectionOnClick
        sx={{
          border: 0,
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "rgba(255,255,255,0.03)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          },
          "& .MuiDataGrid-row:hover": {
            backgroundColor: "rgba(255,255,255,0.025)",
          },
        }}
      />
      </div>
    </div>
  );
}
