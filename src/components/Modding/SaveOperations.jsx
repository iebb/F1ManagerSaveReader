import {
  BasicInfoContext,
  BasicInfoUpdaterContext,
  DatabaseContext,
  MetadataContext
} from "@/js/Contexts";
import {
  circuitNames,
  dayToDate,
  formatDate,
  getDriverName,
  raceAbbrevs,
  raceFlags,
  resolveLiteral
} from "@/js/localization";
import { getExistingTableSet } from "@/components/Customize/Player/timeMachineUtils";
import { Alert, AlertTitle } from "@mui/material";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import BoardWorkspace from "@/components/Modding/workspaces/BoardWorkspace";
import InboxWorkspace from "@/components/Modding/workspaces/InboxWorkspace";
import SportingWorkspace from "@/components/Modding/workspaces/SportingWorkspace";
import PitStopWorkspace from "@/components/Modding/workspaces/PitStopWorkspace";
import {
  eventTypeLabels,
  getTeamDisplayName,
  normalizePitStopSeconds,
  readRows
} from "@/components/Modding/saveOperationsShared";

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
      FastestPitStopTime: normalizePitStopSeconds(row.FastestPitStopTime),
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
      description: "Penalties and inspections",
      content: (
        <SportingWorkspace
          inspectionRows={inspectionRows}
          penaltyCount={penaltyCount}
          onRefresh={refresh}
          currentSeason={currentSeason}
        />
      ),
    },
    {
      id: "pit-stop",
      name: "Pit Stop",
      description: "Pit stop awards and timing detail",
      content: (
        <PitStopWorkspace
          pitStopRows={pitStopRows}
          timingRows={timingRows}
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
