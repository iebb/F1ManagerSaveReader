import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, MetadataContext, UiSettingsContext} from "@/js/Contexts";
import {resolveLiteral, teamNames} from "@/js/localization";
import {getOfficialTeamLogo} from "@/components/Common/teamLogos";

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
  const {logoStyle = "colored"} = useContext(UiSettingsContext);

  if (!TeamID) {
    return null;
  }

  const teamLabel = TeamID > 31 && teamMap?.[TeamID]?.TeamNameLocKey
    ? resolveLiteral(teamMap[TeamID].TeamNameLocKey)
    : teamNames(TeamID, version);
  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;
  const logoSrc = TeamID >= 32 && customTeamLogoBase64
    ? `data:image/png;base64,${customTeamLogoBase64}`
    : getOfficialTeamLogo(version, TeamID, logoStyle);

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
