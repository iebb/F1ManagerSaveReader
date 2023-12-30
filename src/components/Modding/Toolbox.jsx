import {Button, Divider, Typography} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext} from "react";
import {dateToDay, teamNames} from "@/js/localization";
import {repack} from "@/js/Parser";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";

export default function Toolbox() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const myTeam = basicInfo.player.TeamID;
  let columns, values;
  const { enqueueSnackbar } = useSnackbar();

  const tools = [ {
    category: "Misc",
    commands: [{
      name: "Wayback Machine",
      command: () => {


        try {
          database.exec(`CREATE TABLE IF NOT EXISTS Modding (Key TEXT PRIMARY KEY, Value TEXT)`);
          database.exec(`INSERT INTO Modding VALUES ("TimeTravel", "1")`);
        } catch {
          enqueueSnackbar("You have time travelled before!");
          return;
        }


        const wayBackSeasonPlusOne = 2020;


        const wayBackSeason = wayBackSeasonPlusOne - 1;
        const vanillaSeason = 2023;
        const dayNumber = dateToDay(new Date(`${wayBackSeason}-12-27`));
        const seasonStartDayNumber = dateToDay(new Date(`${wayBackSeason}-01-01`));
        const vanillaDayNumber = dateToDay(new Date(`${vanillaSeason}-01-01`));
        const dd = vanillaDayNumber - seasonStartDayNumber;
        const yd = vanillaSeason - wayBackSeason;



        const metaProperty = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0];
        metaProperty.Properties[0].Properties.forEach(x => {
          if (x.Name === 'Day') {
            x.Property = dayNumber;
          }
        });

        database.exec(`UPDATE Player_State SET Day = ${dayNumber}`);
        database.exec(`UPDATE Player SET FirstGameDay = ${dayNumber}`);
        database.exec(`UPDATE Player_State SET CurrentSeason = ${wayBackSeason}`);

        database.exec(`UPDATE Player_Record SET StartSeason = ${wayBackSeason}`);
        database.exec(`UPDATE Player_History SET StartDay = ${seasonStartDayNumber}`);

        database.exec(`UPDATE Calendar_LastActivityDates SET 
LastScoutDate = ${seasonStartDayNumber}, LastEngineerDate = ${seasonStartDayNumber}, 
LastDesignProjectDate = ${seasonStartDayNumber}, LastResearchProjectDate = ${seasonStartDayNumber}`);


        database.exec(`UPDATE Parts_Designs SET DayCreated = DayCreated - ${dd} WHERE DayCreated > 0`);
        database.exec(`UPDATE Parts_Designs SET DayCompleted = DayCompleted - ${dd} WHERE DayCompleted > 0`);
        database.exec(`UPDATE Parts_Designs SET ValidFrom = ValidFrom - ${yd}`);

        database.exec(`DELETE FROM Sponsorship_GuaranteesAndIncentives`); // delete all



        database.exec(`DELETE FROM Races WHERE SeasonID != ${vanillaSeason}`);
        database.exec(`DELETE FROM Seasons WHERE SeasonID != ${vanillaSeason}`);

        database.exec(`UPDATE Races SET SeasonID = ${wayBackSeason}, Day = Day - ${dd}, State = 2 WHERE SeasonID = ${vanillaSeason}`);
        database.exec(
          `UPDATE Seasons_Deadlines SET SeasonID = SeasonID - ${yd}, Day = Day - ${dd}`
        );

        database.exec(
          `UPDATE Staff_PitCrew_DevelopmentPlan SET Day = Day - ${dd} WHERE Day > 40000`
        );


        database.exec(
          `UPDATE Onboarding_Tutorial_RestrictedActions SET TutorialIsActiveSetting = 0`
        );


        const moddingPairs = [
          {
            table: ["Staff_Contracts"],
            modDay: ["StartDay"],
            modSeason: ["EndSeason"],
          },
          {
            table: ["Staff_CareerHistory"],
            modDay: ["StartDay", "EndDay"],
            modSeason: [],
          },
          {
            table: ["Mail_EventPool_Cooldown"],
            modDay: ["NextTriggerDay"],
            modSeason: [],
          },
          {
            table: ["Board_Confidence"],
            modDay: [],
            modSeason: ["Season"],
          },
          {
            table: ["Board_Objectives"],
            modDay: [],
            modSeason: ["StartYear", "TargetEndYear"],
          },
          {
            table: ["Board_Prestige", "Board_SeasonObjectives"],
            modDay: [],
            modSeason: ["SeasonID"],
          },
          {
            table: ["Seasons"],
            modDay: [],
            modSeason: ["SeasonID"],
          },
          {
            table: ["Parts_TeamHistory"],
            modDay: [],
            modSeason: ["SeasonID"],
          },
          {
            table: ["Races_Strategies"],
            modDay: [],
            modSeason: ["SeasonID"],
          },
          {
            table: ["Staff_Driver_RaceRecordPerSeason"],
            modDay: [],
            modSeason: ["SeasonID"],
          },
          {
            table: ["Mail_Inbox", "Sponsorship_ObligationCalendar"],
            modDay: ["Day"],
            modSeason: [],
          },
          {
            table: ["Races_DriverStandings", "Races_TeamStandings", "Races_PitCrewStandings"],
            modDay: [],
            modSeason: ["SeasonID"],
          }
        ]




        let [{ values }] = database.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC");
        for(const [ table ] of values) {
          if (
            // table.startsWith("Board_Confidence") ||
            table.startsWith("Teams_RaceRecord") ||
            (table.startsWith("Races") && table.endsWith("Results")) ||
            0
          ) {
            database.exec(`DELETE FROM ${table}`);
          }
        }

        for(const pair of moddingPairs) {
          for(const table of pair.table) {
            for(const md of pair.modDay) {
              database.exec(`UPDATE ${table} SET ${md} = ${md} - ${dd}`);
            }
            for(const ms of pair.modSeason) {
              database.exec(`UPDATE ${table} SET ${ms} = ${ms} - ${yd}`);
            }
          }
        }


        database.exec(
          `UPDATE Staff_Contracts SET EndSeason = EndSeason + 1`
        ); // one more year


        basicInfoUpdater({ metadata });

      }
    }]
  }
  /*,  {
    category: "Facilities",
    commands: [{
      name: "Refurbish My Facilities",
      command: () => {
        enqueueSnackbar(
          `All ${teamNames(myTeam, metadata.version)} facilities are 50% newer now.`,
          { variant: "success" }
        );
        database.exec(`UPDATE Buildings_HQ SET DegradationValue = (1 + DegradationValue) / 2 WHERE TeamID = ${myTeam}`)
      }
    }, {
      name: "Refurbish All Facilities",
      command: () => {
        enqueueSnackbar(
          'Everyone\'s facilities are now brand new.',
          { variant: "success" }
        );
        database.exec("UPDATE Buildings_HQ SET DegradationValue = 1")
      }
    }]
  }, {
    category: "Parts",
    commands: [{
      name: "Refund Unused Old Parts",
      command: () => {
        let r = database.exec(`SELECT Parts_Designs.TeamID, SUM(FLOOR(BuildCost * Condition)) FROM "Parts_Items" 
LEFT JOIN Parts_CarLoadout ON Parts_CarLoadout.ItemID = Parts_Items.ItemID 
LEFT JOIN Parts_Designs ON Parts_Designs.DesignID = Parts_Items.DesignID 
LEFT JOIN (SELECT TeamID, PartType, Max(DesignNumber) - 2 AS OldThreshold FROM "Parts_Designs" GROUP BY TeamID, PartType) as tt 
ON tt.TeamID = Parts_Designs.TeamID AND tt.PartType = Parts_Designs.PartType
WHERE Parts_Designs.DesignNumber < tt.OldThreshold AND LoadoutID IS NULL AND Condition = 1
GROUP BY Parts_Designs.TeamID`)
        if (r.length) {
          [{ columns, values }] = r;
          for(const [teamID, refundCost] of values) {
            enqueueSnackbar(
              `Refunding $${refundCost} for ${teamNames(teamID, metadata.version)}`,
              { variant: "success" }
            );
            database.exec(`INSERT INTO Finance_Transactions VALUES (:teamID, :day, :value, 9, -1, 1)`, {
              ":teamID": teamID,
              ":value": refundCost,
              ":day": basicInfo.player.Day,
            })
            database.exec(`UPDATE Finance_TeamBalance SET Balance = Balance + :value WHERE TeamID = :teamID`, {
              ":teamID": teamID,
              ":value": refundCost,
            })
          }

          database.exec(`DELETE FROM "Parts_Items" WHERE ItemID IN (SELECT Parts_Items.ItemID FROM "Parts_Items"
LEFT JOIN Parts_CarLoadout ON Parts_CarLoadout.ItemID = Parts_Items.ItemID 
LEFT JOIN Parts_Designs ON Parts_Designs.DesignID = Parts_Items.DesignID
LEFT JOIN (SELECT TeamID, PartType, Max(DesignNumber) - 2 AS OldThreshold FROM "Parts_Designs" GROUP BY TeamID, PartType) as tt
ON tt.TeamID = Parts_Designs.TeamID AND tt.PartType = Parts_Designs.PartType
WHERE Parts_Designs.DesignNumber < tt.OldThreshold AND LoadoutID IS NULL )`)
        } else {
          enqueueSnackbar(
            `No unused legacy car parts found (3+ designs earlier)`,
            { variant: "warning" }
          );
        }


      }
    }, {
      name: "Refund All Unused Parts",
      command: () => {
        let r = database.exec(`SELECT Parts_Designs.TeamID, SUM(FLOOR(BuildCost * Condition)) FROM "Parts_Items" 
LEFT JOIN Parts_CarLoadout ON Parts_CarLoadout.ItemID = Parts_Items.ItemID 
LEFT JOIN Parts_Designs ON Parts_Designs.DesignID = Parts_Items.DesignID 
LEFT JOIN (SELECT TeamID, PartType, Max(DesignNumber) - 1 AS OldThreshold FROM "Parts_Designs" GROUP BY TeamID, PartType) as tt 
ON tt.TeamID = Parts_Designs.TeamID AND tt.PartType = Parts_Designs.PartType
WHERE Parts_Designs.DesignNumber < tt.OldThreshold AND LoadoutID IS NULL 
GROUP BY Parts_Designs.TeamID`)
        if (r.length) {
          [{ columns, values }] = r;
          for(const [teamID, refundCost] of values) {
            enqueueSnackbar(
              `Refunding $${refundCost} for ${teamNames(teamID, metadata.version)}`,
              { variant: "success" }
            );
            database.exec(`INSERT INTO Finance_Transactions VALUES (:teamID, :day, :value, 9, -1, 1)`, {
              ":teamID": teamID,
              ":value": refundCost,
              ":day": basicInfo.player.Day,
            })
            database.exec(`UPDATE Finance_TeamBalance SET Balance = Balance + :value WHERE TeamID = :teamID`, {
              ":teamID": teamID,
              ":value": refundCost,
            })
          }

          database.exec(`DELETE FROM "Parts_Items" WHERE ItemID IN (SELECT Parts_Items.ItemID FROM "Parts_Items"
LEFT JOIN Parts_CarLoadout ON Parts_CarLoadout.ItemID = Parts_Items.ItemID 
LEFT JOIN Parts_Designs ON Parts_Designs.DesignID = Parts_Items.DesignID
LEFT JOIN (SELECT TeamID, PartType, Max(DesignNumber) - 1 AS OldThreshold FROM "Parts_Designs" GROUP BY TeamID, PartType) as tt
ON tt.TeamID = Parts_Designs.TeamID AND tt.PartType = Parts_Designs.PartType
WHERE Parts_Designs.DesignNumber < tt.OldThreshold AND LoadoutID IS NULL )`)
        } else {
          enqueueSnackbar(
            `No unused legacy car parts found (3+ designs earlier)`,
            { variant: "warning" }
          );
        }


      }
    }]
  }*/]


  return (
    <div>
      <Typography variant="h5" component="h5">
        Cheatbox
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      {
        tools.map(c => (
          <div key={c.category}>
            <Typography variant="h6" component="h6">
              {c.category}
            </Typography>
            {
              c.commands.map(t => (
                <Button key={t.name} color={t.color || "primary"} variant="outlined" sx={{ m: 1 }} onClick={t.command}>
                  {t.name}
                </Button>
              ))
            }
            <Divider variant="fullWidth" sx={{ my: 2 }} />
          </div>
        ))
      }
    </div>
  );
}