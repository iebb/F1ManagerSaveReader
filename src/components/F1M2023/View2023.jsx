import Modding from "../Common/Modding";
import CarSetup from "./CarSetup";
import {circuitNames, dayToDate, formatDate, raceAbbrevs, raceFlags, weekendStagesAbbrev} from "@/js/localization";
import {Divider, Step, StepLabel, Stepper, Typography} from "@mui/material";
import {useEffect, useState} from "react";
import Image from "next/image";
import RaceResults from "../Common/RaceResults";
import {VTabs} from "../Tabs";
import CostCap from "../Common/CostCap";

export default function DataView2023({ db, metadata }) {
  const [basicInfo, setBasicInfo] = useState({});


  useEffect(() => {
    const basicInfo = {
      currentSeasonRaces: [],
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

      [{ columns, values }] = db.exec("SELECT * FROM 'Staff_DriverData' " +
        "LEFT JOIN 'Staff_BasicData' ON Staff_DriverData.StaffID = Staff_BasicData.StaffID " +
        "LEFT JOIN 'Staff_DriverNumbers' ON Staff_DriverData.StaffID = Staff_DriverNumbers.CurrentHolder");
      for(const r of values) {
        basicInfo.driverMap[r[0]] = {};
        r.map((x, _idx) => {
          basicInfo.driverMap[r[0]][columns[_idx]] = x;
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


      [{ columns, values }] = db.exec(
        "select * from Races JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID order by Day ASC"
      );
      for(const r of values) {
        basicInfo.races[r[0]] = {};
        r.map((x, _idx) => {
          basicInfo.races[r[0]][columns[_idx]] = x;
        })
        if (basicInfo.races[r[0]].SeasonID === basicInfo.player.CurrentSeason) {
          basicInfo.currentSeasonRaces.push(basicInfo.races[r[0]])
        }
      }

      try {
        [{ columns, values }] = db.exec("select * from Save_Weekend");
        for(const r of values) {
          r.map((x, _idx) => {
            basicInfo.weekend[columns[_idx]] = x;
          })
        }
      } catch {
        basicInfo.weekend = {
          RaceID: -1
        };
      }

      setBasicInfo(basicInfo);
    } catch {

    }
  }, [db])

  if (!basicInfo.player) {
    return (
      <div>
        <Typography variant="h5" component="h5" sx={{ m: 2 }}>
          File might be corrupted or not an F1 Manager 2023 savefile.
        </Typography>
      </div>
    );
  }

  const { player, teamMap, weekend, races, currentSeasonRaces } = basicInfo;

  const team = teamMap[player.TeamID];

  const currentRaceIdx = currentSeasonRaces.map(x => x.RaceID).indexOf(weekend.RaceID);

  return (
    <div>
      <Typography variant="p" component="p" style={{ color: "#ccc", margin: 12, marginBottom: 24 }}>
        Playing as {player.FirstName} {player.LastName} for {team.TeamName} in 2023 Game.
        <br />
        It's {formatDate(dayToDate(player.Day))} in-game{player.LastRaceTrackID ? ` and last raced at ${circuitNames[player.LastRaceTrackID]}` : ""}.
      </Typography>
      <div style={{ overflowX: "auto" }}>
        <Stepper
          activeStep={currentRaceIdx}
          alternativeLabel
          key={player.Day}
        >
          {currentSeasonRaces.map((race) => (
            <Step key={race.RaceID}>
              <StepLabel
                StepIconComponent={() => <Image
                  src={require(`../../assets/flags/${raceFlags[race.TrackID]}.svg`)}
                  key={race.TrackID}
                  width={24} height={18}
                  alt={race.Name}
                  style={{ opacity: race.Day >= player.Day ? 1 : 0.3 }}
                />}
              >
                {raceAbbrevs[race.TrackID]}
                <br />
                {
                  race.RaceID === weekend.RaceID ? weekendStagesAbbrev[weekend.WeekendStage] :
                    race.Day < player.Day ? "✅" : `${(race.Day - player.Day)}d`
                }
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>
      <Divider variant="fullWidth" sx={{ mt: 3, mb: 3 }} />
      <VTabs options={(document.location.host !== "save.f1setup.it") ? [
        {name: "Car Setup Viewer", tab: <CarSetup database={db} basicInfo={basicInfo} version={3}/>},
        {name: "Race Results", tab: <RaceResults database={db} basicInfo={basicInfo} version={3}/>},
        {name: "Cost Cap", tab: <CostCap database={db} basicInfo={basicInfo} version={3}/>},
        {name: "Modding", tab: <Modding database={db} basicInfo={basicInfo} metadata={metadata} version={3}/>},
      ] : [
        {name: "Car Setup Viewer", tab: <CarSetup database={db} basicInfo={basicInfo} version={3}/>},
        {name: "Race Results", tab: <RaceResults database={db} basicInfo={basicInfo} version={3}/>},
        {name: "Cost Cap", tab: <CostCap database={db} basicInfo={basicInfo} version={3}/>},
      ]} />
    </div>
  )
}
