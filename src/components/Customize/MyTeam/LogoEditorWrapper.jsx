import LogoEditor from "@/components/Customize/MyTeam/LogoEditor";
import {gameToJson, jsonToGame} from "@/components/Customize/MyTeam/LogoEditor/logo/utils";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {Alert, AlertTitle} from "@mui/material";
import {enqueueSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useState} from "react";

export default function LogoEditorWrapper() {
  const database = useContext(DatabaseContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);


  const [defaultData, setDefaultData] = useState(null);


  useEffect(() => {
    const elements = database.getAllRows("SELECT * FROM Teams_Custom_LogoElements ORDER BY ElementID ASC");
    setDefaultData(gameToJson(elements));
  }, [])

  if (basicInfo.player.TeamID < 32) {
    return (
      <Alert severity="warning" sx={{my: 2}}>
        <AlertTitle>Error</AlertTitle>
        This feature is only available for Custom Team saves.
      </Alert>
    )
  }

  if (!defaultData) {
    return null;
  }

  return (
    <div className="h-[700px] w-full bp5-dark">
      <p className="mb-4">Happy with your results? Share your creation on <a href="https://discord.gg/tBA8r5XH4J">Discord</a> here!</p>
      <LogoEditor
        defaultData={defaultData}
        onSave={async (store) => {
          const game = jsonToGame(store.toJSON());
          database.exec("DELETE FROM Teams_Custom_LogoElements");
          for (const row of game) {
            database.exec(`INSERT INTO Teams_Custom_LogoElements VALUES(${
              row.ElementID
            }, ${row.PartHash}, ${row.Colour}, ${row.PositionX}, ${row.PositionY}, ${row.Rotation}, ${row.ScaleX}, ${row.ScaleY})`);
          }
          const img = (await store.toDataURL()).replace("data:image/png;base64,", "");
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

          enqueueSnackbar(
            `Team Logo Saved!`,
            { variant: "success" }
          );
        }}
      />
    </div>
  );
}
