import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, MetadataContext} from "@/js/Contexts";
import {resolveLiteral, teamNames} from "@/js/localization";

const teamLogoAssets = import.meta.glob("../../assets/team-logos/**/*.{png,webp}", {
  eager: true,
  import: "default",
});

const teamLogoSlugsByYear = {
  2022: { 1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin" },
  2023: { 1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin" },
  2024: { 1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas", 8: "rb", 9: "kicksauber", 10: "astonmartin" },
  2025: { 1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "kicksauber", 10: "astonmartin" },
  2026: { 1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "audi", 10: "astonmartin", 11: "cadillac" },
};

function getOfficialTeamLogo(version, teamId) {
  const year = Math.min(2026, Math.max(2022, version + 2020));
  const slug = teamLogoSlugsByYear[year]?.[teamId];
  if (!slug) return null;
  for (const extension of ["png", "webp"]) {
    const asset = teamLogoAssets[`../../assets/team-logos/${year}/${slug}.${extension}`];
    if (asset) return asset;
  }
  return null;
}

function resolveLogoSize(size) {
  switch (size) {
    case "sm":
      return "h-6 w-6";
    case "lg":
      return "h-10 w-10";
    default:
      return "h-8 w-8";
  }
}

export default function TeamIdentity({
  TeamID = 0,
  size = "md",
  className = "",
  textClassName = "",
  showLabel = true,
}) {
  const {version, careerSaveMetadata} = useContext(MetadataContext);
  const {teamMap, player} = useContext(BasicInfoContext);

  if (!TeamID) {
    return null;
  }

  const teamLabel = TeamID > 31 && teamMap?.[TeamID]?.TeamNameLocKey
    ? resolveLiteral(teamMap[TeamID].TeamNameLocKey)
    : teamNames(TeamID, version);
  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;
  const logoSrc = TeamID >= 32 && customTeamLogoBase64
    ? `data:image/png;base64,${customTeamLogoBase64}`
    : getOfficialTeamLogo(version, TeamID);

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {logoSrc ? (
        <img src={logoSrc} alt="" className={`${resolveLogoSize(size)} shrink-0 object-contain`} />
      ) : (
        <div className={`${resolveLogoSize(size)} shrink-0 border border-white/10 bg-white/[0.03]`} />
      )}
      {showLabel ? (
        <div
          className={`min-w-0 truncate font-medium ${textClassName}`}
          style={{color: `rgb(var(--team${TeamID}-triplet))`}}
        >
          {teamLabel}
        </div>
      ) : null}
    </div>
  );
}
