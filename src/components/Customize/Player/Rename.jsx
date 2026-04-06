import CompatibilityPreview from "@/components/Customize/CompatibilityPreview";
import {TestStringCompatibility} from "@/components/Customize/Player/font_glyphs";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {Alert, AlertTitle, Button, Divider, Grid, TextField, Typography} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useState} from "react";

export default function Rename() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const {version, gameVersion} = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();
  const [firstName, setFirstName] = useState(basicInfo.player.FirstName);
  const [lastName, setLastName] = useState(basicInfo.player.LastName);


  const compatibility = TestStringCompatibility(firstName, lastName);

  const supportedLanguages = [];

  if (compatibility.Chn) {
    supportedLanguages.push("Chinese (Simplified)");
  }
  if (compatibility.Jpn) {
    supportedLanguages.push("Japanese");
  }
  if (compatibility.Lat) {
    supportedLanguages.push("Dutch, English, French, German, Italian, Polish, Portuguese, Spanish, Turkish");
  }
  if (compatibility.Rus) {
    supportedLanguages.push("Russian");
  }

  return (
    <div>
      <Typography variant="h5" component="h5">
        Rename Player
      </Typography>
      <Divider variant="fullWidth" sx={{my: 2}}/>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm="auto">
          <TextField
            label="First Name"
            value={firstName}
            variant="standard"
            onChange={(event) => {
              setFirstName(event.target.value);
            }}
          />
        </Grid>
        <Grid item xs={12} sm="auto">
          <TextField
            label="Last Name"
            value={lastName}
            variant="standard"
            onChange={(event) => {
              setLastName(event.target.value);
            }}
          />
        </Grid>
        <Grid item xs={12} sm="auto">
          <Button
            sx={{mx: 1}}
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

      <div className="mt-4">
        {compatibility.All ? (
          <Alert severity="success" sx={{my: 2}}>
            <AlertTitle>Info</AlertTitle>
            This name can be displayed correctly in all supported languages.
            <CompatibilityPreview compatibility={compatibility} />
          </Alert>
        ) : compatibility.None ? (
          <Alert severity="error" sx={{my: 2}}>
            <AlertTitle>Warning</AlertTitle>
            This name cannot be displayed correctly in any languages. (Consider replacing font?)
            <CompatibilityPreview compatibility={compatibility} />
          </Alert>
        ) : (
          <Alert severity="info" sx={{my: 2}}>
            <AlertTitle>Warning</AlertTitle>
            This name can only be displayed correctly in these languages: {supportedLanguages.join(", ")}
            <CompatibilityPreview compatibility={compatibility} />
          </Alert>
        )}
      </div>
    </div>
  );
}
