import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, MetadataContext, UiSettingsContext} from "@/js/Contexts";
import {getOfficialTeamLogo, getOfficialTeamLogoConfig} from "@/components/Common/teamLogos";

function resolveLogoSize(size) {
  switch (size) {
    case "sm":
      return "h-6 w-6";
    case "lg":
      return "h-10 w-10";
    case "xl":
      return "h-16 w-16";
    default:
      return "h-8 w-8";
  }
}

export default function TeamLogo({
  TeamID = 0,
  size = "md",
  className = "",
  logoStyleOverride = null,
  logoVersionOverride = null,
  brandYearOverride = null,
  alt = "",
}) {
  const {version, careerSaveMetadata} = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const {logoStyle = "normal", useRealWorldTeamBrands = true} = useContext(UiSettingsContext);
  const player = basicInfo?.player;
  const effectiveVersion = logoVersionOverride ?? version;
  const effectiveLogoStyle = logoStyleOverride ?? logoStyle;
  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;

  if (!TeamID) {
    return null;
  }

  if (TeamID >= 32 && customTeamLogoBase64) {
    return (
      <img
        src={`data:image/png;base64,${customTeamLogoBase64}`}
        alt={alt}
        className={`${resolveLogoSize(size)} shrink-0 object-contain ${className}`}
      />
    );
  }

  const brandingOptions = {
    currentSeason: player?.CurrentSeason,
    startSeason: player?.StartSeason,
    useRealWorldTeamBrands,
    brandYearOverride,
  };
  const logoConfig = getOfficialTeamLogoConfig(effectiveVersion, TeamID, brandingOptions);
  if (!logoConfig) {
    return null;
  }

  if (effectiveLogoStyle === "colored-white") {
    const whiteSource = logoConfig.whiteLogo || logoConfig.defaultLogo;
    const coloredSource = logoConfig.coloredLogo;
    return (
      <div
        className={`relative ${resolveLogoSize(size)} shrink-0 overflow-hidden ${className}`}
        style={{backgroundColor: logoConfig.backgroundColor}}
      >
        {coloredSource ? (
          <img
            src={coloredSource}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-contain p-[12%] opacity-95"
          />
        ) : null}
        {whiteSource ? (
          <img
            src={whiteSource}
            alt={alt}
            className="absolute inset-0 h-full w-full object-contain p-[12%]"
          />
        ) : null}
      </div>
    );
  }

  const logoSrc = getOfficialTeamLogo(effectiveVersion, TeamID, effectiveLogoStyle, brandingOptions);
  if (!logoSrc) {
    return null;
  }

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={`${resolveLogoSize(size)} shrink-0 object-contain ${className}`}
    />
  );
}
