import {Button, FormControl, Divider, MenuItem, Select, TextField, Typography} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {teamNames} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "../Contexts";

export default function Toolbox() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const myTeam = basicInfo.player.TeamID;
  let columns, values;
  const { enqueueSnackbar } = useSnackbar();


  const tools = [{
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
  }]


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