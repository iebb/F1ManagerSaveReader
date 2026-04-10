const whiteLogoAssets = import.meta.glob("../../assets/team-logos/**/*.webp", {
  eager: true,
  import: "default",
});

const coloredLogoAssets = import.meta.glob("../../assets/team-logos-colored/**/*.webp", {
  eager: true,
  import: "default",
});

const teamLogoPathsByBrandYear = {
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
  "2024/astonmartin",
  "2024/mercedes",
  "2025/mercedes",
  "2025/astonmartin",
  "2026/astonmartin",
  "2026/audi",
]);

const logoBackgroundColorByPath = {
  "2024/ferrari": "#E8002D",
  "2025/ferrari": "#E8002D",
  "2026/ferrari": "#E8002D",
  "2024/mclaren": "#FF8000",
  "2025/mclaren": "#FF8000",
  "2026/mclaren": "#FF8000",
  "2024/redbullracing": "#3671C6",
  "2025/redbullracing": "#3671C6",
  "2026/redbullracing": "#3671C6",
  "2024/mercedes": "#27F4D2",
  "2025/mercedes": "#27F4D2",
  "2026/mercedes": "#27F4D2",
  "2024/alpine": "#0093CC",
  "2025/alpine": "#0093CC",
  "2026/alpine": "#0093CC",
  "2024/williams": "#64C4FF",
  "2025/williams": "#64C4FF",
  "2026/williams": "#1863C6",
  "2024/haas": "#B6BABD",
  "2025/haasf1team": "#B6BABD",
  "2026/haasf1team": "#B6BABD",
  "2024/rb": "#6692FF",
  "2025/racingbulls": "#6692FF",
  "2026/racingbulls": "#6692FF",
  "2024/kicksauber": "#52E252",
  "2025/kicksauber": "#52E252",
  "2024/astonmartin": "#229971",
  "2025/astonmartin": "#229971",
  "2026/astonmartin": "#229971",
  "2026/audi": "#B00020",
  "2026/cadillac": "#0F4C81",
  "misc/alphatauri": "#1C2745",
  "misc/alfaromeo": "#7A0026",
};

function getSaveYear(version) {
  return Math.min(2026, Math.max(2022, version + 2020));
}

function toVersionFromYear(year) {
  return Math.min(6, Math.max(2, year - 2020));
}

function formatRangeLabel(name, startYear, endYear = null) {
  if (endYear && endYear > startYear) {
    return `${name} (${startYear}-${endYear})`;
  }
  return `${name} (${startYear}-)`;
}

function createPreviewRow({ key, name, startYear, endYear = null, teamId, brandYear, familyKey = key, isSubRow = false }) {
  return {
    key,
    name,
    label: formatRangeLabel(name, startYear, endYear),
    subtitle: endYear && endYear > startYear ? `${startYear}-${endYear}` : `${startYear}-`,
    version: toVersionFromYear(startYear),
    teamId,
    brandYear,
    familyKey,
    isSubRow,
  };
}

export function getSettingsPreviewTeams(startYear = 2025, includeFutureVariants = true) {
  const normalizedStartYear = Math.min(2026, Math.max(2022, Number(startYear) || 2025));
  const rows = [
    createPreviewRow({ key: "ferrari", name: "Ferrari", startYear: normalizedStartYear, teamId: 1, brandYear: Math.max(2025, normalizedStartYear) }),
    createPreviewRow({ key: "mclaren", name: "McLaren", startYear: normalizedStartYear, teamId: 2, brandYear: Math.max(2025, normalizedStartYear) }),
    createPreviewRow({ key: "redbull", name: "Red Bull", startYear: normalizedStartYear, teamId: 3, brandYear: Math.max(2025, normalizedStartYear) }),
    createPreviewRow({ key: "mercedes", name: "Mercedes", startYear: normalizedStartYear, teamId: 4, brandYear: Math.max(2025, normalizedStartYear) }),
    createPreviewRow({ key: "alpine", name: "Alpine", startYear: normalizedStartYear, teamId: 5, brandYear: Math.max(2025, normalizedStartYear) }),
  ];

  if (includeFutureVariants && normalizedStartYear <= 2025) {
    rows.push(
      createPreviewRow({ key: "williams-early", name: "Williams", startYear: normalizedStartYear, endYear: 2025, teamId: 6, brandYear: 2025, familyKey: "williams" }),
      createPreviewRow({ key: "williams-2026", name: "Williams", startYear: 2026, teamId: 6, brandYear: 2026, familyKey: "williams", isSubRow: true }),
    );
  } else {
    rows.push(
      createPreviewRow({ key: "williams", name: "Williams", startYear: normalizedStartYear, teamId: 6, brandYear: normalizedStartYear >= 2026 ? 2026 : 2025, familyKey: "williams" }),
    );
  }

  rows.push(createPreviewRow({ key: "haas", name: "Haas", startYear: normalizedStartYear, teamId: 7, brandYear: Math.max(2025, normalizedStartYear) }));

  if (includeFutureVariants) {
    if (normalizedStartYear <= 2023) {
      rows.push(
        createPreviewRow({ key: "alphatauri", name: "AlphaTauri", startYear: normalizedStartYear, endYear: 2023, teamId: 8, brandYear: 2023, familyKey: "team-8" }),
        createPreviewRow({ key: "racingbulls", name: "Racing Bulls", startYear: 2024, teamId: 8, brandYear: 2025, familyKey: "team-8", isSubRow: true }),
      );
    } else {
      rows.push(
        createPreviewRow({ key: "racingbulls", name: "Racing Bulls", startYear: normalizedStartYear, teamId: 8, brandYear: normalizedStartYear >= 2026 ? 2026 : 2025, familyKey: "team-8" }),
      );
    }

    if (normalizedStartYear <= 2023) {
      rows.push(
        createPreviewRow({ key: "alfaromeo", name: "Alfa Romeo", startYear: normalizedStartYear, endYear: 2023, teamId: 9, brandYear: 2023, familyKey: "team-9" }),
        createPreviewRow({ key: "kicksauber", name: "Kick Sauber", startYear: 2024, endYear: 2025, teamId: 9, brandYear: 2025, familyKey: "team-9", isSubRow: true }),
        createPreviewRow({ key: "audi", name: "Audi", startYear: 2026, teamId: 9, brandYear: 2026, familyKey: "team-9", isSubRow: true }),
      );
    } else if (normalizedStartYear <= 2025) {
      rows.push(
        createPreviewRow({ key: "kicksauber", name: "Kick Sauber", startYear: normalizedStartYear, endYear: 2025, teamId: 9, brandYear: 2025, familyKey: "team-9" }),
        createPreviewRow({ key: "audi", name: "Audi", startYear: 2026, teamId: 9, brandYear: 2026, familyKey: "team-9", isSubRow: true }),
      );
    } else {
      rows.push(
        createPreviewRow({ key: "audi", name: "Audi", startYear: normalizedStartYear, teamId: 9, brandYear: 2026, familyKey: "team-9" }),
      );
    }
  } else {
    rows.push(
      createPreviewRow({
        key: normalizedStartYear <= 2023 ? "alphatauri" : "racingbulls",
        name: normalizedStartYear <= 2023 ? "AlphaTauri" : "Racing Bulls",
        startYear: normalizedStartYear,
        teamId: 8,
        brandYear: normalizedStartYear <= 2023 ? 2023 : normalizedStartYear >= 2026 ? 2026 : 2025,
      }),
      createPreviewRow({
        key: normalizedStartYear <= 2023 ? "alfaromeo" : normalizedStartYear <= 2025 ? "kicksauber" : "audi",
        name: normalizedStartYear <= 2023 ? "Alfa Romeo" : normalizedStartYear <= 2025 ? "Kick Sauber" : "Audi",
        startYear: normalizedStartYear,
        teamId: 9,
        brandYear: normalizedStartYear <= 2023 ? 2023 : normalizedStartYear <= 2025 ? 2025 : 2026,
      }),
    );
  }

  rows.push(
    createPreviewRow({ key: "astonmartin", name: "Aston Martin", startYear: normalizedStartYear, teamId: 10, brandYear: Math.max(2025, normalizedStartYear) }),
  );

  return rows;
}

function getBrandingContext(options = {}) {
  const globalContext = typeof window !== "undefined" ? window.__teamBrandingContext || {} : {};
  return {
    currentSeason: options.currentSeason ?? globalContext.currentSeason ?? null,
    startSeason: options.startSeason ?? globalContext.startSeason ?? null,
    useRealWorldTeamBrands: options.useRealWorldTeamBrands ?? globalContext.useRealWorldTeamBrands ?? true,
    brandYearOverride: options.brandYearOverride ?? null,
  };
}

export function getDisplayBrandYear(version, options = {}) {
  const saveYear = getSaveYear(version);
  const { currentSeason, startSeason, useRealWorldTeamBrands, brandYearOverride } = getBrandingContext(options);

  if (Number.isFinite(Number(brandYearOverride))) {
    return Math.min(2026, Math.max(2022, Number(brandYearOverride)));
  }

  if (useRealWorldTeamBrands && Number.isFinite(Number(currentSeason)) && Number.isFinite(Number(startSeason)) && Number(currentSeason) > Number(startSeason)) {
    return Math.min(2026, Math.max(2022, Number(currentSeason)));
  }

  return saveYear;
}

function resolveWhiteAsset(assetPath) {
  const explicitWhiteRef = `../../assets/team-logos/${assetPath}-white.webp`;
  if (whiteLogoAssets[explicitWhiteRef]) {
    return whiteLogoAssets[explicitWhiteRef];
  }

  const baseWhiteRef = `../../assets/team-logos/${assetPath}.webp`;
  if (whiteLogoAssets[baseWhiteRef]) {
    return whiteLogoAssets[baseWhiteRef];
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

export function getOfficialTeamLogoConfig(version, teamId, options = {}) {
  const brandYear = getDisplayBrandYear(version, options);
  const assetPath = teamLogoPathsByBrandYear[brandYear]?.[teamId];
  if (!assetPath) {
    return null;
  }

  const whiteLogo = resolveWhiteAsset(assetPath);
  const coloredLogo = resolveColoredAsset(assetPath);
  const defaultLogo = alwaysWhitePaths.has(assetPath)
    ? whiteLogo || coloredLogo
    : coloredLogo || whiteLogo;

  return {
    brandYear,
    assetPath,
    whiteLogo,
    coloredLogo,
    defaultLogo,
    backgroundColor: logoBackgroundColorByPath[assetPath] || "#101820",
    alwaysWhite: alwaysWhitePaths.has(assetPath),
  };
}

export function getOfficialTeamLogo(version, teamId, logoStyle = "normal", options = {}) {
  const config = getOfficialTeamLogoConfig(version, teamId, options);
  if (!config) {
    return null;
  }

  const { assetPath, whiteLogo, coloredLogo, defaultLogo } = config;

  if (logoStyle === "white") {
    return whiteLogo || defaultLogo || null;
  }

  if (logoStyle === "colored-white") {
    return whiteLogo || defaultLogo || coloredLogo || null;
  }

  return defaultLogo || null;
}
