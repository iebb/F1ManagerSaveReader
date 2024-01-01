export const parseBasicInfo = ({db, metadata}) => {
  let columns, values;
  const { version } = metadata;
  const basicInfo = {
    currentSeasonRaces: [],
    races: {},
    teamMap: {},
    driverMap: {},
    player: {},
    weekend: {},
    misc: {},
  };


  if (version === 2) {


    /* 2022 game */

    [{ columns, values }] = db.exec("WITH CurrStaffContracts AS (SELECT * FROM Staff_Contracts WHERE ContractType = (SELECT Value FROM Staff_Enum_ContractType WHERE Name = \"Current\")), " +
      "TeamContracts AS (SELECT * FROM CurrStaffContracts WHERE CurrStaffContracts.TeamID = Teams.TeamID), " +
      "TeamMembers AS (SELECT * FROM Staff_CommonData JOIN TeamContracts ON Staff_CommonData.StaffID = TeamContracts.StaffID), " +
      "TeamDrivers AS (SELECT * FROM TeamMembers WHERE StaffType = 0), TeamRaceEngineers AS (SELECT * FROM TeamMembers WHERE StaffType = 2) " +
      "SELECT TeamID, TeamName, TeamNameLocKey, Formula, (SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 1) AS Driver1ID, (SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 2) AS Driver2ID, " +
      "(SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 3) AS ReserveDriverID, (SELECT StaffID FROM TeamMembers WHERE StaffType = 1) AS ChiefDesignerID, " +
      "(SELECT StaffID FROM TeamRaceEngineers WHERE PosInTeam = 1) AS RaceEngineer1ID, (SELECT StaffID FROM TeamRaceEngineers WHERE PosInTeam = 2) AS RaceEngineer2ID, " +
      "(SELECT StaffID FROM TeamMembers WHERE StaffType = 3) AS HeadOfAerodynamicsID FROM Teams " +
      "WHERE ( @OptTeamID IS NULL OR TeamID = @OptTeamID ) AND ( @OptInclNonF1 = 1 OR Formula = 1 ) ORDER BY PredictedRanking");
    for (const r of values) {
      basicInfo.teamMap[r[0]] = {};
      r.map((x, _idx) => {
        basicInfo.teamMap[r[0]][columns[_idx]] = x;
      })
    }

    [{columns, values}] = db.exec("" +
      "SELECT * FROM 'Staff_DriverData' " +
      "LEFT JOIN 'Staff_CommonData' ON Staff_DriverData.StaffID = Staff_CommonData.StaffID " +
      "LEFT JOIN 'Staff_DriverNumbers' ON Staff_DriverData.StaffID = Staff_DriverNumbers.CurrentHolder");
    for (const r of values) {
      let d = {};
      r.map((x, _idx) => d[columns[_idx]] = x)
      d.PernamentNumber = d.Number === 1 ? d.LastKnownDriverNumber : d.Number
      if (d.LastName === "[StaffName_Surname_Bianchi]") {
        basicInfo.misc.Formula1Number17Retired = 1; // currently not in use
      }
      if (d.LastName === "[StaffName_Forename_Male_Hubert]" || d.LastName === "[StaffName_Surname_Hubert]") {
        basicInfo.misc.Formula2Number19Retired = 1;
      }
      basicInfo.driverMap[r[0]] = d;
    }
    basicInfo.player.StartSeason = 2022; // TODO: a mod for pre-2022 seasons
  }

  /* 2023 game */

  if (version === 3) {
    [{ columns, values }] = db.exec("WITH CurrStaffContracts AS (SELECT * FROM Staff_Contracts WHERE ContractType = (SELECT Value FROM Staff_Enum_ContractType WHERE Name = \"Current\"))," +
      " TeamContracts AS (SELECT * FROM CurrStaffContracts WHERE CurrStaffContracts.TeamID = Teams.TeamID)," +
      " TeamMembers AS (SELECT * FROM Staff_GameData JOIN TeamContracts ON Staff_GameData.StaffID = TeamContracts.StaffID)," +
      " TeamDrivers AS (SELECT * FROM TeamMembers WHERE StaffType = 0), TeamRaceEngineers AS (SELECT * FROM TeamMembers WHERE StaffType = 2), " +
      "NarrativeTeamMembers AS (SELECT * FROM Staff_NarrativeData WHERE Staff_NarrativeData.TeamID = Teams.TeamID), " +
      "TeamPrincipal AS (SELECT * FROM NarrativeTeamMembers WHERE GenSource = (SELECT Value FROM Staff_Enum_NarrativeGenSource WHERE Name = \"TeamPrincipal\")) " +
      "SELECT TeamID, TeamName, TeamNameLocKey, Formula, (SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 1) AS Driver1ID, " +
      "(SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 2) AS Driver2ID, " +
      "(SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 3) AS ReserveDriverID, " +
      "(SELECT StaffID FROM TeamMembers WHERE StaffType = 1) AS ChiefDesignerID, " +
      "(SELECT StaffID FROM TeamRaceEngineers WHERE PosInTeam = 1) AS RaceEngineer1ID, " +
      "(SELECT StaffID FROM TeamRaceEngineers WHERE PosInTeam = 2) AS RaceEngineer2ID, " +
      "(SELECT StaffID FROM TeamMembers WHERE StaffType = 3) AS HeadOfAerodynamicsID, " +
      "(SELECT StaffID FROM TeamMembers WHERE StaffType = 4) AS SportingDirectorID, (SELECT StaffID FROM TeamPrincipal) AS TeamPrincipalID " +
      "FROM Teams WHERE ( @OptTeamID IS NULL OR TeamID = @OptTeamID ) AND ( @OptInclNonF1 = 1 OR Formula = 1 ) ORDER BY PredictedRanking");
    for(const r of values) {
      basicInfo.teamMap[r[0]] = {};
      r.map((x, _idx) => {
        basicInfo.teamMap[r[0]][columns[_idx]] = x;
      })
    }

    [{ columns, values }] = db.exec("SELECT * FROM 'Staff_DriverData' " +
      "LEFT JOIN 'Staff_BasicData' ON Staff_DriverData.StaffID = Staff_BasicData.StaffID " +
      "LEFT JOIN 'Staff_DriverNumbers' ON Staff_DriverData.StaffID = Staff_DriverNumbers.CurrentHolder");
    for(const r of values) {
      let d = {};
      r.map((x, _idx) => d[columns[_idx]] = x)
      d.PernamentNumber = d.Number === 1 ? d.LastKnownDriverNumber : d.Number
      if (d.LastName === "[StaffName_Surname_Bianchi]") {
        basicInfo.misc.Formula1Number17Retired = 1; // currently not in use
      }
      if (d.LastName === "[StaffName_Forename_Male_Hubert]" || d.LastName === "[StaffName_Surname_Hubert]") {
        basicInfo.misc.Formula2Number19Retired = 1;
      }
      basicInfo.driverMap[r[0]] = d;
    }

    [{ columns, values }] = db.exec("select * from Player_Record");
    for(const r of values) {
      r.map((x, _idx) => {
        basicInfo.player[columns[_idx]] = x;
      })
    }

  }

  basicInfo.weekend = {
    RaceID: -1
  };

  for (const r of db.getAllRows("select * from Save_Weekend")) {
    basicInfo.weekend = r;
  }
  for (const r of db.getAllRows("select * from Player_State")) {
    basicInfo.player = {...basicInfo.player, ...r};
  }
  for (const r of db.getAllRows("select * from Player")) {
    basicInfo.player = {...basicInfo.player, ...r};
  }

  for (const r of db.getAllRows(
    "select * from Races JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID order by Day ASC"
  )) {
    basicInfo.races[r.RaceID] = r;
    if (r.SeasonID === basicInfo.player.CurrentSeason) {
      basicInfo.currentSeasonRaces.push(r)
    }
  }

  return basicInfo;
}
