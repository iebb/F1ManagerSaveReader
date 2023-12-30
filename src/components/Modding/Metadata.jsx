import JSONEditorComponent from "@/components/UI/Editor/Editor";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {Tuple} from "@/js/UESaveTool";
import {Button, Divider, Grid, TextField, Typography} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useState} from "react";

export default function MetadataEditor() {

  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();

  const [mode, setMode] = useState("table");
  const [metaProperty, setMetaProperty] = useState(null);
  const [metaJSON, setMetaJSON] = useState({
    json: null,
  });


  useEffect(() => {
    if (metadata) {
      const mp = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0].Properties[0];
      setMetaJSON({
        json: JSON.parse(JSON.stringify(mp.Properties)),
      });
      setMetaProperty(mp);
    }
  }, [metadata]);

  if (metaJSON?.json === null && metaJSON?.text === null) return null;
/*
 onRenderMenu={(items) => {
          items.push({
            type: 'separator'
          })
          items.push({
            type: 'button',
            onClick: () => {
              try {
                const Properties = metaJSON.json || JSON.parse(metaJSON.text);
                const mp = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0].Properties[0];
                mp.Properties = Tuple.from({Name: 'CareerSaveMetaData', Type: 'Tuple', Properties}).Properties;
                basicInfoUpdater({ metadata });
                enqueueSnackbar(
                  `Updated successfully`,
                  { variant: "success" }
                );
              } catch (e) {
                enqueueSnackbar(
                  e.toString(),
                  { variant: "error" }
                );
              }
            },
            text: "save",
            title: "save changes",
            disabled: false,
          })
        }}
 */
  return (
    <div>
      <Typography variant="h5" component="h5">
        Metadata Editor
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <JSONEditorComponent
        mode={mode}

        onChangeMode={setMode}
        content={metaJSON}
        validator={(Properties) => {
          try {
            Tuple.from({Name: 'CareerSaveMetaData', Type: 'Tuple', Properties})
          } catch (e) {
            return [{
              path: [],
              message: e.toString(),
              severity: 'error'
            }];
          }
          return [];
        }}
        onChange={(props) => {
          setMetaJSON(props);
          try {
            const Properties = props.json || JSON.parse(props.text);
            Tuple.from({Name: 'CareerSaveMetaData', Type: 'Tuple', Properties})
            const mp = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0].Properties[0];
            mp.Properties = Tuple.from({Name: 'CareerSaveMetaData', Type: 'Tuple', Properties}).Properties;
            basicInfoUpdater({ metadata });
          } catch (e) {
          }
        }}
      />
    </div>
  );
}