import {getStaff} from "@/components/People/commons/drivers";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {resolveLiteral, resolveName, resolveNameV4, teamNames} from "@/js/localization";
import {getCountryFlag} from "@/js/localization/ISOCountries";
import * as React from "react";
import {useContext, useEffect, useMemo, useState} from "react";
import TeamContractSwapper from "./TeamContractSwapper";

const teamLogoAssets = import.meta.glob("../../assets/team-logos/**/*.{png,webp}", {
  eager: true,
  import: "default",
});

const teamLogoSlugsByYear = {
  2022: {1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin"},
  2023: {1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin"},
  2024: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas", 8: "rb", 9: "kicksauber", 10: "astonmartin"},
  2025: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "kicksauber", 10: "astonmartin"},
  2026: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "audi", 10: "astonmartin", 11: "cadillac"},
};

const roleRows = [
  [
    {key: "Driver1ID", title: "Lead Driver", subtitle: "Seat 1", staffType: 0},
    {key: "RaceEngineer1ID", title: "Race Engineer 1", subtitle: "Driver 1 side", staffType: 2},
    {key: "TeamPrincipalID", title: "Team Principal", subtitle: "Organisation lead", staffType: 5, minVersion: 3},
  ],
  [
    {key: "Driver2ID", title: "Second Driver", subtitle: "Seat 2", staffType: 0},
    {key: "RaceEngineer2ID", title: "Race Engineer 2", subtitle: "Driver 2 side", staffType: 2},
    {key: "ChiefDesignerID", title: "Chief Designer", subtitle: "Car concept", staffType: 1},
  ],
  [
    {key: "ReserveDriverID", title: "Reserve Driver", subtitle: "Backup", staffType: 0},
    {key: "SportingDirectorID", title: "Sporting Director", subtitle: "Track operations", staffType: 4, minVersion: 3},
    {key: "HeadOfAerodynamicsID", title: "Head of Aerodynamics", subtitle: "Aero programme", staffType: 3},
  ],
];

function getOfficialTeamLogo(version, teamId) {
  const year = Math.min(2026, Math.max(2022, version + 2020));
  const slug = teamLogoSlugsByYear[year]?.[teamId];
  if (!slug) return null;
  const extension = year <= 2023 ? "png" : "webp";
  return teamLogoAssets[`../../assets/team-logos/${year}/${slug}.${extension}`] || null;
}

function getTeamTextStyle(teamId) {
  return {color: `rgb(var(--team${teamId}-triplet))`};
}

function resolveStaffName(version, staff) {
  if (!staff) return "Unassigned";
  const resolver = version >= 4 ? resolveNameV4 : resolveName;
  return `${resolver(staff.FirstName)} ${resolver(staff.LastName)}`;
}

function RoleCard({teamId, title, subtitle, person, onReplace, replaceDisabled = false, className = ""}) {
  const personName = person ? person.name : "Unassigned";
  return (
    <div className={`border border-white/10 bg-white/[0.015] p-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{subtitle}</div>
          <div className="mt-2 text-sm font-semibold" style={getTeamTextStyle(teamId)}>{title}</div>
        </div>
        <button
          type="button"
          onClick={onReplace}
          disabled={!person?.row || replaceDisabled}
          className="border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-default disabled:opacity-40"
        >
          Replace
        </button>
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
            {person?.meta || "No contracted staff member in this slot"}
          </div>
          {person?.carNumber ? (
            <div className="mt-1 text-[11px] font-semibold text-slate-300">#{person.carNumber}</div>
          ) : null}
        </div>
        </div>
        {person?.rating !== null && person?.rating !== undefined ? (
          <div className="shrink-0 self-end text-right">
            <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Rating</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-200">{person.rating.toFixed(1)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function Contracts() {
  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const {version, careerSaveMetadata} = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const {player, teamMap, teamIds} = basicInfo;
  const [staffMap, setStaffMap] = useState({});
  const [swapRow, setSwapRow] = useState(null);
  const [updated, setUpdated] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState(player.TeamID);

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

  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;
  const selectedTeam = teamMap[selectedTeamId];
  const selectedTeamLabel = selectedTeamId >= 32 && selectedTeam?.TeamNameLocKey
    ? resolveLiteral(selectedTeam.TeamNameLocKey)
    : teamNames(selectedTeamId, version);
  const selectedLogoSrc = selectedTeamId >= 32 && customTeamLogoBase64
    ? `data:image/png;base64,${customTeamLogoBase64}`
    : getOfficialTeamLogo(version, selectedTeamId);

  useEffect(() => {
    const ctx = {basicInfo, database, version};
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

  return (
    <div className="grid gap-3">
      <TeamContractSwapper
        swapRow={swapRow}
        setSwapRow={setSwapRow}
        refresh={() => setUpdated(Date.now())}
      />

      <div className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
        <div className="grid gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Team Contracts</h2>
            <p className="mt-2 max-w-[920px] text-sm text-slate-400">
              Review contracted roles one team at a time. Use `Replace` on any assigned slot to open the existing contract swap workflow for that position.
            </p>
          </div>
          <div className="border border-white/10 bg-black/10 p-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Choose Team</div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 xl:flex xl:flex-nowrap xl:gap-2">
              {orderedTeamIds.map((teamId) => {
                const label = teamId >= 32 && teamMap?.[teamId]?.TeamNameLocKey
                  ? resolveLiteral(teamMap[teamId].TeamNameLocKey)
                  : teamNames(teamId, version);
                const selected = teamId === selectedTeamId;
                const logoSrc = teamId >= 32 && customTeamLogoBase64
                  ? `data:image/png;base64,${customTeamLogoBase64}`
                  : getOfficialTeamLogo(version, teamId);
                return (
                  <button
                    key={teamId}
                    type="button"
                    onClick={() => setSelectedTeamId(teamId)}
                    title={label}
                    className={`group border p-2 text-left transition xl:min-w-0 xl:flex-1 ${
                      selected
                        ? "border-sky-300/60 bg-sky-600/15 shadow-[0_0_0_1px_rgba(125,211,252,0.2)]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`flex h-10 w-full items-center justify-center ${selected ? "opacity-100" : "opacity-90 group-hover:opacity-100"}`}>
                        {logoSrc ? (
                          <img src={logoSrc} alt={label} className="h-8 w-8 object-contain" />
                        ) : (
                          <div className="h-8 w-8 rounded-full border border-white/10 bg-white/5" />
                        )}
                      </div>
                      <div
                        className={`w-full truncate text-center text-[11px] font-semibold ${selected ? "text-white" : ""}`}
                        style={selected ? undefined : getTeamTextStyle(teamId)}
                      >
                        {label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <section className="grid gap-2 border border-white/10 bg-white/[0.015] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              {selectedTeamId === player.TeamID ? "Current Team" : "Team"}
            </div>
            <div className="mt-2 text-base font-bold" style={getTeamTextStyle(selectedTeamId)}>{selectedTeamLabel}</div>
          </div>
          {selectedLogoSrc ? (
            <img src={selectedLogoSrc} alt={selectedTeamLabel} className="h-12 w-12 shrink-0 object-contain opacity-95" />
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Contracted Roles</div>
          <div className="grid gap-2">
            {visibleRoleRows.map((row, rowIndex) => (
              <div key={`${selectedTeamId}-row-${rowIndex}`} className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {row.map((role) => {
                const person = staffMap[selectedTeam?.[role.key]];
                return (
                  <RoleCard
                    key={`${selectedTeamId}-${rowIndex}-${role.key}`}
                    teamId={selectedTeamId}
                    title={role.title}
                    subtitle={role.subtitle}
                    replaceDisabled={role.staffType === 5}
                          person={person ? {
                            name: person.name,
                            flag: person.flag,
                            meta: person.Nationality || "Contracted role",
                            carNumber: person.CurrentNumber || person.PernamentNumber || null,
                            rating: Number.isFinite(person.Overall) ? person.Overall : null,
                            row: person,
                          } : null}
                    onReplace={() => {
                      if (person?.row) {
                        setSwapRow({...person.row});
                      }
                    }}
                  />
                );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
