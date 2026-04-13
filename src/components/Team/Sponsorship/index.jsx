import {
  BasicInfoContext,
  BasicInfoUpdaterContext,
  DatabaseContext,
  MetadataContext,
} from "@/js/Contexts";
import {
  circuitNames,
  dayToDate,
  formatDate,
  getDriverName,
  raceAbbrevs,
  raceFlags,
  resolveLiteral,
} from "@/js/localization";
import { getExistingTableSet } from "@/components/Customize/Player/timeMachineUtils";
import {readRows} from "@/js/database/utils";
import { useSnackbar } from "notistack";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";

const clampPercentage = (value, max) => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / max) * 100));
};

function LegacySponsorshipWorkspace({ legacyObligations, legacyIncentives, currentDay }) {
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
            State: row.State,
            raceLabel: row.TrackID ? (raceAbbrevs[row.TrackID] || row.RaceID) : `${row.RaceID ?? "?"}`,
            items: [],
          });
        }
        map.get(key).items.push(row);
        return map;
      }, new Map()).values()
    ).map((race) => {
      const isWeekendReached = Number(race.Day || 0) > 0 && Number(race.Day) <= Number(currentDay || 0);
      const isRaceComplete = Number(race.State) === 2;
      return {
        ...race,
        isFinished: isWeekendReached,
        items: race.items.map((row) => ({
          ...row,
          DerivedStatus: Number(row.Achieved)
            ? "achieved"
            : isRaceComplete
              ? "failed"
              : "pending",
        })),
      };
    });

    return {
      finished: grouped
        .filter((race) => race.isFinished)
        .sort((left, right) => Number(right.Day || right.RaceID || 0) - Number(left.Day || left.RaceID || 0)),
      upcoming: grouped
        .filter((race) => !race.isFinished)
        .sort((left, right) => Number(left.Day || left.RaceID || 0) - Number(right.Day || right.RaceID || 0)),
    };
  }, [currentDay, legacyIncentives]);

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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:min-w-[560px]">
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
                            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                {race.TrackID ? <img src={`/flags/${raceFlags[race.TrackID]}.svg`} alt="" className="h-[16px] w-6 border border-white/10 object-cover" /> : null}
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-white">{race.raceLabel}</div>
                                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                                    {race.items.length} item{race.items.length === 1 ? "" : "s"}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Race Day</div>
                                <div className="mt-1 text-xs font-medium text-slate-300">
                                  {Number(race.Day) > 0 ? formatDate(dayToDate(race.Day)) : "-"}
                                </div>
                              </div>
                            </div>
                          <div className="grid">
                            {race.items.map((row, index) => (
                              <div key={`legacy-incentive-${row.id}`} className={`grid gap-2 px-4 py-3 ${index > 0 ? "border-t border-white/5" : ""}`}>
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

function ModernSponsorshipWorkspace({ rows, secondaryRows, availableRows, bonusRows, onRefresh }) {
  const database = useContext(DatabaseContext);
  const { enqueueSnackbar } = useSnackbar();
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

export default function SponsorshipWorkspace() {
  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { version } = metadata;
  const [updated, setUpdated] = useState(0);
  const currentSeason = basicInfo.player.CurrentSeason;
  const currentDay = basicInfo.player.Day;
  const teamId = basicInfo.player.TeamID;
  const driverMap = basicInfo.driverMap;

  const [rows, setRows] = useState([]);
  const [availableRows, setAvailableRows] = useState([]);
  const [secondaryRows, setSecondaryRows] = useState([]);
  const [bonusRows, setBonusRows] = useState([]);
  const [mode, setMode] = useState("modern");
  const [legacyObligations, setLegacyObligations] = useState([]);
  const [legacyIncentives, setLegacyIncentives] = useState([]);

  const refresh = () => {
    basicInfoUpdater?.({});
    setUpdated(Date.now());
  };

  useEffect(() => {
    if (!database) {
      return;
    }

    const existingTables = getExistingTableSet(database);
    const hasModernSponsorship = existingTables.has("Sponsorship_ActivePackages");
    setMode(hasModernSponsorship ? "modern" : "legacy");

    if (hasModernSponsorship) {
      const activeSponsors = readRows(
        database,
        `SELECT rowid AS id, TeamID, SponsorID, SponsorType, Engagement, Slot
         FROM Sponsorship_ActivePackages
         WHERE TeamID = :teamId
         ORDER BY SponsorType ASC, Slot ASC, SponsorID ASC`,
        { ":teamId": teamId }
      );
      setRows(activeSponsors);

      const availableSponsors = readRows(
        database,
        `SELECT rowid AS id, TeamID, SponsorID, SponsorType
         FROM Sponsorship_AvailablePackages
         WHERE TeamID = :teamId
         ORDER BY SponsorType ASC, SponsorID ASC`,
        { ":teamId": teamId }
      );
      setAvailableRows(availableSponsors);

      const secondaryBonuses = readRows(
        database,
        `SELECT rowid AS id, TeamID, SponsorID, ActiveEffectID, AffiliateID
         FROM Sponsorship_ActivePackages_SecondaryBonuses
         WHERE TeamID = :teamId
         ORDER BY SponsorID ASC, ActiveEffectID ASC`,
        { ":teamId": teamId }
      ).map((row) => ({
        ...row,
        Affiliate: row.AffiliateID ? getDriverName(driverMap[row.AffiliateID]) : "-",
      }));
      setSecondaryRows(secondaryBonuses);
      setLegacyObligations([]);
      setLegacyIncentives([]);
    } else {
      setRows([]);
      setAvailableRows([]);
      setSecondaryRows([]);

      const obligationRows = readRows(
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
      setLegacyObligations(obligationRows);

      const incentiveRows = readRows(
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
                Races.Day,
                Races.State
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
      setLegacyIncentives(incentiveRows);
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

    const loadedBonusRows = readRows(database, bonusQuery, { ":season": currentSeason }).map((row, index) => ({
      id: `${row.DriverID}-${row.RaceID}-${row.Difficulty}-${index}`,
      ...row,
      Selected: Boolean(row.Selected),
      Achieved: Boolean(row.Achieved),
      FinishPosition: raceResultMap[`${row.DriverID}-${row.RaceID}`] ?? null,
      Driver: getDriverName(driverMap[row.DriverID]),
      Race: circuitNames[row.TrackID] || `Race ${row.RaceID}`,
      Status: row.State === 2 ? "Completed" : row.State === 1 ? "Active" : "Upcoming",
    }));
    setBonusRows(loadedBonusRows);
  }, [basicInfoUpdater, currentSeason, currentDay, database, driverMap, teamId, updated, version]);

  if (mode === "legacy") {
    return (
      <LegacySponsorshipWorkspace
        legacyObligations={legacyObligations}
        legacyIncentives={legacyIncentives}
        currentDay={currentDay}
      />
    );
  }

  return (
    <ModernSponsorshipWorkspace
      rows={rows}
      secondaryRows={secondaryRows}
      availableRows={availableRows}
      bonusRows={bonusRows}
      onRefresh={refresh}
    />
  );
}
