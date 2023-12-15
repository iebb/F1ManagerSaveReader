import {Typography} from "@mui/material";
import {useContext, useEffect, useState} from "react";
import CostCap from "../Common/CostCap";
import Modding from "../Common/Modding";
import RaceResults from "../Common/RaceResults";
import {Header} from "../Common/subcomponents/Header";
import {BasicInfoContext, DatabaseContext, MetadataContext, MiscContext} from "../Contexts";
import {VTabs} from "../Tabs";
import CarSetup from "./CarSetup";

export default function DataView2022() {
  const [basicInfo, setBasicInfo] = useState({});
  const [misc, setMisc] = useState({});
  const db = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);

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
      [{ columns, values }] = db.exec("WITH CurrStaffContracts AS (SELECT * FROM Staff_Contracts WHERE ContractType = (SELECT Value FROM Staff_Enum_ContractType WHERE Name = \"Current\")), " +
        "TeamContracts AS (SELECT * FROM CurrStaffContracts WHERE CurrStaffContracts.TeamID = Teams.TeamID), " +
        "TeamMembers AS (SELECT * FROM Staff_CommonData JOIN TeamContracts ON Staff_CommonData.StaffID = TeamContracts.StaffID), " +
        "TeamDrivers AS (SELECT * FROM TeamMembers WHERE StaffType = 0), TeamRaceEngineers AS (SELECT * FROM TeamMembers WHERE StaffType = 2) " +
        "SELECT TeamID, TeamName, TeamNameLocKey, Formula, (SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 1) AS Driver1ID, (SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 2) AS Driver2ID, " +
        "(SELECT StaffID FROM TeamDrivers WHERE PosInTeam = 3) AS ReserveDriverID, (SELECT StaffID FROM TeamMembers WHERE StaffType = 1) AS ChiefDesignerID, " +
        "(SELECT StaffID FROM TeamRaceEngineers WHERE PosInTeam = 1) AS RaceEngineer1ID, (SELECT StaffID FROM TeamRaceEngineers WHERE PosInTeam = 2) AS RaceEngineer2ID, " +
        "(SELECT StaffID FROM TeamMembers WHERE StaffType = 3) AS HeadOfAerodynamicsID FROM Teams " +
        "WHERE ( @OptTeamID IS NULL OR TeamID = @OptTeamID ) AND ( @OptInclNonF1 = 1 OR Formula = 1 ) ORDER BY PredictedRanking");
      for(const r of values) {
        basicInfo.teamMap[r[0]] = {};
        r.map((x, _idx) => {
          basicInfo.teamMap[r[0]][columns[_idx]] = x;
        })
      }

      [{ columns, values }] = db.exec("" +
        "SELECT * FROM 'Staff_DriverData' " +
        "LEFT JOIN 'Staff_CommonData' ON Staff_DriverData.StaffID = Staff_CommonData.StaffID " +
        "LEFT JOIN 'Staff_DriverNumbers' ON Staff_DriverData.StaffID = Staff_DriverNumbers.CurrentHolder");
      for(const r of values) {
        let d = {};
        r.map((x, _idx) => d[columns[_idx]] = x)
        d.PernamentNumber = d.Number === 1 ? d.LastKnownDriverNumber : d.Number
        if (d.LastName === "[StaffName_Surname_Bianchi]") {
          setMisc({...misc, has_bianchi: 1});
        }
        if (d.LastName === "[StaffName_Forename_Male_Hubert]" || d.LastName === "[StaffName_Surname_Hubert]") {
          setMisc({...misc, has_hubert: 1});
        }
        basicInfo.driverMap[r[0]] = d;
      }

      [{ columns, values }] = db.exec("select * from Player");
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

      basicInfo.player.StartSeason = 2022;

      setBasicInfo(basicInfo);
    } catch (e) {
      console.error(e);
    }
  }, [db])

  if (!basicInfo.player) {
    return (
      <div>
        <Typography variant="h5" component="h5" sx={{ m: 2 }}>
          File might be corrupted or not an F1 Manager 2022 savefile.
        </Typography>
      </div>
    );
  }




  return (
    <div>
      <MiscContext.Provider value={misc}>
        <BasicInfoContext.Provider value={basicInfo}>
          <Header />
          <VTabs options={[
            {name: "Setup", tab: <CarSetup />},
            {name: "Results", tab: <RaceResults />},
            {name: "Cost Cap", tab: <CostCap />},
            {name: "Modding", tab: <Modding />},
          ]} />
        </BasicInfoContext.Provider>
      </MiscContext.Provider>
    </div>
  )
}
