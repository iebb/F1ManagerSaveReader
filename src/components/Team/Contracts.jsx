import TeamIdentity from "@/components/Common/TeamIdentity";
import { currencyFormatter } from "@/components/Finance/utils";
import { getStaff } from "@/components/People/commons/drivers";
import ContractSwapper from "@/components/People/subcomponents/ContractSwapper";
import { BasicInfoContext, DatabaseContext, MetadataContext } from "@/js/Contexts";
import {
  dayToDate,
  formatDate,
  formatISODateLocal,
  localDateToDay,
  resolveName,
  resolveNameV4,
  resolveLiteral,
  teamNames,
} from "@/js/localization";
import { getCountryFlag } from "@/js/localization/ISOCountries";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";

const roleRows = [
  [
    { key: "Driver1ID", title: "Lead Driver", subtitle: "Seat 1", staffType: 0 },
    { key: "RaceEngineer1ID", title: "Race Engineer 1", subtitle: "Driver 1 side", staffType: 2 },
    { key: "TeamPrincipalID", title: "Team Principal", subtitle: "Organisation lead", staffType: 5, minVersion: 3 },
  ],
  [
    { key: "Driver2ID", title: "Second Driver", subtitle: "Seat 2", staffType: 0 },
    { key: "RaceEngineer2ID", title: "Race Engineer 2", subtitle: "Driver 2 side", staffType: 2 },
    { key: "ChiefDesignerID", title: "Chief Designer", subtitle: "Car concept", staffType: 1 },
  ],
  [
    { key: "ReserveDriverID", title: "Reserve Driver", subtitle: "Backup", staffType: 0 },
    { key: "SportingDirectorID", title: "Sporting Director", subtitle: "Track operations", staffType: 4, minVersion: 3 },
    { key: "HeadOfAerodynamicsID", title: "Head of Aerodynamics", subtitle: "Aero programme", staffType: 3 },
  ],
];

const editableContractFields = [
  { key: "Salary", label: "Salary", type: "currency", min: 0, step: 100000 },
  { key: "StartingBonus", label: "Starting Bonus", type: "currency", min: 0, step: 100000 },
  { key: "RaceBonus", label: "Race Bonus", type: "currency", min: 0, step: 10000 },
  { key: "RaceBonusTargetPos", label: "Race Bonus Target", type: "number", min: 1, max: 30, step: 1 },
  { key: "BreakoutClause", label: "Breakout Clause", type: "decimal", min: 0, max: 1, step: 0.01 },
  { key: "AffiliateDualRoleClause", label: "Affiliate Dual Role", type: "toggle" },
  { key: "StartDay", label: "Start Date", type: "date" },
  { key: "EndSeason", label: "End Season", type: "number", min: 2022, max: 2100, step: 1 },
];

function getTeamTextStyle(teamId) {
  return { color: `rgb(var(--team${teamId}-triplet))` };
}

function resolveStaffName(version, staff) {
  if (!staff) return "Unassigned";
  const resolver = version >= 4 ? resolveNameV4 : resolveName;
  return `${resolver(staff.FirstName)} ${resolver(staff.LastName)}`;
}

function formatOrdinal(value) {
  if (!Number.isFinite(Number(value))) {
    return "—";
  }
  return `${value}${{
    one: "st",
    two: "nd",
    few: "rd",
    other: "th",
  }[new Intl.PluralRules("en", { type: "ordinal" }).select(value)]}`;
}

function formatMoney(value) {
  return Number.isFinite(Number(value)) ? currencyFormatter.format(Number(value)) : "—";
}

function formatContractDate(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? formatDate(dayToDate(Number(value))) : "—";
}

function DetailStat({ label, value, tone = "text-white" }) {
  return (
    <div className="border border-white/10 bg-black/10 p-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function ContractEditorModal({ editingContract, setEditingContract, onSave, currentSeason, editableFields }) {
  if (!editingContract) {
    return null;
  }

  const { person, form } = editingContract;

  const updateField = (field, value) => {
    setEditingContract((current) => ({
      ...current,
      form: {
        ...current.form,
        [field]: value,
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-[960px] border border-white/10 bg-[#0b1116] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Contract Editor</div>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-white">{person.name}</div>
              <div className="mt-1 text-sm text-slate-400">
                {editingContract.roleTitle} · {editingContract.teamLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingContract(null)}
              className="border border-white/10 bg-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Close
            </button>
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {editableFields.map((field) => {
                const value = form[field.key];
                return (
                  <label key={field.key} className="grid gap-2">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
                    {field.type === "toggle" ? (
                      <select
                        value={Number(value) ? "1" : "0"}
                        onChange={(event) => updateField(field.key, Number(event.target.value))}
                        className="border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/50"
                      >
                        <option value="0">Off</option>
                        <option value="1">On</option>
                      </select>
                    ) : field.type === "date" ? (
                      <input
                        type="date"
                        value={value}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        className="border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/50"
                      />
                    ) : (
                      <input
                        type="number"
                        value={value}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        onChange={(event) => updateField(field.key, event.target.value)}
                        className="border border-white/10 bg-black/10 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/50"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <DetailStat label="Position" value={editingContract.contract.PosInTeam ? `Slot ${editingContract.contract.PosInTeam}` : "—"} />
            <DetailStat label="Contract Type" value={editingContract.contract.ContractType} />
            <DetailStat label="Formula" value={editingContract.contract.Formula || "—"} />
            <DetailStat label="Current Season" value={currentSeason} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
          <div className="text-sm text-slate-500">
            Updates apply directly to the active `Staff_Contracts` row for this staff member.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditingContract(null)}
              className="border border-white/10 bg-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className="border border-sky-300/50 bg-sky-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-100 transition hover:bg-sky-500/15"
            >
              Save Contract
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  teamId,
  title,
  subtitle,
  person,
  contract,
  onReplace,
  onEdit,
  replaceDisabled = false,
  editDisabled = false,
}) {
  const personName = person ? person.name : "Unassigned";
  return (
    <div className="border border-white/10 bg-white/[0.015] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{subtitle}</div>
          <div className="mt-2 text-sm font-semibold" style={getTeamTextStyle(teamId)}>{title}</div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            disabled={!person?.row || editDisabled}
            className="border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-default disabled:opacity-40"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onReplace}
            disabled={!person?.row || replaceDisabled}
            className="border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-default disabled:opacity-40"
          >
            Replace
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {person?.flag ? (
            <img src={person.flag} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
          ) : (
            <div className="h-5 w-5 shrink-0 rounded-full border border-white/10 bg-white/5" />
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{personName}</div>
            <div className="mt-0.5 text-xs text-slate-500">
              {person?.carNumber ? <span className="text-slate-300">#{person.carNumber} </span> : null}
              {person?.meta || "No contracted staff member in this slot"}
            </div>
          </div>
        </div>
        {person?.rating !== null && person?.rating !== undefined ? (
          <div className="shrink-0 self-end text-right">
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Rating</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-200">{person.rating.toFixed(1)}</div>
          </div>
        ) : null}
      </div>

      {contract ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <DetailStat label="Salary" value={formatMoney(contract.Salary)} />
          <DetailStat label="Ends" value={contract.EndSeason || "—"} />
          <DetailStat label="Starting Bonus" value={formatMoney(contract.StartingBonus)} />
          <DetailStat label="Race Bonus" value={`${formatMoney(contract.RaceBonus)} · ${formatOrdinal(contract.RaceBonusTargetPos)}`} />
          <DetailStat label="Breakout Clause" value={Number.isFinite(Number(contract.BreakoutClause)) ? Number(contract.BreakoutClause).toFixed(2) : "—"} />
          <DetailStat label="Start Date" value={formatContractDate(contract.StartDay)} />
        </div>
      ) : null}
    </div>
  );
}

export default function Contracts() {
  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const { version } = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const { player, teamMap, teamIds } = basicInfo;
  const [staffMap, setStaffMap] = useState({});
  const [swapRow, setSwapRow] = useState(null);
  const [updated, setUpdated] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState(player.TeamID);
  const [editingContract, setEditingContract] = useState(null);
  const [contractColumns, setContractColumns] = useState([]);

  const visibleRoleRows = useMemo(
    () => roleRows
      .map((row) => row.filter((role) => !role.minVersion || version >= role.minVersion))
      .filter((row) => row.length > 0),
    [version]
  );

  const orderedTeamIds = useMemo(() => {
    const rest = teamIds.filter((id) => id !== player.TeamID);
    return [player.TeamID, ...rest];
  }, [player.TeamID, teamIds]);

  useEffect(() => {
    const nextColumns = database.getAllRows(`PRAGMA table_info('Staff_Contracts')`).map((row) => row.name);
    setContractColumns(nextColumns);
  }, [database]);

  useEffect(() => {
    const ctx = { basicInfo, database, version };
    const typesNeeded = [...new Set(visibleRoleRows.flatMap((row) => row.map((role) => role.staffType)))];
    const nextMap = {};

    for (const staffType of typesNeeded) {
      const rows = getStaff(ctx, staffType)[1];
      for (const row of rows) {
        nextMap[row.StaffID] = {
          ...row,
          name: resolveStaffName(version, row),
          flag: row.Nationality ? getCountryFlag(row.Nationality) : null,
        };
      }
    }

    setStaffMap(nextMap);
  }, [basicInfo, database, version, visibleRoleRows, updated]);

  const selectedTeam = teamMap[selectedTeamId];
  const getTeamLabel = (teamId) => {
    if (!teamId) {
      return "Unknown Team";
    }
    return teamId >= 32 && teamMap?.[teamId]?.TeamNameLocKey
      ? resolveLiteral(teamMap[teamId].TeamNameLocKey)
      : teamNames(teamId, version);
  };

  const roleCards = useMemo(() => visibleRoleRows.map((row, rowIndex) => row.map((role) => {
    const person = staffMap[selectedTeam?.[role.key]];
    const contract = person?.Contracts?.find((entry) => Number(entry.TeamID) === Number(selectedTeamId))
      || person?.Contracts?.[0]
      || null;
    return {
      id: `${selectedTeamId}-${rowIndex}-${role.key}`,
      role,
      person,
      contract,
    };
  })), [selectedTeam, selectedTeamId, staffMap, visibleRoleRows]);

  const flattenedContracts = useMemo(
    () => roleCards.flat().filter((entry) => entry.contract),
    [roleCards]
  );

  const payrollSummary = useMemo(() => ({
    payroll: flattenedContracts.reduce((sum, entry) => sum + Number(entry.contract?.Salary || 0), 0),
    startingBonus: flattenedContracts.reduce((sum, entry) => sum + Number(entry.contract?.StartingBonus || 0), 0),
    raceBonus: flattenedContracts.reduce((sum, entry) => sum + Number(entry.contract?.RaceBonus || 0), 0),
    averageEndSeason: flattenedContracts.length
      ? Math.round(flattenedContracts.reduce((sum, entry) => sum + Number(entry.contract?.EndSeason || player.CurrentSeason), 0) / flattenedContracts.length)
      : player.CurrentSeason,
  }), [flattenedContracts, player.CurrentSeason]);

  const editableFields = useMemo(
    () => editableContractFields.filter((field) => contractColumns.includes(field.key)),
    [contractColumns]
  );

  const saveEditedContract = () => {
    if (!editingContract) {
      return;
    }

    const updates = {};
    editableFields.forEach((field) => {
      let value = editingContract.form[field.key];
      if (field.type === "date") {
        value = localDateToDay(value);
      } else if (field.type === "toggle") {
        value = Number(value) ? 1 : 0;
      } else {
        value = Number(value);
      }

      if (field.min !== undefined) {
        value = Math.max(field.min, value);
      }
      if (field.max !== undefined) {
        value = Math.min(field.max, value);
      }
      if (field.key === "EndSeason") {
        value = Math.max(player.CurrentSeason, Math.round(value));
      }
      if (field.key === "RaceBonusTargetPos") {
        value = Math.max(1, Math.round(value));
      }
      if (field.key !== "BreakoutClause") {
        value = Math.round(value);
      } else {
        value = Number(value.toFixed(2));
      }

      updates[field.key] = value;
    });

    const assignments = Object.keys(updates).map((key) => `${key} = :${key}`).join(", ");
    database.exec(
      `UPDATE Staff_Contracts
       SET ${assignments}
       WHERE StaffID = :staffId AND ContractType = 0 AND TeamID = :teamId`,
      {
        ...Object.fromEntries(Object.entries(updates).map(([key, value]) => [`:${key}`, value])),
        ":staffId": editingContract.person.StaffID,
        ":teamId": editingContract.contract.TeamID,
      }
    );

    setEditingContract(null);
    setUpdated(Date.now());
  };

  return (
    <div className="grid gap-3">
      <ContractSwapper
        swapRow={swapRow}
        setSwapRow={setSwapRow}
        refresh={() => setUpdated(Date.now())}
      />

      <ContractEditorModal
        editingContract={editingContract}
        setEditingContract={setEditingContract}
        onSave={saveEditedContract}
        currentSeason={player.CurrentSeason}
        editableFields={editableFields}
      />

      <div className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
        <div className="grid gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Team Contracts</h2>
            <p className="mt-2 max-w-[920px] text-sm text-slate-400">
              Review each team&apos;s contracted roles, compare salary and bonus structure, and edit active contract terms without leaving the workspace.
            </p>
          </div>
          <div className="border border-white/10 bg-black/10 p-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Choose Team</div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 xl:flex xl:flex-nowrap xl:gap-2">
              {orderedTeamIds.map((teamId) => {
                const selected = teamId === selectedTeamId;
                return (
                  <button
                    key={teamId}
                    type="button"
                    onClick={() => setSelectedTeamId(teamId)}
                    className={`group border p-2 text-left transition xl:min-w-0 xl:flex-1 ${
                      selected
                        ? "border-sky-300/60 bg-sky-600/15 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <TeamIdentity
                      TeamID={teamId}
                      size="sm"
                      className="flex-col justify-center gap-2"
                      textClassName={`w-full truncate text-center text-[11px] font-semibold ${selected ? "text-white" : ""}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-3 border border-white/10 bg-white/[0.015] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              {selectedTeamId === player.TeamID ? "Current Team" : "Team"}
            </div>
            <div className="mt-2">
              <TeamIdentity TeamID={selectedTeamId} size="lg" textClassName="text-lg font-bold" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <DetailStat label="Annual Payroll" value={formatMoney(payrollSummary.payroll)} />
            <DetailStat label="Signing Bonuses" value={formatMoney(payrollSummary.startingBonus)} />
            <DetailStat label="Race Bonuses" value={formatMoney(payrollSummary.raceBonus)} />
            <DetailStat label="Average End Season" value={payrollSummary.averageEndSeason} />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Contracted Roles</div>
          <div className="grid gap-2">
            {roleCards.map((row, rowIndex) => (
              <div key={`${selectedTeamId}-row-${rowIndex}`} className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {row.map(({ id, role, person, contract }) => (
                  <RoleCard
                    key={id}
                    teamId={selectedTeamId}
                    title={role.title}
                    subtitle={role.subtitle}
                    replaceDisabled={role.staffType === 5}
                    editDisabled={!contract}
                    person={person ? {
                      name: person.name,
                      flag: person.flag,
                      meta: person.Nationality || "Contracted role",
                      carNumber: person.CurrentNumber || person.PernamentNumber || null,
                      rating: Number.isFinite(person.Overall) ? person.Overall : null,
                      row: person,
                    } : null}
                    contract={contract}
                    onEdit={() => {
                      if (!person || !contract) {
                        return;
                      }
                      setEditingContract({
                        person,
                        roleTitle: role.title,
                        teamLabel: getTeamLabel(contract.TeamID || person.TeamID || selectedTeamId),
                        contract,
                        form: Object.fromEntries(editableFields.map((field) => [
                          field.key,
                          field.type === "date"
                            ? formatISODateLocal(dayToDate(contract[field.key] || player.Day))
                            : contract[field.key] ?? (field.type === "toggle" ? 0 : ""),
                        ])),
                      });
                    }}
                    onReplace={() => {
                      if (person) {
                        setSwapRow({ ...person });
                      }
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
