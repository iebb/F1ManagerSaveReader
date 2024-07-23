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
    } else if (version >= 4) {
      // [{ columns, values }] = database.exec(
      //   "SELECT Staff_BasicData.StaffID as StaffID, * from Staff_NarrativeData \n" +
      //   `LEFT JOIN Staff_BasicData on Staff_NarrativeData.StaffID = Staff_BasicData.StaffID WHERE Staff_NarrativeData.IsActive = 1\n`
      // );
      [{ columns, values }] = database.exec(
        "SELECT Staff_BasicData.StaffID as StaffID, Countries.EnumName as Nationality, * from Staff_NarrativeData \n" +
        `LEFT JOIN Staff_BasicData on Staff_NarrativeData.StaffID = Staff_BasicData.StaffID\n` +
          `LEFT JOIN Countries on Countries.CountryID = Staff_BasicData.CountryID\n`
      );
      // TODO: 1.3.0 Does not have IsActive
    }
  } else if (StaffType === 0) {
    if (version === 2) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_DriverData.StaffID as StaffID, *, Staff_DriverNumbers.Number as CurrentNumber from Staff_DriverData \n" +
        "LEFT JOIN Staff_CommonData on Staff_CommonData.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_DriverData.StaffID AND Staff_Contracts.ContractType = 0\n" +
        "LEFT JOIN (SELECT Staff_CareerHistory.StaffID, Staff_CareerHistory.TeamID as PreviousTeamID, EndDay as PreviousContractED, StartDay as PreviousContractSD FROM Staff_CareerHistory\n" +
        "INNER JOIN (SELECT StaffID, MAX(EndDay) MED, MAX(StartDay) MSD FROM Staff_CareerHistory GROUP BY StaffID) b " +
        "ON Staff_CareerHistory.StaffID = b.StaffID AND Staff_CareerHistory.EndDay = b.MED AND Staff_CareerHistory.StartDay = b.MSD) as PreviousContract on PreviousContract.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_DriverNumbers on Staff_DriverNumbers.CurrentHolder = Staff_DriverData.StaffID\n"
      );
    } else if (version === 3) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_DriverData.StaffID as StaffID, *, Staff_DriverNumbers.Number as CurrentNumber from Staff_DriverData \n" +
        "LEFT JOIN Staff_BasicData on Staff_BasicData.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_GameData on Staff_GameData.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_DriverData.StaffID AND Staff_Contracts.ContractType = 0\n" +
        "LEFT JOIN (SELECT Staff_CareerHistory.StaffID, Staff_CareerHistory.TeamID as PreviousTeamID, EndDay as PreviousContractED, StartDay as PreviousContractSD FROM Staff_CareerHistory\n" +
        "INNER JOIN (SELECT StaffID, MAX(EndDay) MED, MAX(StartDay) MSD FROM Staff_CareerHistory GROUP BY StaffID) b " +
        "ON Staff_CareerHistory.StaffID = b.StaffID AND Staff_CareerHistory.EndDay = b.MED AND Staff_CareerHistory.StartDay = b.MSD) as PreviousContract on PreviousContract.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_DriverNumbers on Staff_DriverNumbers.CurrentHolder = Staff_DriverData.StaffID\n"
      );
    } else if (version >= 4) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_DriverData.StaffID as StaffID, *, Staff_DriverNumbers.Number as CurrentNumber, Countries.EnumName as Nationality from Staff_DriverData \n" +
        "LEFT JOIN Staff_BasicData on Staff_BasicData.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_GameData on Staff_GameData.StaffID = Staff_DriverData.StaffID\n" +
        `LEFT JOIN Countries on Countries.CountryID = Staff_BasicData.CountryID\n` +
        "LEFT JOIN (SELECT Staff_CareerHistory.StaffID, Staff_CareerHistory.TeamID as PreviousTeamID, EndDay as PreviousContractED, StartDay as PreviousContractSD FROM Staff_CareerHistory\n" +
        "INNER JOIN (SELECT StaffID, MAX(EndDay) MED, MAX(StartDay) MSD FROM Staff_CareerHistory GROUP BY StaffID) b " +
        "ON Staff_CareerHistory.StaffID = b.StaffID AND Staff_CareerHistory.EndDay = b.MED AND Staff_CareerHistory.StartDay = b.MSD) as PreviousContract on PreviousContract.StaffID = Staff_DriverData.StaffID\n" +
        "LEFT JOIN Staff_DriverNumbers on Staff_DriverNumbers.CurrentHolder = Staff_DriverData.StaffID AND Staff_DriverNumbers.Number != 1\n"
         // "LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_DriverData.StaffID AND Staff_Contracts.ContractType = 0\n" +
      );
    }
  } else {
    if (version === 2) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_CommonData.StaffID as StaffID, * FROM Staff_CommonData \n" +
        "LEFT JOIN (SELECT Staff_CareerHistory.StaffID, Staff_CareerHistory.TeamID as PreviousTeamID, EndDay as PreviousContractED, StartDay as PreviousContractSD FROM Staff_CareerHistory\n" +
        "INNER JOIN (SELECT StaffID, MAX(EndDay) MED, MAX(StartDay) MSD FROM Staff_CareerHistory GROUP BY StaffID) b " +
        "ON Staff_CareerHistory.StaffID = b.StaffID AND Staff_CareerHistory.EndDay = b.MED AND Staff_CareerHistory.StartDay = b.MSD) as PreviousContract on PreviousContract.StaffID = Staff_CommonData.StaffID\n" +
        `LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_CommonData.StaffID AND Staff_Contracts.ContractType = 0 WHERE Staff_CommonData.StaffType = ${StaffType}`
      );
    } else if (version === 3) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_BasicData.StaffID as StaffID, * from Staff_BasicData \n" +
        "LEFT JOIN Staff_GameData on Staff_GameData.StaffID = Staff_BasicData.StaffID\n" +
        "LEFT JOIN (SELECT Staff_CareerHistory.StaffID, Staff_CareerHistory.TeamID as PreviousTeamID, EndDay as PreviousContractED, StartDay as PreviousContractSD FROM Staff_CareerHistory\n" +
        "INNER JOIN (SELECT StaffID, MAX(EndDay) MED, MAX(StartDay) MSD FROM Staff_CareerHistory GROUP BY StaffID) b " +
        "ON Staff_CareerHistory.StaffID = b.StaffID AND Staff_CareerHistory.EndDay = b.MED AND Staff_CareerHistory.StartDay = b.MSD) as PreviousContract on PreviousContract.StaffID = Staff_BasicData.StaffID\n" +
        `LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_BasicData.StaffID AND Staff_Contracts.ContractType = 0 WHERE Staff_GameData.StaffType = ${StaffType}`
      );
    } else if (version >= 4) {
      [{ columns, values }] = database.exec(
        "SELECT Staff_BasicData.StaffID as StaffID, *, Countries.EnumName as Nationality from Staff_BasicData \n" +
        "LEFT JOIN Staff_GameData on Staff_GameData.StaffID = Staff_BasicData.StaffID\n" +
        `LEFT JOIN Countries on Countries.CountryID = Staff_BasicData.CountryID\n` +
        "LEFT JOIN (SELECT Staff_CareerHistory.StaffID, Staff_CareerHistory.TeamID as PreviousTeamID, EndDay as PreviousContractED, StartDay as PreviousContractSD FROM Staff_CareerHistory\n" +
        "INNER JOIN (SELECT StaffID, MAX(EndDay) MED, MAX(StartDay) MSD FROM Staff_CareerHistory GROUP BY StaffID) b " +
        "ON Staff_CareerHistory.StaffID = b.StaffID AND Staff_CareerHistory.EndDay = b.MED AND Staff_CareerHistory.StartDay = b.MSD) as PreviousContract on PreviousContract.StaffID = Staff_BasicData.StaffID\n" +
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
      ova += (PerformanceStats?.[row.StaffID]?.[stat] || 0) * (factors[stat] || 1);
      factor += (factors[stat] || 1);
      row["performance_stats_" + stat] = (PerformanceStats?.[row.StaffID]?.[stat] || 0);
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