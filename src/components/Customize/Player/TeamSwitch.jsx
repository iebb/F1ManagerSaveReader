import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {teamNames} from "@/js/localization";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext} from "react";

const teamLogoAssets = import.meta.glob("../../../assets/team-logos/**/*.{png,webp}", {
  eager: true,
  import: "default",
});

const teamLogoSlugsByYear = {
  2022: {
    1: "ferrari",
    2: "mclaren",
    3: "red-bull-racing",
    4: "mercedes",
    5: "alpine",
    6: "williams",
    7: "haas-f1-team",
    8: "alphatauri",
    9: "alfa-romeo",
    10: "aston-martin",
  },
  2023: {
    1: "ferrari",
    2: "mclaren",
    3: "red-bull-racing",
    4: "mercedes",
    5: "alpine",
    6: "williams",
    7: "haas-f1-team",
    8: "alphatauri",
    9: "alfa-romeo",
    10: "aston-martin",
  },
  2024: {
    1: "ferrari",
    2: "mclaren",
    3: "redbullracing",
    4: "mercedes",
    5: "alpine",
    6: "williams",
    7: "haas",
    8: "rb",
    9: "kicksauber",
    10: "astonmartin",
  },
  2025: {
    1: "ferrari",
    2: "mclaren",
    3: "redbullracing",
    4: "mercedes",
    5: "alpine",
    6: "williams",
    7: "haasf1team",
    8: "racingbulls",
    9: "kicksauber",
    10: "astonmartin",
  },
  2026: {
    1: "ferrari",
    2: "mclaren",
    3: "redbullracing",
    4: "mercedes",
    5: "alpine",
    6: "williams",
    7: "haasf1team",
    8: "racingbulls",
    9: "audi",
    10: "astonmartin",
    11: "cadillac",
  },
};

function getOfficialTeamLogo(version, teamId) {
  const year = Math.min(2026, Math.max(2022, version + 2020));
  const slug = teamLogoSlugsByYear[year]?.[teamId];
  if (!slug) {
    return null;
  }

  const extension = year <= 2023 ? "png" : "webp";
  return teamLogoAssets[`../../../assets/team-logos/${year}/${slug}.${extension}`] || null;
}

export default function TeamSwitch() {
  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const {version, careerSaveMetadata} = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const {enqueueSnackbar} = useSnackbar();
  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || basicInfo.player?.CustomTeamLogoBase64;

  const teams = basicInfo.teamIds.map((id) => ({
    ...basicInfo.teamMap[id],
    displayName: teamNames(id, version),
    logoSrc: id === 32 && customTeamLogoBase64
      ? `data:image/png;base64,${customTeamLogoBase64}`
      : getOfficialTeamLogo(version, id),
  }));

  const currentTeam = teams.find((team) => team.TeamID === basicInfo.player.TeamID) || basicInfo.teamMap[basicInfo.player.TeamID];

  const switchToTeam = (team) => {
    database.exec(`UPDATE Player SET TeamID = ${team.TeamID}`);
    if (version >= 3) {
      database.exec(`UPDATE Staff_NarrativeData SET TeamID = ${team.TeamID} WHERE GenSource = 0`);
      database.exec(`UPDATE Player_History SET EndDay = ${basicInfo.player.Day - 1} WHERE EndDay IS NULL`);
      database.exec(`DELETE FROM Player_History WHERE EndDay < StartDay`);
      database.exec(`INSERT INTO Player_History VALUES (${team.TeamID}, ${basicInfo.player.Day}, NULL)`);
    }

    const metaProperty = metadata.gvasMeta.Properties.Properties.filter((p) => p.Name === "MetaData")[0];
    metaProperty.Properties[0].Properties.forEach((property) => {
      if (property.Name === "TeamID") {
        property.Property = team.TeamID;
      }
      if (property.Name === "Team") {
        property.Property = team.TeamNameLocKey;
      }
    });

    basicInfoUpdater({metadata});
    enqueueSnackbar("Team switched", {variant: "success"});
  };

  return (
    <div className="grid gap-3">
      <div className="border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white">Mid-season Team Switching</h2>
        <p className="mt-2 max-w-[920px] text-sm text-slate-400">
          Move the player career to another team without leaving the current save. This updates player ownership and
          related narrative history.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border border-amber-400/20 bg-amber-500/10 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-amber-300/80">Current Team</div>
              <div className="mt-2 text-base font-bold text-white">{teamNames(currentTeam.TeamID, version)}</div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                This tool is powerful and can affect progression data. Use it deliberately, especially during an active season.
              </p>
            </div>
            {currentTeam?.logoSrc ? (
              <img
                src={currentTeam.logoSrc}
                alt={currentTeam.displayName || teamNames(currentTeam.TeamID, version)}
                className="h-16 w-16 shrink-0 object-contain opacity-95"
              />
            ) : null}
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.015] p-4">
          <div className="mb-3 text-[11px] uppercase tracking-[0.14em] text-slate-500">Select New Team</div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const isCurrent = team.TeamID === basicInfo.player.TeamID;
              return (
                <button
                  key={team.TeamID}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => switchToTeam(team)}
                  className={`border p-4 text-left transition ${
                    isCurrent
                      ? "cursor-default"
                      : "hover:-translate-y-px"
                  }`}
                  style={{
                    borderColor: isCurrent ? "rgba(210, 255, 145, 0.85)" : `rgba(var(--team${team.TeamID}-fanfare1-triplet), 0.42)`,
                    background: isCurrent
                      ? `linear-gradient(135deg, rgba(var(--team${team.TeamID}-fanfare1-triplet), 0.26), rgba(var(--team${team.TeamID}-fanfare2-triplet), 0.18))`
                      : `linear-gradient(135deg, rgba(var(--team${team.TeamID}-fanfare1-triplet), 0.2), rgba(var(--team${team.TeamID}-fanfare2-triplet), 0.14))`,
                    boxShadow: isCurrent
                      ? "0 0 0 1px rgba(210, 255, 145, 0.38), 0 0 22px rgba(222, 255, 153, 0.22), 0 0 44px rgba(255, 223, 94, 0.12), inset 0 0 0 1px rgba(255,255,255,0.08)"
                      : `inset 0 0 0 1px rgba(255,255,255,0.04)`,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className="text-[11px] uppercase tracking-[0.14em]"
                        style={{color: `rgba(var(--team${team.TeamID}-fanfare1-triplet), 0.9)`}}
                      >
                        {isCurrent ? "Current Team" : "Switch To"}
                      </div>
                      <div className="mt-2 text-sm font-bold text-white">{team.displayName}</div>
                    </div>
                    {team.logoSrc ? (
                      <img
                        src={team.logoSrc}
                        alt={team.displayName}
                        className={`h-14 w-14 shrink-0 object-contain ${isCurrent ? "opacity-100" : "opacity-90"}`}
                      />
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
