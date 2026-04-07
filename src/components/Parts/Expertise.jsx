import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useCallback, useContext, useEffect, useMemo, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import TeamIdentity from "@/components/Common/TeamIdentity";
import {PartStatsCategorizedV} from "./consts";
import {useSnackbar} from "notistack";

function getValueTone(value, negative = false, min = 0, max = 1000) {
  if (Math.abs(max - min) < 1e-9) {
    return {
      color: "rgb(226 232 240)",
    };
  }

  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const hue = negative ? 120 - normalized * 120 : normalized * 120;
  return {
    color: `hsl(${hue}, 80%, 68%)`,
  };
}

export default function ExpertiseView({ type = 'current' }) {

  const database = useContext(DatabaseContext);
  const {version} = useContext(MetadataContext)
  const {teamIds} = useContext(BasicInfoContext);
  const { enqueueSnackbar } = useSnackbar();
  const [partStats, setPartStats] = useState([]);
  const [partPanel, setPartPanel] = useState(1);
  const [pendingAction, setPendingAction] = useState(null);

  const PartStatsCategorized = PartStatsCategorizedV[version];
  const availablePartGroups = PartStatsCategorized.filter((group) => group.stats.some((stat) => !stat.hideInExpertise));
  const resolvedPartPanel = availablePartGroups.some((group) => group.id === partPanel)
    ? partPanel
    : availablePartGroups[0]?.id ?? PartStatsCategorized[0]?.id;
  const PartStatsCategorizedPage = (PartStatsCategorized[resolvedPartPanel] || PartStatsCategorized[0]).stats;
  const visibleStats = PartStatsCategorizedPage.filter((x) => !x.hideInExpertise);

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

  useEffect(() => {
    if (resolvedPartPanel !== partPanel) {
      setPartPanel(resolvedPartPanel);
    }
  }, [partPanel, resolvedPartPanel]);

  const bestTeamByGroup = useMemo(() => {
    const leaders = {};
    availablePartGroups.forEach((group) => {
      const groupStats = group.stats.filter((stat) => !stat.hideInExpertise);
      if (!groupStats.length || !partStats.length) {
        return;
      }
      let bestTeamId = null;
      let bestAverage = null;
      partStats.forEach((row) => {
        const total = groupStats.reduce((sum, stat) => sum + Number(row[`stat_${stat.id}`] || 0), 0);
        const average = total / groupStats.length;
        if (bestAverage === null || average > bestAverage) {
          bestAverage = average;
          bestTeamId = row.TeamID;
        }
      });
      leaders[group.id] = bestTeamId;
    });
    return leaders;
  }, [availablePartGroups, partStats]);

  const statRanges = useMemo(() => {
    return visibleStats.reduce((acc, stat) => {
      const values = partStats
        .map((row) => Number(row[`stat_${stat.id}`]))
        .filter((value) => Number.isFinite(value));
      acc[stat.id] = {
        min: values.length ? Math.min(...values) : 0,
        max: values.length ? Math.max(...values) : 1000,
      };
      return acc;
    }, {});
  }, [partStats, visibleStats]);

  const applyMassAction = () => {
    if (!pendingAction || !visibleStats.length || !partStats.length) {
      setPendingAction(null);
      return;
    }

    try {
      const nextValuesByStat = {};
      visibleStats.forEach((stat) => {
        const values = partStats
          .map((row) => Number(row[`stat_${stat.id}`]))
          .filter((value) => Number.isFinite(value));
        if (!values.length) {
          return;
        }
        if (pendingAction === "equalize") {
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          nextValuesByStat[stat.id] = Number(average.toFixed(stat.digits));
          return;
        }
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const randomizedMin = Math.max(0, minValue - 100);
        const randomizedMax = Math.min(1000, maxValue + 100);
        nextValuesByStat[stat.id] = values.map(() => {
          if (randomizedMin === randomizedMax) {
            return Number(randomizedMin.toFixed(stat.digits));
          }
          const randomized = randomizedMin + Math.random() * (randomizedMax - randomizedMin);
          return Number(randomized.toFixed(stat.digits));
        });
      });

      partStats.forEach((row, rowIndex) => {
        visibleStats.forEach((stat) => {
          const [partType, partStat] = stat.id.split("_");
          const nextValue = pendingAction === "equalize"
            ? nextValuesByStat[stat.id]
            : nextValuesByStat[stat.id]?.[rowIndex];
          if (nextValue === undefined) {
            return;
          }
          database.exec(
            version === 2 ? (
              `UPDATE Parts_TeamExpertise SET ${field} = :value WHERE TeamID = :teamID AND PartType = :partType AND StatID = :partStat`
            ) : (
              `UPDATE Parts_TeamExpertise SET ${field} = :value WHERE TeamID = :teamID AND PartType = :partType AND PartStat = :partStat`
            ),
            {
              ":teamID": row.TeamID,
              ":value": nextValue,
              ":partType": partType,
              ":partStat": partStat,
            }
          );
        });
      });

      loadPartStats();
      enqueueSnackbar(
        pendingAction === "equalize"
          ? "Visible expertise stats equalized for all teams"
          : "Visible expertise stats randomized for all teams",
        { variant: "success" }
      );
    } catch (error) {
      enqueueSnackbar(`Failed to apply expertise action: ${error.message || error}`, { variant: "error" });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.015] p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Part Groups</div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {availablePartGroups.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPartPanel(p.id)}
                className={`relative min-w-[150px] flex-none border px-3 py-2 text-left transition ${
                  p.id === resolvedPartPanel
                    ? "border-sky-300/50 bg-sky-500/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                }`}
              >
                <div className="text-sm font-semibold">{p.category}</div>
                {bestTeamByGroup[p.id] ? (
                  <div className="absolute bottom-2 right-2">
                    <TeamIdentity
                      TeamID={bestTeamByGroup[p.id]}
                      size="sm"
                      showLabel={false}
                      className="justify-end"
                    />
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Team Matrix</div>
              <div className="mt-1 text-base font-bold text-white">{(PartStatsCategorized[resolvedPartPanel] || PartStatsCategorized[0]).category}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outlined" color="warning" onClick={() => setPendingAction("randomize")}>
                Randomize
              </Button>
              <Button variant="outlined" color="info" onClick={() => setPendingAction("equalize")}>
                Equalize
              </Button>
            </div>
          </div>
        </div>
        <div className="min-w-0 overflow-x-auto bg-black/10">
          <DataGrid
            rows={partStats}
            getRowId={r => r.TeamID}
            onProcessRowUpdateError={e => console.error(e)}
            processRowUpdate={(newRow, oldRow) => {
              for (const stat of visibleStats) {
                const [partType, partStat] = stat.id.split("_");
                if (newRow['stat_' + stat.id] !== oldRow['stat_' + stat.id]) {
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
            rowHeight={62}
            columnHeaderHeight={52}
            columns={[
              {
                field: 'TeamID',
                headerName: "Team",
                width: 220,
                renderCell: ({ value }) => (
                  <div className="flex min-w-0 items-center">
                    <TeamIdentity TeamID={value} textClassName="text-sm" />
                  </div>
                ),
              },
              ...visibleStats.map(stat => ({
                field: `stat_` + stat.id,
                headerName: stat.name,
                type: 'number',
                width: 136,
                valueGetter: ({value}) => Number(value).toFixed(stat.digits),
                renderCell: ({row, value}) => {
                  const numericValue = Number(value);
                  const delta = numericValue - row["season_start_stat_" + stat.id];
                  const range = statRanges[stat.id] || { min: 0, max: 1000 };
                  return (
                    <div className="w-full px-1 text-right">
                      <div
                        className="text-sm font-semibold"
                        style={getValueTone(numericValue, stat.negative, range.min, range.max)}
                      >
                        {numericValue.toFixed(stat.displayDigits)}
                      </div>
                      <div className="mt-1 h-[2px] w-full bg-white/[0.06]">
                        <div
                          className={`h-full ${
                            stat.negative
                              ? "bg-[linear-gradient(90deg,#f87171,#fb7185)]"
                              : "bg-[linear-gradient(90deg,#60a5fa,#34d399)]"
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, (numericValue / 1000) * 100))}%` }}
                        />
                      </div>
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
            ]}
            hideFooter
            disableRowSelectionOnClick
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 700,
                fontSize: "0.8rem",
                letterSpacing: "0.04em",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              },
              "& .MuiDataGrid-row:nth-of-type(even)": {
                backgroundColor: "rgba(255,255,255,0.012)",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "rgba(255,255,255,0.025)",
              },
            }}
          />
        </div>
      </section>

      <Dialog open={Boolean(pendingAction)} onClose={() => setPendingAction(null)}>
        <DialogTitle>{pendingAction === "randomize" ? "Randomize Expertise" : "Equalize Expertise"}</DialogTitle>
        <DialogContent>
          <div className="text-sm text-slate-700">
            {pendingAction === "randomize"
              ? `Randomize all visible ${(PartStatsCategorized[resolvedPartPanel] || PartStatsCategorized[0]).category.toLowerCase()} stats for every team in this matrix?`
              : `Equalize all visible ${(PartStatsCategorized[resolvedPartPanel] || PartStatsCategorized[0]).category.toLowerCase()} stats across every team in this matrix?`}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingAction(null)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={applyMassAction}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
