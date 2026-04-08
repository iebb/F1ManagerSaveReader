const whiteLogoAssets = import.meta.glob("../../assets/team-logos/**/*.webp", {
  eager: true,
  import: "default",
});

const coloredLogoAssets = import.meta.glob("../../assets/team-logos-colored/**/*.webp", {
  eager: true,
  import: "default",
});

const teamLogoPathsByYear = {
  2022: {
    1: "2025/ferrari",
    2: "2025/mclaren",
    3: "2025/redbullracing",
    4: "2025/mercedes",
    5: "2025/alpine",
    6: "2025/williams",
    7: "2025/haasf1team",
    8: "misc/alphatauri",
    9: "misc/alfaromeo",
    10: "2025/astonmartin",
  },
  2023: {
    1: "2025/ferrari",
    2: "2025/mclaren",
    3: "2025/redbullracing",
    4: "2025/mercedes",
    5: "2025/alpine",
    6: "2025/williams",
    7: "2025/haasf1team",
    8: "misc/alphatauri",
    9: "misc/alfaromeo",
    10: "2025/astonmartin",
  },
  2024: {
    1: "2024/ferrari",
    2: "2024/mclaren",
    3: "2024/redbullracing",
    4: "2024/mercedes",
    5: "2024/alpine",
    6: "2024/williams",
    7: "2024/haas",
    8: "2024/rb",
    9: "2024/kicksauber",
    10: "2024/astonmartin",
  },
  2025: {
    1: "2025/ferrari",
    2: "2025/mclaren",
    3: "2025/redbullracing",
    4: "2025/mercedes",
    5: "2025/alpine",
    6: "2025/williams",
    7: "2025/haasf1team",
    8: "2025/racingbulls",
    9: "2025/kicksauber",
    10: "2025/astonmartin",
  },
  2026: {
    1: "2026/ferrari",
    2: "2026/mclaren",
    3: "2026/redbullracing",
    4: "2026/mercedes",
    5: "2026/alpine",
    6: "2026/williams",
    7: "2026/haasf1team",
    8: "2026/racingbulls",
    9: "2026/audi",
    10: "2026/astonmartin",
    11: "2026/cadillac",
  },
};

const alwaysWhitePaths = new Set([
  "misc/alphatauri",
  "2025/mercedes",
  "2025/astonmartin",
  "2026/astonmartin",
  "2026/audi",
]);

function getSaveYear(version) {
  return Math.min(2026, Math.max(2022, version + 2020));
}

function resolveWhiteAsset(assetPath) {
  const whiteVariantRef = `../../assets/team-logos/${assetPath}-white.webp`;
  if (whiteLogoAssets[whiteVariantRef]) {
    return whiteLogoAssets[whiteVariantRef];
  }

  const whiteBaseRef = `../../assets/team-logos/${assetPath}.webp`;
  if (whiteLogoAssets[whiteBaseRef]) {
    return whiteLogoAssets[whiteBaseRef];
  }

  return null;
}

function resolveColoredAsset(assetPath) {
  const coloredRef = `../../assets/team-logos-colored/${assetPath}.webp`;
  if (coloredLogoAssets[coloredRef]) {
    return coloredLogoAssets[coloredRef];
  }

  return null;
}

export function getOfficialTeamLogo(version, teamId, logoStyle = "colored") {
  const saveYear = getSaveYear(version);
  const assetPath = teamLogoPathsByYear[saveYear]?.[teamId];
  if (!assetPath) {
    return null;
  }

  if (alwaysWhitePaths.has(assetPath)) {
    return resolveWhiteAsset(assetPath) || resolveColoredAsset(assetPath) || null;
  }

  if (logoStyle === "white") {
    return resolveWhiteAsset(assetPath) || resolveColoredAsset(assetPath) || null;
  }

  return resolveColoredAsset(assetPath) || resolveWhiteAsset(assetPath) || null;
}
