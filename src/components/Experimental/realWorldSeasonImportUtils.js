import {
  getExistingTableSet,
  recalculateRaceStandings,
  setCareerSaveMetadataFields,
} from "@/components/Customize/Player/timeMachineUtils";
import { parseBasicInfo } from "@/js/BasicInfo";
import { dateToDay, dayToDate, resolveDriverCode, resolveLiteral, resolveName, unresolveDriverCode, unresolveName } from "@/js/localization";

const SEASON_RACE_DELETE_TABLES = [
  { table: "Races_Results", seasonColumn: "Season" },
  { table: "Races_FeatureRaceResults", seasonColumn: "SeasonID" },
  { table: "Races_SprintResults", seasonColumn: "SeasonID" },
  { table: "Races_QualifyingResults", seasonColumn: "SeasonID" },
  { table: "Races_PracticeResults", seasonColumn: "SeasonID" },
  { table: "Races_PitStopResults", seasonColumn: "SeasonID" },
  { table: "Races_PitStopTimings", seasonColumn: "SeasonID" },
];

const F1_TEAM_NAME_TO_ID = {
  ferrari: 1,
  mclaren: 2,
  "mclaren mercedes": 2,
  "mclaren f1 team": 2,
  "red bull": 3,
  "red bull racing": 3,
  "red bull racing rbpt": 3,
  "red bull racing honda rbpt": 3,
  mercedes: 4,
  alpine: 5,
  "alpine f1 team": 5,
  "alpine renault": 5,
  williams: 6,
  "williams mercedes": 6,
  haas: 7,
  "haas ferrari": 7,
  "haas f1 team": 7,
  alphatauri: 8,
  "alphatauri rbpt": 8,
  rb: 8,
  "rb f1 team": 8,
  "racing bulls": 8,
  "racing bulls honda rbpt": 8,
  "racing bulls rbpt": 8,
  "alfa romeo": 9,
  "alfa romeo ferrari": 9,
  sauber: 9,
  "kick sauber": 9,
  "kick sauber ferrari": 9,
  "aston martin": 10,
  "aston martin aramco mercedes": 10,
};

const TRACK_ID_BY_SLUG = {
  australia: 1,
  bahrain: 2,
  china: 3,
  azerbaijan: 4,
  spain: 5,
  monaco: 6,
  canada: 7,
  france: 8,
  austria: 9,
  "great-britain": 10,
  "saudi-arabia": 11,
  hungary: 12,
  belgium: 13,
  italy: 14,
  singapore: 15,
  japan: 17,
  mexico: 18,
  "united-states": 19,
  brazil: 20,
  "abu-dhabi": 21,
  miami: 22,
  netherlands: 23,
  "emilia-romagna": 24,
  "las-vegas": 25,
  qatar: 26,
};

const JOLPICA_CIRCUIT_ID_TO_SLUG = {
  albert_park: "australia",
  bahrain: "bahrain",
  jeddah: "saudi-arabia",
  shanghai: "china",
  miami: "miami",
  imola: "emilia-romagna",
  monaco: "monaco",
  villeneuve: "canada",
  catalunya: "spain",
  red_bull_ring: "austria",
  silverstone: "great-britain",
  hungaroring: "hungary",
  spa: "belgium",
  zandvoort: "netherlands",
  monza: "italy",
  baku: "azerbaijan",
  marina_bay: "singapore",
  americas: "united-states",
  rodriguez: "mexico",
  interlagos: "brazil",
  vegas: "las-vegas",
  losail: "qatar",
  yas_marina: "abu-dhabi",
  sepang: "malaysia",
  paul_ricard: "france",
  suzuka: "japan",
};

const COMPONENT_WEAR_BY_PART_TYPE = {
  0: 0.085,
  1: 0.07,
  2: 0.08,
  3: 0.04,
  4: 0.05,
  5: 0.05,
  6: 0.04,
  7: 0.055,
  8: 0.045,
};

const PART_TYPE_TOKEN_BY_ID = {
  0: "Part_Type_Chassis",
  1: "Part_Type_FrontWing",
  2: "Part_Type_RearWing",
  3: "Part_Type_Body",
  4: "Part_Type_SidePods",
  5: "Part_Type_Floor",
  6: "Part_Type_Suspension",
  7: "Part_Type_Gearbox",
  8: "Part_Type_Engine",
};

const F1_DRIVER_DIRECTORY = {
  "alexander albon": { firstName: "Alexander", lastName: "Albon", code: "ALB", countryCandidates: ["Thailand", "UnitedKingdom"], dob: "1996-03-23" },
  "carlos sainz": { firstName: "Carlos", lastName: "Sainz", code: "SAI", countryCandidates: ["Spain"], dob: "1994-09-01" },
  "charles leclerc": { firstName: "Charles", lastName: "Leclerc", code: "LEC", countryCandidates: ["Monaco"], dob: "1997-10-16" },
  "daniel ricciardo": { firstName: "Daniel", lastName: "Ricciardo", code: "RIC", countryCandidates: ["Australia"], dob: "1989-07-01" },
  "esteban ocon": { firstName: "Esteban", lastName: "Ocon", code: "OCO", countryCandidates: ["France"], dob: "1996-09-17" },
  "fernando alonso": { firstName: "Fernando", lastName: "Alonso", code: "ALO", countryCandidates: ["Spain"], dob: "1981-07-29" },
  "franco colapinto": { firstName: "Franco", lastName: "Colapinto", code: "COL", countryCandidates: ["Argentina"], dob: "2003-05-27" },
  "gabriel bortoleto": { firstName: "Gabriel", lastName: "Bortoleto", code: "BOR", countryCandidates: ["Brazil"], dob: "2004-10-14" },
  "george russell": { firstName: "George", lastName: "Russell", code: "RUS", countryCandidates: ["UnitedKingdom", "GreatBritain"], dob: "1998-02-15" },
  "isack hadjar": { firstName: "Isack", lastName: "Hadjar", code: "HAD", countryCandidates: ["France"], dob: "2004-09-28" },
  "jack doohan": { firstName: "Jack", lastName: "Doohan", code: "DOO", countryCandidates: ["Australia"], dob: "2003-01-20" },
  "kevin magnussen": { firstName: "Kevin", lastName: "Magnussen", code: "MAG", countryCandidates: ["Denmark"], dob: "1992-10-05" },
  "andrea kimi antonelli": { firstName: "Andrea Kimi", lastName: "Antonelli", code: "ANT", countryCandidates: ["Italy"], dob: "2006-08-25" },
  "lance stroll": { firstName: "Lance", lastName: "Stroll", code: "STR", countryCandidates: ["Canada"], dob: "1998-10-29" },
  "lando norris": { firstName: "Lando", lastName: "Norris", code: "NOR", countryCandidates: ["UnitedKingdom", "GreatBritain"], dob: "1999-11-13" },
  "lewis hamilton": { firstName: "Lewis", lastName: "Hamilton", code: "HAM", countryCandidates: ["UnitedKingdom", "GreatBritain"], dob: "1985-01-07" },
  "liam lawson": { firstName: "Liam", lastName: "Lawson", code: "LAW", countryCandidates: ["NewZealand"], dob: "2002-02-11" },
  "logan sargeant": { firstName: "Logan", lastName: "Sargeant", code: "SAR", countryCandidates: ["UnitedStates"], dob: "2000-12-31" },
  "max verstappen": { firstName: "Max", lastName: "Verstappen", code: "VER", countryCandidates: ["Netherlands"], dob: "1997-09-30" },
  "nico hulkenberg": { firstName: "Nico", lastName: "Hulkenberg", code: "HUL", countryCandidates: ["Germany"], dob: "1987-08-19" },
  "nicholas latifi": { firstName: "Nicholas", lastName: "Latifi", code: "LAT", countryCandidates: ["Canada"], dob: "1995-06-29" },
  "nyck de vries": { firstName: "Nyck", lastName: "de Vries", code: "DEV", countryCandidates: ["Netherlands"], dob: "1995-02-06" },
  "oliver bearman": { firstName: "Oliver", lastName: "Bearman", code: "BEA", countryCandidates: ["UnitedKingdom", "GreatBritain"], dob: "2005-05-08" },
  "oscar piastri": { firstName: "Oscar", lastName: "Piastri", code: "PIA", countryCandidates: ["Australia"], dob: "2001-04-06" },
  "pierre gasly": { firstName: "Pierre", lastName: "Gasly", code: "GAS", countryCandidates: ["France"], dob: "1996-02-07" },
  "sergio perez": { firstName: "Sergio", lastName: "Perez", code: "PER", countryCandidates: ["Mexico"], dob: "1990-01-26" },
  "valtteri bottas": { firstName: "Valtteri", lastName: "Bottas", code: "BOT", countryCandidates: ["Finland"], dob: "1989-08-28" },
  "yuki tsunoda": { firstName: "Yuki", lastName: "Tsunoda", code: "TSU", countryCandidates: ["Japan"], dob: "2000-05-11" },
  "guanyu zhou": { firstName: "Guanyu", lastName: "Zhou", code: "ZHO", countryCandidates: ["China"], dob: "1999-05-30" },
};

const DEFAULT_SERIES_CONFIG = {
  f1: {
    label: "Formula 1",
    formula: 1,
    teamMapper: mapF1TeamNameToId,
    resultPlan: [
      { sessionKey: "practice1", table: "Races_PracticeResults", sessionType: "practice", practiceSession: 1 },
      { sessionKey: "practice2", table: "Races_PracticeResults", sessionType: "practice", practiceSession: 2 },
      { sessionKey: "practice3", table: "Races_PracticeResults", sessionType: "practice", practiceSession: 3 },
      { sessionKey: "qualifying", table: "Races_QualifyingResults", sessionType: "qualifying" },
      { sessionKey: "sprint", table: "Races_SprintResults", sessionType: "sprint" },
      { sessionKey: "race", table: "Races_Results", sessionType: "race" },
    ],
  },
  f2: {
    label: "Formula 2",
    formula: 2,
    teamMapper: (teamName, teamMap = {}) => teamMap[normalizeName(teamName)] ?? null,
    resultPlan: [
      { sessionKey: "practice", table: "Races_PracticeResults", sessionType: "practice", practiceSession: 1 },
      { sessionKey: "qualifying", table: "Races_QualifyingResults", sessionType: "qualifying" },
      { sessionKey: "sprint", table: "Races_SprintResults", sessionType: "sprint" },
      { sessionKey: "feature", table: "Races_FeatureRaceResults", sessionType: "race" },
    ],
  },
  f3: {
    label: "Formula 3",
    formula: 3,
    teamMapper: (teamName, teamMap = {}) => teamMap[normalizeName(teamName)] ?? null,
    resultPlan: [
      { sessionKey: "practice", table: "Races_PracticeResults", sessionType: "practice", practiceSession: 1 },
      { sessionKey: "qualifying", table: "Races_QualifyingResults", sessionType: "qualifying" },
      { sessionKey: "sprint", table: "Races_SprintResults", sessionType: "sprint" },
      { sessionKey: "feature", table: "Races_FeatureRaceResults", sessionType: "race" },
    ],
  },
};

const F1_RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const F1_SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];
const DEFAULT_CUSTOM_TEAM_RANDOMIZATION = {
  baselineStrength: 12,
  derivation: 14,
  dnfChance: 8,
};

export async function readRealWorldDatasetFile(file) {
  const raw = await file.text();
  return JSON.parse(raw);
}

const REAL_WORLD_DATASET_YEARS = [2022, 2023, 2024, 2025];

function getBundledDatasetBasePath(seriesKey) {
  return `/real-world/${seriesKey}`;
}

function mergeRealWorldDatasets(seriesKey, datasets) {
  const merged = {
    series: datasets[0]?.series || seriesKey,
    seasons: {},
  };

  datasets.forEach((dataset) => {
    Object.entries(dataset?.seasons || {}).forEach(([year, season]) => {
      merged.seasons[year] = season;
    });
  });

  return merged;
}

export async function fetchBundledRealWorldDataset(seriesKey, years = REAL_WORLD_DATASET_YEARS) {
  const normalizedYears = [...new Set([].concat(years))]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  const basePath = getBundledDatasetBasePath(seriesKey);
  const responses = await Promise.all(
    normalizedYears.map(async (year) => {
      const response = await fetch(`${basePath}/${year}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${seriesKey} ${year}`);
      }
      return response.json();
    })
  );
  return mergeRealWorldDatasets(seriesKey, responses);
}

export function getAvailableImportYears(dataset) {
  return Object.keys(dataset?.seasons || {})
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
}

export function getSeasonImportPreview({ dataset, basicInfo, targetYear, lastCompletedRound = null }) {
  const currentSeason = Number(basicInfo?.player?.CurrentSeason || 0);
  if (!dataset?.seasons || !targetYear || Number(targetYear) < currentSeason) {
    return null;
  }
  const importDriverNames = new Set();
  let eventCount = 0;

  for (let year = currentSeason; year <= Number(targetYear); year += 1) {
    const season = dataset.seasons?.[`${year}`];
    if (!season) {
      continue;
    }
    const maxRound = season.events?.length || 0;
    const startRound = year === currentSeason ? getLockedCompletedRounds(basicInfo) : 0;
    const endRound = year === Number(targetYear)
      ? Math.max(0, Math.min(Number(lastCompletedRound ?? maxRound), maxRound))
      : maxRound;
    const selectedEvents = (season.events || []).slice(startRound, endRound);
    eventCount += selectedEvents.length;
    collectSeasonDriverNames({ ...season, events: selectedEvents }).forEach((name) => importDriverNames.add(name));
  }

  const existingDrivers = new Set(
    Object.values(basicInfo?.driverMap || {}).map((driver) => normalizeName(resolveDriverName(driver)))
  );
  const importedDrivers = [...importDriverNames].sort((left, right) => left.localeCompare(right));

  return {
    eventCount,
    importedDriverCount: importedDrivers.length,
    missingDrivers: importedDrivers.filter((name) => !existingDrivers.has(normalizeName(name))),
    driverConflicts: getImportDriverConflicts({ dataset, basicInfo, targetYear, lastCompletedRound }),
  };
}

export function getLockedCompletedRounds(basicInfo) {
  return countLockedCompletedRounds(basicInfo);
}

export function applyRealWorldSeasonImport({
  database,
  metadata,
  basicInfo,
  basicInfoUpdater,
  datasets,
  targetYear,
  lastCompletedRound,
  customTeamRandomization,
  driverReplacements,
}) {
  if ((metadata?.version || 0) < 4) {
    throw new Error("This experimental importer currently targets F1 Manager 2024 saves only.");
  }

  if (isRaceWeekendInProgress(basicInfo)) {
    throw new Error("Finish the active race weekend before running an import.");
  }

  const tableSet = getExistingTableSet(database);
  if (tableSet.has("Save_Weekend")) {
    const activeWeekendRows = Number(readRows(database, "SELECT COUNT(*) AS Count FROM Save_Weekend")[0]?.Count || 0);
    if (activeWeekendRows > 0) {
      throw new Error("This save still contains an in-progress weekend snapshot. Resume it once and create a clean save first.");
    }
  }

  const startingSeason = Number(basicInfo?.player?.CurrentSeason || 0);
  if (targetYear < startingSeason) {
    throw new Error("This importer only supports the current season or future seasons.");
  }

  let liveBasicInfo = basicInfo;
  const createdDrivers = [];
  const appliedSeries = new Set();

  withImportSqlLogger(database, () => {
    database.exec("BEGIN");
    try {
      for (let year = startingSeason; year <= targetYear; year += 1) {
        const f1Season = datasets?.f1?.seasons?.[`${year}`];
        if (!f1Season) {
          throw new Error(`No Formula 1 season data found for ${year}.`);
        }
        const requestedLastRound = year === targetYear ? Number(lastCompletedRound || 0) : (f1Season.events?.length || 0);
        const result = applySingleSeasonImport({
          database,
          metadata,
          basicInfo: liveBasicInfo,
          datasets,
          targetYear: year,
          lastCompletedRound: requestedLastRound,
          allowCarryForwardFromPriorSeason: year > startingSeason,
          customTeamRandomization,
          driverReplacements,
        });
        result.createdDrivers.forEach((name) => createdDrivers.push(name));
        result.appliedSeries.forEach((seriesKey) => appliedSeries.add(seriesKey));
        liveBasicInfo = parseBasicInfo({ db: database, metadata });
      }
      database.exec("COMMIT");
    } catch (error) {
      try {
        database.exec("ROLLBACK");
      } catch {
        // ignore nested rollback errors
      }
      throw error;
    }
  });

  basicInfoUpdater({ metadata });
  return {
    createdDrivers: [...new Set(createdDrivers)],
    appliedSeries: [...appliedSeries],
    targetYear,
    completedRounds: Number(lastCompletedRound || 0),
  };
}

function applySingleSeasonImport({
  database,
  metadata,
  basicInfo,
  datasets,
  targetYear,
  lastCompletedRound,
  allowCarryForwardFromPriorSeason = false,
  customTeamRandomization,
  driverReplacements,
}) {
  let tableSet = getExistingTableSet(database);
  const f1Season = datasets?.f1?.seasons?.[`${targetYear}`];
  if (!f1Season) {
    throw new Error(`No Formula 1 season data found for ${targetYear}.`);
  }

  const maxRound = f1Season.events?.length || 0;
  const lastRound = Math.max(0, Math.min(Number(lastCompletedRound || 0), maxRound));
  if (!maxRound) {
    throw new Error(`Season ${targetYear} does not contain any events.`);
  }

  const currentSeason = Number(basicInfo?.player?.CurrentSeason || 0);
  const lockedCompletedRounds = allowCarryForwardFromPriorSeason || targetYear !== currentSeason
    ? 0
    : countLockedCompletedRounds(basicInfo);

  if (lastRound < lockedCompletedRounds) {
    throw new Error(
      `This save already has ${lockedCompletedRounds} completed round(s). Choose a target round at or after round ${lockedCompletedRounds}.`
    );
  }

  const importState = {
    datasets,
    targetYear,
    lastRound,
    lockedCompletedRounds,
    importStartRound: lockedCompletedRounds,
    initialTeamSeatState: buildInitialSeatState(basicInfo),
    teamSeatState: buildInitialSeatState(basicInfo),
    driverIdsByName: buildExistingDriverLookup(basicInfo),
    currentSeason,
    currentSeasonRaces: [...(basicInfo.currentSeasonRaces || [])].sort((left, right) => left.Day - right.Day || left.RaceID - right.RaceID),
    teamMap: basicInfo.teamMap || {},
    driverMap: basicInfo.driverMap || {},
    database,
    feederTeamMappings: {},
    createdDrivers: [],
    appliedSeries: [],
    metadata,
    initialPlayerDay: Number(basicInfo?.player?.Day || 0),
    customTeamRandomization: normalizeCustomTeamRandomization({ basicInfo, customTeamRandomization }),
    driverReplacements: normalizeDriverReplacements({ basicInfo, driverReplacements }),
  };

  ensureExperimentalTables(database);
  tableSet = getExistingTableSet(database);
  retargetSaveToImportedSeason({ database, metadata, basicInfo, tableSet, targetYear });
  const raceShells = rebuildSeasonCalendar({ database, tableSet, importState, season: f1Season });
  clearImportedSeasonState({ database, tableSet, seasonId: targetYear, raceShells, importState });

  const activeSeriesKeys = ["f1", "f2", "f3"].filter((key) => datasets?.[key]?.seasons?.[`${targetYear}`]);
  for (const seriesKey of activeSeriesKeys) {
    applySeriesSeason({
      database,
      tableSet,
      importState,
      seriesKey,
      season: datasets[seriesKey].seasons[`${targetYear}`],
      raceShells,
    });
    importState.appliedSeries.push(seriesKey);
  }

  finalizeDriverContracts({ database, importState, seasonId: targetYear, raceShells });
  applyComponentInspectionState({ database, tableSet, importState, raceShells, seasonId: targetYear });
  updatePlayerProgress({ database, metadata, tableSet, importState, raceShells, season: f1Season });

  for (const _seriesKey of importState.appliedSeries) {
    recalculateRaceStandings({
      database,
      season: targetYear,
      tableSet,
    });
  }

  rebuildPostRaceDerivedTables({ database, tableSet, importState, raceShells });

  return {
    createdDrivers: importState.createdDrivers,
    appliedSeries: importState.appliedSeries,
    targetYear,
    completedRounds: lastRound,
  };
}

function applySeriesSeason({ database, tableSet, importState, seriesKey, season, raceShells }) {
  const config = DEFAULT_SERIES_CONFIG[seriesKey];
  if (!config) {
    return;
  }

  const eventsToApply = (season.events || []).slice(importState.importStartRound, importState.lastRound);
  const teamMapping = resolveSeasonTeamMapping({
    database,
    importState,
    seriesKey,
    season,
    config,
  });

  ensureStandingsRows({
    database,
    tableSet,
    seasonId: importState.targetYear,
    formula: config.formula,
    season,
    importState,
    teamMapping,
    config,
  });

  eventsToApply.forEach((event, eventIndex) => {
    const raceIndex = importState.importStartRound + eventIndex;
    const raceShell = resolveRaceShellForEvent({ raceShells, event, fallbackIndex: raceIndex });
    if (!raceShell) {
      return;
    }
    const seatAssignments = ensureEventSeatAssignments(importState, event);
    const sessionRowCache = new Map();
    const getSessionRows = (sessionKey, sessionType) => {
      const cacheKey = `${sessionKey}:${sessionType}`;
      if (sessionRowCache.has(cacheKey)) {
        return sessionRowCache.get(cacheKey);
      }
      const nextRows = buildSessionImportRows({
        importState,
        seriesKey,
        season,
        event,
        session: event.sessions?.[sessionKey],
        plan: { sessionType },
      });
      sessionRowCache.set(cacheKey, nextRows);
      return nextRows;
    };
    const raceGridByDriver = buildGridPositionMap(
      event.sessions?.startingGrid?.results?.length
        ? getSessionRows("startingGrid", "qualifying")
        : getSessionRows("qualifying", "qualifying")
    );
    const sprintGridByDriver = buildGridPositionMap(
      event.sessions?.sprintGrid?.results?.length
        ? getSessionRows("sprintGrid", "qualifying")
        : []
    );

    for (const plan of config.resultPlan) {
      const session = event.sessions?.[plan.sessionKey];
      if (!session?.results?.length || !tableSet.has(plan.table)) {
        console.debug("[RealWorldImport][SessionSkip]", {
          seriesKey,
          round: event.round,
          eventName: event.eventName,
          sessionKey: plan.sessionKey,
          table: plan.table,
          hasResults: Boolean(session?.results?.length),
          tableExists: tableSet.has(plan.table),
        });
        continue;
      }
      console.debug("[RealWorldImport][SessionStart]", {
        seriesKey,
        formula: config.formula,
        round: event.round,
        eventName: event.eventName,
        sessionKey: plan.sessionKey,
        table: plan.table,
        resultCount: session.results.length,
        raceId: raceShell.RaceID,
      });
      const sessionRows = getSessionRows(plan.sessionKey, plan.sessionType);
      const sessionLapFallback = getSessionLapFallback(sessionRows);
      const sessionFinishingPositions = getSessionFinishingPositions(sessionRows);
      const sessionTimeContext = buildSessionTimeContext(plan.sessionType, sessionRows);
      let insertedCount = 0;
      sessionRows.forEach((resultRow, resultIndex) => {
        const driverId = Number(resultRow.driverId) || ensureDriverExists({
          database,
          importState,
          driverName: resultRow.driverName,
          driverCode: resultRow.driverCode,
        });
        const teamId = resolveSeriesTeamId({
          config,
          resultRow,
          event,
          teamMapping,
        });
        if (!driverId || (config.formula === 1 && !teamId)) {
          console.debug("[RealWorldImport][RowSkip]", {
            seriesKey,
            round: event.round,
            eventName: event.eventName,
            sessionKey: plan.sessionKey,
            table: plan.table,
            driverName: resultRow.driverName,
            teamName: resultRow.teamName,
            driverId,
            teamId,
          });
          return;
        }
        const seatAssignment = config.formula === 1 ? seatAssignments[teamId]?.[normalizeName(resultRow.driverName)] : null;

        insertSessionResultRow({
          database,
          table: plan.table,
          tableSet,
          seriesKey,
          seasonId: importState.targetYear,
          formula: config.formula,
          raceId: raceShell.RaceID,
          teamId,
          driverId,
          loadoutId: seatAssignment?.loadoutId || null,
          resultRow,
          sessionType: plan.sessionType,
          practiceSession: plan.practiceSession || null,
          rowIndex: resultIndex,
          sessionLapFallback,
          normalizedFinishingPos: sessionFinishingPositions[resultIndex],
          resolvedGridPosition: plan.sessionType === "race"
            ? raceGridByDriver[normalizeName(resultRow.driverName)] ?? null
            : plan.sessionType === "sprint"
              ? sprintGridByDriver[normalizeName(resultRow.driverName)] ?? null
              : null,
          sessionTimeContext,
        });
        insertedCount += 1;
      });
      console.debug("[RealWorldImport][SessionDone]", {
        seriesKey,
        formula: config.formula,
        round: event.round,
        eventName: event.eventName,
        sessionKey: plan.sessionKey,
        table: plan.table,
        insertedCount,
        raceId: raceShell.RaceID,
      });
    }

    if (seriesKey === "f1") {
      applyF1PitStopImport({
        database,
        tableSet,
        importState,
        event,
        raceShell,
        raceRows: getSessionRows("race", "race"),
        teamMapping,
        config,
      });
    }
  });
}

function buildSessionImportRows({ importState, seriesKey, season, event, session, plan }) {
  const sessionRows = (session?.results || []).map((row) => ({ ...row }));
  if (seriesKey !== "f1" || !["qualifying", "race", "sprint"].includes(plan.sessionType)) {
    return sessionRows;
  }

  const customTeamDrivers = getCustomTeamDriverEntries(importState);
  if (!customTeamDrivers.length) {
    return sessionRows;
  }

  const rng = createSeededRng([
    importState.targetYear,
    event.round,
    plan.sessionType,
    importState.customTeamRandomization?.teamId,
    importState.customTeamRandomization?.baselineStrength,
    importState.customTeamRandomization?.derivation,
    importState.customTeamRandomization?.dnfChance,
  ].join(":"));
  const baselineStrength = Number(importState.customTeamRandomization?.baselineStrength || DEFAULT_CUSTOM_TEAM_RANDOMIZATION.baselineStrength);
  const derivation = Number(importState.customTeamRandomization?.derivation || DEFAULT_CUSTOM_TEAM_RANDOMIZATION.derivation);
  const dnfChance = Number(importState.customTeamRandomization?.dnfChance || DEFAULT_CUSTOM_TEAM_RANDOMIZATION.dnfChance);
  const explicitFastestLapDriver = plan.sessionType === "race"
    ? findExplicitFastestLapDriverKey(sessionRows)
    : null;

  const rankedRows = sessionRows.map((row, index) => ({
    ...row,
    __source: "imported",
    __originalIndex: index,
    __originalPoints: Number(row?.points ?? row?.pts ?? 0),
  }));
  const rankedRowByDriver = new Map();
  rankedRows.forEach((row) => {
    rankedRowByDriver.set(normalizeName(row.driverName), row);
    if (row.driverCode) {
      rankedRowByDriver.set(`code:${normalizeDriverCode(row.driverCode)}`, row);
    }
  });
  let customDriverChanges = 0;

  customTeamDrivers.forEach((driver, index) => {
    const teammateOffset = index === 0 ? -0.05 - (rng() * 0.04) : 0.05 + (rng() * 0.04);
    const targetQuantile = clampUnitInterval((100 - baselineStrength) / 100 + teammateOffset);
    const existingRow = rankedRowByDriver.get(normalizeName(driver.driverName))
      || rankedRowByDriver.get(`code:${normalizeDriverCode(driver.driverCode)}`);
    if (existingRow) {
      existingRow.driverId = driver.driverId;
      existingRow.teamName = driver.teamName;
      existingRow.teamId = driver.teamId;
      existingRow.driverNumber = driver.driverNumber ?? existingRow.driverNumber;
      existingRow.__source = "custom-team-reassigned";
      existingRow.__targetQuantile = targetQuantile;
      existingRow.__variation = derivation;
      existingRow.__dnfChance = dnfChance;
      customDriverChanges += 1;
      return;
    }
    rankedRows.push(buildSyntheticCustomTeamRow({
      driver,
      sessionType: plan.sessionType,
      targetQuantile,
      derivation,
      dnfChance,
      lapFallback: getSessionLapFallback(sessionRows),
    }));
    customDriverChanges += 1;
  });
  if (!customDriverChanges) {
    return sessionRows;
  }

  const simulatedRows = simulateCustomTeamSessionRows({
    rows: rankedRows,
    sessionType: plan.sessionType,
    rng,
  });

  return simulatedRows.map((row, index, allRows) => finalizeSyntheticSessionRow({
    row,
    index,
    allRows,
    sessionType: plan.sessionType,
    explicitFastestLapDriver,
    fastestLapPointAwarded: season?.rules?.fastestLapPointAwarded !== false,
  }));
}

function applyF1PitStopImport({ database, tableSet, importState, event, raceShell, raceRows, teamMapping, config }) {
  if (!tableSet.has("Races_PitStopResults") || !raceShell || !raceRows?.length) {
    return;
  }

  const raceEntries = raceRows
    .map((row, index) => {
      const driverId = Number(row.driverId) || ensureDriverExists({
        database,
        importState,
        driverName: row.driverName,
        driverCode: row.driverCode,
      });
      const teamId = resolveSeriesTeamId({
        config,
        resultRow: row,
        event,
        teamMapping,
      });
      return {
        row,
        index,
        driverId,
        teamId,
        driverKey: normalizeName(row.driverName),
      };
    })
    .filter((entry) => entry.driverId && entry.teamId);

  if (!raceEntries.length) {
    return;
  }

  const raceEntryByDriverKey = Object.fromEntries(raceEntries.map((entry) => [entry.driverKey, entry]));
  const fetchedPayload = event?.pitStops || null;
  const fetchedResults = (fetchedPayload?.results || [])
    .map((row) => {
      const driverKey = normalizeName(row.driverName);
      const raceEntry = raceEntryByDriverKey[driverKey];
      return raceEntry ? {
        ...row,
        driverKey,
        driverId: raceEntry.driverId,
        teamId: raceEntry.teamId,
      } : null;
    })
    .filter(Boolean);

  const fetchedTimings = (fetchedPayload?.timings || [])
    .map((row) => {
      const driverKey = normalizeName(row.driverName);
      const raceEntry = raceEntryByDriverKey[driverKey];
      return raceEntry ? {
        ...row,
        driverKey,
        driverId: raceEntry.driverId,
        teamId: raceEntry.teamId,
      } : null;
    })
    .filter(Boolean);

  const generatedRows = buildMockPitStopRows({
    importState,
    event,
    raceEntries,
    existingDriverKeys: new Set(fetchedResults.map((row) => row.driverKey)),
    seedSuffix: fetchedResults.length ? "pit-missing" : "pit-full",
    slowerThan: fetchedResults.length
      ? Math.max(...fetchedResults.map((row) => Number(row.fastestPitStopTime || 0)).filter((value) => Number.isFinite(value)))
      : null,
  });
  const mergedResults = [...fetchedResults, ...generatedRows]
    .sort((left, right) => Number(left.fastestPitStopTime) - Number(right.fastestPitStopTime) || left.driverId - right.driverId)
    .map((row, index) => ({
      ...row,
      finishPosition: index + 1,
      points: F1_RACE_POINTS[index] || 0,
    }));

  const timingRows = [
    ...fetchedTimings,
    ...mergedResults
      .filter((row) => !fetchedTimings.some((timing) => Number(timing.driverId) === Number(row.driverId)))
      .map((row) => ({
      driverId: row.driverId,
      teamId: row.teamId,
      pitStopId: 1,
      lap: Number(row.lap) || 18,
      stopDuration: Number(row.fastestPitStopTime),
      stageDurations: buildPitStopStageDurations(Number(row.fastestPitStopTime)),
      })),
  ];

  insertPitStopResults({
    database,
    seasonId: importState.targetYear,
    raceId: raceShell.RaceID,
    results: mergedResults,
  });
  insertPitStopTimings({
    database,
    tableSet,
    seasonId: importState.targetYear,
    raceId: raceShell.RaceID,
    timingRows,
  });
}

function buildMockPitStopRows({ importState, event, raceEntries, existingDriverKeys, seedSuffix, slowerThan = null }) {
  const occupiedKeys = existingDriverKeys || new Set();
  const baseFloor = Number.isFinite(Number(slowerThan)) ? Number(slowerThan) + 0.015 : 2.42;
  return raceEntries
    .filter((entry) => !occupiedKeys.has(entry.driverKey))
    .map((entry) => {
      const rng = createSeededRng([
        importState.targetYear,
        event.round,
        seedSuffix,
        entry.teamId,
        entry.driverId,
      ].join(":"));
      const stopDuration = roundToThreeDecimals(baseFloor + (entry.index * 0.018) + (rng() * 0.09));
      const totalLaps = Number(entry.row?.laps || raceEntries[0]?.row?.laps || 57);
      const lap = Math.max(1, Math.min(totalLaps, Math.round((totalLaps * (0.28 + (rng() * 0.38))))));
      return {
        driverId: entry.driverId,
        teamId: entry.teamId,
        driverKey: entry.driverKey,
        fastestPitStopTime: stopDuration,
        lap,
      };
    });
}

function insertPitStopResults({ database, seasonId, raceId, results }) {
  const templateRow = getTemplateRow(database, "Races_PitStopResults");
  results.forEach((row) => {
    insertTableRow(database, "Races_PitStopResults", templateRow, sanitizeRowObject({
      SeasonID: seasonId,
      RaceID: raceId,
      TeamID: row.teamId,
      FinishPosition: row.finishPosition,
      FastestPitStopID: 1,
      FastestPitStopTime: row.fastestPitStopTime,
      DriverID: row.driverId,
      Points: row.points,
    }), {
      table: "Races_PitStopResults",
      seasonId,
      raceId,
      teamId: row.teamId,
      driverId: row.driverId,
    });
  });
}

function insertPitStopTimings({ database, tableSet, seasonId, raceId, timingRows }) {
  if (!tableSet.has("Races_PitStopTimings")) {
    return;
  }
  const templateRow = getTemplateRow(database, "Races_PitStopTimings");
  timingRows.forEach((row) => {
    const stageDurations = Array.isArray(row.stageDurations) && row.stageDurations.length
      ? row.stageDurations
      : buildPitStopStageDurations(Number(row.stopDuration));
    stageDurations.forEach((duration, stageIndex) => {
      insertTableRow(database, "Races_PitStopTimings", templateRow, sanitizeRowObject({
        SeasonID: seasonId,
        RaceID: raceId,
        TeamID: row.teamId,
        DriverID: row.driverId,
        PitStopID: Number(row.pitStopId) || 1,
        PitStopStage: stageIndex,
        Duration: duration,
        IncidentDelay: 0,
        Lap: Number(row.lap) || 0,
      }));
    });
  });
}

function buildPitStopStageDurations(totalDuration) {
  const weights = [0.168, 0.139, 0.168, 0.168, 0.139, 0.109, 0.109, 0, 0];
  return weights.map((weight) => roundToSixDecimals((Number(totalDuration) || 0) * weight));
}

function roundToThreeDecimals(value) {
  return Math.round((Number(value) || 0) * 1000) / 1000;
}

function roundToSixDecimals(value) {
  return Math.round((Number(value) || 0) * 1000000) / 1000000;
}

function retargetSaveToImportedSeason({ database, metadata, basicInfo, tableSet, targetYear }) {
  const currentSeason = Number(basicInfo.player.CurrentSeason);
  const seasonStartDay = dateToDay(new Date(`${targetYear}-01-01`));

  if (tableSet.has("Races")) {
    database.exec(`DELETE FROM Races WHERE SeasonID != ${currentSeason}`);
    database.exec(`UPDATE Races SET SeasonID = :targetYear WHERE SeasonID = :currentSeason`, {
      ":targetYear": targetYear,
      ":currentSeason": currentSeason,
    });
  }

  if (tableSet.has("Seasons")) {
    database.exec(`DELETE FROM Seasons WHERE SeasonID != ${currentSeason}`);
    database.exec(`UPDATE Seasons SET SeasonID = :targetYear WHERE SeasonID = :currentSeason`, {
      ":targetYear": targetYear,
      ":currentSeason": currentSeason,
    });
  }

  if (tableSet.has("Seasons_Deadlines")) {
    database.exec(`DELETE FROM Seasons_Deadlines WHERE SeasonID != ${currentSeason}`);
    database.exec(`UPDATE Seasons_Deadlines SET SeasonID = :targetYear WHERE SeasonID = :currentSeason`, {
      ":targetYear": targetYear,
      ":currentSeason": currentSeason,
    });
  }

  database.exec(`UPDATE Player_State SET CurrentSeason = :targetYear, Day = :seasonStartDay`, {
    ":targetYear": targetYear,
    ":seasonStartDay": seasonStartDay,
  });

  if (tableSet.has("Player_Record")) {
    database.exec(`UPDATE Player_Record SET StartSeason = CASE WHEN StartSeason > :targetYear THEN :targetYear ELSE StartSeason END`, {
      ":targetYear": targetYear,
    });
  }

  if (tableSet.has("Player_History")) {
    database.exec(`UPDATE Player_History SET StartDay = CASE WHEN StartDay > :seasonStartDay THEN :seasonStartDay ELSE StartDay END`, {
      ":seasonStartDay": seasonStartDay,
    });
  }

  setCareerSaveMetadataFields(metadata, {
    CurrentSeason: targetYear,
    Day: seasonStartDay,
  });
}

function clearImportedSeasonState({ database, tableSet, seasonId, raceShells, importState }) {
  const raceIdsToReset = raceShells.slice(importState.importStartRound).map((row) => row.RaceID);
  const raceIdList = raceIdsToReset.length ? raceIdsToReset.join(",") : "-1";

  for (const { table, seasonColumn } of SEASON_RACE_DELETE_TABLES) {
    if (!tableSet.has(table)) {
      continue;
    }
    const columns = new Set(getTableColumns(database, table));
    if (columns.has("RaceID")) {
      database.exec(`DELETE FROM ${table} WHERE RaceID IN (${raceIdList})`);
    } else {
      database.exec(`DELETE FROM ${table} WHERE ${seasonColumn} = :seasonId`, {
        ":seasonId": seasonId,
      });
    }
  }

  if (tableSet.has("Parts_InspectionResults")) {
    database.exec(
      `DELETE FROM Parts_InspectionResults
       WHERE RaceID IN (${raceIdList})`
    );
  }

  if (tableSet.has("Races_GridPenalties")) {
    const columns = new Set(getTableColumns(database, "Races_GridPenalties"));
    if (columns.has("RaceID")) {
      database.exec(`DELETE FROM Races_GridPenalties WHERE RaceID IN (${raceIdList})`);
    }
  }
  if (tableSet.has("Save_Weekend")) {
    database.exec("DELETE FROM Save_Weekend");
  }
  if (tableSet.has("Races_DriverStandings")) {
    database.exec(`DELETE FROM Races_DriverStandings WHERE SeasonID = :seasonId`, { ":seasonId": seasonId });
  }
  if (tableSet.has("Races_TeamStandings")) {
    database.exec(`DELETE FROM Races_TeamStandings WHERE SeasonID = :seasonId`, { ":seasonId": seasonId });
  }
  if (tableSet.has("Races_PitCrewStandings")) {
    database.exec(`DELETE FROM Races_PitCrewStandings WHERE SeasonID = :seasonId`, { ":seasonId": seasonId });
  }
  if (tableSet.has("Modding_RealWorldImport_ComponentLedger")) {
    database.exec(
      `DELETE FROM Modding_RealWorldImport_ComponentLedger
       WHERE SeasonID = :seasonId
         AND RaceID IN (${raceIdList})`,
      { ":seasonId": seasonId }
    );
  }
  if (tableSet.has("Modding_RealWorldImport_ResultStatus")) {
    database.exec(
      `DELETE FROM Modding_RealWorldImport_ResultStatus
       WHERE SeasonID = :seasonId
         AND RaceID IN (${raceIdList})`,
      { ":seasonId": seasonId }
    );
  }
}

function rebuildSeasonCalendar({ database, tableSet, importState, season }) {
  if (!tableSet.has("Races")) {
    throw new Error("Races table is missing from the loaded save.");
  }

  const currentRaceShells = readRows(
    database,
    `SELECT * FROM Races WHERE SeasonID = :seasonId ORDER BY Day ASC, RaceID ASC`,
    { ":seasonId": importState.targetYear }
  );
  if (currentRaceShells.length < (season.events?.length || 0)) {
    throw new Error(
      `The loaded save only has ${currentRaceShells.length} race shells for the current season, but ${season.events.length} are required.`
    );
  }

  const raceColumns = new Set(getTableColumns(database, "Races"));
  const seasonStartDay = dateToDay(new Date(`${importState.targetYear}-01-01`));
  const raceShells = currentRaceShells.slice(0, season.events.length);
  const preserveExistingCalendar = importState.targetYear === importState.currentSeason;

  season.events.forEach((event, index) => {
    const shell = raceShells[index];
    shell.ImportedEventSlug = getImportedEventSlug(event);
    if (index < importState.lockedCompletedRounds) {
      return;
    }
    const day = dateToDay(new Date(`${event.eventDate}T00:00:00Z`));
    const update = {
      SeasonID: importState.targetYear,
      State: index < importState.lastRound ? 2 : 0,
      Day: day,
    };
    shell.Day = day;
    if (!preserveExistingCalendar) {
      update.TrackID = TRACK_ID_BY_SLUG[getImportedEventSlug(event)] || shell.TrackID;
    }
    if (raceColumns.has("WeekendType")) {
      update.WeekendType = event.eventFormat?.includes("sprint") ? 1 : 2;
    }
    if (raceColumns.has("IsF2Race")) {
      update.IsF2Race = preserveExistingCalendar
        ? Number(Boolean(importState.datasets?.f2?.seasons?.[`${importState.targetYear}`]?.events?.[index]))
        : Number(Boolean(findSeriesEventForRaceShell({
          raceShell: shell,
          season: importState.datasets?.f2?.seasons?.[`${importState.targetYear}`],
        })));
    }
    if (raceColumns.has("IsF3Race")) {
      update.IsF3Race = preserveExistingCalendar
        ? Number(Boolean(importState.datasets?.f3?.seasons?.[`${importState.targetYear}`]?.events?.[index]))
        : Number(Boolean(findSeriesEventForRaceShell({
          raceShell: shell,
          season: importState.datasets?.f3?.seasons?.[`${importState.targetYear}`],
        })));
    }
    updateRow(database, "Races", update, { RaceID: shell.RaceID });
  });

  const extraRaceIds = preserveExistingCalendar ? [] : currentRaceShells.slice(season.events.length).map((row) => row.RaceID);
  if (extraRaceIds.length) {
    database.exec(`DELETE FROM Races WHERE RaceID IN (${extraRaceIds.join(",")})`);
  }

  if (!preserveExistingCalendar && tableSet.has("Seasons_Deadlines")) {
    const deadlineRows = readRows(
      database,
      `SELECT ROWID AS __RowId, * FROM Seasons_Deadlines WHERE SeasonID = :seasonId ORDER BY Day ASC, DeadlineType ASC`,
      { ":seasonId": importState.targetYear }
    );
    deadlineRows.forEach((row, index) => {
      database.exec(
        `UPDATE Seasons_Deadlines SET Day = :day WHERE ROWID = :rowId`,
        {
          ":day": -1000000 - index,
          ":rowId": row.__RowId,
        }
      );
    });
    const usedDeadlineKeys = new Set();
    deadlineRows.forEach((row, index) => {
      const boundedIndex = Math.min(index, season.events.length - 1);
      let deadlineDay = boundedIndex >= 0
        ? dateToDay(new Date(`${season.events[boundedIndex].eventDate}T00:00:00Z`))
        : seasonStartDay;
      const deadlineType = Number(row.DeadlineType || 0);
      while (usedDeadlineKeys.has(`${deadlineType}:${deadlineDay}`)) {
        deadlineDay += 1;
      }
      usedDeadlineKeys.add(`${deadlineType}:${deadlineDay}`);
      database.exec(
        `UPDATE Seasons_Deadlines SET Day = :day WHERE ROWID = :rowId`,
        {
          ":day": deadlineDay,
          ":rowId": row.__RowId,
        }
      );
    });
  }

  return raceShells;
}

function ensureStandingsRows({ database, tableSet, seasonId, formula, season, importState, teamMapping, config }) {
  if (tableSet.has("Races_DriverStandings")) {
    const templateRow = getTemplateRow(database, "Races_DriverStandings");
    const driverNames = formula === 1
      ? [...new Set([...collectSeasonDriverNames(season), ...getCustomTeamDriverEntries(importState).map((driver) => driver.driverName)])]
      : collectSeasonDriverNames(season);
    driverNames.forEach((driverName, index) => {
      const driverId = ensureDriverExists({
        database,
        importState,
        driverName,
      });
      if (!driverId) {
        return;
      }
      insertTableRow(database, "Races_DriverStandings", templateRow, sanitizeRowObject({
        SeasonID: seasonId,
        DriverID: driverId,
        Points: 0,
        Position: index + 1,
        LastPointsChange: 0,
        LastPositionChange: 0,
        RaceFormula: formula,
      }));
    });
  }

  if (tableSet.has("Races_TeamStandings")) {
    const templateRow = getTemplateRow(database, "Races_TeamStandings");
    const teamIds = formula === 1
      ? getActiveF1TeamIds(importState)
      : Array.from(new Set(collectSeasonTeamNames(season)
        .map((teamName) => config.teamMapper(teamName, teamMapping))
        .filter(Boolean)));
    teamIds.forEach((teamId, index) => {
      insertTableRow(database, "Races_TeamStandings", templateRow, sanitizeRowObject({
        SeasonID: seasonId,
        TeamID: teamId,
        Points: 0,
        Position: index + 1,
        LastPointsChange: 0,
        LastPositionChange: 0,
        RaceFormula: formula,
      }));
    });
  }

  if (formula === 1 && tableSet.has("Races_PitCrewStandings")) {
    const templateRow = getTemplateRow(database, "Races_PitCrewStandings");
    getActiveF1TeamIds(importState).forEach((teamId, index) => {
      insertTableRow(database, "Races_PitCrewStandings", templateRow, sanitizeRowObject({
        SeasonID: seasonId,
        TeamID: teamId,
        Points: 0,
        Position: index + 1,
        LastPointsChange: 0,
        LastPositionChange: 0,
        RaceFormula: 1,
      }));
    });
  }
}

function ensureEventSeatAssignments(importState, event) {
  const seatAssignmentsByTeam = {};
  const lineup = event.lineup || {};
  applyLineupToSeatState(importState.teamSeatState, lineup);
  Object.entries(lineup).forEach(([teamName]) => {
    const teamId = mapF1TeamNameToId(teamName);
    if (!teamId) {
      return;
    }
    const nextState = importState.teamSeatState[teamId] || { 1: null, 2: null };
    seatAssignmentsByTeam[teamId] = Object.fromEntries(
      Object.entries(nextState)
        .filter(([, driverKey]) => driverKey)
        .map(([loadoutId, driverKey]) => [driverKey, { loadoutId: Number(loadoutId) }])
    );
  });

  const customTeamDrivers = getCustomTeamDriverEntries(importState);
  if (customTeamDrivers.length) {
    const teamId = Number(importState.customTeamRandomization?.teamId);
    const teamState = importState.teamSeatState[teamId] || { 1: null, 2: null };
    seatAssignmentsByTeam[teamId] = Object.fromEntries(
      customTeamDrivers.map((driver, index) => {
        const loadoutId = Number(Object.entries(teamState).find(([, driverKey]) => driverKey === normalizeName(driver.driverName))?.[0] || index + 1);
        return [normalizeName(driver.driverName), { loadoutId }];
      })
    );
  }

  return seatAssignmentsByTeam;
}

function insertSessionResultRow({
  database,
  table,
  seasonId,
  formula,
  seriesKey,
  raceId,
  teamId,
  driverId,
  loadoutId,
  resultRow,
  sessionType,
  practiceSession,
  rowIndex,
  sessionLapFallback,
  normalizedFinishingPos,
  resolvedGridPosition,
  sessionTimeContext,
}) {
  const templateRow = getTemplateRow(database, table);
  const resolvedLaps = normalizeImportedLaps({
    resultRow,
    sessionType,
    sessionLapFallback,
  });
  const resolvedBestLap = resolveBestLapTime(resultRow, sessionType, sessionTimeContext);
  const resolvedRaceTime = resolveRaceTimeSeconds(resultRow, sessionType, sessionTimeContext);
  const resolvedTimeDelta = resolveTimeDeltaSeconds(resultRow, sessionType, sessionTimeContext);
  const resolvedGrid = Number.isFinite(Number(resolvedGridPosition)) ? Number(resolvedGridPosition) : 0;
  const isClassifiedDisqualification = `${resultRow?.position ?? ""}`.trim().toUpperCase() === "DQ";
  const didNotFinish = isClassifiedDisqualification ? 0 : isNonFinishStatus(resultRow);
  const base = {
    Season: seasonId,
    SeasonID: seasonId,
    RaceID: raceId,
    DriverID: driverId,
    TeamID: teamId,
    RaceFormula: formula,
    LoadoutID: loadoutId,
  };
  const errorContext = {
    table,
    seasonId,
    formula,
    raceId,
    teamId,
    driverId,
    loadoutId,
    sessionType,
    practiceSession,
    rowIndex,
    driverName: resultRow.driverName,
    driverCode: resultRow.driverCode,
    teamName: resultRow.teamName,
    position: resultRow.position,
    grid: resultRow.grid,
    laps: resolvedLaps,
    points: resultRow.points ?? resultRow.pts ?? 0,
  };
  const numericFinishingPos = Number.isFinite(Number(normalizedFinishingPos))
    ? Number(normalizedFinishingPos)
    : rowIndex + 1;

  logImportedSessionStatus({
    database,
    seasonId,
    raceId,
    seriesKey,
    sessionType,
    driverId,
    resultRow,
    laps: resolvedLaps,
  });

  if (sessionType === "practice") {
    insertTableRow(database, table, templateRow, sanitizeRowObject({
      ...base,
      PracticeSession: practiceSession,
      TimeOnTrack: 0,
      SessionDuration: 0,
      BestLapTime: resolvedBestLap,
      BestLapTyre: 0,
      LapCount: resolvedLaps,
      GridPenalty: 0,
    }), errorContext);
    return;
  }

  if (sessionType === "qualifying") {
    const stage = resultRow.q3 ? 3 : resultRow.q2 ? 2 : 1;
    const qualifyingPoints = resultRow.points ?? resultRow.pts ?? 0;
    insertTableRow(database, table, templateRow, sanitizeRowObject({
      ...base,
      QualifyingStage: stage,
      SprintShootout: 0,
      FinishingPos: numericFinishingPos,
      ChampionshipPoints: qualifyingPoints,
      FastestLap: resolvedBestLap,
      DNF: didNotFinish,
      LapCount: resolvedLaps,
      GridPenalty: 0,
    }), errorContext);
    return;
  }

  if (sessionType === "sprint") {
    insertTableRow(database, table, templateRow, sanitizeRowObject({
      ...base,
      FinishingPos: numericFinishingPos,
      ChampionshipPoints: resultRow.pts ?? resultRow.points ?? 0,
      FastestLap: resolvedBestLap,
      DNF: didNotFinish,
      LapCount: resolvedLaps,
      TimeDeltaFromLead: resolvedTimeDelta,
      GridPenalty: 0,
      RaceTime: resolvedRaceTime,
    }), errorContext);
    return;
  }

  insertTableRow(database, table, templateRow, sanitizeRowObject({
    ...base,
    FinishingPos: numericFinishingPos,
    Points: resultRow.pts ?? resultRow.points ?? 0,
    Laps: resolvedLaps,
    Time: resolvedRaceTime,
    FastestLap: resolvedBestLap,
    DNF: didNotFinish,
    StartingPos: resolvedGrid,
  }), errorContext);
}

function logImportedSessionStatus({
  database,
  seasonId,
  raceId,
  seriesKey,
  sessionType,
  driverId,
  resultRow,
  laps,
}) {
  const classificationStatus = `${resultRow?.classificationStatus ?? resultRow?.status ?? ""}`.trim();
  const positionText = `${resultRow?.positionText ?? resultRow?.position ?? ""}`.trim();
  if (!classificationStatus && !positionText) {
    return;
  }

  database.exec(
    `INSERT INTO Modding_RealWorldImport_ResultStatus
     (SeasonID, RaceID, Series, SessionType, DriverID, ClassificationStatus, PositionText, Laps)
     VALUES (:seasonId, :raceId, :seriesKey, :sessionType, :driverId, :classificationStatus, :positionText, :laps)`,
    {
      ":seasonId": seasonId,
      ":raceId": raceId,
      ":seriesKey": seriesKey,
      ":sessionType": sessionType,
      ":driverId": driverId,
      ":classificationStatus": classificationStatus || null,
      ":positionText": positionText || null,
      ":laps": Number.isFinite(Number(laps)) ? Number(laps) : null,
    }
  );
}

function getSessionLapFallback(results) {
  return results.reduce((maxLaps, row) => {
    const numericLaps = Number(row?.laps);
    return Number.isFinite(numericLaps) ? Math.max(maxLaps, numericLaps) : maxLaps;
  }, 0);
}

function buildGridPositionMap(gridResults = []) {
  const positions = {};
  gridResults.forEach((row, index) => {
    const key = normalizeName(row?.driverName);
    const numericPosition = numericPositionValue(row?.position);
    positions[key] = Number.isFinite(numericPosition) && numericPosition > 0 ? numericPosition : index + 1;
  });
  return positions;
}

function getActiveF1TeamIds(importState) {
  const extraTeamId = Number(importState?.customTeamRandomization?.teamId);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    .concat(Number.isFinite(extraTeamId) ? [extraTeamId] : [])
    .filter((value, index, array) => array.indexOf(value) === index);
}

function getCustomTeamDriverEntries(importState) {
  const teamId = Number(importState?.customTeamRandomization?.teamId);
  if (!Number.isFinite(teamId)) {
    return [];
  }
  const team = importState?.teamMap?.[teamId];
  if (!team) {
    return [];
  }
  const teamName = resolveLiteral(team.TeamNameLocKey || team.TeamName || "") || team.TeamName || "Custom Team";
  return [team.Driver1ID, team.Driver2ID]
    .map((driverId) => importState?.driverMap?.[driverId] || readCustomTeamDriverRow(importState?.database, driverId))
    .filter(Boolean)
    .map((driver) => ({
      teamId,
      teamName,
      driverId: Number(driver.StaffID),
      driverName: resolveDriverName(driver),
      driverCode: normalizeDriverCode(resolveDriverCode(driver.DriverCode || "") || driver.LastName || driver.StaffID),
      driverNumber: Number(driver.PernamentNumber || driver.LastKnownDriverNumber || driver.Number || 0) || null,
    }))
    .filter((driver) => driver.driverName);
}

function readCustomTeamDriverRow(database, driverId) {
  if (!database || !driverId) {
    return null;
  }
  const row = readRows(
    database,
    `SELECT sb.StaffID, sb.FirstName, sb.LastName, sd.DriverCode, sd.LastKnownDriverNumber, sd.AssignedCarNumber
     FROM Staff_BasicData sb
     JOIN Staff_DriverData sd ON sd.StaffID = sb.StaffID
     WHERE sb.StaffID = :staffId`,
    { ":staffId": driverId }
  )[0];
  if (!row) {
    return null;
  }
  return {
    ...row,
    PernamentNumber: row.AssignedCarNumber || row.LastKnownDriverNumber || null,
  };
}

function buildSyntheticCustomTeamRow({ driver, sessionType, targetQuantile, derivation, dnfChance, lapFallback }) {
  const baseRow = {
    driverId: driver.driverId,
    driverName: driver.driverName,
    driverCode: driver.driverCode,
    driverNumber: driver.driverNumber,
    teamName: driver.teamName,
    teamId: driver.teamId,
    __targetQuantile: targetQuantile,
    __variation: derivation,
    __dnfChance: dnfChance,
    __source: "synthetic-custom-team",
  };
  if (sessionType === "qualifying") {
    return {
      ...baseRow,
      q1: null,
      q2: null,
      q3: null,
      points: 0,
    };
  }
  return {
    ...baseRow,
    grid: null,
    laps: Number.isFinite(Number(lapFallback)) ? Number(lapFallback) : 0,
    status: "Finished",
    classificationStatus: "Finished",
    points: 0,
    time: null,
    timeMillis: null,
    fastestLap: null,
  };
}

function finalizeSyntheticSessionRow({ row, index, allRows, sessionType, explicitFastestLapDriver, fastestLapPointAwarded }) {
  const finishingPos = index + 1;
  const finalized = {
    ...row,
    position: finishingPos,
    positionText: row.__displayPositionText || `${finishingPos}`,
  };

  if (sessionType === "qualifying") {
    finalized.points = 0;
    return finalized;
  }

  const pointsTable = sessionType === "sprint" ? F1_SPRINT_POINTS : F1_RACE_POINTS;
  const basePoints = pointsTable[finishingPos - 1] || 0;
  const bonusPoint = sessionType === "race"
    && fastestLapPointAwarded
    && explicitFastestLapDriver
    && normalizeName(finalized.driverName) === explicitFastestLapDriver
    && finishingPos <= 10
      ? 1
      : 0;
  finalized.points = basePoints + bonusPoint;

  if (row.__source && row.__source !== "imported") {
    if (sessionType === "race" || sessionType === "sprint") {
      const timeSeconds = Number.isFinite(Number(row.__simulatedTimeSeconds))
        ? Number(row.__simulatedTimeSeconds)
        : inferSyntheticRaceTimeSeconds(allRows, index);
      if (Number.isFinite(timeSeconds)) {
        finalized.timeMillis = Math.max(0, Math.round(timeSeconds * 1000));
        finalized.time = formatSyntheticRaceTime({
          timeSeconds,
          finishingPos,
          winnerSeconds: inferSyntheticRaceTimeSeconds(allRows, 0),
          laps: Number(finalized.laps || 0),
          winnerLaps: Number(allRows[0]?.laps || finalized.laps || 0),
          isRetired: row.__isRetired,
        });
      }
      if (row.__isRetired) {
        finalized.status = "Retired";
        finalized.classificationStatus = "Retired";
        finalized.positionText = "DNF";
      }
    }
    if (sessionType === "qualifying") {
      const lapSeconds = Number(row.__simulatedLapSeconds);
      if (Number.isFinite(lapSeconds)) {
        finalized.q1 = formatLapTimeSeconds(lapSeconds);
        finalized.q2 = null;
        finalized.q3 = null;
      }
    }
  }

  return finalized;
}

function inferSyntheticRaceTimeSeconds(rows, index) {
  if (Number.isFinite(Number(rows[index]?.__simulatedTimeSeconds))) {
    return Number(rows[index].__simulatedTimeSeconds);
  }
  const previous = [...rows.slice(0, index)].reverse().find((row) => Number.isFinite(extractRaceTimeSeconds(row)));
  const next = rows.slice(index + 1).find((row) => Number.isFinite(extractRaceTimeSeconds(row)));
  const previousSeconds = extractRaceTimeSeconds(previous);
  const nextSeconds = extractRaceTimeSeconds(next);
  if (Number.isFinite(previousSeconds) && Number.isFinite(nextSeconds) && nextSeconds > previousSeconds) {
    return previousSeconds + ((nextSeconds - previousSeconds) / 2);
  }
  if (Number.isFinite(previousSeconds)) {
    return previousSeconds + 0.75;
  }
  if (Number.isFinite(nextSeconds)) {
    return Math.max(1, nextSeconds - 0.75);
  }
  return null;
}

function extractRaceTimeSeconds(row) {
  if (!row) {
    return null;
  }
  const simulatedSeconds = Number(row.__simulatedTimeSeconds);
  if (Number.isFinite(simulatedSeconds)) {
    return simulatedSeconds;
  }
  const explicitMillis = Number(row.timeMillis);
  if (Number.isFinite(explicitMillis)) {
    return explicitMillis / 1000;
  }
  const direct = parseAbsoluteTimeToSeconds(row.time ?? row.time_or_retired);
  if (Number.isFinite(direct)) {
    return direct;
  }
  return null;
}

function formatSyntheticRaceTime({ timeSeconds, finishingPos, winnerSeconds, laps, winnerLaps, isRetired }) {
  if (!Number.isFinite(timeSeconds)) {
    return null;
  }
  if (isRetired) {
    return "Retired";
  }
  if (Number.isFinite(winnerLaps) && Number.isFinite(laps) && winnerLaps > 0 && laps < winnerLaps) {
    const lapDelta = Math.max(1, winnerLaps - laps);
    return `+${lapDelta} ${lapDelta === 1 ? "lap" : "laps"}`;
  }
  if (finishingPos === 1) {
    const hours = Math.floor(timeSeconds / 3600);
    const minutes = Math.floor((timeSeconds % 3600) / 60);
    const seconds = (timeSeconds % 60).toFixed(3).padStart(6, "0");
    return `${hours}:${String(minutes).padStart(2, "0")}:${seconds}`;
  }
  const winnerTime = Number.isFinite(winnerSeconds) ? winnerSeconds : 0;
  return `+${Math.max(0, timeSeconds - winnerTime).toFixed(3)}`;
}

function simulateCustomTeamSessionRows({ rows, sessionType, rng }) {
  if (sessionType === "qualifying") {
    return simulateCustomTeamQualifyingRows({ rows, rng });
  }
  if (sessionType === "race" || sessionType === "sprint") {
    return simulateCustomTeamRaceRows({ rows, sessionType, rng });
  }
  return rows;
}

function simulateCustomTeamQualifyingRows({ rows, rng }) {
  const anchors = rows
    .map((row, index) => ({
      row,
      index,
      lapSeconds: Number.isFinite(Number(row.__simulatedLapSeconds))
        ? Number(row.__simulatedLapSeconds)
        : resolveBestLapTime(row, "qualifying", null),
    }))
    .filter((entry) => Number.isFinite(entry.lapSeconds))
    .sort((left, right) => left.lapSeconds - right.lapSeconds || left.index - right.index);
  if (!anchors.length) {
    return rows;
  }

  rows.forEach((row) => {
    if (row.__source === "imported") {
      row.__sessionSortBucket = 0;
      row.__sessionMetric = resolveBestLapTime(row, "qualifying", null);
      return;
    }
    const quantile = sampleNormalizedQuantile({
      rng,
      targetQuantile: Number(row.__targetQuantile),
      derivation: Number(row.__variation),
    });
    row.__simulatedLapSeconds = interpolateAnchoredMetric(anchors.map((entry) => entry.lapSeconds), quantile);
    row.__sessionSortBucket = 0;
    row.__sessionMetric = row.__simulatedLapSeconds;
  });

  return [...rows].sort(compareSimulatedSessionRows);
}

function simulateCustomTeamRaceRows({ rows, sessionType, rng }) {
  const context = buildSessionTimeContext(sessionType, rows);
  const winnerLaps = Number(context?.winnerLaps || getSessionLapFallback(rows) || 57);
  const avgLap = Number(context?.averageLapTime || 90);
  const classifiedAnchors = rows
    .map((row, index) => ({
      row,
      index,
      laps: normalizeImportedLaps({ resultRow: row, sessionType, sessionLapFallback: winnerLaps }),
      timeSeconds: resolveRaceTimeSeconds(row, sessionType, context),
      dnf: isNonFinishStatus(row),
    }))
    .filter((entry) => !entry.dnf && Number(entry.laps || 0) > 0 && Number.isFinite(entry.timeSeconds))
    .sort((left, right) => left.timeSeconds - right.timeSeconds || right.laps - left.laps || left.index - right.index);
  const anchorTimes = classifiedAnchors.map((entry) => entry.timeSeconds);
  const worstTime = anchorTimes[anchorTimes.length - 1] || ((context?.winnerTime || 0) + avgLap);

  rows.forEach((row) => {
    if (row.__source === "imported") {
      const importedLaps = normalizeImportedLaps({ resultRow: row, sessionType, sessionLapFallback: winnerLaps });
      row.__sessionSortBucket = isNonFinishStatus(row) ? 1 : 0;
      row.__sessionMetric = resolveRaceTimeSeconds(row, sessionType, context);
      row.__sessionLaps = importedLaps;
      return;
    }

    const shouldDnf = rng() < (clampNumericValue(row.__dnfChance, DEFAULT_CUSTOM_TEAM_RANDOMIZATION.dnfChance, 0, 100) / 100);
    if (shouldDnf) {
      const dnfLaps = sampleRetirementLaps({ rng, winnerLaps });
      row.laps = dnfLaps;
      row.status = "Retired";
      row.classificationStatus = "Retired";
      row.time = "Retired";
      row.timeMillis = null;
      row.fastestLap = null;
      row.__isRetired = true;
      row.__displayPositionText = "DNF";
      row.__sessionSortBucket = 1;
      row.__sessionLaps = dnfLaps;
      row.__sessionMetric = (winnerLaps - dnfLaps) * avgLap;
      row.__simulatedTimeSeconds = context?.winnerTime || 0;
      return;
    }

    const quantile = sampleNormalizedQuantile({
      rng,
      targetQuantile: Number(row.__targetQuantile),
      derivation: Number(row.__variation),
    });
    const effectiveTime = anchorTimes.length
      ? interpolateAnchoredMetric(anchorTimes, quantile)
      : Math.max(Number(context?.winnerTime || 0), worstTime);
    const lapDeficit = Math.max(0, Math.floor(Math.max(0, effectiveTime - Number(context?.winnerTime || 0)) / Math.max(avgLap, 1)));
    const completedLaps = Math.max(1, winnerLaps - lapDeficit);
    row.laps = completedLaps;
    row.status = "Finished";
    row.classificationStatus = "Finished";
    row.__isRetired = false;
    row.__displayPositionText = null;
    row.__sessionSortBucket = 0;
    row.__sessionLaps = completedLaps;
    row.__simulatedTimeSeconds = effectiveTime;
    row.__sessionMetric = effectiveTime;
    row.timeMillis = Math.max(0, Math.round(effectiveTime * 1000));
  });

  return [...rows].sort(compareSimulatedSessionRows);
}

function compareSimulatedSessionRows(left, right) {
  const bucketCompare = Number(left.__sessionSortBucket || 0) - Number(right.__sessionSortBucket || 0);
  if (bucketCompare !== 0) {
    return bucketCompare;
  }
  if (Number(left.__sessionSortBucket || 0) === 1) {
    const lapCompare = Number(right.__sessionLaps || 0) - Number(left.__sessionLaps || 0);
    if (lapCompare !== 0) {
      return lapCompare;
    }
  }
  const metricCompare = Number(left.__sessionMetric || 0) - Number(right.__sessionMetric || 0);
  if (metricCompare !== 0) {
    return metricCompare;
  }
  if (left.__source !== right.__source) {
    return left.__source === "imported" ? -1 : 1;
  }
  return Number(left.__originalIndex || 0) - Number(right.__originalIndex || 0);
}

function sampleNormalizedQuantile({ rng, targetQuantile, derivation }) {
  const sigma = clampNumericValue(derivation, DEFAULT_CUSTOM_TEAM_RANDOMIZATION.derivation, 0, 100) / 100;
  const gaussian = randomStandardNormal(rng);
  return clampUnitInterval(targetQuantile + (gaussian * sigma * 0.28));
}

function interpolateAnchoredMetric(sortedValues, quantile) {
  if (!sortedValues.length) {
    return 0;
  }
  if (sortedValues.length === 1) {
    return Number(sortedValues[0]);
  }
  const scaled = clampUnitInterval(quantile) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(sortedValues.length - 1, lowerIndex + 1);
  const remainder = scaled - lowerIndex;
  const lower = Number(sortedValues[lowerIndex] || 0);
  const upper = Number(sortedValues[upperIndex] || lower);
  return lower + ((upper - lower) * remainder);
}

function randomStandardNormal(rng) {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function clampUnitInterval(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0.5;
  }
  return Math.max(0, Math.min(1, numeric));
}

function sampleRetirementLaps({ rng, winnerLaps }) {
  const normalized = clampUnitInterval(0.2 + (rng() * 0.78));
  return Math.max(1, Math.min(winnerLaps - 1, Math.round(normalized * (winnerLaps - 1))));
}

function formatLapTimeSeconds(timeSeconds) {
  if (!Number.isFinite(timeSeconds)) {
    return null;
  }
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = (timeSeconds % 60).toFixed(3).padStart(6, "0");
  return `${minutes}:${seconds}`;
}

function findExplicitFastestLapDriverKey(rows) {
  const fastestLapRows = rows
    .map((row, index) => ({ row, index, lapSeconds: parseLapTimeToSeconds(row?.fastestLap) }))
    .filter((entry) => Number.isFinite(entry.lapSeconds));
  if (!fastestLapRows.length) {
    return null;
  }
  fastestLapRows.sort((left, right) => left.lapSeconds - right.lapSeconds || left.index - right.index);
  return normalizeName(fastestLapRows[0].row.driverName);
}

function normalizeCustomTeamRandomization({ basicInfo, customTeamRandomization }) {
  const teamId = getCustomTeamF1TeamId(basicInfo);
  if (!Number.isFinite(teamId)) {
    return null;
  }
  const legacyBaselinePosition = clampNumericValue(
    customTeamRandomization?.baselinePosition,
    null,
    1,
    20
  );
  const derivedLegacyStrength = Number.isFinite(legacyBaselinePosition)
    ? Math.round(((20 - legacyBaselinePosition) / 19) * 100)
    : DEFAULT_CUSTOM_TEAM_RANDOMIZATION.baselineStrength;
  const baselineStrength = clampNumericValue(
    customTeamRandomization?.baselineStrength,
    derivedLegacyStrength,
    0,
    100
  );
  const derivation = clampNumericValue(
    customTeamRandomization?.derivation,
    DEFAULT_CUSTOM_TEAM_RANDOMIZATION.derivation,
    0,
    100
  );
  const dnfChance = clampNumericValue(
    customTeamRandomization?.dnfChance,
    DEFAULT_CUSTOM_TEAM_RANDOMIZATION.dnfChance,
    0,
    100
  );
  return {
    teamId,
    baselineStrength,
    derivation,
    dnfChance,
  };
}

function getCustomTeamF1TeamId(basicInfo) {
  const preferredTeamId = Number(basicInfo?.player?.CustomTeamEnabled ? 32 : NaN);
  if (Number.isFinite(preferredTeamId) && Number(basicInfo?.teamMap?.[preferredTeamId]?.Formula) === 1) {
    return preferredTeamId;
  }
  return Object.entries(basicInfo?.teamMap || {})
    .map(([teamId, team]) => ({ teamId: Number(teamId), formula: Number(team?.Formula) }))
    .find((entry) => Number.isFinite(entry.teamId) && entry.teamId > 10 && entry.formula === 1)?.teamId ?? null;
}

function clampNumericValue(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function createSeededRng(seedInput) {
  let hash = 2166136261;
  `${seedInput || ""}`.split("").forEach((char) => {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return () => {
    hash += 0x6D2B79F5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSessionTimeContext(sessionType, results = []) {
  if (!results.length) {
    return null;
  }
  if (sessionType === "race" || sessionType === "sprint") {
    const winnerTime = Number.isFinite(Number(results[0]?.timeMillis))
      ? Number(results[0].timeMillis) / 1000
      : parseAbsoluteTimeToSeconds(results[0]?.time ?? results[0]?.time_or_retired ?? null);
    const winnerLaps = Number(results[0]?.laps);
    return {
      winnerTime,
      winnerLaps: Number.isFinite(winnerLaps) ? winnerLaps : null,
      averageLapTime: Number.isFinite(winnerTime) && Number.isFinite(winnerLaps) && winnerLaps > 0
        ? winnerTime / winnerLaps
        : null,
    };
  }
  if (sessionType === "practice") {
    const leaderLap = parseLapTimeToSeconds(results[0]?.time_or_gap ?? null);
    return { leaderLap };
  }
  return null;
}

function resolveBestLapTime(resultRow, sessionType, sessionTimeContext) {
  const explicitFastestLap = Number(resultRow?.fastestLapSeconds);
  if (Number.isFinite(explicitFastestLap)) {
    return explicitFastestLap;
  }
  const jolpicaFastestLap = parseLapTimeToSeconds(resultRow?.fastestLap);
  if (Number.isFinite(jolpicaFastestLap)) {
    return jolpicaFastestLap;
  }
  if (sessionType === "qualifying") {
    return [
      parseLapTimeToSeconds(resultRow?.q3),
      parseLapTimeToSeconds(resultRow?.q2),
      parseLapTimeToSeconds(resultRow?.q1),
      parseLapTimeToSeconds(resultRow?.time_or_gap),
    ].find((value) => Number.isFinite(value)) ?? -1;
  }
  if (sessionType === "practice") {
    const direct = parseLapTimeToSeconds(resultRow?.time_or_gap);
    if (Number.isFinite(direct)) {
      return direct;
    }
    const delta = parseDeltaSeconds(resultRow?.time_or_gap);
    if (Number.isFinite(delta) && Number.isFinite(sessionTimeContext?.leaderLap)) {
      return sessionTimeContext.leaderLap + delta;
    }
    return -1;
  }
  return Number(resultRow?.laps) > 0 ? 0 : -1;
}

function resolveRaceTimeSeconds(resultRow, sessionType, sessionTimeContext) {
  if (sessionType !== "race" && sessionType !== "sprint") {
    return 0;
  }
  const explicit = Number(resultRow?.raceTimeSeconds);
  if (Number.isFinite(explicit)) {
    return explicit;
  }
  const jolpicaMillis = Number(resultRow?.timeMillis);
  if (Number.isFinite(jolpicaMillis)) {
    return jolpicaMillis / 1000;
  }
  const direct = parseAbsoluteTimeToSeconds(resultRow?.time ?? resultRow?.time_or_retired);
  if (Number.isFinite(direct)) {
    return sessionTimeContext?.winnerTime && numericPositionValue(resultRow?.position) === 1
      ? direct
      : sessionTimeContext?.winnerTime && direct < sessionTimeContext.winnerTime
        ? sessionTimeContext.winnerTime + direct
        : direct;
  }
  const delta = parseDeltaSeconds(resultRow?.time ?? resultRow?.time_or_retired);
  if (Number.isFinite(delta) && Number.isFinite(sessionTimeContext?.winnerTime)) {
    return sessionTimeContext.winnerTime + delta;
  }
  const lapDelta = parseLapDelta(resultRow?.time ?? resultRow?.time_or_retired ?? resultRow?.status);
  if (
    Number.isFinite(lapDelta)
    && Number.isFinite(sessionTimeContext?.winnerTime)
    && Number.isFinite(sessionTimeContext?.averageLapTime)
    && Number.isFinite(Number(resultRow?.laps))
  ) {
    const completedLaps = Number(resultRow.laps);
    const missingLaps = Number.isFinite(sessionTimeContext?.winnerLaps)
      ? Math.max(0, Number(sessionTimeContext.winnerLaps) - completedLaps)
      : lapDelta;
    return sessionTimeContext.winnerTime + (missingLaps * sessionTimeContext.averageLapTime);
  }
  return 0;
}

function resolveTimeDeltaSeconds(resultRow, sessionType, sessionTimeContext) {
  if (sessionType !== "race" && sessionType !== "sprint") {
    return 0;
  }
  const explicit = Number(resultRow?.timeDeltaSeconds);
  if (Number.isFinite(explicit)) {
    return explicit;
  }
  const delta = parseDeltaSeconds(resultRow?.time ?? resultRow?.time_or_retired);
  if (Number.isFinite(delta)) {
    return delta;
  }
  if (Number.isFinite(Number(resultRow?.timeMillis)) && numericPositionValue(resultRow?.position) !== 1 && Number.isFinite(sessionTimeContext?.winnerTime)) {
    return Math.max(0, (Number(resultRow.timeMillis) / 1000) - sessionTimeContext.winnerTime);
  }
  const direct = parseAbsoluteTimeToSeconds(resultRow?.time ?? resultRow?.time_or_retired);
  if (Number.isFinite(direct) && Number.isFinite(sessionTimeContext?.winnerTime)) {
    return Math.max(0, direct - sessionTimeContext.winnerTime);
  }
  const lapDelta = parseLapDelta(resultRow?.time ?? resultRow?.time_or_retired ?? resultRow?.status);
  if (
    Number.isFinite(lapDelta)
    && Number.isFinite(sessionTimeContext?.averageLapTime)
    && Number.isFinite(Number(resultRow?.laps))
  ) {
    const completedLaps = Number(resultRow.laps);
    const missingLaps = Number.isFinite(sessionTimeContext?.winnerLaps)
      ? Math.max(0, Number(sessionTimeContext.winnerLaps) - completedLaps)
      : lapDelta;
    return missingLaps * sessionTimeContext.averageLapTime;
  }
  return 0;
}

function parseLapTimeToSeconds(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const normalized = value.trim();
  if (normalized.startsWith("+")) {
    return null;
  }
  const parts = normalized.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return null;
}

function parseAbsoluteTimeToSeconds(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const normalized = value.trim();
  if (normalized.startsWith("+")) {
    return null;
  }
  const parts = normalized.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return null;
}

function parseDeltaSeconds(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const normalized = value.trim().replace(/^\+/, "").replace(/s$/i, "");
  if (!normalized || /lap|ret|dq|dns|dnq|accident|engine|gearbox|collision|damage|hydraulics|brakes|power unit|vibration|water leak|undertray|oil|electrical/i.test(normalized)) {
    return null;
  }
  const parts = normalized.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return null;
}

function parseLapDelta(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const match = value.trim().match(/^\+(\d+)\s+laps?$/i);
  return match ? Number(match[1]) : null;
}

function numericPositionValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isNonFinishStatus(resultRow) {
  const positionText = `${resultRow?.positionText ?? resultRow?.position ?? ""}`.trim().toUpperCase();
  const timeText = `${resultRow?.time ?? resultRow?.time_or_retired ?? ""}`.trim().toUpperCase();
  const classificationText = `${resultRow?.classificationStatus ?? ""}`.trim().toUpperCase();
  const statusText = `${resultRow?.status ?? ""}`.trim().toUpperCase();
  if (classificationText.includes("FINISHED") || classificationText.includes("LAP")) {
    return 0;
  }
  if (classificationText.includes("ACCIDENT") || classificationText.includes("DISQUALIFIED") || classificationText.includes("RETIRED")) {
    return classificationText.includes("DISQUALIFIED") ? 0 : 1;
  }
  if (statusText === "FINISHED" || /\+\d+\s+LAP/i.test(statusText)) {
    return 0;
  }
  if (statusText === "DISQUALIFIED") {
    return 0;
  }
  if (/(ACCIDENT|ENGINE|GEARBOX|COLLISION|DAMAGE|HYDRAULICS|BRAKES|POWER UNIT|VIBRATION|WATER LEAK|UNDERTRAY|OIL|ELECTRICAL|RETIRED|WITHDREW|ILLNESS)/i.test(statusText)) {
    return 1;
  }
  if (["RET", "DNF", "DNS", "DNQ", "DSQ", "DQ"].includes(positionText)) {
    return positionText === "DQ" ? 0 : 1;
  }
  return /(ACCIDENT|ENGINE|GEARBOX|COLLISION|DAMAGE|HYDRAULICS|BRAKES|POWER UNIT|VIBRATION|WATER LEAK|UNDERTRAY|OIL|ELECTRICAL|RETIRED|WITHDREW|ILLNESS)/i.test(timeText) ? 1 : 0;
}

function getSessionFinishingPositions(results) {
  const numericPositions = results
    .map((row) => numericPositionValue(row?.position))
    .filter((value) => Number.isFinite(value) && value > 0);
  const usedPositions = new Set();
  let nextPosition = numericPositions.length ? Math.max(...numericPositions) + 1 : 1;

  return results.map((row) => {
    const numericPosition = numericPositionValue(row?.position);
    if (Number.isFinite(numericPosition) && numericPosition > 0 && !usedPositions.has(numericPosition)) {
      usedPositions.add(numericPosition);
      return numericPosition;
    }
    while (usedPositions.has(nextPosition)) {
      nextPosition += 1;
    }
    const assignedPosition = nextPosition;
    usedPositions.add(assignedPosition);
    nextPosition += 1;
    return assignedPosition;
  });
}

function normalizeImportedLaps({ resultRow, sessionType, sessionLapFallback }) {
  const numericLaps = Number(resultRow?.laps);
  if (Number.isFinite(numericLaps)) {
    return numericLaps;
  }

  if (sessionType === "race" || sessionType === "sprint") {
    const classification = `${resultRow?.position ?? ""}`.trim().toUpperCase();
    if (classification && classification !== "DNS" && classification !== "DNQ") {
      return Number(sessionLapFallback) || 0;
    }
  }

  return 0;
}

function finalizeDriverContracts({ database, importState, seasonId, raceShells }) {
  const lastAppliedRace = raceShells[Math.max(0, importState.lastRound - 1)] || raceShells[0];
  const seasonStartDay = dateToDay(new Date(`${seasonId}-01-01`));
  const startDay = lastAppliedRace?.Day || seasonStartDay;
  extendCurrentContractsToSeason(database, seasonId);

  Object.entries(importState.teamSeatState).forEach(([teamIdValue, seatState]) => {
    const teamId = Number(teamIdValue);
    [1, 2].forEach((loadoutId) => {
      const driverKey = seatState[loadoutId];
      if (!driverKey) {
        return;
      }
      const driverId = importState.driverIdsByName[driverKey];
      ensureCurrentSeatContract({
        database,
        seasonId,
        teamId,
        posInTeam: loadoutId,
        driverId,
        startDay,
      });
    });
  });
}

function extendCurrentContractsToSeason(database, seasonId) {
  const contractColumns = new Set(getTableColumns(database, "Staff_Contracts"));
  const whereClauses = ["ContractType = 0", "EndSeason < :seasonId"];
  if (contractColumns.has("Formula")) {
    whereClauses.push("Formula = 1");
  }
  database.exec(
    `UPDATE Staff_Contracts
     SET EndSeason = :seasonId
     WHERE ${whereClauses.join("\n       AND ")}`,
    { ":seasonId": seasonId }
  );
}

function ensureCurrentSeatContract({ database, seasonId, teamId, posInTeam, driverId, startDay }) {
  const contractColumns = new Set(getTableColumns(database, "Staff_Contracts"));
  const formulaClause = contractColumns.has("Formula") ? "AND Formula = 1" : "";
  clearCurrentDriverSeatContracts({ database, contractColumns, driverId, keepTeamId: teamId });
  const currentRows = readRows(
    database,
    `SELECT * FROM Staff_Contracts
     WHERE TeamID = :teamId
       AND PosInTeam = :posInTeam
       AND ContractType = 0
       ${formulaClause}
     ORDER BY StartDay DESC`,
    {
      ":teamId": teamId,
      ":posInTeam": posInTeam,
    }
  );
  const existingDriverTeamContract = readRows(
    database,
    `SELECT * FROM Staff_Contracts
     WHERE StaffID = :driverId
       AND TeamID = :teamId
       AND ContractType = 0
     LIMIT 1`,
    {
      ":driverId": driverId,
      ":teamId": teamId,
    }
  )[0];

  const alreadyCurrent = currentRows.find((row) => Number(row.StaffID) === Number(driverId)) || existingDriverTeamContract;
  if (alreadyCurrent) {
    updateRow(database, "Staff_Contracts", sanitizeRowObject({
      PosInTeam: posInTeam,
      StartDay: Math.min(Number(alreadyCurrent.StartDay || startDay), startDay),
      EndSeason: seasonId,
      ...(contractColumns.has("Formula") ? { Formula: 1 } : {}),
    }), {
      StaffID: driverId,
      TeamID: teamId,
      ContractType: 0,
    });
  } else {
    const template = currentRows[0] || getTemplateRow(database, "Staff_Contracts");
    if (template) {
      if (currentRows.length) {
        database.exec(
          `DELETE FROM Staff_Contracts
           WHERE TeamID = :teamId
             AND PosInTeam = :posInTeam
             AND ContractType = 0
             ${formulaClause}`,
          {
            ":teamId": teamId,
            ":posInTeam": posInTeam,
          }
        );
      }
      insertTableRow(database, "Staff_Contracts", template, sanitizeRowObject({
        StaffID: driverId,
        TeamID: teamId,
        PosInTeam: posInTeam,
        ContractType: 0,
        StartDay: startDay,
        EndSeason: seasonId,
        ...(contractColumns.has("Formula") ? { Formula: 1 } : {}),
      }));
    }
  }

  const engineerAssignmentRows = readRows(
    database,
    `SELECT * FROM Staff_RaceEngineerDriverAssignments
     WHERE IsCurrentAssignment = 1
       AND DriverID != :driverId`,
    { ":driverId": driverId }
  );
  engineerAssignmentRows
    .filter((row) => Number(row.DriverID) !== Number(driverId))
    .forEach((row) => {
      if (posInTeam === 1 && Number(row.RaceEngineerID) > 0 && row.DriverID !== driverId) {
        if (Number(row.DriverID) !== Number(driverId)) {
          // leave unrelated assignments untouched
        }
      }
    });
}

function clearCurrentDriverSeatContracts({ database, contractColumns, driverId, keepTeamId }) {
  const teamRows = readRows(
    database,
    `SELECT TeamID FROM Teams
     WHERE Formula = 1`
  );
  const activeF1Teams = new Set(teamRows.map((row) => Number(row.TeamID)).filter(Number.isFinite));
  const currentContracts = readRows(
    database,
    `SELECT TeamID, PosInTeam
     FROM Staff_Contracts
     WHERE StaffID = :driverId
       AND ContractType = 0`,
    { ":driverId": driverId }
  );
  currentContracts
    .filter((row) => activeF1Teams.has(Number(row.TeamID)) && Number(row.TeamID) !== Number(keepTeamId))
    .forEach((row) => {
      const whereClauses = [
        "StaffID = :driverId",
        "TeamID = :teamId",
        "PosInTeam = :posInTeam",
        "ContractType = 0",
      ];
      if (contractColumns.has("Formula")) {
        whereClauses.push("Formula = 1");
      }
      database.exec(
        `DELETE FROM Staff_Contracts
         WHERE ${whereClauses.join("\n           AND ")}`,
        {
          ":driverId": driverId,
          ":teamId": Number(row.TeamID),
          ":posInTeam": Number(row.PosInTeam),
        }
      );
    });
}

function applyComponentInspectionState({ database, tableSet, importState, raceShells, seasonId }) {
  if (!tableSet.has("Parts_CarLoadout") || !tableSet.has("Parts_Items") || !tableSet.has("Parts_InspectionResults")) {
    return;
  }

  const playerTeamId = resolvePlayerTeamId({
    database,
    importState,
    day: Number(raceShells[Math.max(importState.lastRound - 1, 0)]?.Day || dateToDay(new Date(`${seasonId}-01-01`))),
  });
  if (!Number.isFinite(playerTeamId) || playerTeamId <= 0) {
    return;
  }

  const loadoutRows = readRows(
    database,
    `SELECT Parts_CarLoadout.TeamID,
            Parts_CarLoadout.LoadoutID,
            Parts_CarLoadout.PartType,
            Parts_CarLoadout.ItemID,
            Parts_Items.DesignID,
            Parts_Items.ManufactureNumber,
            Parts_Designs.DesignNumber,
            Parts_Designs.TeamID AS DesignTeamID
     FROM Parts_CarLoadout
     JOIN Parts_Items ON Parts_Items.ItemID = Parts_CarLoadout.ItemID
     LEFT JOIN Parts_Designs ON Parts_Designs.DesignID = Parts_Items.DesignID
     WHERE Parts_CarLoadout.TeamID = :teamId
       AND Parts_CarLoadout.PartType IN (1, 2, 3, 4, 5, 6)`,
    {
      ":teamId": playerTeamId,
    }
  );

  const inspectionRowsByLoadout = {};
  loadoutRows.forEach((row) => {
    const loadoutId = Number(row.LoadoutID || 0);
    inspectionRowsByLoadout[loadoutId] = inspectionRowsByLoadout[loadoutId] || [];
    inspectionRowsByLoadout[loadoutId].push({
      itemId: row.ItemID,
      designId: row.DesignID,
      manufactureNumber: Number(row.ManufactureNumber || 0),
      designNumber: Number(row.DesignNumber || 0),
      designTeamId: Number(row.DesignTeamID || row.TeamID || 0),
      partType: Number(row.PartType || 0),
    });
  });

  const templateRow = getTemplateRow(database, "Parts_InspectionResults");
  raceShells.slice(importState.importStartRound, importState.lastRound).forEach((raceShell) => {
    Object.entries(inspectionRowsByLoadout).forEach(([loadoutId, partRows]) => {
      partRows.forEach((loadout) => {
        const itemName = buildInspectionItemName({
          teamId: loadout.designTeamId || playerTeamId,
          partType: loadout.partType,
          seasonId,
          designNumber: loadout.designNumber,
          manufactureNumber: loadout.manufactureNumber,
          itemId: loadout.itemId,
        });
        insertTableRow(database, "Parts_InspectionResults", templateRow, sanitizeRowObject({
          ItemID: loadout.itemId,
          RaceID: raceShell.RaceID,
          DesignID: loadout.designId,
          LoadoutID: Number(loadoutId),
          ItemName: itemName,
          Result: 0,
        }));
      });
    });
  });
}

function updatePlayerProgress({ database, metadata, tableSet, importState, raceShells, season }) {
  const seasonStartDay = dateToDay(new Date(`${importState.targetYear}-01-01`));
  const lastRace = importState.lastRound > 0 ? raceShells[importState.lastRound - 1] : null;
  const nextRaceIndex = Math.min(importState.lastRound, raceShells.length - 1);
  const nextRace = importState.lastRound < raceShells.length ? raceShells[nextRaceIndex] : null;
  const newDay = lastRace
    ? Math.max(seasonStartDay, Number(lastRace.Day || seasonStartDay) + 1)
    : seasonStartDay;

  database.exec(`UPDATE Player_State SET Day = :day`, { ":day": newDay });
  database.exec(
    `UPDATE Races
     SET State = CASE
       WHEN RaceID IN (${raceShells.slice(0, importState.lastRound).map((race) => race.RaceID).join(",") || "-1"}) THEN 2
       ELSE 0
     END
     WHERE SeasonID = :seasonId`,
    { ":seasonId": importState.targetYear }
  );
  updatePlayerRecord({ database, tableSet, importState, raceShells, newDay });

  setCareerSaveMetadataFields(metadata, {
    CurrentSeason: importState.targetYear,
    Day: newDay,
    CurrentRace: Math.min(importState.lastRound + 1, raceShells.length),
    TrackID: nextRace?.TrackID || lastRace?.TrackID || raceShells[0]?.TrackID || 0,
    RaceWeekendInProgress: 0,
    SessionInProgress: 0,
    WeekendStage: 0,
    CurrentLap: 0,
    LapCount: 0,
    TimeRemaining: 0,
  });
}

function updatePlayerRecord({ database, tableSet, importState, raceShells, newDay }) {
  if (!tableSet.has("Player_Record") || importState.lastRound <= 0) {
    return;
  }

  const playerTeamId = resolvePlayerTeamId({ database, importState, day: newDay });
  if (!Number.isFinite(playerTeamId) || playerTeamId <= 0) {
    return;
  }

  const completedRaceIds = raceShells.slice(0, importState.lastRound).map((race) => race.RaceID);
  if (!completedRaceIds.length) {
    return;
  }
  const raceIdList = completedRaceIds.join(",");
  const completedResults = readRows(
    database,
    `
      SELECT Results.RaceID,
             Races.TrackID,
             Races.Day,
             Results.TeamID,
             Results.DriverID,
             Results.FinishingPos,
             Results.StartingPos,
             Results.Points,
             Results.FastestLap,
             Results.DNF
      FROM Races_Results AS Results
      JOIN Races ON Races.RaceID = Results.RaceID
      WHERE Results.Season = :seasonId
        AND Results.TeamID = :teamId
        AND Results.RaceID IN (${raceIdList})
      ORDER BY Races.Day ASC, Results.RaceID ASC, Results.DriverID ASC
    `,
    {
      ":seasonId": importState.targetYear,
      ":teamId": playerTeamId,
    }
  );
  if (!completedResults.length) {
    return;
  }

  const positiveStarts = completedResults.filter((row) => Number(row.StartingPos || 0) > 0);
  const finishedRows = completedResults.filter((row) => Number(row.DNF || 0) === 0);
  const pointRows = completedResults.filter((row) => Number(row.Points || 0) > 0);
  const podiumRows = completedResults.filter((row) => {
    const finish = Number(row.FinishingPos || 0);
    return finish > 0 && finish <= 3;
  });
  const winRows = completedResults.filter((row) => Number(row.FinishingPos || 0) === 1);
  const distinctStartedRaceIds = new Set(positiveStarts.map((row) => row.RaceID));
  const distinctFinishedRaceIds = new Set(finishedRows.map((row) => row.RaceID));
  const distinctPodiumRaceIds = new Set(podiumRows.map((row) => row.RaceID));
  const firstRaceRow = positiveStarts[0] || completedResults[0];
  const lastRaceRow = completedResults[completedResults.length - 1];
  const firstPointsRow = pointRows[0] || null;
  const firstPodiumRow = podiumRows[0] || null;
  const firstWinRow = winRows[0] || null;
  const lastWinRow = winRows[winRows.length - 1] || null;
  const bestQualifyingRow = positiveStarts.reduce((best, row) => {
    if (!best) {
      return row;
    }
    const currentPos = Number(row.StartingPos || 0);
    const bestPos = Number(best.StartingPos || 0);
    if (currentPos > 0 && (bestPos <= 0 || currentPos < bestPos)) {
      return row;
    }
    return best;
  }, null);
  const bestFinishRow = completedResults.reduce((best, row) => {
    const currentPos = Number(row.FinishingPos || 0);
    if (currentPos <= 0) {
      return best;
    }
    if (!best) {
      return row;
    }
    const bestPos = Number(best.FinishingPos || 0);
    return currentPos < bestPos ? row : best;
  }, null);

  const updates = sanitizeRowObject({
    FirstRace: firstRaceRow ? importState.targetYear : undefined,
    FirstRaceTrackID: firstRaceRow?.TrackID,
    FirstRaceTeamID: playerTeamId,
    LastRace: lastRaceRow ? importState.targetYear : undefined,
    LastRaceTrackID: lastRaceRow?.TrackID,
    LastRaceTeamID: playerTeamId,
    FirstWin: firstWinRow ? importState.targetYear : null,
    FirstWinTrackID: firstWinRow?.TrackID ?? null,
    FirstWinTeamID: firstWinRow ? playerTeamId : null,
    LastWin: lastWinRow ? importState.targetYear : null,
    LastWinTrackID: lastWinRow?.TrackID ?? null,
    LastWinTeamID: lastWinRow ? playerTeamId : null,
    FirstPodium: firstPodiumRow ? importState.targetYear : null,
    FirstPodiumTrackID: firstPodiumRow?.TrackID ?? null,
    FirstPodiumTeamID: firstPodiumRow ? playerTeamId : null,
    FirstPoints: firstPointsRow ? importState.targetYear : null,
    FirstPointsTrackID: firstPointsRow?.TrackID ?? null,
    FirstPointsTeamID: firstPointsRow ? playerTeamId : null,
    TotalDriverStarts: completedResults.length,
    TotalDriverFinishes: finishedRows.length,
    BestQualifying: bestQualifyingRow ? Number(bestQualifyingRow.StartingPos || 0) : null,
    BestQualifyingYear: bestQualifyingRow ? importState.targetYear : null,
    BestQualifyingTrackID: bestQualifyingRow?.TrackID ?? null,
    BestQualifyingTeamID: bestQualifyingRow ? playerTeamId : null,
    BestFinish: bestFinishRow ? Number(bestFinishRow.FinishingPos || 0) : null,
    BestFinishYear: bestFinishRow ? importState.targetYear : null,
    BestFinishTrackID: bestFinishRow?.TrackID ?? null,
    BestFinishTeamID: bestFinishRow ? playerTeamId : null,
    TotalDriverPoles: positiveStarts.filter((row) => Number(row.StartingPos || 0) === 1).length,
    TotalDriverWins: winRows.length,
    TotalDriverPodiums: podiumRows.length,
    TotalDriverPointsScoringFinishes: pointRows.length,
    TotalDriverPoints: completedResults.reduce((sum, row) => sum + Number(row.Points || 0), 0),
    TotalDriverFastestLaps: completedResults.filter((row) => Number(row.FastestLap || 0) > 0).length,
    TotalUniqueStarts: distinctStartedRaceIds.size,
    TotalUniqueFinishes: distinctFinishedRaceIds.size,
    TotalUniquePodiums: distinctPodiumRaceIds.size,
  });

  if (Object.keys(updates).length) {
    database.exec(
      `UPDATE Player_Record
       SET ${Object.keys(updates).map((column) => `${column} = :${column}`).join(", ")}`,
      Object.fromEntries(Object.entries(updates).map(([key, value]) => [`:${key}`, value]))
    );
  }
}

function resolvePlayerTeamId({ database, importState, day }) {
  const currentTeamId = readRows(
    database,
    `
      SELECT TeamID
      FROM Player_History
      WHERE StartDay <= :day
        AND (EndDay IS NULL OR EndDay >= :day)
      ORDER BY StartDay DESC
      LIMIT 1
    `,
    { ":day": day }
  )[0]?.TeamID;
  if (Number.isFinite(Number(currentTeamId))) {
    return Number(currentTeamId);
  }

  const fallbackTeamId = readRows(
    database,
    `
      SELECT TeamID
      FROM Player_History
      ORDER BY COALESCE(EndDay, 999999999) DESC, StartDay DESC
      LIMIT 1
    `
  )[0]?.TeamID;
  if (Number.isFinite(Number(fallbackTeamId))) {
    return Number(fallbackTeamId);
  }

  return Number(importState.customTeamRandomization?.teamId || 0);
}

function buildInspectionItemName({ teamId, partType, seasonId, designNumber, manufactureNumber, itemId }) {
  const safeTeamId = Number.isFinite(teamId) && teamId > 0 ? teamId : 0;
  const safeSeasonSuffix = String(seasonId || "").slice(-2) || "00";
  const safeDesignNumber = Math.max(1, Number(designNumber || 1));
  const safeManufactureNumber = Math.max(1, Number(manufactureNumber || 1));
  const partTypeToken = PART_TYPE_TOKEN_BY_ID[partType] || "Part_Type_Body";
  return `Imported ${partTypeToken} T${safeTeamId} (${safeSeasonSuffix}) D${safeDesignNumber} I${safeManufactureNumber} #${itemId}`;
}

function rebuildPostRaceDerivedTables({ database, tableSet, importState, raceShells }) {
  rebuildPowertrainRaceHistory({ database, tableSet, importState, raceShells });
  rebuildBoardConfidenceHistory({ database, tableSet, importState, raceShells });
  rebuildSponsorshipRaceBonuses({ database, tableSet, importState, raceShells });
  rebuildRaceRecordTables({ database, tableSet, importState });
  rebuildPitCrewRecordTables({ database, tableSet, importState });
  refreshStartOfMonthPerformanceSnapshot({ database, tableSet, importState });
}

function refreshStartOfMonthPerformanceSnapshot({ database, tableSet, importState }) {
  if (!tableSet.has("Staff_PerformanceStats_StartOfMonth") || !tableSet.has("Staff_PerformanceStats")) {
    return;
  }

  const currentDay = Number(readRows(database, `SELECT Day FROM Player_State LIMIT 1`)[0]?.Day || 0);
  const startMonthKey = toMonthKey(importState.initialPlayerDay);
  const currentMonthKey = toMonthKey(currentDay);
  if (!startMonthKey || !currentMonthKey || startMonthKey === currentMonthKey) {
    return;
  }

  database.exec(`DELETE FROM Staff_PerformanceStats_StartOfMonth`);
  const templateRow = getTemplateRow(database, "Staff_PerformanceStats_StartOfMonth");
  readRows(database, `SELECT StaffID, StatID, Val FROM Staff_PerformanceStats`).forEach((row) => {
    insertTableRow(database, "Staff_PerformanceStats_StartOfMonth", templateRow, sanitizeRowObject({
      StaffID: row.StaffID,
      StatID: row.StatID,
      Val: row.Val,
    }));
  });
}

function toMonthKey(dayNumber) {
  const numericDay = Number(dayNumber || 0);
  if (!Number.isFinite(numericDay) || numericDay <= 0) {
    return "";
  }
  const date = dayToDate(numericDay);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function rebuildPowertrainRaceHistory({ database, tableSet, importState, raceShells }) {
  if (!tableSet.has("Parts_PowertrainRaceHistoryData")) {
    return;
  }

  const completedRaceIds = raceShells.slice(importState.importStartRound, importState.lastRound).map((race) => race.RaceID);
  if (!completedRaceIds.length) {
    return;
  }
  const raceIdList = completedRaceIds.join(",");
  database.exec(`DELETE FROM Parts_PowertrainRaceHistoryData WHERE TrackID IN (
    SELECT DISTINCT TrackID FROM Races WHERE RaceID IN (${raceIdList})
  )`);

  const contractType = readRows(
    database,
    `SELECT Value FROM Staff_Enum_ContractType WHERE Name = 'Current' LIMIT 1`
  )[0]?.Value ?? 0;
  const loadoutMap = new Map(
    readRows(
      database,
      `SELECT StaffID, TeamID, PosInTeam
       FROM Staff_Contracts
       WHERE ContractType = :contractType`,
      { ":contractType": contractType }
    ).map((row) => [`${row.StaffID}:${row.TeamID}`, Number(row.PosInTeam || 0)])
  );

  const templateRow = getTemplateRow(database, "Parts_PowertrainRaceHistoryData");
  const completedRows = readRows(
    database,
    `
      SELECT Results.RaceID, Races.TrackID, Results.TeamID, Results.DriverID
      FROM Races_Results AS Results
      JOIN Races ON Races.RaceID = Results.RaceID
      WHERE Results.Season = :seasonId
        AND Results.RaceID IN (${raceIdList})
      ORDER BY Results.RaceID ASC, Results.TeamID ASC, Results.DriverID ASC
    `,
    { ":seasonId": importState.targetYear }
  );

  const inserted = new Set();
  completedRows.forEach((row) => {
    const associatedCar = loadoutMap.get(`${row.DriverID}:${row.TeamID}`);
    if (!Number.isFinite(associatedCar) || associatedCar <= 0) {
      return;
    }
    const key = `${row.TrackID}:${row.TeamID}:${associatedCar}`;
    if (inserted.has(key)) {
      return;
    }
    inserted.add(key);
    insertTableRow(database, "Parts_PowertrainRaceHistoryData", templateRow, sanitizeRowObject({
      TrackID: row.TrackID,
      TeamID: row.TeamID,
      AssociatedCar: associatedCar,
      EnginePartsUsed: 1,
      ERSPartsUsed: 1,
      GearboxPartsUsed: 1,
    }));
  });
}

function rebuildBoardConfidenceHistory({ database, tableSet, importState, raceShells }) {
  if (!tableSet.has("Board_Confidence_RaceHistory")) {
    return;
  }
  const completedRaces = raceShells.slice(importState.importStartRound, importState.lastRound);
  if (!completedRaces.length) {
    return;
  }

  const playerTeamId = resolvePlayerTeamId({
    database,
    importState,
    day: Number(completedRaces[completedRaces.length - 1]?.Day || 0),
  });
  database.exec(
    `DELETE FROM Board_Confidence_RaceHistory
     WHERE TrackID IN (${completedRaces.map((race) => race.TrackID).join(",")})`
  );
  const templateRow = getTemplateRow(database, "Board_Confidence_RaceHistory");
  completedRaces.forEach((race) => {
    insertTableRow(database, "Board_Confidence_RaceHistory", templateRow, sanitizeRowObject({
      Day: race.Day,
      TrackID: race.TrackID,
      Performance: 3,
    }));
  });
}

function rebuildSponsorshipRaceBonuses({ database, tableSet, importState, raceShells }) {
  if (!tableSet.has("Sponsorship_RaceBonuses")) {
    return;
  }
  const completedRaceIds = raceShells.slice(importState.importStartRound, importState.lastRound).map((race) => race.RaceID);
  if (!completedRaceIds.length) {
    return;
  }
  database.exec(`DELETE FROM Sponsorship_RaceBonuses WHERE RaceID IN (${completedRaceIds.join(",")})`);
  const templateRow = getTemplateRow(database, "Sponsorship_RaceBonuses");
  const rows = readRows(
    database,
    `
      SELECT DriverID, RaceID, FinishingPos
      FROM Races_Results
      WHERE Season = :seasonId
        AND RaceID IN (${completedRaceIds.join(",")})
      ORDER BY RaceID ASC, DriverID ASC
    `,
    { ":seasonId": importState.targetYear }
  );
  rows.forEach((row) => {
    const finish = Math.max(1, Number(row.FinishingPos || 20));
    [0, 1, 2].forEach((difficulty) => {
      const targetPosition = Math.min(21, finish + (difficulty * 2));
      insertTableRow(database, "Sponsorship_RaceBonuses", templateRow, sanitizeRowObject({
        DriverID: row.DriverID,
        RaceID: row.RaceID,
        Difficulty: difficulty,
        Position: targetPosition,
        Selected: difficulty === 1 ? 1 : 0,
        Achieved: 0,
      }));
    });
  });
}

function rebuildRaceRecordTables({ database, tableSet, importState }) {
  const stats = collectCompletedRaceRecordStats(database);
  rebuildDriverRaceRecordTables({ database, tableSet, stats, importState });
  rebuildTeamRaceRecordTables({ database, tableSet, stats, importState });
}

function collectCompletedRaceRecordStats(database) {
  const mainRows = [
    ...readRows(
      database,
      `
        SELECT Results.Season AS SeasonID,
               Results.RaceID,
               Races.Day,
               Races.TrackID,
               1 AS Formula,
               Results.DriverID,
               Results.TeamID,
               Results.FinishingPos,
               Results.StartingPos,
               Results.Points,
               CASE WHEN COALESCE(Results.FastestLap, 0) > 0 THEN 1 ELSE 0 END AS FastestLapAward,
               COALESCE(Results.DNF, 0) AS DNF
        FROM Races_Results AS Results
        JOIN Races ON Races.RaceID = Results.RaceID
        WHERE Races.State = 2
      `
    ),
    ...readRows(
      database,
      `
        SELECT Results.SeasonID,
               Results.RaceID,
               Races.Day,
               Races.TrackID,
               Results.RaceFormula AS Formula,
               Results.DriverID,
               Results.TeamID,
               Results.FinishingPos,
               NULL AS StartingPos,
               COALESCE(Results.ChampionshipPoints, 0) AS Points,
               0 AS FastestLapAward,
               0 AS DNF
        FROM Races_FeatureRaceResults AS Results
        JOIN Races ON Races.RaceID = Results.RaceID
        WHERE Races.State = 2
      `
    ),
  ];

  const qualifyingRows = [
    ...readRows(
      database,
      `
        SELECT Season AS SeasonID,
               Results.RaceID,
               1 AS Formula,
               DriverID,
               TeamID,
               StartingPos AS FinishingPos
        FROM Races_Results AS Results
        JOIN Races ON Races.RaceID = Results.RaceID
        WHERE StartingPos > 0
          AND Races.State = 2
      `
    ),
    ...readRows(
      database,
      `
        SELECT SeasonID,
               RaceID,
               RaceFormula AS Formula,
               DriverID,
               TeamID,
               FinishingPos
        FROM Races_QualifyingResults
        WHERE FinishingPos > 0
      `
    ),
  ];

  const sprintRows = readRows(
    database,
    `
      SELECT SeasonID,
             RaceID,
             RaceFormula AS Formula,
             DriverID,
             TeamID,
             FinishingPos
      FROM Races_SprintResults
      WHERE FinishingPos > 0
    `
  );

  return { mainRows, qualifyingRows, sprintRows };
}

function buildRaceRecordPayload({ mainRows, qualifyingRows, sprintRows, seasonId, teamId = null }) {
  const sortedMainRows = [...mainRows].sort((left, right) => left.Day - right.Day || left.RaceID - right.RaceID || left.DriverID - right.DriverID);
  if (!sortedMainRows.length) {
    return null;
  }
  const positiveStarts = qualifyingRows.filter((row) => Number(row.FinishingPos || 0) > 0);
  const finishedRows = sortedMainRows.filter((row) => Number(row.DNF || 0) === 0);
  const pointRows = sortedMainRows.filter((row) => Number(row.Points || 0) > 0);
  const podiumRows = sortedMainRows.filter((row) => {
    const finish = Number(row.FinishingPos || 0);
    return finish > 0 && finish <= 3;
  });
  const winRows = sortedMainRows.filter((row) => Number(row.FinishingPos || 0) === 1);
  const firstRaceRow = positiveStarts[0] || sortedMainRows[0];
  const lastRaceRow = sortedMainRows[sortedMainRows.length - 1];
  const firstPointsRow = pointRows[0] || null;
  const firstPodiumRow = podiumRows[0] || null;
  const firstWinRow = winRows[0] || null;
  const lastWinRow = winRows[winRows.length - 1] || null;
  const bestQualifyingRow = positiveStarts.reduce((best, row) => {
    if (!best) {
      return row;
    }
    return Number(row.FinishingPos || 999) < Number(best.FinishingPos || 999) ? row : best;
  }, null);
  const bestFinishRow = sortedMainRows.reduce((best, row) => {
    const finish = Number(row.FinishingPos || 0);
    if (finish <= 0) {
      return best;
    }
    if (!best) {
      return row;
    }
    return finish < Number(best.FinishingPos || 999) ? row : best;
  }, null);
  const bestSprintRow = sprintRows.reduce((best, row) => {
    if (!best) {
      return row;
    }
    return Number(row.FinishingPos || 999) < Number(best.FinishingPos || 999) ? row : best;
  }, null);

  return sanitizeRowObject({
    ...(seasonId !== null ? { SeasonID: seasonId } : {}),
    ...(teamId !== null ? { TeamID: teamId } : {}),
    FirstRace: firstRaceRow?.SeasonID ?? seasonId,
    FirstRaceTrackID: firstRaceRow?.TrackID,
    LastRace: lastRaceRow?.SeasonID ?? seasonId,
    LastRaceTrackID: lastRaceRow?.TrackID,
    FirstWin: firstWinRow?.SeasonID ?? null,
    FirstWinTrackID: firstWinRow?.TrackID ?? null,
    LastWin: lastWinRow?.SeasonID ?? null,
    LastWinTrackID: lastWinRow?.TrackID ?? null,
    FirstPodium: firstPodiumRow?.SeasonID ?? null,
    FirstPodiumTrackID: firstPodiumRow?.TrackID ?? null,
    FirstPoints: firstPointsRow?.SeasonID ?? null,
    FirstPointsTrackID: firstPointsRow?.TrackID ?? null,
    TotalDriverStarts: sortedMainRows.length,
    TotalStarts: sortedMainRows.length,
    TotalDriverFinishes: finishedRows.length,
    TotalFinishes: finishedRows.length,
    TotalDriverQualifying: 0,
    BestQualifyingYear: bestQualifyingRow?.SeasonID ?? null,
    BestQualifying: bestQualifyingRow ? Number(bestQualifyingRow.FinishingPos || 0) : null,
    BestQualifyingTrackID: bestQualifyingRow?.TrackID ?? null,
    BestFinish: bestFinishRow ? Number(bestFinishRow.FinishingPos || 0) : null,
    BestFinishYear: bestFinishRow?.SeasonID ?? null,
    BestFinishTrackID: bestFinishRow?.TrackID ?? null,
    TotalDriverSprintWins: sprintRows.filter((row) => Number(row.FinishingPos || 0) === 1).length,
    TotalSprintWins: sprintRows.filter((row) => Number(row.FinishingPos || 0) === 1).length,
    TotalDriverPoles: positiveStarts.filter((row) => Number(row.FinishingPos || 0) === 1).length,
    TotalPoles: positiveStarts.filter((row) => Number(row.FinishingPos || 0) === 1).length,
    TotalDriverWins: winRows.length,
    TotalWins: winRows.length,
    TotalDriverPodiums: podiumRows.length,
    TotalPodiums: podiumRows.length,
    TotalDriverPointsScoringFinishes: pointRows.length,
    TotalPointsScoringFinishes: pointRows.length,
    TotalDriverPoints: sortedMainRows.reduce((sum, row) => sum + Number(row.Points || 0), 0),
    TotalPointsScored: sortedMainRows.reduce((sum, row) => sum + Number(row.Points || 0), 0),
    TotalDriverFastestLaps: sortedMainRows.reduce((sum, row) => sum + Number(row.FastestLapAward || 0), 0),
    TotalFastestLaps: sortedMainRows.reduce((sum, row) => sum + Number(row.FastestLapAward || 0), 0),
    BestDriverFinishes: 0,
    TotalUniqueStarts: new Set(sortedMainRows.map((row) => row.RaceID)).size,
    TotalUniqueFinishes: new Set(finishedRows.map((row) => row.RaceID)).size,
    TotalUniquePodiums: new Set(podiumRows.map((row) => row.RaceID)).size,
    BestSprintFinish: bestSprintRow ? Number(bestSprintRow.FinishingPos || 0) : null,
    BestSprintFinishYear: bestSprintRow?.SeasonID ?? null,
    BestSprintFinishTrackID: bestSprintRow?.TrackID ?? null,
  });
}

function rebuildDriverRaceRecordTables({ database, tableSet, stats, importState }) {
  const { mainRows, qualifyingRows, sprintRows } = stats;
  const seasonRows = mainRows.filter((row) => Number(row.SeasonID) === importState.targetYear);
  const seasonQualRows = qualifyingRows.filter((row) => Number(row.SeasonID) === importState.targetYear);
  const seasonSprintRows = sprintRows.filter((row) => Number(row.SeasonID) === importState.targetYear);
  const previousSinceRows = tableSet.has("Staff_Driver_RaceRecordSinceGameStart")
    ? readRows(database, `SELECT * FROM Staff_Driver_RaceRecordSinceGameStart`)
    : [];

  if (tableSet.has("Staff_Driver_RaceRecordPerSeason")) {
    database.exec(`DELETE FROM Staff_Driver_RaceRecordPerSeason WHERE SeasonID = :seasonId`, { ":seasonId": importState.targetYear });
    const templateRow = getTemplateRow(database, "Staff_Driver_RaceRecordPerSeason");
    const groupKeys = new Set(seasonRows.map((row) => `${row.DriverID}:${row.Formula}:${row.TeamID}`));
    for (const key of groupKeys) {
      const [driverId, formula, teamId] = key.split(":").map(Number);
      const payload = buildRaceRecordPayload({
        mainRows: seasonRows.filter((row) => row.DriverID === driverId && row.Formula === formula && row.TeamID === teamId),
        qualifyingRows: seasonQualRows.filter((row) => row.DriverID === driverId && row.Formula === formula && row.TeamID === teamId),
        sprintRows: seasonSprintRows.filter((row) => row.DriverID === driverId && row.Formula === formula && row.TeamID === teamId),
        seasonId: importState.targetYear,
        teamId,
      });
      if (!payload) {
        continue;
      }
      insertTableRow(database, "Staff_Driver_RaceRecordPerSeason", templateRow, sanitizeRowObject({
        StaffID: driverId,
        SeasonID: importState.targetYear,
        TeamID: teamId,
        ...payload,
      }));
    }
  }

  if (tableSet.has("Staff_Driver_RaceRecordSinceGameStart")) {
    database.exec(`DELETE FROM Staff_Driver_RaceRecordSinceGameStart`);
    const templateRow = getTemplateRow(database, "Staff_Driver_RaceRecordSinceGameStart");
    const groupKeys = new Set(mainRows.map((row) => `${row.DriverID}:${row.Formula}`));
    for (const key of groupKeys) {
      const [driverId, formula] = key.split(":").map(Number);
      const driverRows = mainRows.filter((row) => row.DriverID === driverId && row.Formula === formula);
      const payload = buildRaceRecordPayload({
        mainRows: driverRows,
        qualifyingRows: qualifyingRows.filter((row) => row.DriverID === driverId && row.Formula === formula),
        sprintRows: sprintRows.filter((row) => row.DriverID === driverId && row.Formula === formula),
        seasonId: Number(driverRows[0]?.SeasonID || importState.targetYear),
      });
      if (!payload) {
        continue;
      }
      insertTableRow(database, "Staff_Driver_RaceRecordSinceGameStart", templateRow, sanitizeRowObject({
        StaffID: driverId,
        Formula: formula,
        ...payload,
      }));
    }
  }

  if (tableSet.has("Staff_RaceRecord")) {
    const previousSinceMap = new Map(previousSinceRows.map((row) => [`${row.StaffID}:${row.Formula}`, row]));
    const currentRows = readRows(database, `SELECT * FROM Staff_RaceRecord`);
    const templateRow = getTemplateRow(database, "Staff_RaceRecord");
    const currentMap = new Map(currentRows.map((row) => [`${row.StaffID}:${row.Formula}`, row]));
    const nextSinceRows = readRows(database, `SELECT * FROM Staff_Driver_RaceRecordSinceGameStart`);
    const nextKeys = new Set(nextSinceRows.map((row) => `${row.StaffID}:${row.Formula}`));
    nextKeys.forEach((key) => {
      const [staffId, formula] = key.split(":").map(Number);
      const previous = previousSinceMap.get(key) || {};
      const current = currentMap.get(key) || {};
      const next = nextSinceRows.find((row) => `${row.StaffID}:${row.Formula}` === key) || {};
      const baselineStarts = Math.max(0, Number(current.TotalStarts || 0) - Number(previous.TotalStarts || 0));
      const baselinePodiums = Math.max(0, Number(current.TotalPodiums || 0) - Number(previous.TotalPodiums || 0));
      const baselineWins = Math.max(0, Number(current.TotalWins || 0) - Number(previous.TotalWins || 0));
      database.exec(`DELETE FROM Staff_RaceRecord WHERE StaffID = :staffId AND Formula = :formula`, {
        ":staffId": staffId,
        ":formula": formula,
      });
      insertTableRow(database, "Staff_RaceRecord", templateRow, sanitizeRowObject({
        StaffID: staffId,
        Formula: formula,
        TotalStarts: baselineStarts + Number(next.TotalStarts || 0),
        TotalPodiums: baselinePodiums + Number(next.TotalPodiums || 0),
        TotalWins: baselineWins + Number(next.TotalWins || 0),
        TotalConstructorChampionships: Number(current.TotalConstructorChampionships || 0),
      }));
    });
  }
}

function rebuildTeamRaceRecordTables({ database, tableSet, stats, importState }) {
  const { mainRows, qualifyingRows, sprintRows } = stats;
  const seasonRows = mainRows.filter((row) => Number(row.SeasonID) === importState.targetYear);
  const seasonQualRows = qualifyingRows.filter((row) => Number(row.SeasonID) === importState.targetYear);
  const seasonSprintRows = sprintRows.filter((row) => Number(row.SeasonID) === importState.targetYear);

  if (tableSet.has("Teams_RaceRecordPerSeason")) {
    database.exec(`DELETE FROM Teams_RaceRecordPerSeason WHERE SeasonID = :seasonId`, { ":seasonId": importState.targetYear });
    const templateRow = getTemplateRow(database, "Teams_RaceRecordPerSeason");
    const groupKeys = new Set(seasonRows.map((row) => `${row.TeamID}:${row.Formula}`));
    for (const key of groupKeys) {
      const [teamId, formula] = key.split(":").map(Number);
      const teamRows = seasonRows.filter((row) => row.TeamID === teamId && row.Formula === formula);
      const payload = buildRaceRecordPayload({
        mainRows: teamRows,
        qualifyingRows: seasonQualRows.filter((row) => row.TeamID === teamId && row.Formula === formula),
        sprintRows: seasonSprintRows.filter((row) => row.TeamID === teamId && row.Formula === formula),
        seasonId: importState.targetYear,
      });
      if (!payload) {
        continue;
      }
      insertTableRow(database, "Teams_RaceRecordPerSeason", templateRow, sanitizeRowObject({
        TeamID: teamId,
        SeasonID: importState.targetYear,
        ...payload,
      }));
    }
  }

  if (tableSet.has("Teams_RaceRecordSinceGameStart")) {
    database.exec(`DELETE FROM Teams_RaceRecordSinceGameStart`);
    const templateRow = getTemplateRow(database, "Teams_RaceRecordSinceGameStart");
    const groupKeys = new Set(mainRows.map((row) => `${row.TeamID}:${row.Formula}`));
    for (const key of groupKeys) {
      const [teamId, formula] = key.split(":").map(Number);
      if (formula !== 1) {
        continue;
      }
      const teamRows = mainRows.filter((row) => row.TeamID === teamId && row.Formula === formula);
      const payload = buildRaceRecordPayload({
        mainRows: teamRows,
        qualifyingRows: qualifyingRows.filter((row) => row.TeamID === teamId && row.Formula === formula),
        sprintRows: sprintRows.filter((row) => row.TeamID === teamId && row.Formula === formula),
        seasonId: Number(teamRows[0]?.SeasonID || importState.targetYear),
      });
      if (!payload) {
        continue;
      }
      insertTableRow(database, "Teams_RaceRecordSinceGameStart", templateRow, sanitizeRowObject({
        TeamID: teamId,
        ...payload,
      }));
    }
  }
}

function rebuildPitCrewRecordTables({ database, tableSet, importState }) {
  const pitRows = readRows(
    database,
    `
      SELECT SeasonID, RaceID, TeamID, DriverID, FinishPosition, FastestPitStopTime, Points
      FROM Races_PitStopResults
    `
  );
  if (tableSet.has("Teams_PitCrewRecordPerSeason")) {
    database.exec(`DELETE FROM Teams_PitCrewRecordPerSeason WHERE SeasonID = :seasonId`, { ":seasonId": importState.targetYear });
    const templateRow = getTemplateRow(database, "Teams_PitCrewRecordPerSeason");
    const groupKeys = new Set(pitRows.filter((row) => Number(row.SeasonID) === importState.targetYear).map((row) => row.TeamID));
    for (const teamId of groupKeys) {
      const rows = pitRows.filter((row) => Number(row.SeasonID) === importState.targetYear && Number(row.TeamID) === Number(teamId));
      const fastest = rows.reduce((best, row) => (!best || Number(row.FastestPitStopTime || 999) < Number(best.FastestPitStopTime || 999)) ? row : best, null);
      insertTableRow(database, "Teams_PitCrewRecordPerSeason", templateRow, sanitizeRowObject({
        TeamID: Number(teamId),
        SeasonID: importState.targetYear,
        CompetitionWins: rows.filter((row) => Number(row.FinishPosition || 0) === 1).length,
        FastestPitStopsTotal: rows.filter((row) => Number(row.FinishPosition || 0) === 1).length,
        FastestPitStopTime: Number(fastest?.FastestPitStopTime || 0),
        TotalPointsScored: rows.reduce((sum, row) => sum + Number(row.Points || 0), 0),
        DriverID: Number(fastest?.DriverID || rows[0]?.DriverID || 0),
      }));
    }
  }

  if (tableSet.has("Teams_PitCrewRecordSinceGameStart")) {
    database.exec(`DELETE FROM Teams_PitCrewRecordSinceGameStart`);
    const templateRow = getTemplateRow(database, "Teams_PitCrewRecordSinceGameStart");
    const groupKeys = new Set(pitRows.map((row) => row.TeamID));
    for (const teamId of groupKeys) {
      const rows = pitRows.filter((row) => Number(row.TeamID) === Number(teamId));
      const fastest = rows.reduce((best, row) => (!best || Number(row.FastestPitStopTime || 999) < Number(best.FastestPitStopTime || 999)) ? row : best, null);
      insertTableRow(database, "Teams_PitCrewRecordSinceGameStart", templateRow, sanitizeRowObject({
        TeamID: Number(teamId),
        CompetitionWins: rows.filter((row) => Number(row.FinishPosition || 0) === 1).length,
        FastestPitStopsTotal: rows.filter((row) => Number(row.FinishPosition || 0) === 1).length,
        FastestPitStopTime: Number(fastest?.FastestPitStopTime || 0),
        TotalPointsScored: rows.reduce((sum, row) => sum + Number(row.Points || 0), 0),
        DriverID: Number(fastest?.DriverID || rows[0]?.DriverID || 0),
      }));
    }
  }
}

function isRaceWeekendInProgress(basicInfo) {
  if ((basicInfo?.weekend?.RaceID ?? -1) >= 0) {
    return true;
  }
  const player = basicInfo?.player || {};
  return Boolean(
    Number(player.RaceWeekendInProgress || 0) > 0
    || Number(player.SessionInProgress || 0) > 0
    || Number(player.WeekendStage || 0) > 0
  );
}

function countLockedCompletedRounds(basicInfo) {
  const races = [...(basicInfo?.currentSeasonRaces || [])].sort((left, right) => left.Day - right.Day || left.RaceID - right.RaceID);
  let count = 0;
  for (const race of races) {
    if (Number(race.State) === 2) {
      count += 1;
      continue;
    }
    break;
  }
  return count;
}

function ensureDriverExists({ database, importState, driverName, driverCode = null }) {
  const key = normalizeName(driverName);
  if (importState.driverIdsByName[key]) {
    return importState.driverIdsByName[key];
  }
  if (Number.isFinite(Number(importState.driverReplacements?.[key]))) {
    const replacementId = Number(importState.driverReplacements[key]);
    importState.driverIdsByName[key] = replacementId;
    return replacementId;
  }

  const templateId = readRows(database, "SELECT StaffID FROM Staff_DriverData ORDER BY StaffID DESC LIMIT 1")[0]?.StaffID;
  if (!templateId) {
    throw new Error(`No driver template row exists to create ${driverName}.`);
  }
  const nextStaffId = Number(readRows(database, "SELECT MAX(StaffID) AS MaxID FROM Staff_BasicData")[0]?.MaxID || 0) + 1;

  cloneStaffRow(database, "Staff_BasicData", templateId, nextStaffId);
  cloneStaffRow(database, "Staff_GameData", templateId, nextStaffId);
  cloneStaffRow(database, "Staff_DriverData", templateId, nextStaffId);

  const profile = resolveImportedDriverProfile(importState, driverName, driverCode)
    || F1_DRIVER_DIRECTORY[key]
    || inferProfileFromName(driverName, driverCode);
  updateDriverProfile(database, importState, nextStaffId, profile);

  importState.driverIdsByName[key] = nextStaffId;
  importState.createdDrivers.push(driverName);
  return nextStaffId;
}

function updateDriverProfile(database, importState, staffId, profile) {
  const countryRow = resolveCountryRow(database, profile.countryCandidates || []);
  const currentBasicRow = readRows(database, "SELECT * FROM Staff_BasicData WHERE StaffID = :staffId", { ":staffId": staffId })[0] || {};
  const currentGameRow = readRows(database, "SELECT * FROM Staff_GameData WHERE StaffID = :staffId", { ":staffId": staffId })[0] || {};

  updateRow(database, "Staff_BasicData", sanitizeRowObject({
    FirstName: unresolveName(profile.firstName),
    LastName: unresolveName(profile.lastName),
    CountryID: countryRow?.CountryID ?? currentBasicRow.CountryID,
    DOB: profile.dob ? dateToDay(new Date(`${profile.dob}T00:00:00Z`)) : currentBasicRow.DOB,
    DOB_ISO: profile.dob || currentBasicRow.DOB_ISO,
    PhotoDay: importState.currentSeasonRaces?.[0]?.Day || currentBasicRow.PhotoDay || importState.currentSeason,
  }), { StaffID: staffId });

  updateRow(database, "Staff_GameData", sanitizeRowObject({
    Retired: 0,
    RetirementAge: currentGameRow.RetirementAge || 40,
  }), { StaffID: staffId });

  updateRow(database, "Staff_DriverData", sanitizeRowObject({
    DriverCode: unresolveDriverCode(profile.code),
    LastKnownDriverNumber: null,
    AssignedCarNumber: null,
    FeederSeriesAssignedCarNumber: null,
  }), { StaffID: staffId });
}

function ensureExperimentalTables(database) {
  database.exec(
    `CREATE TABLE IF NOT EXISTS Modding_RealWorldImport_ComponentLedger (
      SeasonID INTEGER NOT NULL,
      RaceID INTEGER NOT NULL,
      Series TEXT NOT NULL,
      TeamID INTEGER NOT NULL,
      LoadoutID INTEGER NOT NULL,
      DriverID INTEGER NOT NULL,
      PartType INTEGER NOT NULL,
      ItemID INTEGER NOT NULL,
      ConditionBefore REAL,
      ConditionAfter REAL,
      SimulatedWear REAL
    )`
  );
  database.exec(
    `CREATE TABLE IF NOT EXISTS Modding_RealWorldImport_ErrorLog (
      LoggedAt TEXT,
      Stage TEXT,
      TableName TEXT,
      Details TEXT
    )`
  );
  database.exec(
    `CREATE TABLE IF NOT EXISTS Modding_RealWorldImport_ResultStatus (
      SeasonID INTEGER NOT NULL,
      RaceID INTEGER NOT NULL,
      Series TEXT NOT NULL,
      SessionType TEXT NOT NULL,
      DriverID INTEGER NOT NULL,
      ClassificationStatus TEXT,
      PositionText TEXT,
      Laps INTEGER
    )`
  );
}

function buildInitialSeatState(basicInfo) {
  const seatState = {};
  getActiveF1TeamIds({ customTeamRandomization: { teamId: getCustomTeamF1TeamId(basicInfo) } }).forEach((teamId) => {
    const team = basicInfo?.teamMap?.[teamId] || {};
    seatState[teamId] = {
      1: normalizeName(resolveDriverName(basicInfo?.driverMap?.[team.Driver1ID])),
      2: normalizeName(resolveDriverName(basicInfo?.driverMap?.[team.Driver2ID])),
    };
  });
  return seatState;
}

function buildExistingDriverLookup(basicInfo) {
  return Object.fromEntries(
    Object.values(basicInfo?.driverMap || {})
      .map((driver) => [normalizeName(resolveDriverName(driver)), driver.StaffID])
      .filter(([key]) => key)
  );
}

function resolveSeriesTeamId({ config, resultRow, event, teamMapping }) {
  if (config.formula === 1) {
    return Number(resultRow.teamId) || mapF1TeamNameToId(resultRow.teamName);
  }
  return config.teamMapper(resultRow.teamName, teamMapping);
}

function resolveSeasonTeamMapping({ database, importState, seriesKey, season, config }) {
  if (config.formula === 1) {
    return season.teamMap || {};
  }

  const cacheKey = `${seriesKey}:${importState.targetYear}`;
  if (importState.feederTeamMappings[cacheKey]) {
    return importState.feederTeamMappings[cacheKey];
  }

  const saveTeams = readRows(
    database,
    `SELECT TeamID, Formula, TeamName, TeamNameLocKey
     FROM Teams
     WHERE Formula = :formula
     ORDER BY TeamID ASC`,
    { ":formula": config.formula }
  );
  const availableIds = saveTeams.map((row) => Number(row.TeamID)).filter(Number.isFinite);
  const saveLookup = {};
  saveTeams.forEach((row) => {
    const aliases = collectTeamAliases(row);
    aliases.forEach((alias) => {
      saveLookup[alias] = Number(row.TeamID);
    });
  });

  const importedTeams = collectSeasonTeamNames(season).sort((left, right) => left.localeCompare(right));
  const mapping = {};
  const usedIds = new Set();

  importedTeams.forEach((teamName) => {
    const normalized = normalizeName(teamName);
    const preferredAliases = FEEDER_TEAM_NAME_ALIASES[normalized] || [normalized];
    const teamId = preferredAliases.map((alias) => saveLookup[alias]).find(Boolean);
    if (teamId) {
      mapping[normalized] = teamId;
      usedIds.add(teamId);
    }
  });

  const remainingIds = availableIds.filter((teamId) => !usedIds.has(teamId));
  importedTeams.forEach((teamName) => {
    const normalized = normalizeName(teamName);
    if (mapping[normalized]) {
      return;
    }
    const nextTeamId = remainingIds.shift();
    if (nextTeamId) {
      mapping[normalized] = nextTeamId;
    }
  });

  importState.feederTeamMappings[cacheKey] = mapping;
  return mapping;
}

const FEEDER_TEAM_NAME_ALIASES = {
  [normalizeName("Virtuosi Racing")]: [normalizeName("Virtuosi Racing"), normalizeName("Invicta Racing")],
  [normalizeName("UNI-Virtuosi Racing")]: [normalizeName("UNI-Virtuosi Racing"), normalizeName("Virtuosi Racing"), normalizeName("Invicta Racing")],
  [normalizeName("Carlin")]: [normalizeName("Carlin"), normalizeName("Rodin Motorsport"), normalizeName("Rodin Carlin")],
  [normalizeName("Rodin Carlin")]: [normalizeName("Rodin Carlin"), normalizeName("Carlin"), normalizeName("Rodin Motorsport")],
  [normalizeName("Rodin Motorsport")]: [normalizeName("Rodin Motorsport"), normalizeName("Carlin"), normalizeName("Rodin Carlin")],
  [normalizeName("Hitech Grand Prix")]: [normalizeName("Hitech Grand Prix"), normalizeName("Hitech Pulse-Eight")],
  [normalizeName("Hitech Pulse-Eight")]: [normalizeName("Hitech Pulse-Eight"), normalizeName("Hitech Grand Prix")],
  [normalizeName("DAMS")]: [normalizeName("DAMS"), normalizeName("DAMS Lucas Oil")],
  [normalizeName("PHM Racing by Charouz")]: [normalizeName("PHM Racing by Charouz"), normalizeName("AIX Racing"), normalizeName("Charouz Racing System")],
  [normalizeName("PHM AIX Racing")]: [normalizeName("PHM AIX Racing"), normalizeName("AIX Racing"), normalizeName("PHM Racing by Charouz")],
  [normalizeName("AIX Racing")]: [normalizeName("AIX Racing"), normalizeName("PHM AIX Racing"), normalizeName("PHM Racing by Charouz"), normalizeName("Charouz Racing System")],
  [normalizeName("Charouz Racing System")]: [normalizeName("Charouz Racing System"), normalizeName("AIX Racing"), normalizeName("PHM Racing by Charouz")],
  [normalizeName("Campos Racing")]: [normalizeName("Campos Racing"), normalizeName("Campos")],
  [normalizeName("MP Motorsport")]: [normalizeName("MP Motorsport")],
  [normalizeName("Van Amersfoort Racing")]: [normalizeName("Van Amersfoort Racing")],
  [normalizeName("Jenzer Motorsport")]: [normalizeName("Jenzer Motorsport")],
  [normalizeName("ART Grand Prix")]: [normalizeName("ART Grand Prix")],
  [normalizeName("PREMA Racing")]: [normalizeName("PREMA Racing")],
  [normalizeName("Trident")]: [normalizeName("Trident")],
};

function collectTeamAliases(teamRow) {
  const aliases = new Set();
  [teamRow.TeamName, teamRow.TeamNameLocKey]
    .map((value) => resolveLiteral(`${value || ""}`))
    .forEach((value) => {
      const normalized = normalizeName(value);
      if (normalized) {
        aliases.add(normalized);
        (FEEDER_TEAM_NAME_ALIASES[normalized] || []).forEach((alias) => aliases.add(alias));
      }
    });
  return [...aliases];
}

function resolveRaceShellForEvent({ raceShells, event, fallbackIndex = 0 }) {
  if (!event) {
    return raceShells[fallbackIndex] || null;
  }

  const eventSlug = normalizeName(getImportedEventSlug(event));
  const bySlug = eventSlug
    ? raceShells.find((shell) => normalizeName(shell.ImportedEventSlug) === eventSlug)
    : null;
  if (bySlug) {
    return bySlug;
  }

  const eventDay = event.eventDate ? dateToDay(new Date(`${event.eventDate}T00:00:00Z`)) : null;
  if (Number.isFinite(eventDay)) {
    const byDate = raceShells.find((shell) => Math.abs(Number(shell.Day) - eventDay) <= 4);
    if (byDate) {
      return byDate;
    }
  }

  return raceShells[fallbackIndex] || null;
}

function findSeriesEventForRaceShell({ raceShell, season }) {
  if (!raceShell || !season?.events?.length) {
    return null;
  }
  return season.events.find((event) => {
    const eventSlug = normalizeName(getImportedEventSlug(event));
    if (eventSlug && eventSlug === normalizeName(raceShell.ImportedEventSlug)) {
      return true;
    }
    if (event.eventDate) {
      const eventDay = dateToDay(new Date(`${event.eventDate}T00:00:00Z`));
      return Math.abs(Number(raceShell.Day) - eventDay) <= 4;
    }
    return false;
  }) || null;
}

function getImportedEventSlug(event) {
  if (!event) {
    return "";
  }
  const directSlug = `${event.f1Slug || event.slug || ""}`.trim();
  if (directSlug) {
    return directSlug;
  }
  const circuitId = `${event?.circuit?.circuitId || ""}`.trim().toLowerCase();
  if (circuitId && JOLPICA_CIRCUIT_ID_TO_SLUG[circuitId]) {
    return JOLPICA_CIRCUIT_ID_TO_SLUG[circuitId];
  }
  return normalizeName(event.eventName).replace(/\s+/g, "-");
}

function mapF1TeamNameToId(teamName) {
  return F1_TEAM_NAME_TO_ID[normalizeName(teamName)] || null;
}

function collectSeasonDriverNames(season) {
  const names = new Set();
  for (const event of season?.events || []) {
    for (const session of Object.values(event.sessions || {})) {
      for (const row of session?.results || []) {
        if (row?.driverName) {
          names.add(row.driverName);
        }
      }
    }
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

function collectSeasonTeamNames(season) {
  const names = new Set();
  for (const event of season?.events || []) {
    for (const session of Object.values(event.sessions || {})) {
      for (const row of session?.results || []) {
        if (row?.teamName) {
          names.add(row.teamName);
        }
      }
    }
  }
  return [...names];
}

function getTemplateRow(database, table) {
  const cache = getImportRuntimeCache(database);
  if (Object.prototype.hasOwnProperty.call(cache.templateRows, table)) {
    return cache.templateRows[table];
  }
  const row = readRows(database, `SELECT * FROM ${table} ORDER BY ROWID DESC LIMIT 1`)[0] || null;
  cache.templateRows[table] = row;
  return row;
}

function getTableColumns(database, table) {
  const cache = getImportRuntimeCache(database);
  if (cache.tableColumns[table]) {
    return cache.tableColumns[table];
  }
  const columns = readRows(database, `PRAGMA table_info('${table}')`).map((row) => row.name);
  cache.tableColumns[table] = columns;
  return columns;
}

function insertTableRow(database, table, templateRow, row, errorContext = null) {
  const columns = getTableColumns(database, table);
  const finalRow = {};
  if (templateRow) {
    columns.forEach((column) => {
      finalRow[column] = templateRow[column];
    });
  }
  Object.entries(row).forEach(([key, value]) => {
    if (columns.includes(key) && value !== undefined) {
      finalRow[key] = value;
    }
  });
  const populatedColumns = columns.filter((column) => finalRow[column] !== undefined);
  if (!populatedColumns.length) {
    return;
  }
  const values = populatedColumns.map((column) => toSqlLiteral(finalRow[column]));
  try {
    database.exec(`INSERT INTO ${table} (${populatedColumns.join(", ")}) VALUES (${values.join(", ")})`);
  } catch (error) {
    logImportError(database, {
      stage: "insertTableRow",
      table,
      error,
      context: errorContext,
      row: finalRow,
    });
    throw enrichImportError(error, table, errorContext, finalRow);
  }
}

function updateRow(database, table, updates, where) {
  const columns = getTableColumns(database, table);
  const setPairs = Object.entries(updates)
    .filter(([key, value]) => columns.includes(key) && value !== undefined)
    .map(([key, value]) => `${key} = ${toSqlLiteral(value)}`);
  if (!setPairs.length) {
    return;
  }
  const wherePairs = Object.entries(where)
    .filter(([key]) => columns.includes(key))
    .map(([key, value]) => `${key} = ${toSqlLiteral(value)}`);
  if (!wherePairs.length) {
    return;
  }
  database.exec(`UPDATE ${table} SET ${setPairs.join(", ")} WHERE ${wherePairs.join(" AND ")}`);
}

function cloneStaffRow(database, table, templateId, nextStaffId) {
  const columns = getTableColumns(database, table);
  const values = columns.map((column) => (column === "StaffID" ? `${nextStaffId}` : column)).join(", ");
  database.exec(`INSERT INTO ${table} (${columns.join(", ")}) SELECT ${values} FROM ${table} WHERE StaffID = ${templateId}`);
}

function resolveCountryRow(database, countryCandidates) {
  for (const candidate of countryCandidates) {
    const rows = readRows(
      database,
      `SELECT CountryID, EnumName FROM Countries WHERE EnumName = :candidate LIMIT 1`,
      { ":candidate": candidate }
    );
    if (rows.length) {
      return rows[0];
    }
  }
  return null;
}

function resolveImportedDriverProfile(importState, driverName, driverCode) {
  const season = importState?.datasets?.f1?.seasons?.[`${importState?.targetYear}`];
  const profiles = season?.driverProfiles || {};
  const profile = profiles[driverName] || profiles[Object.keys(profiles).find((name) => normalizeName(name) === normalizeName(driverName))];
  if (!profile) {
    return null;
  }
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    code: normalizeDriverCode(profile.code || driverCode || ""),
    countryCandidates: profile.countryCandidates || [],
    dob: profile.dob || null,
  };
}

function getImportDriverConflicts({ dataset, basicInfo, targetYear, lastCompletedRound = null }) {
  const currentSeason = Number(basicInfo?.player?.CurrentSeason || 0);
  if (!dataset?.seasons || !targetYear || Number(targetYear) < currentSeason) {
    return [];
  }

  const existingDriverIdsByName = buildExistingDriverLookup(basicInfo);
  const teamSeatState = buildInitialSeatState(basicInfo);
  const driverDisplayNames = {};
  const selectedEvents = [];

  for (let year = currentSeason; year <= Number(targetYear); year += 1) {
    const season = dataset.seasons?.[`${year}`];
    if (!season) {
      continue;
    }
    const maxRound = season.events?.length || 0;
    const startRound = year === currentSeason ? getLockedCompletedRounds(basicInfo) : 0;
    const endRound = year === Number(targetYear)
      ? Math.max(0, Math.min(Number(lastCompletedRound ?? maxRound), maxRound))
      : maxRound;
    selectedEvents.push(...(season.events || []).slice(startRound, endRound));
  }

  selectedEvents.forEach((event) => {
    Object.values(event?.lineup || {}).forEach((driverNames = []) => {
      driverNames.forEach((driverName) => {
        const key = normalizeName(driverName);
        if (key && !driverDisplayNames[key]) {
          driverDisplayNames[key] = driverName;
        }
      });
    });
    applyLineupToSeatState(teamSeatState, event?.lineup || {});
  });

  return Object.entries(teamSeatState)
    .flatMap(([teamIdValue, seatState]) => [1, 2].map((posInTeam) => ({
      teamId: Number(teamIdValue),
      posInTeam,
      driverKey: seatState?.[posInTeam] || "",
    })))
    .filter((entry) => entry.driverKey && !existingDriverIdsByName[entry.driverKey])
    .map((entry) => {
      const team = basicInfo?.teamMap?.[entry.teamId] || {};
      const conflictingDriverId = Number(team?.[`Driver${entry.posInTeam}ID`] || 0) || null;
      const conflictingDriver = conflictingDriverId ? basicInfo?.driverMap?.[conflictingDriverId] : null;
      return {
        importedDriverName: driverDisplayNames[entry.driverKey] || entry.driverKey,
        teamId: entry.teamId,
        teamName: resolveLiteral(team.TeamNameLocKey || team.TeamName || "") || team.TeamName || `Team ${entry.teamId}`,
        posInTeam: entry.posInTeam,
        conflictingDriverId,
        conflictingDriverName: resolveDriverName(conflictingDriver) || null,
      };
    })
    .sort((left, right) => left.teamId - right.teamId || left.posInTeam - right.posInTeam || left.importedDriverName.localeCompare(right.importedDriverName));
}

function applyLineupToSeatState(teamSeatState, lineup = {}) {
  Object.entries(lineup).forEach(([teamName, driverNames]) => {
    const teamId = mapF1TeamNameToId(teamName);
    if (!teamId) {
      return;
    }
    const state = teamSeatState[teamId] || { 1: null, 2: null };
    const incoming = (driverNames || []).map((name) => normalizeName(name)).filter(Boolean);
    const nextState = { ...state };
    const preserved = new Set();

    [1, 2].forEach((loadoutId) => {
      if (nextState[loadoutId] && incoming.includes(nextState[loadoutId])) {
        preserved.add(nextState[loadoutId]);
      } else {
        nextState[loadoutId] = null;
      }
    });

    incoming.forEach((driverKey) => {
      if (preserved.has(driverKey)) {
        return;
      }
      const openSeat = [1, 2].find((loadoutId) => !nextState[loadoutId]);
      if (openSeat) {
        nextState[openSeat] = driverKey;
      }
    });

    teamSeatState[teamId] = nextState;
  });
}

function normalizeDriverReplacements({ basicInfo, driverReplacements }) {
  const validDriverIds = new Set(
    Object.keys(basicInfo?.driverMap || {})
      .map((value) => Number(value))
      .filter(Number.isFinite)
  );
  return Object.fromEntries(
    Object.entries(driverReplacements || {})
      .map(([driverName, staffId]) => [normalizeName(driverName), Number(staffId)])
      .filter(([driverKey, staffId]) => driverKey && validDriverIds.has(staffId))
  );
}

function inferProfileFromName(driverName, driverCode) {
  const parts = `${driverName || ""}`.trim().split(/\s+/);
  return {
    firstName: parts.slice(0, -1).join(" ") || parts[0] || "Generated",
    lastName: parts.at(-1) || "Driver",
    code: normalizeDriverCode(driverCode || `${parts.at(-1) || "DRV"}`),
    countryCandidates: [],
  };
}

function resolveDriverName(driver) {
  if (!driver) {
    return "";
  }
  const firstName = resolveName(`${driver.FirstName || ""}`);
  const lastName = resolveName(`${driver.LastName || ""}`);
  return `${firstName} ${lastName}`.trim();
}

function normalizeName(value) {
  return `${value || ""}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDriverCode(value) {
  const sanitized = `${value || ""}`.replace(/[^A-Za-z]+/g, "").toUpperCase();
  return sanitized.slice(0, 3) || "DRV";
}

function sanitizeRowObject(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function readRows(database, query, params = {}) {
  try {
    return database.getAllRows(query, params);
  } catch {
    return [];
  }
}

function withImportSqlLogger(database, callback) {
  if (!database || typeof callback !== "function") {
    return callback();
  }

  const originalExec = database.exec?.bind(database);
  const originalGetAllRows = database.getAllRows?.bind(database);
  const sink = [];

  const logEntry = (kind, sql, params = null) => {
    const entry = {
      at: new Date().toISOString(),
      kind,
      sql,
      params,
    };
    sink.push(entry);
    try {
      if (typeof window !== "undefined") {
        window.__realWorldImportSqlLog = window.__realWorldImportSqlLog || [];
        window.__realWorldImportSqlLog.push(entry);
      }
    } catch {
      // ignore window logging failures
    }
    console.debug("[RealWorldImport][SQL]", entry);
  };

  if (originalExec) {
    database.exec = (sql, params) => {
      logEntry("exec", sql, params ?? null);
      return originalExec(sql, params);
    };
  }
  if (originalGetAllRows) {
    database.getAllRows = (sql, params) => {
      logEntry("getAllRows", sql, params ?? null);
      return originalGetAllRows(sql, params);
    };
  }

  try {
    const cache = getImportRuntimeCache(database);
    cache.tableColumns = {};
    cache.templateRows = {};
    return callback();
  } finally {
    if (originalExec) {
      database.exec = originalExec;
    }
    if (originalGetAllRows) {
      database.getAllRows = originalGetAllRows;
    }
  }
}

function getImportRuntimeCache(database) {
  if (!database.__realWorldImportRuntimeCache) {
    database.__realWorldImportRuntimeCache = {
      tableColumns: {},
      templateRows: {},
    };
  }
  return database.__realWorldImportRuntimeCache;
}

function toSqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? `${value}` : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${`${value}`.replaceAll("'", "''")}'`;
}

function logImportError(database, { stage, table, error, context, row }) {
  const details = {
    error: error?.message || `${error}`,
    context: context || null,
    row: row || null,
  };
  try {
    database.exec(
      `INSERT INTO Modding_RealWorldImport_ErrorLog (LoggedAt, Stage, TableName, Details)
       VALUES (:loggedAt, :stage, :tableName, :details)`,
      {
        ":loggedAt": new Date().toISOString(),
        ":stage": stage,
        ":tableName": table,
        ":details": JSON.stringify(details),
      }
    );
  } catch {
    // ignore nested logging failures
  }
  try {
    if (typeof window !== "undefined") {
      window.__realWorldImportErrorLog = window.__realWorldImportErrorLog || [];
      window.__realWorldImportErrorLog.push({ stage, table, details });
    }
  } catch {
    // ignore window logging failures
  }
  console.error("[RealWorldImport]", stage, table, details);
}

function enrichImportError(error, table, context, row) {
  const fragments = [
    error?.message || `${error}`,
    `table=${table}`,
  ];
  if (context?.raceId !== undefined) fragments.push(`raceId=${context.raceId}`);
  if (context?.sessionType) fragments.push(`session=${context.sessionType}`);
  if (context?.driverName) fragments.push(`driver=${context.driverName}`);
  if (context?.teamName) fragments.push(`team=${context.teamName}`);
  if (context?.position !== undefined) fragments.push(`pos=${context.position}`);
  if (row?.FinishingPos !== undefined) fragments.push(`finishingPos=${row.FinishingPos}`);
  return new Error(fragments.join(" | "));
}
