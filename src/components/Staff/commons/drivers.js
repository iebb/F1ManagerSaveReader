const factors = [
  0, 0, 20, 15, 15, 10, 5, 5, 5, 10, 15,
]
export const getStaff = (ctx, StaffType = 0) => {
  const {basicInfo, database, version} = ctx;

  const StaffStats = [];
  let columns, values;
  let result = database.exec(`SELECT PerformanceStatType FROM Staff_StaffTypePerformanceStatsTemplate WHERE StaffType = ${StaffType}`);
  if (result.length) {
    [{ columns, values }] = result;
    for(const row of values) {
      StaffStats.push(row[0]);
    }
  }

  const PerformanceStats = {};
  result = database.exec(`SELECT * FROM Staff_PerformanceStats WHERE StatID IN (${StaffStats.join(",")})`);
  if (result.length) {
    [{columns, values}] = result;
    for (const row of values) {
      if (!PerformanceStats[row[0]]) PerformanceStats[row[0]] = {};
      PerformanceStats[row[0]][row[1]] = row[2];
    }
  }

  if (StaffType === 5) {
    if (version === 3) {
      // [{ columns, values }] = database.exec(
      //   "SELECT Staff_BasicData.StaffID as StaffID, * from Staff_NarrativeData \n" +
      //   `LEFT JOIN Staff_BasicData on Staff_NarrativeData.StaffID = Staff_BasicData.StaffID WHERE Staff_NarrativeData.IsActive = 1\n`
      // );
      [{ columns, values }] = database.exec(
        "SELECT Staff_BasicData.StaffID as StaffID, * from Staff_NarrativeData \n" +
        `LEFT JOIN Staff_BasicData on Staff_NarrativeData.StaffID = Staff_BasicData.StaffID\n`
      );
      // TODO: 1.3.0 Does not have IsActive
    }
  } else if (StaffType === 0) {
    if (version === 2) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_DriverData.StaffID as StaffID, *, Staff_DriverNumbers.Number as CurrentNumber from Staff_DriverData \n" +
        "LEFT JOIN Staff_CommonData on Staff_CommonData.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_DriverData.StaffID AND Staff_Contracts.ContractType = 0\n" +
        "LEFT JOIN Staff_DriverNumbers on Staff_DriverNumbers.CurrentHolder = Staff_DriverData.StaffID\n"
      );
    } else if (version === 3) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_DriverData.StaffID as StaffID, *, Staff_DriverNumbers.Number as CurrentNumber from Staff_DriverData \n" +
        "LEFT JOIN Staff_BasicData on Staff_BasicData.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_GameData on Staff_GameData.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_DriverData.StaffID AND Staff_Contracts.ContractType = 0\n" +
        "LEFT JOIN Staff_DriverNumbers on Staff_DriverNumbers.CurrentHolder = Staff_DriverData.StaffID\n"
      );
    }
  } else {
    if (version === 2) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_CommonData.StaffID as StaffID, * FROM Staff_CommonData \n" +
        `LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_CommonData.StaffID AND Staff_Contracts.ContractType = 0 WHERE Staff_CommonData.StaffType = ${StaffType}`
      );
    } else if (version === 3) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_BasicData.StaffID as StaffID, * from Staff_BasicData \n" +
        "LEFT JOIN Staff_GameData on Staff_GameData.StaffID = Staff_BasicData.StaffID\n" +
        `LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_BasicData.StaffID AND Staff_Contracts.ContractType = 0 WHERE Staff_GameData.StaffType = ${StaffType}`
      );
    }
  }
  let results = values.map(val => {
    let row = {};
    val.map((x, _idx) => {if (x !== null) row[columns[_idx]] = x;})
    if (StaffType === 0) {
      row.PernamentNumber = row.CurrentNumber === 1 ? row.LastKnownDriverNumber : row.CurrentNumber;
    }
    if (basicInfo) {
      row.Age = (basicInfo.player.Day - row.DOB) / 365.2422;
    }
    let ova = 0;
    let factor = 0;
    for(const stat of StaffStats) {
      ova += PerformanceStats[row.StaffID][stat] * (factors[stat] || 1);
      factor += (factors[stat] || 1);
      row["performance_stats_" + stat] = PerformanceStats[row.StaffID][stat];
    }
    row.Overall = ova / factor;
    return row;
  });
  return [StaffStats, results]
}

export const assignRandomRaceNumber = (ctx, staff1) => {
  const { database } = ctx;
  const [_, drivers] = getStaff(ctx);

  const unusedNumbers = drivers.filter(x => x.CurrentNumber).map(x => x.CurrentNumber);
  let number = 0;
  for(number = 2; number < 40; number++) {
    if (number === 17) continue; // for Jules
    if (unusedNumbers.indexOf(number) !== -1) continue;
    break;
  }

  const unavailableNumbers = drivers.filter(x => x.CurrentNumber && x.TeamID < 10).map(x => x.CurrentNumber);
  if (number === 40) {
    for(number = 2; number < 100; number++) {
      if (number === 17) continue; // for Jules
      if (unavailableNumbers.indexOf(number) !== -1) continue;
      break;
    }
  }
  database.exec(`UPDATE Staff_DriverNumbers SET CurrentHolder = NULL WHERE CurrentHolder = ${staff1}`);
  database.exec(`INSERT OR REPLACE INTO Staff_DriverNumbers VALUES(${number}, ${staff1})`);
}


export const swapDriverContracts = (ctx, staff1, staff2, staffType = 0) => {
  const { database, basicInfo } = ctx;
  const season = basicInfo.player.CurrentSeason;
  let results;

  /* contracts */
  database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1}, ContractType = 1, Accepted = 10 WHERE StaffID = ${staff2} AND ContractType = 0`);
  database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2}, ContractType = 1, Accepted = 10 WHERE StaffID = ${staff1} AND ContractType = 0`);

  database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1}, ContractType = 1, Accepted = 30 WHERE StaffID = ${staff2} AND ContractType = 3`);
  database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2}, ContractType = 1, Accepted = 30 WHERE StaffID = ${staff1} AND ContractType = 3`);

  database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 0 WHERE ContractType = 1 AND Accepted = 10`);
  database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 3 WHERE ContractType = 1 AND Accepted = 30`);

  if (staffType === 0) {
    console.log("swapping drivers")
    let [{values: [[AssignedCarNumberA]]}] = database.exec(`SELECT AssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${staff1}`);
    let [{values: [[AssignedCarNumberB]]}] = database.exec(`SELECT AssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${staff2}`);

    /* car numbers */
    database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = :acn WHERE StaffID = ${staff2}`, {":acn": AssignedCarNumberA});
    database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = :acn WHERE StaffID = ${staff1}`, {":acn": AssignedCarNumberB});

    const driverPairs = [[staff1, staff2], [staff2, staff1]]
    for(const [A, B] of driverPairs) {

      /* race engineers */
      results = database.exec(`SELECT RaceEngineerID FROM Staff_RaceEngineerDriverAssignments WHERE IsCurrentAssignment = 1 AND DriverID = ${A}`);
      if (results.length) {
        let [{values: [[engineerA]]}] = results;
        database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 0 WHERE RaceEngineerID = ${engineerA} AND DriverID = ${A}`);

        /* check if paired before */
        results = database.exec(`SELECT DaysTogether FROM Staff_RaceEngineerDriverAssignments WHERE RaceEngineerID = ${engineerA} AND DriverID = ${B}`);
        if (results.length) {
          database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 3 WHERE RaceEngineerID = ${engineerA} AND DriverID = ${B}`);
        } else {
          database.exec(`INSERT INTO Staff_RaceEngineerDriverAssignments VALUES (${engineerA}, ${B}, 0, 50, 3)`);
        }
      }

      /* standings */

      results = database.exec(`SELECT RaceFormula FROM Races_DriverStandings WHERE DriverID = ${A} AND SeasonID = ${season}`);
      if (results.length) {
        for(let {values: [[RaceFormula]]} of results) {
          results = database.exec(`SELECT RaceFormula FROM Races_DriverStandings WHERE DriverID = ${B} AND SeasonID = ${season} AND RaceFormula = ${RaceFormula}`);
          if (!results.length) { // to be added
            let [{values: [[Position]]}] = database.exec(`SELECT MAX(Position) + 1 FROM Races_DriverStandings WHERE SeasonID = ${season} AND RaceFormula = ${RaceFormula}`);
            database.exec(`INSERT INTO Races_DriverStandings VALUES (${season}, ${B}, 0, ${Position}, 0, 0, ${RaceFormula})`);
          }
        }
      }
    }

    database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 1 WHERE IsCurrentAssignment = 3`);
  } else if (staffType === 2) { // race engineer
    const raceEngineerPairs = [[staff1, staff2], [staff2, staff1]]
    for(const [A, B] of raceEngineerPairs) {
      /* race engineers */
      results = database.exec(`SELECT DriverID FROM Staff_RaceEngineerDriverAssignments WHERE IsCurrentAssignment = 1 AND RaceEngineerID = ${A}`);
      if (results.length) {
        let [{values: [[engineerA]]}] = results;
        database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 0 WHERE DriverID = ${engineerA} AND RaceEngineerID = ${A}`);
        /* check if paired before */
        results = database.exec(`SELECT DaysTogether FROM Staff_RaceEngineerDriverAssignments WHERE DriverID = ${engineerA} AND RaceEngineerID = ${B}`);
        if (results.length) {
          database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 3 WHERE DriverID = ${engineerA} AND RaceEngineerID = ${B}`);
        } else {
          database.exec(`INSERT INTO Staff_RaceEngineerDriverAssignments VALUES (${B}, ${engineerA}, 0, 50, 3)`);
        }
      }
    }
    database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 1 WHERE IsCurrentAssignment = 3`);
  }
}
export const fireDriverContract = (ctx, staff1) => {
  const { database, basicInfo } = ctx;
  let results;

  /* contracts */
  database.exec(`DELETE FROM Staff_Contracts WHERE StaffID = ${staff1}`);
  database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = NULL WHERE StaffID = ${staff1}`);
  results = database.exec(`SELECT RaceEngineerID FROM Staff_RaceEngineerDriverAssignments WHERE IsCurrentAssignment = 1 AND DriverID = ${staff1}`);
  if (results.length) {
    let [{values: [[engineerA]]}] = results;
    database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 0 WHERE RaceEngineerID = ${engineerA} AND DriverID = ${staff1}`);
  }
}