import TeamLogo from "@/components/Common/TeamLogo";
import { currencyFormatter } from "@/components/Finance/utils";
import {
  BasicInfoContext,
  DatabaseContext,
  MetadataContext,
  UiSettingsContext
} from "@/js/Contexts";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { Button } from "@mui/material";
import {
  clampPercentage,
  getTeamDisplayName,
  objectiveStateLabels
} from "@/components/Modding/saveOperationsShared";

export default function BoardWorkspace({
  confidenceRows,
  objectiveRows,
  ratingRows,
  paymentRows,
  balanceRows,
  currentSeason,
  onRefresh,
  teamId,
  showHeader = true
}) {
  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);
  const { version } = useContext(MetadataContext);
  const { logoStyle = "normal" } = useContext(UiSettingsContext);
  const { enqueueSnackbar } = useSnackbar();
  const { teamMap, teamIds } = basicInfo;
  const [displayTeamId, setDisplayTeamId] = useState(teamId);
  const teamOptions = useMemo(() => {
    const seen = new Set([
      ...teamIds,
      ...objectiveRows.map((row) => row.TeamID),
      ...ratingRows.map((row) => row.TeamID),
    ].filter((value) => value !== undefined && value !== null));
    return [teamId, ...Array.from(seen).filter((value) => value !== teamId)];
  }, [objectiveRows, ratingRows, teamId, teamIds]);
  const selectedTeamLabel = getTeamDisplayName(teamMap, displayTeamId, version);
  const isOwnTeam = displayTeamId === teamId;
  const currentConfidence = confidenceRows.find((row) => row.Season === currentSeason)?.Confidence ?? "-";
  const selectedObjectiveRows = objectiveRows.filter((row) => row.TeamID === displayTeamId);
  const selectedRatingRows = ratingRows.filter((row) => row.TeamID === displayTeamId);
  const currentObjective = selectedObjectiveRows.find((row) => row.SeasonID === currentSeason) || selectedObjectiveRows[0] || null;
  const objectiveHistoryRows = selectedObjectiveRows.filter((row) => row.id !== currentObjective?.id);
  const currentRating = selectedRatingRows.find((row) => row.SeasonID === currentSeason) || selectedRatingRows[0] || null;
  const selectedBalance = balanceRows.find((row) => Number(row.TeamID) === Number(displayTeamId)) || null;
  const targetPayment = paymentRows.find((row) => Number(row.SeasonExpectation) === Number(currentObjective?.TargetPos)) || null;
  const targetBudget = Number(targetPayment?.Budget || 0);
  const targetMonthlyPayment = targetBudget ? targetBudget / 12.5 : 0;
  const teamSeasonTotals = useMemo(() => (
    ratingRows.map((row) => ({
      TeamID: row.TeamID,
      SeasonID: row.SeasonID,
      Total: Number(row.PtsFromConstructorResults || 0)
        + Number(row.PtsFromDriverResults || 0)
        + Number(row.PtsFromSeasonsEntered || 0)
        + Number(row.PtsFromChampionshipsWon || 0)
        + Number(row.PtsFromNewTeamHype || 0),
    }))
  ), [ratingRows]);
  const comparisonRows = ratingRows
    .filter((row) => row.SeasonID === currentSeason)
    .map((row) => {
      const total = Number(row.PtsFromConstructorResults || 0)
        + Number(row.PtsFromDriverResults || 0)
        + Number(row.PtsFromSeasonsEntered || 0)
        + Number(row.PtsFromChampionshipsWon || 0)
        + Number(row.PtsFromNewTeamHype || 0);
      const previousTeamSeason = teamSeasonTotals
        .filter((entry) => entry.TeamID === row.TeamID && Number(entry.SeasonID) < Number(row.SeasonID))
        .sort((left, right) => Number(right.SeasonID) - Number(left.SeasonID))[0];
      const delta = previousTeamSeason ? total - previousTeamSeason.Total : null;
      return {
        id: `comparison-${row.TeamID}-${row.SeasonID}`,
        TeamID: row.TeamID,
        Team: getTeamDisplayName(teamMap, row.TeamID, version),
        Constructor: Number(row.PtsFromConstructorResults || 0),
        Driver: Number(row.PtsFromDriverResults || 0),
        Seasons: Number(row.PtsFromSeasonsEntered || 0),
        Titles: Number(row.PtsFromChampionshipsWon || 0),
        Hype: Number(row.PtsFromNewTeamHype || 0),
        Total: total,
        PreviousTotal: previousTeamSeason?.Total ?? null,
        Delta: delta,
      };
    })
    .sort((left, right) => right.Total - left.Total);
  const confidenceTrend = confidenceRows
    .slice()
    .sort((a, b) => a.Season - b.Season);
  const [confidenceDraft, setConfidenceDraft] = useState(Number.isFinite(Number(currentConfidence)) ? Number(currentConfidence) : 50);
  const ratingBreakdown = currentRating ? [
    { label: "Constructor Results", value: Number(currentRating.PtsFromConstructorResults || 0) },
    { label: "Driver Results", value: Number(currentRating.PtsFromDriverResults || 0) },
    { label: "Seasons Entered", value: Number(currentRating.PtsFromSeasonsEntered || 0) },
    { label: "Championships Won", value: Number(currentRating.PtsFromChampionshipsWon || 0) },
    { label: "New Team Hype", value: Number(currentRating.PtsFromNewTeamHype || 0) },
  ] : [];
  const totalRatingPoints = ratingBreakdown.reduce((sum, item) => sum + item.value, 0);
  const objectiveTone = {
    0: "border-amber-300/30 bg-amber-500/[0.08] text-amber-100",
    1: "border-emerald-300/30 bg-emerald-500/[0.08] text-emerald-100",
    2: "border-rose-300/30 bg-rose-500/[0.08] text-rose-100",
    3: "border-red-300/30 bg-red-500/[0.10] text-red-100",
  }[currentObjective?.State] || "border-white/10 bg-white/[0.04] text-slate-200";
  const stackedBarSegments = [
    { key: "Constructor", label: "Constructor", className: "bg-sky-400", field: "Constructor" },
    { key: "Driver", label: "Driver", className: "bg-emerald-400", field: "Driver" },
    { key: "Seasons", label: "Seasons", className: "bg-amber-400", field: "Seasons" },
    { key: "Titles", label: "Titles", className: "bg-fuchsia-400", field: "Titles" },
    { key: "Hype", label: "Hype", className: "bg-rose-400", field: "Hype" },
  ];
  const maxComparisonTotal = comparisonRows.length
    ? Math.max(...comparisonRows.map((row) => row.Total))
    : 0;

  useEffect(() => {
    if (!teamOptions.includes(displayTeamId)) {
      setDisplayTeamId(teamOptions[0] ?? teamId);
    }
  }, [displayTeamId, teamId, teamOptions]);

  useEffect(() => {
    const nextConfidence = Number(currentConfidence);
    if (Number.isFinite(nextConfidence)) {
      setConfidenceDraft(nextConfidence);
    }
  }, [currentConfidence]);

  const updateConfidence = (nextConfidence) => {
    try {
      const clampedConfidence = Math.max(0, Math.min(100, Number(nextConfidence) || 0));
      database.exec(
        `UPDATE Board_Confidence
         SET Confidence = :confidence
         WHERE Season = :season`,
        {
          ":confidence": clampedConfidence,
          ":season": currentSeason,
        }
      );
      setConfidenceDraft(clampedConfidence);
      onRefresh();
      enqueueSnackbar(`Current season board confidence set to ${clampedConfidence}`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(`Failed to update confidence: ${error.message || error}`, { variant: "error" });
    }
  };

  const updateObjectiveTarget = (row, delta) => {
    try {
      if (Number(row.State) !== 0) {
        enqueueSnackbar("Only ongoing objectives can be changed", { variant: "warning" });
        return;
      }
      const nextTargetPos = Math.max(1, Math.min(10, Number(row.TargetPos || 1) + delta));
      if (nextTargetPos === Number(row.TargetPos || 1)) {
        return;
      }
      database.exec(
        `UPDATE Board_SeasonObjectives
         SET TargetPos = :targetPos
         WHERE TeamID = :teamId
           AND SeasonID = :seasonId`,
        {
          ":targetPos": nextTargetPos,
          ":teamId": row.TeamID,
          ":seasonId": row.SeasonID,
        }
      );
      onRefresh();
      enqueueSnackbar(`Season ${row.SeasonID} target set to P${nextTargetPos}`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(`Failed to update board objective: ${error.message || error}`, { variant: "error" });
    }
  };

  return (
    <div className="grid gap-4">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="grid gap-4">
          {showHeader ? (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Board Workspace</div>
              <h2 className="mt-2 text-lg font-bold text-white">Board Confidence, Objectives, and Rating</h2>
              <p className="mt-2 max-w-[920px] text-sm text-slate-400">
                Confidence is only tracked for your own team. Objectives and board rating can be reviewed team by team.
              </p>
            </div>
          ) : null}
          <div className="bg-black/10">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Choose Team</div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 xl:flex xl:flex-nowrap xl:gap-2">
              {teamOptions.map((optionTeamId) => {
                const label = getTeamDisplayName(teamMap, optionTeamId, version);
                const selected = optionTeamId === displayTeamId;
                return (
                  <button
                    key={optionTeamId}
                    type="button"
                    onClick={() => setDisplayTeamId(optionTeamId)}
                    title={label}
                    className={`group border p-2 text-left transition xl:min-w-0 xl:flex-1 ${selected
                      ? "border-sky-300/60 bg-sky-600/15 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`flex h-10 w-full items-center justify-center ${selected ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}>
                        <TeamLogo TeamID={optionTeamId} size="md" logoStyleOverride={logoStyle} alt={label} />
                      </div>
                      <div className="w-full truncate text-center text-[11px] font-semibold text-slate-200">
                        {label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Season Objectives</div>
            <div className="mt-2 flex items-center gap-3">
              <TeamLogo TeamID={displayTeamId} size="lg" logoStyleOverride={logoStyle} alt={selectedTeamLabel} />
              <div className="text-lg font-bold text-white">{selectedTeamLabel}</div>
            </div>
          </div>
          <div className="xl:min-w-[760px]">
            {currentObjective ? (
              <div className="grid gap-4 xl:grid-cols-[auto_1fr] xl:items-center">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    disabled={Number(currentObjective.State) !== 0 || Number(currentObjective.TargetPos || 1) <= 1}
                    onClick={() => updateObjectiveTarget(currentObjective, -1)}
                    className={`h-11 w-11 border text-lg font-semibold transition ${Number(currentObjective.State) === 0 && Number(currentObjective.TargetPos || 1) > 1 ? "border-white/10 text-white hover:border-white/20 hover:bg-white/[0.04]" : "border-white/5 text-slate-600"}`}
                  >
                    -
                  </button>
                  <div className="min-w-[120px] text-center">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Target Finish</div>
                    <div className="mt-1 text-3xl font-bold text-white">
                      {currentObjective.TargetPos ? `P${currentObjective.TargetPos}` : "-"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={Number(currentObjective.State) !== 0 || Number(currentObjective.TargetPos || 1) >= 10}
                    onClick={() => updateObjectiveTarget(currentObjective, 1)}
                    className={`h-11 w-11 border text-lg font-semibold transition ${Number(currentObjective.State) === 0 && Number(currentObjective.TargetPos || 1) < 10 ? "border-white/10 text-white hover:border-white/20 hover:bg-white/[0.04]" : "border-white/5 text-slate-600"}`}
                  >
                    +
                  </button>
                  <div className={`inline-flex border px-2 py-1 text-sm font-semibold ${objectiveTone}`}>
                    {objectiveStateLabels[currentObjective.State] || "Not Set"}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Team Balance</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {selectedBalance ? currencyFormatter.format(Number(selectedBalance.Balance || 0)) : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Board Payment</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {targetPayment ? currencyFormatter.format(targetBudget) : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Monthly Payment</div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {targetPayment ? currencyFormatter.format(targetMonthlyPayment) : "-"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">No current objective row is available for this team.</div>
            )}
          </div>
        </div>
        {objectiveHistoryRows.length ? (
          <div className="mt-4 grid gap-3">
            {objectiveHistoryRows.map((row) => {
              const rowObjectiveTone = {
                0: "border-amber-300/30 bg-amber-500/[0.08] text-amber-100",
                1: "border-emerald-300/30 bg-emerald-500/[0.08] text-emerald-100",
                2: "border-rose-300/30 bg-rose-500/[0.08] text-rose-100",
                3: "border-red-300/30 bg-red-500/[0.10] text-red-100",
              }[row.State] || "border-white/10 bg-white/[0.04] text-slate-200";
              return (
                <div key={row.id} className="grid gap-3 border border-white/10 bg-black/10 p-4 md:grid-cols-[120px_140px_160px] md:items-center">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Season</div>
                    <div className="mt-1 text-xl font-semibold text-white">{row.SeasonID}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Target Finish</div>
                    <div className="mt-1 text-xl font-semibold text-white">P{Math.max(1, Math.min(10, Number(row.TargetPos || 1)))}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">State</div>
                    <div className={`mt-2 inline-flex border px-2 py-1 text-sm font-semibold ${rowObjectiveTone}`}>
                      {objectiveStateLabels[row.State] || "Not Set"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {isOwnTeam ? (
        <section className="border border-white/10 bg-white/[0.015] p-5">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-200/80">Confidence</div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={confidenceDraft}
                  onChange={(event) => setConfidenceDraft(Math.max(0, Math.min(100, Number(event.target.value) || 0)))}
                  onBlur={() => updateConfidence(confidenceDraft)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      updateConfidence(confidenceDraft);
                    }
                  }}
                  className="w-28 border-0 bg-transparent p-0 text-5xl font-black leading-none text-white outline-none"
                />
                <Button variant="contained" color="success" onClick={() => updateConfidence(100)}>
                  Max
                </Button>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={confidenceDraft}
                onChange={(event) => setConfidenceDraft(Number(event.target.value))}
                onMouseUp={() => updateConfidence(confidenceDraft)}
                onTouchEnd={() => updateConfidence(confidenceDraft)}
                className="mt-4 h-3 w-full accent-sky-400"
              />
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Confidence History</div>
              <div className="mt-4 grid gap-3">
                {confidenceTrend.length ? confidenceTrend.map((row) => {
                  const confidence = Number(row.Confidence || 0);
                  const width = clampPercentage(confidence, 100);
                  const isCurrent = row.Season === currentSeason;
                  return (
                    <div key={row.Season} className="grid gap-2 md:grid-cols-[72px_minmax(0,1fr)_56px] md:items-center">
                      <div className={`text-sm font-semibold ${isCurrent ? "text-white" : "text-slate-300"}`}>{row.Season}</div>
                      <div className="h-4 border border-white/10 bg-white/[0.03]">
                        <div className={`h-full ${isCurrent ? "bg-[linear-gradient(90deg,#7dd3fc,#38bdf8)]" : "bg-slate-500/80"}`} style={{ width: `${width}%` }} />
                      </div>
                      <div className={`text-right text-sm font-semibold ${isCurrent ? "text-sky-200" : "text-slate-300"}`}>{confidence}</div>
                    </div>
                  );
                }) : (
                  <div className="text-sm text-slate-400">No confidence history is available for this save.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border border-white/10 bg-white/[0.015] p-5">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Board Rating</div>
            <div className="mt-2 flex items-center gap-3">
              <TeamLogo TeamID={displayTeamId} size="lg" logoStyleOverride={logoStyle} alt={selectedTeamLabel} />
              <div className="text-base font-bold text-white">{selectedTeamLabel}</div>
            </div>
            <div className="mt-3 text-sm text-slate-400">
              {currentRating ? `Season ${currentRating.SeasonID}` : "No board rating rows are available for the selected team."}
            </div>
            {currentRating ? (
              <div className="mt-4 grid gap-3">
                {ratingBreakdown.map((item) => (
                  <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-3">
                    <div className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">{item.label}</div>
                    <div className="text-right text-sm font-semibold text-white">{item.value}</div>
                  </div>
                ))}
                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Total Rating Points</div>
                  <div className="mt-1 text-base font-semibold text-white">{totalRatingPoints}</div>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Compare</div>
            <div className="mt-4 grid gap-3">
              {comparisonRows.map((row) => (
                <div key={row.id} className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_64px_92px] md:items-center">
                  <div className={`truncate text-sm font-semibold ${row.TeamID === displayTeamId ? "text-white" : "text-slate-300"}`}>
                    {row.Team}
                  </div>
                  <div className="h-5 border border-white/10 bg-white/[0.03]">
                    <div
                      className="flex h-full overflow-hidden"
                      style={{ width: `${clampPercentage(row.Total, maxComparisonTotal || 1)}%` }}
                    >
                      {stackedBarSegments.map((segment) => {
                        const value = Number(row[segment.field] || 0);
                        const width = clampPercentage(value, row.Total || 1);
                        return value > 0 ? (
                          <div
                            key={`${row.id}-${segment.key}`}
                            className={segment.className}
                            style={{ width: `${width}%` }}
                            title={`${segment.label}: ${value}`}
                          />
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold text-white">{row.Total}</div>
                  <div className="text-right text-sm font-semibold">
                    {row.Delta === null ? (
                      <span className="text-slate-500">-</span>
                    ) : row.Delta > 0 ? (
                      <span className="text-emerald-300">▲ {row.Delta}</span>
                    ) : row.Delta < 0 ? (
                      <span className="text-rose-300">▼ {Math.abs(row.Delta)}</span>
                    ) : (
                      <span className="text-slate-400">• 0</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {stackedBarSegments.map((segment) => (
                <div key={segment.key} className="inline-flex items-center gap-2 text-xs text-slate-400">
                  <span className={`h-2.5 w-2.5 ${segment.className}`} />
                  <span>{segment.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
