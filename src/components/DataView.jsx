import CarSetup from "@/components/CarSetup";
import {analyzeFileToDatabase} from "@/js/fileAnalyzer";
import {weekendStages, circuitNames, countryNames} from "@/js/simple_unloc";
import {Divider, Typography} from "@mui/material";
import {useEffect, useState} from "react";

export default function DataView({file}) {

  const [database, setDatabase] = useState(null);
  const [error, setError] = useState(null);
  const [basicInfo, setBasicInfo] = useState({});

  useEffect(() => {
    analyzeFileToDatabase(file).then(db => {

      const basicInfo = {
        races: {},
        teamMap: {},
        driverMap: {},
        player: {},
        weekend: {},
      }

      let columns, values;

      try {
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

        [{ columns, values }] = db.exec("select * from Staff_DriverData");
        for(const r of values) {
          basicInfo.driverMap[r[0]] = {};
          r.map((x, _idx) => {
            basicInfo.driverMap[r[0]][columns[_idx]] = x;
          })
        }
        [{ columns, values }] = db.exec("select * from Races JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID");
        for(const r of values) {
          basicInfo.races[r[0]] = {};
          r.map((x, _idx) => {
            basicInfo.races[r[0]][columns[_idx]] = x;
          })
        }

        [{ columns, values }] = db.exec("select * from Player");
        for(const r of values) {
          r.map((x, _idx) => {
            basicInfo.player[columns[_idx]] = x;
          })
        }
        [{ columns, values }] = db.exec("select * from Player_Record");
        for(const r of values) {
          r.map((x, _idx) => {
            basicInfo.player[columns[_idx]] = x;
          })
        }
        [{ columns, values }] = db.exec("select * from Player_State");
        for(const r of values) {
          r.map((x, _idx) => {
            basicInfo.player[columns[_idx]] = x;
          })
        }
        try {
          [{ columns, values }] = db.exec("select * from Save_Weekend");
          for(const r of values) {
            r.map((x, _idx) => {
              basicInfo.weekend[columns[_idx]] = x;
            })
          }
        } catch {
          basicInfo.weekend = null;
        }

        setBasicInfo(basicInfo);
        setDatabase(db);
      } catch {

      }



    });
  }, [file])

  if (!database || !basicInfo) {
    if (file) {
      return (
        <div>
          <Typography variant="h5" component="h5" sx={{ m: 2 }}>
            File might be corrupted or not an F1 Manager 2023 savefile.
          </Typography>
        </div>
      );
    }

    return (
      <div>
        <Typography variant="h5" component="h5" sx={{ m: 2 }}>
          Please drag a file first. All processing is done client-side so your savefile won't be uploaded.
        </Typography>
      </div>
    );
  }


  const { player, teamMap, weekend, races } = basicInfo;
  const team = teamMap[player.TeamID];

  return (
    <div>
      <Typography variant="p" component="p" style={{ color: "#ccc" }}>
        Playing as {player.FirstName} {player.LastName} for {team.TeamName} since {player.StartSeason}.
        <br />
        It's {
          new Date(player.Day*86400000 - 2208988800000).toLocaleDateString()
        } in-game and last raced at {
          circuitNames[player.LastRaceTrackID]
        }, {
          countryNames[player.LastRaceTrackID]
        }.
        <br />
        {
          weekend && (
            <>
              <span style={{ color: "yellow", fontSize: 20 }}>
                It's in a race weekend right now. <br />
                Current Race: {
                  circuitNames[races[weekend.RaceID].TrackID]
                }, Current Stage: {weekendStages[weekend.WeekendStage]}
              </span>
              <br/>
            </>
          )
        }
      </Typography>
      <Divider variant="fullWidth" sx={{ mt: 3, mb: 3 }} />
      <CarSetup
        database={database}
        basicInfo={basicInfo}
      />
    </div>
  )
}
