
export const getDrivers = (ctx) => {
  const {database, version} = ctx;

  const PerformanceStats = {};

  let [{ columns, values }] = database.exec(
    "SELECT * FROM Staff_PerformanceStats"
  );
  for(const row of values) {
    if (!PerformanceStats[row[0]]) {
      PerformanceStats[row[0]] = {};
    }
    PerformanceStats[row[0]][row[1]] = row[2];
  }

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

  return values.map(val => {
    let row = {};
    val.map((x, _idx) => {
      if (x !== null) row[columns[_idx]] = x;
    })
    row.PernamentNumber = row.CurrentNumber === 1 ? row.LastKnownDriverNumber : row.CurrentNumber;
    row.performanceStats = PerformanceStats[row.StaffID];
    return row;
  })
}

export const assignRandomRaceNumber = (ctx, driver1) => {
  const { database } = ctx;
  const drivers = getDrivers(ctx);

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
  database.exec(`UPDATE Staff_DriverNumbers SET CurrentHolder = NULL WHERE CurrentHolder = ${driver1}`);
  database.exec(`INSERT OR REPLACE INTO Staff_DriverNumbers VALUES(${number}, ${driver1})`);
}


export const swapDriverContracts = (ctx, driver1, driver2) => {
  const { database, basicInfo } = ctx;
  const season = basicInfo.player.CurrentSeason;
  let results;

  /* contracts */
  database.exec(`UPDATE Staff_Contracts SET StaffID = ${driver1}, ContractType = 1, Accepted = 10 WHERE StaffID = ${driver2} AND ContractType = 0`);
  database.exec(`UPDATE Staff_Contracts SET StaffID = ${driver2}, ContractType = 1, Accepted = 10 WHERE StaffID = ${driver1} AND ContractType = 0`);

  database.exec(`UPDATE Staff_Contracts SET StaffID = ${driver1}, ContractType = 1, Accepted = 30 WHERE StaffID = ${driver2} AND ContractType = 3`);
  database.exec(`UPDATE Staff_Contracts SET StaffID = ${driver2}, ContractType = 1, Accepted = 30 WHERE StaffID = ${driver1} AND ContractType = 3`);

  database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 0 WHERE ContractType = 1 AND Accepted = 10`);
  database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 3 WHERE ContractType = 1 AND Accepted = 30`);


  let [{values: [[AssignedCarNumberA]]}] = database.exec(`SELECT AssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${driver1}`);
  let [{values: [[AssignedCarNumberB]]}] = database.exec(`SELECT AssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${driver2}`);

  /* car numbers */
  database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = :acn WHERE StaffID = ${driver2}`, {":acn": AssignedCarNumberA});
  database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = :acn WHERE StaffID = ${driver1}`, {":acn": AssignedCarNumberB});

  const driverPairs = [[driver1, driver2], [driver2, driver1]]

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
}
export const fireDriverContract = (ctx, driver1) => {
  const { database, basicInfo } = ctx;
  let results;

  /* contracts */
  database.exec(`DELETE FROM Staff_Contracts WHERE StaffID = ${driver1}`);
  database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = NULL WHERE StaffID = ${driver1}`);
  results = database.exec(`SELECT RaceEngineerID FROM Staff_RaceEngineerDriverAssignments WHERE IsCurrentAssignment = 1 AND DriverID = ${driver1}`);
  if (results.length) {
    let [{values: [[engineerA]]}] = results;
    database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 0 WHERE RaceEngineerID = ${engineerA} AND DriverID = ${driver1}`);
  }
}