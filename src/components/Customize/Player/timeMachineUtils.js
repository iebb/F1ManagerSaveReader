const getCareerSaveMetadataProperties = (metadata) => {
  const metaDataProperty = metadata?.gvasMeta?.Properties?.Properties?.find(
    (property) => property.Name === "MetaData"
  );

  return metaDataProperty?.Properties?.[0]?.Properties || [];
};

export const setCareerSaveMetadataFields = (metadata, updates) => {
  const properties = getCareerSaveMetadataProperties(metadata);
  for (const property of properties) {
    if (Object.prototype.hasOwnProperty.call(updates, property.Name)) {
      property.Property = updates[property.Name];
    }
  }
  if (metadata?.careerSaveMetadata) {
    Object.assign(metadata.careerSaveMetadata, updates);
  }
};

export const getExistingTableSet = (database) => {
  if (!database) {
    return new Set();
  }

  try {
    const [{ values }] = database.exec(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC"
    );
    return new Set(values.map(([name]) => name));
  } catch {
    return new Set();
  }
};

const buildAggregateMap = (rows, idColumn) => {
  const aggregateMap = new Map();

  for (const row of rows) {
    const key = `${row[idColumn]}:${row.RaceFormula}`;
    aggregateMap.set(key, (aggregateMap.get(key) || 0) + Number(row.Points || 0));
  }

  return aggregateMap;
};

const buildLatestRoundPointsMap = (rows, idColumn) => {
  const latestRaceIdByFormula = new Map();
  const latestRoundPointsMap = new Map();

  for (const row of rows) {
    const formula = Number(row.RaceFormula);
    const raceId = Number(row.RaceID);
    if (!Number.isFinite(formula) || !Number.isFinite(raceId)) {
      continue;
    }
    const currentRaceId = latestRaceIdByFormula.get(formula);
    if (!Number.isFinite(currentRaceId) || raceId > currentRaceId) {
      latestRaceIdByFormula.set(formula, raceId);
    }
  }

  for (const row of rows) {
    const formula = Number(row.RaceFormula);
    const raceId = Number(row.RaceID);
    const entryId = Number(row[idColumn]);
    const points = Number(row.Points || 0);
    if (!Number.isFinite(formula) || !Number.isFinite(raceId) || !Number.isFinite(entryId)) {
      continue;
    }
    if (raceId !== latestRaceIdByFormula.get(formula)) {
      continue;
    }
    const key = `${entryId}:${formula}`;
    latestRoundPointsMap.set(key, (latestRoundPointsMap.get(key) || 0) + points);
  }

  return latestRoundPointsMap;
};

const buildCountbackMap = (rows, idColumn) => {
  const countbackMap = new Map();

  for (const row of rows) {
    const entryId = Number(row[idColumn]);
    const formula = Number(row.RaceFormula);
    const finishingPos = Number(row.FinishingPos);
    if (!Number.isFinite(entryId) || !Number.isFinite(formula) || !Number.isFinite(finishingPos) || finishingPos <= 0) {
      continue;
    }

    const key = `${entryId}:${formula}`;
    const counts = countbackMap.get(key) || new Map();
    counts.set(finishingPos, (counts.get(finishingPos) || 0) + 1);
    countbackMap.set(key, counts);
  }

  return countbackMap;
};

const compareCountbackMaps = (leftCounts, rightCounts) => {
  const positions = new Set([
    ...Array.from(leftCounts?.keys?.() || []),
    ...Array.from(rightCounts?.keys?.() || []),
  ]);
  const sortedPositions = [...positions].sort((left, right) => left - right);

  for (const finishingPos of sortedPositions) {
    const leftCount = leftCounts?.get(finishingPos) || 0;
    const rightCount = rightCounts?.get(finishingPos) || 0;
    if (leftCount !== rightCount) {
      return rightCount - leftCount;
    }
  }

  return 0;
};

const recalculateStandingsTable = ({
  database,
  season,
  table,
  idColumn,
  pointsMap,
  countbackMap,
  latestRoundPointsMap = new Map(),
}) => {
  const rows = database.getAllRows(
    `SELECT ${idColumn}, RaceFormula FROM ${table} WHERE SeasonID = :season`,
    {
      ":season": season,
    }
  );

  const formulaGroups = new Map();
  for (const row of rows) {
    const entries = formulaGroups.get(row.RaceFormula) || [];
    entries.push(row);
    formulaGroups.set(row.RaceFormula, entries);
  }

  for (const [formula, entries] of formulaGroups.entries()) {
    const sortedEntries = [...entries].sort((left, right) => {
      const leftPoints = pointsMap.get(`${left[idColumn]}:${formula}`) || 0;
      const rightPoints = pointsMap.get(`${right[idColumn]}:${formula}`) || 0;
      if (rightPoints !== leftPoints) {
        return rightPoints - leftPoints;
      }
      const countbackComparison = compareCountbackMaps(
        countbackMap.get(`${left[idColumn]}:${formula}`),
        countbackMap.get(`${right[idColumn]}:${formula}`)
      );
      if (countbackComparison !== 0) {
        return countbackComparison;
      }
      return left[idColumn] - right[idColumn];
    });

    const hasAnyPoints = sortedEntries.some(
      (entry) => (pointsMap.get(`${entry[idColumn]}:${formula}`) || 0) > 0
    );

    sortedEntries.forEach((entry, index) => {
      const points = pointsMap.get(`${entry[idColumn]}:${formula}`) || 0;
      database.exec(
        `UPDATE ${table}
         SET Points = :points,
             Position = :position,
             LastPointsChange = :lastPointsChange,
             LastPositionChange = 0
         WHERE SeasonID = :season
           AND ${idColumn} = :entryId
           AND RaceFormula = :formula`,
        {
          ":season": season,
          ":entryId": entry[idColumn],
          ":formula": formula,
          ":points": points,
          ":position": hasAnyPoints ? index + 1 : 0,
          ":lastPointsChange": latestRoundPointsMap.get(`${entry[idColumn]}:${formula}`) || 0,
        }
      );
    });
  }
};

export const recalculateRaceStandings = ({ database, season, tableSet }) => {
  if (!database) {
    return;
  }

  if (tableSet.has("Races_DriverStandings")) {
    const driverPointRows = database.getAllRows(
        `
          SELECT DriverID, RaceFormula, RaceID, SUM(Points) AS Points
          FROM (
            SELECT DriverID, 1 AS RaceFormula, RaceID, Points
            FROM Races_Results
            WHERE Season = :season
            UNION ALL
            SELECT DriverID, RaceFormula, RaceID, ChampionshipPoints AS Points
            FROM Races_SprintResults
            WHERE SeasonID = :season
            UNION ALL
            SELECT DriverID, RaceFormula, RaceID, ChampionshipPoints AS Points
            FROM Races_QualifyingResults
            WHERE SeasonID = :season
            UNION ALL
            SELECT DriverID, RaceFormula, RaceID, ChampionshipPoints AS Points
            FROM Races_FeatureRaceResults
            WHERE SeasonID = :season
          )
          GROUP BY DriverID, RaceFormula, RaceID
        `,
        {
          ":season": season,
        }
    );
    const driverPoints = buildAggregateMap(driverPointRows, "DriverID");
    const driverLatestRoundPoints = buildLatestRoundPointsMap(driverPointRows, "DriverID");
    const driverCountback = buildCountbackMap(
      database.getAllRows(
        `
          SELECT DriverID, 1 AS RaceFormula, FinishingPos
          FROM Races_Results
          WHERE Season = :season
          UNION ALL
          SELECT DriverID, RaceFormula, FinishingPos
          FROM Races_SprintResults
          WHERE SeasonID = :season
          UNION ALL
          SELECT DriverID, RaceFormula, FinishingPos
          FROM Races_FeatureRaceResults
          WHERE SeasonID = :season
        `,
        {
          ":season": season,
        }
      ),
      "DriverID"
    );

    recalculateStandingsTable({
      database,
      season,
      table: "Races_DriverStandings",
      idColumn: "DriverID",
      pointsMap: driverPoints,
      countbackMap: driverCountback,
      latestRoundPointsMap: driverLatestRoundPoints,
    });
  }

  if (tableSet.has("Races_TeamStandings")) {
    const teamPointRows = database.getAllRows(
        `
          SELECT TeamID, RaceFormula, RaceID, SUM(Points) AS Points
          FROM (
            SELECT TeamID, 1 AS RaceFormula, RaceID, Points
            FROM Races_Results
            WHERE Season = :season
            UNION ALL
            SELECT TeamID, RaceFormula, RaceID, ChampionshipPoints AS Points
            FROM Races_SprintResults
            WHERE SeasonID = :season
            UNION ALL
            SELECT TeamID, RaceFormula, RaceID, ChampionshipPoints AS Points
            FROM Races_QualifyingResults
            WHERE SeasonID = :season
            UNION ALL
            SELECT TeamID, RaceFormula, RaceID, ChampionshipPoints AS Points
            FROM Races_FeatureRaceResults
            WHERE SeasonID = :season
          )
          GROUP BY TeamID, RaceFormula, RaceID
        `,
        {
          ":season": season,
        }
    );
    const teamPoints = buildAggregateMap(teamPointRows, "TeamID");
    const teamLatestRoundPoints = buildLatestRoundPointsMap(teamPointRows, "TeamID");
    const teamCountback = buildCountbackMap(
      database.getAllRows(
        `
          SELECT TeamID, 1 AS RaceFormula, FinishingPos
          FROM Races_Results
          WHERE Season = :season
          UNION ALL
          SELECT TeamID, RaceFormula, FinishingPos
          FROM Races_SprintResults
          WHERE SeasonID = :season
          UNION ALL
          SELECT TeamID, RaceFormula, FinishingPos
          FROM Races_FeatureRaceResults
          WHERE SeasonID = :season
        `,
        {
          ":season": season,
        }
      ),
      "TeamID"
    );

    recalculateStandingsTable({
      database,
      season,
      table: "Races_TeamStandings",
      idColumn: "TeamID",
      pointsMap: teamPoints,
      countbackMap: teamCountback,
      latestRoundPointsMap: teamLatestRoundPoints,
    });
  }

  if (tableSet.has("Races_PitCrewStandings")) {
    const pitStopRows = database.getAllRows(
      `
        SELECT TeamID, 1 AS RaceFormula, RaceID, SUM(Points) AS Points
        FROM Races_PitStopResults
        WHERE SeasonID = :season
        GROUP BY TeamID, RaceID
      `,
      {
        ":season": season,
      }
    );
    const pointsByTeam = buildAggregateMap(pitStopRows, "TeamID");
    const latestPitCrewPoints = buildLatestRoundPointsMap(pitStopRows, "TeamID");

    const standingsRows = database.getAllRows(
      `
        SELECT TeamID, RaceFormula
        FROM Races_PitCrewStandings
        WHERE SeasonID = :season
      `,
      {
        ":season": season,
      }
    );

    const formulaGroups = new Map();
    for (const row of standingsRows) {
      const entries = formulaGroups.get(row.RaceFormula) || [];
      entries.push(row);
      formulaGroups.set(row.RaceFormula, entries);
    }

    for (const [formula, entries] of formulaGroups.entries()) {
      const sortedEntries = [...entries].sort((left, right) => {
        const leftPoints = formula === 1 ? (pointsByTeam.get(`${left.TeamID}:${formula}`) || 0) : 0;
        const rightPoints = formula === 1 ? (pointsByTeam.get(`${right.TeamID}:${formula}`) || 0) : 0;
        if (rightPoints !== leftPoints) {
          return rightPoints - leftPoints;
        }
        return left.TeamID - right.TeamID;
      });

      const hasAnyPoints =
        formula === 1 &&
        sortedEntries.some((entry) => (pointsByTeam.get(`${entry.TeamID}:${formula}`) || 0) > 0);

      sortedEntries.forEach((entry, index) => {
        const points = formula === 1 ? (pointsByTeam.get(`${entry.TeamID}:${formula}`) || 0) : 0;
        database.exec(
          `
            UPDATE Races_PitCrewStandings
            SET Points = :points,
                Position = :position,
                LastPointsChange = :lastPointsChange,
                LastPositionChange = 0
            WHERE SeasonID = :season
              AND TeamID = :teamId
              AND RaceFormula = :formula
          `,
          {
            ":season": season,
            ":teamId": entry.TeamID,
            ":formula": formula,
            ":points": points,
            ":position": hasAnyPoints ? index + 1 : 0,
            ":lastPointsChange": latestPitCrewPoints.get(`${entry.TeamID}:${formula}`) || 0,
          }
        );
      });
    }
  }
};
