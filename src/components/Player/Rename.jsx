import {teamNames} from "@/js/localization";
import {Alert, AlertTitle, Button, Divider, Grid, Input, TextField, Typography} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useState} from "react";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";

export default function Rename() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const {version, gameVersion} = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();
  const [firstName, setFirstName] = useState(basicInfo.player.FirstName);
  const [lastName, setLastName] = useState(basicInfo.player.LastName);


  return (
    <div>
      <Typography variant="h5" component="h5">
        Rename Player
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Alert severity="warning" sx={{ my: 2 }}>
        <AlertTitle>Warning</AlertTitle>
        This feature might be unstable. Use with caution.
      </Alert>
      <Divider variant="fullWidth" sx={{ my: 2 }} />

      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <TextField
            label="First Name"
            value={firstName}
            variant="standard"
            onChange={(event) => {
              setFirstName(event.target.value);
            }}
          />
        </Grid>
        <Grid item>
          <TextField
            label="Last Name"
            value={lastName}
            variant="standard"
            onChange={(event) => {
              setLastName(event.target.value);
            }}
          />
        </Grid>
        <Grid item>
          <Button
            sx={{ mx: 1 }}
            variant="contained"
            color="warning"
            disabled={firstName === basicInfo.player.FirstName && lastName === basicInfo.player.LastName}
            onClick={() => {
              database.exec(`UPDATE Player SET FirstName = :firstName, LastName = :lastName`, {
                ":firstName": firstName,
                ":lastName": lastName,
              });
              const metaProperty = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0];
              metaProperty.Properties[0].Properties.forEach(x => {
                if (x.Name === 'FirstName') {
                  x.Property = firstName;
                }
                if (x.Name === 'LastName') {
                  x.Property = lastName;
                }
              });
              basicInfoUpdater({ metadata });
              enqueueSnackbar(
                `Name changed!`,
                { variant: "success" }
              );

            }}
          >Save</Button>
        </Grid>
      </Grid>
    </div>
  );
}