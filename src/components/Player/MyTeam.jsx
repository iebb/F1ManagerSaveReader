import {teamNames} from "@/js/localization";
import {Tuple} from "@/js/UESaveTool";
import {Alert, AlertTitle, Button, Container, Divider, Grid, Typography} from "@mui/material";
import Image from "next/image";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import Dropzone from "react-dropzone";

export default function MyTeam() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const {version, gameVersion, careerSaveMetadata} = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();


  return (
    <div>
      <Typography variant="h5" component="h5">
        My Team
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Alert severity="warning" sx={{ my: 2 }}>
        <AlertTitle>Warning</AlertTitle>
        This feature might be unstable. Use with caution.
      </Alert>
      <Typography variant="h5" component="h5">
        Logo and Livery Preview
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      {
        basicInfo.player.TeamID >= 32 ? (
          <div style={{display: "flex", flexDirection: "row", gap: 20}}>

            <Dropzone
              onDropAccepted={files => {
                const file = files[0];
                if (file !== undefined) {
                  let reader = new FileReader();
                  reader.onload = async (e) => {
                    const img = btoa(reader.result);
                    if (img.substring(0, 3) !== "iVB") {
                      enqueueSnackbar("Only PNG would work",
                        {variant: "error"});
                      return;
                    }

                    const mp = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0].Properties[0];
                    for(const p of mp.Properties) {
                      if (p.Name === "CustomTeamLogoBase64") {
                        p.Property = img;
                      }
                    }
                    database.exec(`UPDATE Player SET CustomTeamLogoBase64 = :CustomTeamLogoBase64`, {
                      ":CustomTeamLogoBase64": img,
                    });
                    basicInfoUpdater({metadata});
                  }
                  reader.readAsBinaryString(file);
                }
              }}
              accept={{
                "image/*": [".png"],
              }}
              multiple={false}
            >
              {({getRootProps, getInputProps}) => (
                <div {...getRootProps()} className="dropzone-images" style={{width: 200, height: 200}}>
                  <img src={`data:image/png;base64,${metadata.careerSaveMetadata.CustomTeamLogoBase64}`}
                       alt={"custom team logo"}
                       style={{maxWidth: "100%", maxHeight: 200}}/>
                </div>
              )}
            </Dropzone>
            <Dropzone
              onDropAccepted={files => {
                const file = files[0];
                if (file !== undefined) {
                  let reader = new FileReader();
                  reader.onload = async (e) => {
                    const img = btoa(reader.result);
                    if (img.substring(0, 3) !== "iVB") {
                      enqueueSnackbar("Only PNG would work",
                        {variant: "error"});
                      return;
                    }
                    database.exec(`UPDATE Player SET CustomTeamCarLiveryBase64 = :CustomTeamCarLiveryBase64`, {
                      ":CustomTeamCarLiveryBase64": img,
                    });
                    basicInfoUpdater({metadata});
                  }
                  reader.readAsBinaryString(file);
                }
              }}
              accept={{
                "image/*": [".png"],
              }}
              multiple={false}
            >
              {({getRootProps, getInputProps}) => (
                <div {...getRootProps()} className="dropzone-images" style={{height: 200, flex: 1, textAlign: 'center'}}>
                  <img src={`data:image/png;base64,${basicInfo.player.CustomTeamCarLiveryBase64}`}
                       alt={"custom team logo"}
                       style={{maxWidth: "100%", maxHeight: 200}}/>
                </div>
              )}
            </Dropzone>
          </div>
        ) : (
          <Alert severity="warning" sx={{ my: 2 }}>
            <AlertTitle>Warning</AlertTitle>
            Logo / Livery Editing is only available for Custom Team saves.
          </Alert>
        )
      }

    </div>
  );
}