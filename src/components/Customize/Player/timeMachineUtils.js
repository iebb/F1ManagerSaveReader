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
    aggregateMap.set(
      `${row[idColumn]}:${row.RaceFormula}`,
      Number(row.Points || 0)
    );
  }

  return aggregateMap;
};

const recalculateStandingsTable = ({
  database,
  season,
  table,
  idColumn,
  pointsMap,
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
             LastPointsChange = 0,
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
    const driverPoints = buildAggregateMap(
      database.getAllRows(
        `
          SELECT DriverID, RaceFormula, SUM(Points) AS Points
          FROM (
            SELECT DriverID, 1 AS RaceFormula, Points
            FROM Races_Results
            WHERE Season = :season
            UNION ALL
            SELECT DriverID, RaceFormula, ChampionshipPoints AS Points
            FROM Races_SprintResults
            WHERE SeasonID = :season
            UNION ALL
            SELECT DriverID, RaceFormula, ChampionshipPoints AS Points
            FROM Races_QualifyingResults
            WHERE SeasonID = :season
            UNION ALL
            SELECT DriverID, RaceFormula, ChampionshipPoints AS Points
            FROM Races_FeatureRaceResults
            WHERE SeasonID = :season
          )
          GROUP BY DriverID, RaceFormula
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
    });
  }

  if (tableSet.has("Races_TeamStandings")) {
    const teamPoints = buildAggregateMap(
      database.getAllRows(
        `
          SELECT TeamID, RaceFormula, SUM(Points) AS Points
          FROM (
            SELECT TeamID, 1 AS RaceFormula, Points
            FROM Races_Results
            WHERE Season = :season
            UNION ALL
            SELECT TeamID, RaceFormula, ChampionshipPoints AS Points
            FROM Races_SprintResults
            WHERE SeasonID = :season
            UNION ALL
            SELECT TeamID, RaceFormula, ChampionshipPoints AS Points
            FROM Races_QualifyingResults
            WHERE SeasonID = :season
            UNION ALL
            SELECT TeamID, RaceFormula, ChampionshipPoints AS Points
            FROM Races_FeatureRaceResults
            WHERE SeasonID = :season
          )
          GROUP BY TeamID, RaceFormula
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
    });
  }

  if (tableSet.has("Races_PitCrewStandings")) {
    const pointsByTeam = new Map(
      database
        .getAllRows(
          `
            SELECT TeamID, SUM(Points) AS Points
            FROM Races_PitStopResults
            WHERE SeasonID = :season
            GROUP BY TeamID
          `,
          {
            ":season": season,
          }
        )
        .map((row) => [row.TeamID, Number(row.Points || 0)])
    );

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
        const leftPoints = formula === 1 ? (pointsByTeam.get(left.TeamID) || 0) : 0;
        const rightPoints = formula === 1 ? (pointsByTeam.get(right.TeamID) || 0) : 0;
        if (rightPoints !== leftPoints) {
          return rightPoints - leftPoints;
        }
        return left.TeamID - right.TeamID;
      });

      const hasAnyPoints =
        formula === 1 &&
        sortedEntries.some((entry) => (pointsByTeam.get(entry.TeamID) || 0) > 0);

      sortedEntries.forEach((entry, index) => {
        const points = formula === 1 ? (pointsByTeam.get(entry.TeamID) || 0) : 0;
        database.exec(
          `
            UPDATE Races_PitCrewStandings
            SET Points = :points,
                Position = :position,
                LastPointsChange = 0,
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
          }
        );
      });
    }
  }
};
