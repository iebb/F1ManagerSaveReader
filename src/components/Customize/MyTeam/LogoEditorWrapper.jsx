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
    <div className="grid gap-3">
      <section className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Logo</div>
            <h2 className="mt-2 text-lg font-bold text-white">Custom Team Logo Editor</h2>
            <p className="mt-2 max-w-[900px] text-sm text-slate-400">
              Build and import vector layers, then save directly back into your custom-team branding data.
            </p>
          </div>
          <div className="border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-400">
            512x512 workspace
          </div>
        </div>
      </section>

      <div className="bp5-dark h-[700px] w-full">
        <LogoEditor
          defaultData={defaultData}
          onSave={async (editor) => {
            const game = jsonToGame(editor.toJSON());
            database.exec("DELETE FROM Teams_Custom_LogoElements");
            for (const row of game) {
              database.exec(`INSERT INTO Teams_Custom_LogoElements VALUES(${
                row.ElementID
              }, ${row.PartHash}, ${row.Colour}, ${row.PositionX}, ${row.PositionY}, ${row.Rotation}, ${row.ScaleX}, ${row.ScaleY})`);
            }
            const img = (await editor.toDataURL()).replace("data:image/png;base64,", "");
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
    </div>
  );
}
