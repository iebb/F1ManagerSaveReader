import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, MetadataContext, UiSettingsContext} from "@/js/Contexts";
import {resolveLiteral, teamNames} from "@/js/localization";
import TeamLogo from "@/components/Common/TeamLogo";

export default function TeamIdentity({
  TeamID = 0,
  size = "md",
  className = "",
  textClassName = "",
  showLabel = true,
  logoStyleOverride = null,
  logoVersionOverride = null,
  brandYearOverride = null,
  teamLabelOverride = null,
}) {
  const {version} = useContext(MetadataContext);
  const {teamMap, player} = useContext(BasicInfoContext);
  const {logoStyle = "normal", useRealWorldTeamBrands = true} = useContext(UiSettingsContext);

  if (!TeamID) {
    return null;
  }

  const effectiveVersion = logoVersionOverride ?? version;
  const effectiveLogoStyle = logoStyleOverride ?? logoStyle;
  const brandingOptions = {
    currentSeason: player?.CurrentSeason,
    startSeason: player?.StartSeason,
    useRealWorldTeamBrands,
    brandYearOverride,
  };
  const teamLabel = teamLabelOverride || (TeamID > 31 && teamMap?.[TeamID]?.TeamNameLocKey
    ? resolveLiteral(teamMap[TeamID].TeamNameLocKey)
    : teamNames(TeamID, effectiveVersion, brandingOptions));

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <TeamLogo
        TeamID={TeamID}
        size={size}
        logoStyleOverride={effectiveLogoStyle}
        logoVersionOverride={effectiveVersion}
        brandYearOverride={brandYearOverride}
        alt={teamLabel}
      />
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
