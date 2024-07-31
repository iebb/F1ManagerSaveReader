import {TestStringCompatibility} from "@/components/Customize/Player/font_glyphs";
import {CyrillicGlyphs, LatinGlyphs} from "@/components/Customize/Player/glyphs/consts";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {resolveLiteral} from "@/js/localization";
import {Alert, AlertTitle, Button, Divider, Grid, TextField, Typography} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useState} from "react";

const isPrintableASCII = string => /^[\x20-\x7F]*$/.test(string);

export default function TeamRename() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();
  const [firstName, setFirstName] = useState(resolveLiteral(basicInfo.teamMap[basicInfo.player.TeamID].TeamNameLocKey));

  if (basicInfo.player.TeamID < 32) {
    return null;
  }

  const compatibility = TestStringCompatibility(firstName);

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

  const grid = (
    <div style={{display: "grid", gridTemplateColumns: "100px 1fr", gap: 4, marginTop: 8}}>
      <b>Latin</b>
      <div>{compatibility.LatDisplay}</div>
      <b>Russian</b>
      <div>{compatibility.RusDisplay}</div>
      <b>Chinese</b>
      <div>{compatibility.ChnDisplay}</div>
      <b>Japanese</b>
      <div>{compatibility.JpnDisplay}</div>
    </div>
  )

  return (
    <div>
      <Typography variant="h5" component="h5">
        Rename Team
      </Typography>
      <Divider variant="fullWidth" sx={{my: 2}} />
      <div className="my-2">
      {
        compatibility.All ? (
          <Alert severity="success" sx={{my: 2}}>
            <AlertTitle>Info</AlertTitle>
            This name can be displayed correctly in all supported languages.
            {grid}
          </Alert>
        ) : compatibility.None ? (
          <Alert severity="error" sx={{my: 2}}>
            <AlertTitle>Warning</AlertTitle>
            This name cannot be displayed correctly in any languages. (Consider replacing font?)
            {grid}
          </Alert>
        ) : (
          <Alert severity="info" sx={{my: 2}}>
            <AlertTitle>Warning</AlertTitle>
            This name can only be displayed correctly in these languages: {supportedLanguages.join(", ")}
            {grid}
          </Alert>
        )
      }
      </div>
      <div className="my-2">
        <Grid container spacing={2} alignItems="center">
          <Grid item >
            <TextField
              label="Team Name"
              className="w-[400px]"
              value={firstName}
              variant="standard"
              onChange={(event) => {
                setFirstName(event.target.value);
              }}
            />
          </Grid>
          <Grid item>
            <Button
              sx={{ mx: 1 }}
              variant="contained"
              color="warning"
              disabled={`[STRING_LITERAL:Value=|${firstName}|]` === basicInfo.player.Team}
              onClick={() => {
                database.exec(`UPDATE Teams SET TeamNameLocKey = :firstName WHERE TeamID = :tid`, {
                  ":firstName": `[STRING_LITERAL:Value=|${firstName}|]`,
                  ":tid": basicInfo.player.TeamID,
                });

                const metaProperty = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0];
                metaProperty.Properties[0].Properties.forEach(x => {
                  if (x.Name === 'Team') {
                    x.Property = `[STRING_LITERAL:Value=|${firstName}|]`;
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
        <Divider variant="fullWidth" sx={{my: 2}} />
        <Alert severity="info" sx={{my: 2}} className="break-all">
          <AlertTitle>Available Latin Characters</AlertTitle>
          {Object.keys(LatinGlyphs).map(x => String.fromCharCode(x))}
        </Alert>
        <Alert severity="info" sx={{my: 2}} className="break-all">
          <AlertTitle>Available Cyrillic and Greek Characters (for Russian language)</AlertTitle>
          {Object.keys(CyrillicGlyphs).map(x => String.fromCharCode(x))}
        </Alert>
      </div>
    </div>
  );
}