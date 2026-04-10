import {
  BasicInfoContext,
  BasicInfoUpdaterContext,
  DatabaseContext,
  MetadataContext,
  UiSettingsContext
} from "@/js/Contexts";
import {
  circuitNames,
  dayToDate,
  formatDate,
  getDriverName,
  raceAbbrevs,
  raceFlags,
  resolveLiteral,
  teamNames
} from "@/js/localization";
import { getExistingTableSet, recalculateRaceStandings } from "@/components/Customize/Player/timeMachineUtils";
import { currencyFormatter } from "@/components/Finance/utils";
import TeamLogo from "@/components/Common/TeamLogo";
import { DataGrid } from "@mui/x-data-grid";
import { Alert, AlertTitle, Button } from "@mui/material";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";

const objectiveStateLabels = {
  0: "Ongoing",
  1: "Complete",
  2: "Failed",
  3: "Critically Failed",
};

const inspectionStateLabels = {
  0: "Exempt",
  1: "Pending",
  2: "Failed",
  3: "Destroyed",
};

const eventTypeLabels = {
  0: "Building Constructed",
  1: "Building Upgraded",
  2: "Building Refurbished",
  3: "Part Designed",
  4: "Part Manufactured",
  5: "Scouting Completed",
  6: "Part Researched",
};

const getTeamDisplayName = (teamMap, teamId, version) => {
  if (teamId > 31 && teamMap?.[teamId]?.TeamNameLocKey) {
    return resolveLiteral(teamMap[teamId].TeamNameLocKey);
  }
  return teamNames(teamId, version);
};

const readRows = (database, query, params = {}) => {
  try {
    return database.getAllRows(query, params);
  } catch {
    return [];
  }
};

const clampPercentage = (value, max) => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / max) * 100));
};

function SponsorshipWorkspace({ rows, secondaryRows, availableRows, bonusRows, nextRaceName, onRefresh, teamId, mode = "modern", legacyObligations = [], legacyIncentives = [], currentDay = 0 }) {
  const database = useContext(DatabaseContext);
  const { enqueueSnackbar } = useSnackbar();
  const legacyIncentiveGroups = useMemo(() => {
    const grouped = Array.from(
      legacyIncentives.reduce((map, row) => {
        const key = row.RaceID || `unknown-${row.ConditionID}`;
        if (!map.has(key)) {
          map.set(key, {
            key,
            RaceID: row.RaceID,
            TrackID: row.TrackID,
            Day: row.Day,
            raceLabel: row.TrackID ? (raceAbbrevs[row.TrackID] || row.RaceID) : `${row.RaceID ?? "?"}`,
            items: [],
          });
        }
        map.get(key).items.push(row);
        return map;
      }, new Map()).values()
    ).map((race) => {
      const isFinished = Number(race.Day || 0) > 0 && Number(race.Day) <= Number(currentDay || 0);
      return {
        ...race,
        isFinished,
        items: race.items.map((row) => ({
          ...row,
          DerivedStatus: Number(row.Achieved)
            ? "achieved"
            : isFinished
              ? "failed"
              : "pending",
        })),
      };
    }).sort((left, right) => Number(right.RaceID || 0) - Number(left.RaceID || 0));

    return {
      finished: grouped.filter((race) => race.isFinished),
      upcoming: grouped.filter((race) => !race.isFinished),
    };
  }, [currentDay, legacyIncentives]);

  if (mode === "legacy") {
    const acceptedObligations = legacyObligations.filter((row) => Number(row.Accepted));
    const achievedIncentives = legacyIncentives.filter((row) => Number(row.Achieved));
    const failedIncentives = legacyIncentiveGroups.finished.flatMap((race) => race.items).filter((row) => row.DerivedStatus === "failed");
    const pendingIncentives = legacyIncentiveGroups.upcoming.flatMap((race) => race.items).filter((row) => row.DerivedStatus === "pending");

    return (
      <div className="grid gap-4">
        <section className="border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Commercial Ops</div>
              <h2 className="mt-2 text-lg font-bold text-white">Legacy Sponsorship Manager</h2>
              <p className="mt-2 max-w-[880px] text-sm text-slate-400">
                F1 Manager 2023 uses obligations plus guarantees and incentives instead of active sponsor slots. This view keeps that older structure readable.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[440px]">
              {[
                { label: "Accepted", value: acceptedObligations.length },
                { label: "All Obligations", value: legacyObligations.length },
                { label: "Achieved", value: achievedIncentives.length },
                { label: "Failed", value: failedIncentives.length },
                { label: "Pending", value: pendingIncentives.length },
              ].map((item) => (
                <div key={item.label} className="border border-white/10 bg-black/10 p-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                  <div className="mt-1 text-base font-semibold text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border border-white/10 bg-white/[0.015] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Contract Obligations</div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {legacyObligations.map((row) => {
              const progressPct = row.Quantity > 0 ? clampPercentage(Number(row.Progress || 0), Number(row.Quantity || 0)) : 0;
              return (
                <div key={`legacy-obligation-${row.id}`} className="border border-white/10 bg-black/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{row.Label}</div>
                      <div className="mt-1 text-xs text-slate-500">{row.UnitLabel}</div>
                    </div>
                    <div className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${Number(row.Accepted) ? "border-emerald-300/30 bg-emerald-500/[0.08] text-emerald-100" : "border-white/10 bg-white/[0.03] text-slate-300"}`}>
                      {Number(row.Accepted) ? "Accepted" : "Not accepted"}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Target</div>
                      <div className="mt-1 font-semibold text-white">{row.Quantity}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Progress</div>
                      <div className="mt-1 font-semibold text-white">{row.Progress}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Minimum</div>
                      <div className="mt-1 font-semibold text-white">{row.MandatoryMin}</div>
                    </div>
                  </div>
                  <div className="mt-3 h-2 border border-white/10 bg-white/[0.03]">
                    <div className="h-full bg-[linear-gradient(90deg,#7dd3fc,#38bdf8)]" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border border-white/10 bg-white/[0.015]">
          <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Guarantees & Incentives</div>
          <div className="px-4 py-4">
            <div className="grid gap-4">
              {[
                { key: "finished", title: "Finished", rows: legacyIncentiveGroups.finished },
                { key: "upcoming", title: "Upcoming", rows: legacyIncentiveGroups.upcoming },
              ].map((section) => (
                <div key={section.key} className="grid gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{section.title}</div>
                  {section.rows.length ? (
                    <div className="overflow-x-auto">
                      <div className="flex min-w-full gap-3">
                        {section.rows.map((race) => (
                          <div key={`legacy-race-${section.key}-${race.key}`} className="w-[320px] shrink-0 border border-white/10 bg-black/10">
                            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                              {race.TrackID ? <img src={`/flags/${raceFlags[race.TrackID]}.svg`} alt="" className="h-[16px] w-6 border border-white/10 object-cover" /> : null}
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-white">{race.raceLabel}</div>
                                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                                  {race.items.length} item{race.items.length === 1 ? "" : "s"}
                                </div>
                              </div>
                            </div>
                            <div className="grid">
                              {race.items.map((row, index) => (
                                <div
                                  key={`legacy-incentive-${row.id}`}
                                  className={`grid gap-2 px-4 py-3 ${index > 0 ? "border-t border-white/5" : ""}`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold text-slate-100">{row.Label}</div>
                                      <div className="mt-1 text-xs text-slate-400">{row.TargetText}</div>
                                    </div>
                                    <span className={`shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                      row.DerivedStatus === "achieved"
                                        ? "border-emerald-300/30 bg-emerald-500/[0.08] text-emerald-100"
                                        : row.DerivedStatus === "failed"
                                          ? "border-rose-300/30 bg-rose-500/[0.08] text-rose-100"
                                          : "border-amber-300/30 bg-amber-500/[0.08] text-amber-100"
                                    }`}>
                                      {row.DerivedStatus === "achieved" ? "Achieved" : row.DerivedStatus === "failed" ? "Failed" : "Pending"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                                    <span>{row.IsIncentive ? "Incentive" : "Guarantee"}</span>
                                    <span>
                                      {Number(row.NumDrivers) > 0 ? `${row.NumDrivers} driver${Number(row.NumDrivers) === 1 ? "" : "s"}` : "Single condition"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-400">No {section.title.toLowerCase()} race guarantees or incentives.</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  const titleSponsor = rows.find((row) => Number(row.SponsorType) === 0) || null;
  const secondarySponsors = rows.filter((row) => Number(row.SponsorType) === 1).sort((a, b) => Number(a.Slot) - Number(b.Slot));
  const titleOptions = availableRows.filter((row) => Number(row.SponsorType) === 0);
  const secondaryOptions = availableRows.filter((row) => Number(row.SponsorType) === 1);
  const completedBonuses = bonusRows.filter((row) => row.State === 2);
  const activeSponsorCount = rows.length;
  const availableSponsorCount = availableRows.length;
  const linkedAffiliates = secondaryRows.filter((row) => row.Affiliate && row.Affiliate !== "-").length;
  const completedRaceColumns = useMemo(() => (
    Array.from(
      completedBonuses.reduce((map, row) => {
        if (!map.has(row.RaceID)) {
          map.set(row.RaceID, {
            RaceID: row.RaceID,
            TrackID: row.TrackID,
            Race: row.Race,
          });
        }
        return map;
      }, new Map()).values()
    ).sort((left, right) => Number(right.RaceID) - Number(left.RaceID))
  ), [completedBonuses]);
  const completedBonusMatrix = useMemo(() => {
    const driverMap = new Map();
    completedBonuses.forEach((row) => {
      const key = `${row.DriverID}-${row.RaceID}`;
      const current = driverMap.get(row.DriverID) || {
        id: row.DriverID,
        DriverID: row.DriverID,
        Driver: row.Driver,
      };
      const existingCell = current[key];
      const difficultyRank = Number(row.Difficulty);
      const shouldReplace = !existingCell
        || (row.Selected && !existingCell.Selected)
        || (Boolean(row.Selected) === Boolean(existingCell.Selected) && difficultyRank < Number(existingCell.Difficulty));
      if (shouldReplace) {
        current[key] = row;
      }
      driverMap.set(row.DriverID, current);
    });
    return Array.from(driverMap.values()).sort((left, right) => left.Driver.localeCompare(right.Driver));
  }, [completedBonuses]);

  const updateActiveSponsor = (rowId, sponsorId) => {
    try {
      database.exec(
        `UPDATE Sponsorship_ActivePackages
         SET SponsorID = :sponsorId
         WHERE rowid = :rowId`,
        {
          ":sponsorId": Number(sponsorId),
          ":rowId": Number(rowId),
        }
      );
      onRefresh();
      enqueueSnackbar("Updated sponsor slot", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(`Failed to update sponsor slot: ${error.message || error}`, { variant: "error" });
    }
  };

  return (
    <div className="grid gap-4">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Commercial Ops</div>
            <h2 className="mt-2 text-lg font-bold text-white">Sponsorship Manager</h2>
            <p className="mt-2 max-w-[880px] text-sm text-slate-400">
              Change the active title and secondary sponsor packages for each slot. This page stays focused on partner lineup changes, not race-bonus administration.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[440px]">
            {[
              { label: "Active", value: activeSponsorCount },
              { label: "Secondary", value: secondarySponsors.length },
              { label: "Available", value: availableSponsorCount },
              { label: "Affiliates", value: linkedAffiliates },
            ].map((item) => (
              <div key={item.label} className="border border-white/10 bg-black/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                <div className="mt-1 text-base font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015] p-5">
        <div className="grid gap-5">
          <div className="grid gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Title Sponsor</div>
            {titleSponsor ? (
              <div className="grid items-center gap-3 md:grid-cols-[120px_140px_minmax(0,320px)_minmax(0,1fr)]">
                <div className="text-sm font-medium text-slate-300">Primary slot</div>
                <div className="text-base font-semibold text-white">Sponsor {titleSponsor.SponsorID}</div>
                <select
                  value={titleSponsor.SponsorID}
                  onChange={(event) => updateActiveSponsor(titleSponsor.id, event.target.value)}
                  className="w-full border border-white/10 bg-[#131a22] px-3 py-2.5 text-sm text-white outline-none"
                >
                  {titleOptions.map((option) => (
                    <option key={`title-option-${option.SponsorID}`} value={option.SponsorID}>
                      Sponsor {option.SponsorID}
                    </option>
                  ))}
                </select>
                <div className="text-sm text-slate-500">
                  {titleSponsor?.Engagement !== undefined && titleSponsor?.Engagement !== null ? `Engagement ${titleSponsor.Engagement}` : ""}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">No title sponsor slot is available for this team.</div>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Secondary Sponsors</div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{secondarySponsors.length} slots</div>
            </div>
            <div className="grid gap-3 xl:grid-cols-5">
              {secondarySponsors.map((sponsorRow) => (
                <div key={`secondary-slot-${sponsorRow.id}`} className="grid gap-2">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Slot {sponsorRow.Slot}</div>
                  <div className="text-sm font-semibold text-white">Sponsor {sponsorRow.SponsorID}</div>
                  <select
                    value={sponsorRow.SponsorID}
                    onChange={(event) => updateActiveSponsor(sponsorRow.id, event.target.value)}
                    className="w-full border border-white/10 bg-[#131a22] px-3 py-2.5 text-sm text-white outline-none"
                  >
                    {secondaryOptions.map((option) => (
                      <option key={`secondary-option-${sponsorRow.id}-${option.SponsorID}`} value={option.SponsorID}>
                        Sponsor {option.SponsorID}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-500">
                    {secondaryRows
                      .filter((row) => Number(row.SponsorID) === Number(sponsorRow.SponsorID) && row.Affiliate && row.Affiliate !== "-")
                      .slice(0, 2)
                      .map((row) => row.Affiliate)
                      .join(" · ") || "No linked affiliate"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Completed Bonus History</div>
        <div className="overflow-x-auto">
          <table className="min-w-max border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="sticky left-0 z-[1] w-[150px] bg-[#11181f] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Driver
                </th>
                {completedRaceColumns.map((race) => (
                  <th
                    key={`completed-race-${race.RaceID}`}
                    className="min-w-[62px] px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                    title={race.Race}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <img src={`/flags/${raceFlags[race.TrackID]}.svg`} alt={race.Race} className="h-[14px] w-6 border border-white/10 object-cover" />
                      <span>{raceAbbrevs[race.TrackID] || race.Race}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {completedBonusMatrix.map((driverRow) => (
                <tr key={`completed-driver-${driverRow.DriverID}`} className="border-b border-white/5">
                  <td className="sticky left-0 bg-[#11181f] px-3 py-2 text-sm font-medium text-white">{driverRow.Driver}</td>
                  {completedRaceColumns.map((race) => {
                    const cell = driverRow[`${driverRow.DriverID}-${race.RaceID}`];
                    const difficultyLabel = cell ? { 0: "H", 1: "M", 2: "E" }[Number(cell.Difficulty)] || "-" : null;
                    const stateClass = !cell || !cell.Selected
                      ? "text-slate-500"
                      : cell.Achieved
                        ? "text-emerald-300"
                        : "text-rose-300";
                    return (
                      <td key={`completed-cell-${driverRow.DriverID}-${race.RaceID}`} className="px-1.5 py-2 text-center">
                        {cell ? (
                          <div
                            className={`inline-grid gap-0.5 ${stateClass}`}
                            title={`${race.Race}: ${cell.Selected ? `Target P${cell.Position} / Finish P${cell.FinishPosition ?? "-"}` : `Finish P${cell.FinishPosition ?? "-"}`}`}
                          >
                            <span className="text-[12px] font-semibold leading-none">{cell.Selected ? `P${cell.Position}` : "—"}</span>
                            <span className="text-[9px] uppercase leading-none tracking-[0.08em]">{cell.Selected ? difficultyLabel : "—"}</span>
                            <span className="text-[9px] leading-none text-slate-500">R{cell.FinishPosition ?? "-"}</span>
                          </div>
                        ) : (
                          <span className="text-[12px] text-slate-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BoardWorkspace({ confidenceRows, objectiveRows, ratingRows, paymentRows, balanceRows, currentSeason, onRefresh, teamId, showHeader = true }) {
  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);
  const { version, careerSaveMetadata } = useContext(MetadataContext);
  const { logoStyle = "normal" } = useContext(UiSettingsContext);
  const { enqueueSnackbar } = useSnackbar();
  const { player, teamMap, teamIds } = basicInfo;
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

function InboxWorkspace({ mailRows, eventRows, onRefresh, currentDay }) {
  const database = useContext(DatabaseContext);
  const { enqueueSnackbar } = useSnackbar();
  const unreadCount = mailRows.filter((row) => row.Unread).length;
  const flaggedCount = mailRows.filter((row) => row.Flagged).length;
  const recentEventCount = eventRows.filter((row) => row.Day >= currentDay - 30).length;

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Inbox Triage</div>
            <h2 className="mt-2 text-lg font-bold text-white">Mail & Event Review</h2>
            <p className="mt-2 max-w-[880px] text-sm text-slate-400">
              Mark inbox items read or flagged and keep an eye on the recent event log without touching attachment tables directly.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:min-w-[420px]">
            {[
              { label: "Unread", value: unreadCount },
              { label: "Flagged", value: flaggedCount },
              { label: "Recent Events", value: recentEventCount },
            ].map((item) => (
              <div key={item.label} className="border border-white/10 bg-black/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                <div className="mt-1 text-base font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              try {
                database.exec("UPDATE Mail_Inbox SET Unread = 0");
                onRefresh();
                enqueueSnackbar("Marked all inbox entries as read", { variant: "success" });
              } catch (error) {
                enqueueSnackbar(`Failed to update inbox: ${error.message || error}`, { variant: "error" });
              }
            }}
          >
            Mark All Read
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              try {
                database.exec("UPDATE Mail_Inbox SET Flagged = 0");
                onRefresh();
                enqueueSnackbar("Cleared inbox flags", { variant: "success" });
              } catch (error) {
                enqueueSnackbar(`Failed to clear flags: ${error.message || error}`, { variant: "error" });
              }
            }}
          >
            Clear All Flags
          </Button>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Inbox</div>
        <DataGrid
          autoHeight
          disableRowSelectionOnClick
          rows={mailRows}
          processRowUpdate={(newRow, oldRow) => {
            try {
              database.exec(
                `UPDATE Mail_Inbox
                 SET Unread = :unread,
                     Flagged = :flagged
                 WHERE MailID = :mailId`,
                {
                  ":unread": newRow.Unread ? 1 : 0,
                  ":flagged": newRow.Flagged ? 1 : 0,
                  ":mailId": newRow.MailID,
                }
              );
              onRefresh();
              return newRow;
            } catch (error) {
              enqueueSnackbar(`Failed to update mail row: ${error.message || error}`, { variant: "error" });
              return oldRow;
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 20 } },
          }}
          pageSizeOptions={[20, 40]}
          columns={[
            { field: "MailID", headerName: "#", width: 80 },
            { field: "Date", headerName: "Date", width: 120 },
            { field: "SubjectLabel", headerName: "Subject", flex: 1, minWidth: 260 },
            { field: "SenderLabel", headerName: "Sender", width: 180 },
            { field: "Unread", headerName: "Unread", width: 100, editable: true, type: "boolean" },
            { field: "Flagged", headerName: "Flagged", width: 100, editable: true, type: "boolean" },
            { field: "ReferenceID", headerName: "Ref", width: 90 },
          ]}
        />
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Recent Event Log</div>
        <DataGrid
          autoHeight
          hideFooter
          disableRowSelectionOnClick
          rows={eventRows}
          columns={[
            { field: "EventLogID", headerName: "#", width: 80 },
            { field: "Date", headerName: "Date", width: 120 },
            { field: "EntryTypeLabel", headerName: "Type", width: 180 },
            { field: "ReferenceID", headerName: "Ref", width: 100 },
          ]}
        />
      </section>
    </div>
  );
}

function SportingWorkspace({ pitStopRows, timingRows, inspectionRows, penaltyCount, onRefresh, currentSeason }) {
  const database = useContext(DatabaseContext);
  const { enqueueSnackbar } = useSnackbar();
  const existingTables = useMemo(() => getExistingTableSet(database), [database]);
  const failedInspections = inspectionRows.filter((row) => row.Result === 2 || row.Result === 3).length;

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Sporting Audit</div>
            <h2 className="mt-2 text-lg font-bold text-white">Pit Stops, Penalties & Inspection Results</h2>
            <p className="mt-2 max-w-[880px] text-sm text-slate-400">
              Inspect extra race data that already lives in the save and adjust the cleanly editable parts without dropping into raw SQL.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:min-w-[420px]">
            {[
              { label: "Pit Stop Awards", value: pitStopRows.length },
              { label: "Failed Inspections", value: failedInspections },
              { label: "Grid Penalties", value: penaltyCount },
            ].map((item) => (
              <div key={item.label} className="border border-white/10 bg-black/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                <div className="mt-1 text-base font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              try {
                database.exec("DELETE FROM Races_GridPenalties");
                onRefresh();
                enqueueSnackbar("Cleared stored grid penalties", { variant: "success" });
              } catch (error) {
                enqueueSnackbar(`Failed to clear penalties: ${error.message || error}`, { variant: "error" });
              }
            }}
          >
            Clear Grid Penalties
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => {
              try {
                database.exec(
                  `UPDATE Parts_InspectionResults
                   SET Result = 0
                   WHERE Result IN (2, 3)`
                );
                onRefresh();
                enqueueSnackbar("Reset failed and destroyed inspections to exempt", { variant: "success" });
              } catch (error) {
                enqueueSnackbar(`Failed to reset inspections: ${error.message || error}`, { variant: "error" });
              }
            }}
          >
            Clear Failed Inspections
          </Button>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Pit Stop Results</div>
        <DataGrid
          autoHeight
          disableRowSelectionOnClick
          rows={pitStopRows}
          processRowUpdate={(newRow, oldRow) => {
            try {
              database.exec(
                `UPDATE Races_PitStopResults
                 SET Points = :points
                 WHERE SeasonID = :seasonId
                   AND RaceID = :raceId
                   AND TeamID = :teamId
                   AND FinishPosition = :finishPosition`,
                {
                  ":points": Number(newRow.Points),
                  ":seasonId": newRow.SeasonID,
                  ":raceId": newRow.RaceID,
                  ":teamId": newRow.TeamID,
                  ":finishPosition": newRow.FinishPosition,
                }
              );

              recalculateRaceStandings({
                database,
                season: currentSeason,
                tableSet: existingTables,
              });

              onRefresh();
              return newRow;
            } catch (error) {
              enqueueSnackbar(`Failed to update pit stop points: ${error.message || error}`, { variant: "error" });
              return oldRow;
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 20 } },
          }}
          pageSizeOptions={[20, 40]}
          columns={[
            { field: "Race", headerName: "Race", width: 150 },
            { field: "Team", headerName: "Team", width: 170 },
            { field: "Driver", headerName: "Driver", width: 170 },
            { field: "FinishPosition", headerName: "Finish", width: 90 },
            { field: "FastestPitStopTime", headerName: "Best Stop", width: 110 },
            { field: "Points", headerName: "Points", width: 90, editable: true, type: "number" },
          ]}
        />
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Pit Stop Timing Detail</div>
        <DataGrid
          autoHeight
          disableRowSelectionOnClick
          rows={timingRows}
          initialState={{
            pagination: { paginationModel: { pageSize: 20 } },
          }}
          pageSizeOptions={[20, 40]}
          columns={[
            { field: "Race", headerName: "Race", width: 150 },
            { field: "Team", headerName: "Team", width: 170 },
            { field: "Driver", headerName: "Driver", width: 170 },
            { field: "PitStopID", headerName: "Stop", width: 80 },
            { field: "PitStopStage", headerName: "Stage", width: 90 },
            { field: "Lap", headerName: "Lap", width: 80 },
            { field: "Duration", headerName: "Duration", width: 100 },
            { field: "IncidentDelay", headerName: "Delay", width: 90 },
          ]}
        />
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Inspection Results</div>
        <DataGrid
          autoHeight
          disableRowSelectionOnClick
          rows={inspectionRows}
          processRowUpdate={(newRow, oldRow) => {
            try {
              database.exec(
                `UPDATE Parts_InspectionResults
                 SET Result = :result
                 WHERE ItemID = :itemId
                   AND RaceID = :raceId`,
                {
                  ":result": Number(newRow.Result),
                  ":itemId": newRow.ItemID,
                  ":raceId": newRow.RaceID,
                }
              );
              onRefresh();
              return newRow;
            } catch (error) {
              enqueueSnackbar(`Failed to update inspection result: ${error.message || error}`, { variant: "error" });
              return oldRow;
            }
          }}
          initialState={{
            pagination: { paginationModel: { pageSize: 20 } },
          }}
          pageSizeOptions={[20, 40]}
          columns={[
            { field: "Race", headerName: "Race", width: 150 },
            { field: "ItemNameLabel", headerName: "Item", flex: 1, minWidth: 260 },
            { field: "LoadoutID", headerName: "Car", width: 80 },
            {
              field: "Result",
              headerName: "Result",
              width: 150,
              editable: true,
              type: "singleSelect",
              valueOptions: Object.entries(inspectionStateLabels).map(([value, label]) => ({
                value: Number(value),
                label,
              })),
              valueFormatter: ({ value }) => inspectionStateLabels[value] || value,
            },
          ]}
        />
      </section>
    </div>
  );
}

export default function SaveOperations({
  visibleTabs = null,
  titleEyebrow = "Save Operations",
  title = "Editor Extensions",
  description = "These panels expose structured save data that was previously only reachable through SQL. They are scoped to fields that match the 2024 schema cleanly and avoid deleting attachment-heavy records.",
  showLimitNote = true,
}) {
  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { version } = metadata;
  const [updated, setUpdated] = useState(0);
  const [activeTab, setActiveTab] = useState((visibleTabs && visibleTabs[0]) || "sponsorship");

  const currentSeason = basicInfo.player.CurrentSeason;
  const currentDay = basicInfo.player.Day;
  const teamId = basicInfo.player.TeamID;
  const teamMap = basicInfo.teamMap;
  const driverMap = basicInfo.driverMap;

  const [sponsorshipRows, setSponsorshipRows] = useState([]);
  const [availableSponsorRows, setAvailableSponsorRows] = useState([]);
  const [secondarySponsorRows, setSecondarySponsorRows] = useState([]);
  const [bonusRows, setBonusRows] = useState([]);
  const [sponsorshipMode, setSponsorshipMode] = useState("modern");
  const [legacyObligationRows, setLegacyObligationRows] = useState([]);
  const [legacyIncentiveRows, setLegacyIncentiveRows] = useState([]);
  const [confidenceRows, setConfidenceRows] = useState([]);
  const [objectiveRows, setObjectiveRows] = useState([]);
  const [ratingRows, setRatingRows] = useState([]);
  const [paymentRows, setPaymentRows] = useState([]);
  const [balanceRows, setBalanceRows] = useState([]);
  const [mailRows, setMailRows] = useState([]);
  const [eventRows, setEventRows] = useState([]);
  const [pitStopRows, setPitStopRows] = useState([]);
  const [timingRows, setTimingRows] = useState([]);
  const [inspectionRows, setInspectionRows] = useState([]);
  const [penaltyCount, setPenaltyCount] = useState(0);

  const refresh = () => {
    basicInfoUpdater({});
    setUpdated(Date.now());
  };

  const nextRaceName = useMemo(() => {
    const nextRace = basicInfo.currentSeasonRaces.find((race) => race.State === 0);
    return nextRace?.Name || null;
  }, [basicInfo.currentSeasonRaces]);

  useEffect(() => {
    if (!database) {
      return;
    }

    const existingTables = getExistingTableSet(database);
    const hasModernSponsorship = existingTables.has("Sponsorship_ActivePackages");

    setSponsorshipMode(hasModernSponsorship ? "modern" : "legacy");

    if (hasModernSponsorship) {
      const activeSponsors = readRows(
        database,
        `SELECT rowid AS id, TeamID, SponsorID, SponsorType, Engagement, Slot
         FROM Sponsorship_ActivePackages
         WHERE TeamID = :teamId
         ORDER BY SponsorType ASC, Slot ASC, SponsorID ASC`,
        {
          ":teamId": teamId,
        }
      );
      setSponsorshipRows(activeSponsors);

      const availableSponsors = readRows(
        database,
        `SELECT rowid AS id, TeamID, SponsorID, SponsorType
         FROM Sponsorship_AvailablePackages
         WHERE TeamID = :teamId
         ORDER BY SponsorType ASC, SponsorID ASC`,
        {
          ":teamId": teamId,
        }
      );
      setAvailableSponsorRows(availableSponsors);

      const secondaryBonuses = readRows(
        database,
        `SELECT rowid AS id, TeamID, SponsorID, ActiveEffectID, AffiliateID
         FROM Sponsorship_ActivePackages_SecondaryBonuses
         WHERE TeamID = :teamId
         ORDER BY SponsorID ASC, ActiveEffectID ASC`,
        {
          ":teamId": teamId,
        }
      ).map((row) => ({
        ...row,
        Affiliate: row.AffiliateID ? getDriverName(driverMap[row.AffiliateID]) : "-",
      }));
      setSecondarySponsorRows(secondaryBonuses);
    } else {
      setSponsorshipRows([]);
      setAvailableSponsorRows([]);
      setSecondarySponsorRows([]);

      const legacyObligations = readRows(
        database,
        `SELECT Sponsorship_ContractObligations.TeamID,
                Sponsorship_ContractObligations.ObligationID,
                Sponsorship_ContractObligations.Accepted,
                Sponsorship_ContractObligations.Quantity,
                Sponsorship_ContractObligations.Progress,
                Sponsorship_ContractObligations.MandatoryMin,
                Sponsorship_ContractObligations.PosInTeam,
                Sponsorship_Enum_Obligations.LocKey,
                Sponsorship_Enum_Obligations.UnitTypeLocKey
         FROM Sponsorship_ContractObligations
         LEFT JOIN Sponsorship_Enum_Obligations
           ON Sponsorship_Enum_Obligations.ObligationID = Sponsorship_ContractObligations.ObligationID
         WHERE Sponsorship_ContractObligations.TeamID = :teamId
         ORDER BY Sponsorship_ContractObligations.Accepted DESC, Sponsorship_ContractObligations.ObligationID ASC`,
        { ":teamId": teamId }
      ).map((row) => ({
        ...row,
        id: `${row.TeamID}-${row.ObligationID}`,
        Label: resolveLiteral(row.LocKey || row.ObligationID),
        UnitLabel: resolveLiteral(row.UnitTypeLocKey || ""),
      }));
      setLegacyObligationRows(legacyObligations);

      const legacyIncentives = readRows(
        database,
        `SELECT Sponsorship_GuaranteesAndIncentives.TeamID,
                Sponsorship_GuaranteesAndIncentives.ConditionID,
                Sponsorship_GuaranteesAndIncentives.RaceID,
                Sponsorship_GuaranteesAndIncentives.IsIncentive,
                Sponsorship_GuaranteesAndIncentives.Achieved,
                Sponsorship_GuaranteesAndIncentives.NumDrivers,
                Sponsorship_GuaranteesAndIncentives.RacePosition,
                Sponsorship_GuaranteesAndIncentives.StreakLength,
                Sponsorship_GuaranteesAndIncentives.Driver1TargetPos,
                Sponsorship_GuaranteesAndIncentives.Driver2TargetPos,
                Sponsorship_Enum_Conditions.LocKey,
                Races.TrackID,
                Races.Day
         FROM Sponsorship_GuaranteesAndIncentives
         LEFT JOIN Sponsorship_Enum_Conditions
           ON Sponsorship_Enum_Conditions.ConditionID = Sponsorship_GuaranteesAndIncentives.ConditionID
         LEFT JOIN Races
           ON Races.RaceID = Sponsorship_GuaranteesAndIncentives.RaceID
         WHERE Sponsorship_GuaranteesAndIncentives.TeamID = :teamId
         ORDER BY Sponsorship_GuaranteesAndIncentives.RaceID DESC, Sponsorship_GuaranteesAndIncentives.ConditionID ASC`,
        { ":teamId": teamId }
      ).map((row) => ({
        ...row,
        id: `${row.TeamID}-${row.ConditionID}-${row.RaceID}`,
        Label: resolveLiteral(row.LocKey || row.ConditionID),
        TargetText:
          Number(row.RacePosition) > 0 ? `Finish P${row.RacePosition}` :
          Number(row.StreakLength) > 0 ? `${row.StreakLength}-race streak` :
          Number(row.Driver1TargetPos) > 0 || Number(row.Driver2TargetPos) > 0
            ? `D1 P${row.Driver1TargetPos || "-"} · D2 P${row.Driver2TargetPos || "-"}`
            : Number(row.NumDrivers) > 0 ? `${row.NumDrivers} driver target` : "Condition target",
      }));
      setLegacyIncentiveRows(legacyIncentives);
    }

    const contractTypeRows = readRows(
      database,
      `SELECT Value
       FROM Staff_Enum_ContractType
       WHERE Name = 'Current'`
    );
    const currentContractType = contractTypeRows[0]?.Value ?? 0;

    const currentDrivers = readRows(
      database,
      `SELECT Staff_GameData.StaffID
       FROM Staff_GameData
       JOIN Staff_Contracts ON Staff_GameData.StaffID = Staff_Contracts.StaffID
       WHERE Staff_Contracts.TeamID = :teamId
         AND Staff_Contracts.ContractType = :contractType
         AND Staff_GameData.StaffType = 0`,
      {
        ":teamId": teamId,
        ":contractType": currentContractType,
      }
    ).map((row) => row.StaffID);

    const bonusQuery = currentDrivers.length
      ? `
        SELECT Sponsorship_RaceBonuses.DriverID,
               Sponsorship_RaceBonuses.RaceID,
               Sponsorship_RaceBonuses.Difficulty,
               Sponsorship_RaceBonuses.Position,
               Sponsorship_RaceBonuses.Selected,
               Sponsorship_RaceBonuses.Achieved,
               Races.State,
               Races.TrackID
        FROM Sponsorship_RaceBonuses
        JOIN Races ON Races.RaceID = Sponsorship_RaceBonuses.RaceID
        WHERE Sponsorship_RaceBonuses.DriverID IN (${currentDrivers.join(",")})
          AND Races.SeasonID = :season
        ORDER BY Sponsorship_RaceBonuses.RaceID DESC, Sponsorship_RaceBonuses.DriverID ASC, Sponsorship_RaceBonuses.Difficulty ASC
      `
      : `SELECT 0 AS DriverID, 0 AS RaceID, 0 AS Difficulty, 0 AS Position, 0 AS Selected, 0 AS Achieved, 0 AS State, 0 AS TrackID WHERE 0`;

    const raceResultMap = currentDrivers.length
      ? readRows(
        database,
        `SELECT DriverID, RaceID, FinishPosition
         FROM Races_RaceResults
         WHERE SeasonID = :season
           AND DriverID IN (${currentDrivers.join(",")})`,
        { ":season": currentSeason }
      ).reduce((acc, row) => {
        acc[`${row.DriverID}-${row.RaceID}`] = row.FinishPosition;
        return acc;
      }, {})
      : {};

    const bonusData = readRows(database, bonusQuery, { ":season": currentSeason }).map((row, index) => ({
      id: `${row.DriverID}-${row.RaceID}-${row.Difficulty}-${index}`,
      ...row,
      Selected: Boolean(row.Selected),
      Achieved: Boolean(row.Achieved),
      FinishPosition: raceResultMap[`${row.DriverID}-${row.RaceID}`] ?? null,
      Driver: getDriverName(driverMap[row.DriverID]),
      Race: circuitNames[row.TrackID] || `Race ${row.RaceID}`,
      Status: row.State === 2 ? "Completed" : row.State === 1 ? "Active" : "Upcoming",
    }));
    setBonusRows(bonusData);

    const confidenceData = readRows(
      database,
      `SELECT Season AS id, Season, Confidence
       FROM Board_Confidence
       ORDER BY Season DESC`
    );
    setConfidenceRows(confidenceData);

    const objectiveData = readRows(
      database,
      `SELECT TeamID, SeasonID, TargetPos, State
       FROM Board_SeasonObjectives
       ORDER BY SeasonID DESC`,
    ).map((row) => ({
      ...row,
      id: `${row.TeamID}-${row.SeasonID}`,
    }));
    setObjectiveRows(objectiveData);

    const ratingData = existingTables.has("Board_TeamRating")
      ? readRows(
        database,
        `SELECT *
         FROM Board_TeamRating
         ORDER BY SeasonID DESC`
      ).map((row) => ({
        ...row,
        PtsFromNewTeamHype: Number(row.PtsFromNewTeamHype || 0),
        id: `${row.TeamID}-${row.SeasonID}`,
      }))
      : readRows(
        database,
        `SELECT *
         FROM Board_Prestige
         ORDER BY SeasonID DESC`
      ).map((row) => ({
        ...row,
        PtsFromNewTeamHype: 0,
        id: `${row.TeamID}-${row.SeasonID}`,
      }));
    setRatingRows(ratingData);

    const boardPaymentData = readRows(
      database,
      `SELECT SeasonExpectation, Budget
       FROM Board_Payments
       ORDER BY SeasonExpectation ASC`
    ).map((row) => ({
      ...row,
      id: row.SeasonExpectation,
    }));
    setPaymentRows(boardPaymentData);

    const teamBalanceData = readRows(
      database,
      `SELECT TeamID, Balance
       FROM Finance_TeamBalance
       ORDER BY TeamID ASC`
    ).map((row) => ({
      ...row,
      id: row.TeamID,
    }));
    setBalanceRows(teamBalanceData);

    const mailData = readRows(
      database,
      `SELECT MailID AS id, MailID, Day, Subject, SenderName, Unread, Flagged, ReferenceID
       FROM Mail_Inbox
       ORDER BY MailID DESC
       LIMIT 120`
    ).map((row) => ({
      ...row,
      Date: row.Day ? formatDate(dayToDate(row.Day)) : "-",
      SubjectLabel: resolveLiteral(row.Subject || ""),
      SenderLabel: resolveLiteral(row.SenderName || "") || "-",
      Unread: Boolean(row.Unread),
      Flagged: Boolean(row.Flagged),
    }));
    setMailRows(mailData);

    const eventData = readRows(
      database,
      `SELECT EventLogID AS id, EventLogID, Day, EntryType, ReferenceID
       FROM EventLogs
       ORDER BY EventLogID DESC
       LIMIT 40`
    ).map((row) => ({
      ...row,
      Date: formatDate(dayToDate(row.Day)),
      EntryTypeLabel: eventTypeLabels[row.EntryType] || row.EntryType,
    }));
    setEventRows(eventData);

    const pitStops = readRows(
      database,
      `SELECT Races_PitStopResults.SeasonID,
              Races_PitStopResults.RaceID,
              Races_PitStopResults.TeamID,
              Races_PitStopResults.FinishPosition,
              Races_PitStopResults.FastestPitStopTime,
              Races_PitStopResults.DriverID,
              Races_PitStopResults.Points,
              Races.TrackID
       FROM Races_PitStopResults
       JOIN Races ON Races.RaceID = Races_PitStopResults.RaceID
       WHERE Races_PitStopResults.SeasonID = :season
       ORDER BY Races_PitStopResults.RaceID DESC, Races_PitStopResults.FinishPosition ASC`,
      {
        ":season": currentSeason,
      }
    ).map((row) => ({
      id: `${row.SeasonID}-${row.RaceID}-${row.TeamID}-${row.FinishPosition}`,
      ...row,
      Race: circuitNames[row.TrackID] || `Race ${row.RaceID}`,
      Team: getTeamDisplayName(teamMap, row.TeamID, version),
      Driver: getDriverName(driverMap[row.DriverID]),
      FastestPitStopTime: Number(row.FastestPitStopTime).toFixed(3),
    }));
    setPitStopRows(pitStops);

    const timingData = readRows(
      database,
      `SELECT Races_PitStopTimings.SeasonID,
              Races_PitStopTimings.RaceID,
              Races_PitStopTimings.TeamID,
              Races_PitStopTimings.DriverID,
              Races_PitStopTimings.PitStopID,
              Races_PitStopTimings.PitStopStage,
              Races_PitStopTimings.Duration,
              Races_PitStopTimings.IncidentDelay,
              Races_PitStopTimings.Lap,
              Races.TrackID
       FROM Races_PitStopTimings
       JOIN Races ON Races.RaceID = Races_PitStopTimings.RaceID
       WHERE Races_PitStopTimings.SeasonID = :season
       ORDER BY Races_PitStopTimings.RaceID DESC, Races_PitStopTimings.DriverID ASC, Races_PitStopTimings.PitStopID ASC, Races_PitStopTimings.PitStopStage ASC
       LIMIT 240`,
      {
        ":season": currentSeason,
      }
    ).map((row) => ({
      id: `${row.SeasonID}-${row.RaceID}-${row.TeamID}-${row.DriverID}-${row.PitStopID}-${row.PitStopStage}`,
      ...row,
      Race: circuitNames[row.TrackID] || `Race ${row.RaceID}`,
      Team: getTeamDisplayName(teamMap, row.TeamID, version),
      Driver: getDriverName(driverMap[row.DriverID]),
      Duration: Number(row.Duration).toFixed(3),
      IncidentDelay: Number(row.IncidentDelay).toFixed(3),
    }));
    setTimingRows(timingData);

    const inspectionData = readRows(
      database,
      `SELECT Parts_InspectionResults.ItemID,
              Parts_InspectionResults.RaceID,
              Parts_InspectionResults.LoadoutID,
              Parts_InspectionResults.ItemName,
              Parts_InspectionResults.Result,
              Races.TrackID
       FROM Parts_InspectionResults
       JOIN Races ON Races.RaceID = Parts_InspectionResults.RaceID
       WHERE Races.SeasonID = :season
       ORDER BY Parts_InspectionResults.RaceID DESC, Parts_InspectionResults.ItemID ASC
       LIMIT 200`,
      {
        ":season": currentSeason,
      }
    ).map((row) => ({
      id: `${row.ItemID}-${row.RaceID}`,
      ...row,
      Race: circuitNames[row.TrackID] || `Race ${row.RaceID}`,
      ItemNameLabel: resolveLiteral(row.ItemName),
    }));
    setInspectionRows(inspectionData);

    const penaltyRow = readRows(database, "SELECT COUNT(*) AS Count FROM Races_GridPenalties")[0];
    setPenaltyCount(Number(penaltyRow?.Count || 0));
  }, [basicInfoUpdater, currentSeason, database, driverMap, teamId, teamMap, updated, version]);

  const tabs = [
    {
      id: "sponsorship",
      name: "Sponsorship",
      description: "Packages and race bonuses",
      content: (
        <SponsorshipWorkspace
          rows={sponsorshipRows}
          secondaryRows={secondarySponsorRows}
          availableRows={availableSponsorRows}
          bonusRows={bonusRows}
          nextRaceName={nextRaceName}
          onRefresh={refresh}
          teamId={teamId}
          currentDay={currentDay}
          mode={sponsorshipMode}
          legacyObligations={legacyObligationRows}
          legacyIncentives={legacyIncentiveRows}
        />
      ),
    },
    {
      id: "board",
      name: "Board",
      description: "Confidence and objectives",
      content: (
        <BoardWorkspace
          confidenceRows={confidenceRows}
          objectiveRows={objectiveRows}
          ratingRows={ratingRows}
          paymentRows={paymentRows}
          balanceRows={balanceRows}
          currentSeason={currentSeason}
          onRefresh={refresh}
          teamId={teamId}
          showHeader={!visibleTabs?.length || visibleTabs.length > 1}
        />
      ),
    },
    {
      id: "inbox",
      name: "Inbox",
      description: "Mail and event log",
      content: (
        <InboxWorkspace
          mailRows={mailRows}
          eventRows={eventRows}
          onRefresh={refresh}
          currentDay={currentDay}
        />
      ),
    },
    {
      id: "sporting",
      name: "Sporting",
      description: "Pit stop awards and inspections",
      content: (
        <SportingWorkspace
          pitStopRows={pitStopRows}
          timingRows={timingRows}
          inspectionRows={inspectionRows}
          penaltyCount={penaltyCount}
          onRefresh={refresh}
          currentSeason={currentSeason}
        />
      ),
    },
  ];

  const resolvedTabs = visibleTabs?.length
    ? tabs.filter((tab) => visibleTabs.includes(tab.id))
    : tabs;
  const activeTabData = resolvedTabs.find((tab) => tab.id === activeTab) || resolvedTabs[0];

  useEffect(() => {
    if (!activeTabData && resolvedTabs.length) {
      setActiveTab(resolvedTabs[0].id);
    }
  }, [activeTabData, resolvedTabs]);

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{titleEyebrow}</div>
            <h2 className="mt-2 text-lg font-bold text-white">{title}</h2>
            <p className="mt-2 max-w-[900px] text-sm text-slate-400">
              {description}
            </p>
          </div>
        </div>

        {resolvedTabs.length > 1 ? (
          <div className="mt-4 grid grid-cols-1 gap-1 md:grid-cols-4">
            {resolvedTabs.map((tab) => {
            const selected = tab.id === activeTabData.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border p-4 text-left transition ${
                  selected
                    ? "border-sky-300/60 bg-sky-600/15"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="text-sm font-bold text-white">{tab.name}</div>
                <div className="mt-2 text-xs text-slate-400">{tab.description}</div>
              </button>
            );
            })}
          </div>
        ) : null}
      </section>

      {activeTabData?.content}

      {showLimitNote ? (
        <Alert severity="info">
          <AlertTitle>Current Limits</AlertTitle>
          Finance history, attachment-heavy mail cleanup, and aggregate record rebuilds across `Teams_RaceRecord*` and `Staff_Driver_RaceRecord*` still sit outside the safe editing boundary. Those need schema-aware rebuild logic rather than direct row editing.
        </Alert>
      ) : null}
    </div>
  );
}
