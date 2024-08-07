import {teamNames} from "@/js/localization";
import {Alert, AlertTitle, Button, Divider, Grid, Typography} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";

export default function TeamSwitch() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const {version, gameVersion} = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();

  const teams = basicInfo.teamIds.map(x => ({
    ...basicInfo.teamMap[x],
  }));


  return (
    <div>
      <Typography variant="h5" component="h5">
        Mid-season Team Switching
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Alert severity="warning" sx={{ my: 2 }}>
        <AlertTitle>Warning</AlertTitle>
        This feature might be unstable. Use with caution.
      </Alert>
      <Divider variant="fullWidth" sx={{ my: 2 }} />

      <Grid item>
        <div>
          {
            teams.map(team => (
              <Button
                key={team.TeamID}
                sx={{ mx: 1 }}
                variant="contained"
                color={`team${team.TeamID}`}
                disabled={team.TeamID === basicInfo.player.TeamID}
                onClick={() => {
                  database.exec(`UPDATE Player SET TeamID = ${team.TeamID}`);
                  if (version >= 3) {
                    database.exec(`UPDATE Staff_NarrativeData SET TeamID = ${team.TeamID} WHERE GenSource = 0`);
                    database.exec(`UPDATE Player_History SET EndDay = ${basicInfo.player.Day - 1} WHERE EndDay IS NULL`);
                    database.exec(`DELETE FROM Player_History WHERE EndDay < StartDay`);
                    database.exec(`INSERT INTO Player_History VALUES (${team.TeamID}, ${basicInfo.player.Day}, NULL)`);
                  }
                  const metaProperty = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0];
                  metaProperty.Properties[0].Properties.forEach(x => {
                    if (x.Name === 'TeamID') {
                      x.Property = team.TeamID;
                    }
                    if (x.Name === 'Team') {
                      x.Property = team.TeamNameLocKey;
                    }
                  });
                  basicInfoUpdater({ metadata });
                  enqueueSnackbar(
                    `Team switched!`,
                    { variant: "success" }
                  );

                }}
              >
                {teamNames(team.TeamID, version)}
              </Button>))
          }
        </div>
      </Grid>
    </div>
  );
}