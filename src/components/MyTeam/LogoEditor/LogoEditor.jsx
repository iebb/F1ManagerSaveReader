import {EditorSections, fPainterToJson, gameToJson, jsonToGame} from "@/components/MyTeam/LogoEditor/logo/utils";
import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";

import {Alert, AlertTitle, Box, Button, Modal, TextField} from "@mui/material";
import {observer} from "mobx-react-lite";
import {enqueueSnackbar} from "notistack";
import {PolotnoContainer, SidePanelWrap, WorkspaceWrap} from 'polotno';

import {Workspace} from 'polotno/canvas/workspace';
import {createStore} from 'polotno/model/store';
import {SidePanel} from 'polotno/side-panel';
import {Toolbar} from 'polotno/toolbar/toolbar';
import {ZoomButtons} from 'polotno/toolbar/zoom-buttons';
import React, {useContext, useEffect} from 'react';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  minWidth: '50vw',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  pt: 2,
  px: 4,
  pb: 3,
  borderRadius: 6,
};

const store = createStore({
  key: 'X1QnNnMmJajDWNsBKuVD',
});

const ColorPicker = observer(({ store, element: e, elements: t }) => {
  return (
    <div>
      <input
        type="color"
        value={e.colorsReplace.get("#fff") || "#fff"}
        onChange={(r) => {
          e.replaceColor("#fff", r.target.value);
        }}
      />
    </div>
  );
});

const ActionControls = ({ store }) => {
  return (
    <>
      <div style={{display: "flex", justifyContent: "space-between", gap: 4}}>
        <ForzaImporter store={store} />
        <FMSBExporter store={store} />
        <Saver store={store} />
      </div>
    </>
  );
};

const Saver = ({ store }) => {
  const database = useContext(DatabaseContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const metadata = useContext(MetadataContext);

  return (
    <>
      <Button
        variant="contained"
        onClick={async () => {
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
      >
        Save
      </Button>
    </>
  );
};

const ForzaImporter = ({ store }) => {
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [valid, setValid] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="contained"
        color="warning"
        onClick={() => {
          setContent("");
          setOpen(true);
        }}
      >
        Import FP
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box sx={modalStyle}>
          <h2 className="text-2xl">
            Import from Forza Painter
          </h2>
          <p className={"mt-4 text-md"}>
            Forza Painter can be used to convert any picture into ovals and ellipses, making it possible to use in F1M.
          </p>
          <p className={"mt-4 text-sm text-yellow-500"}>
            Warning: You will be unable to edit in-game if you have more than 50 shapes.
          </p>
          <div className="mt-2 max-h-[50vh] overflow-y-auto py-2">
            <TextField
              className="w-full"
              error={!valid}
              value={content}
              inputProps={{style: {fontSize: 13}}}
              onChange={(event) => {
                let v = event.target.value;
                try {
                  const parsed = JSON.parse(v);
                  setValid(parsed.shapes[0].type === 1);
                } catch (e) {
                  setValid(false);
                }
                setContent(v);
              }}
              id="outlined-textarea"
              label="Paste your Forza Painter JSON here"
              placeholder='{"shapes":[{"type":1, "data":[0,0,1,1],"color":[255,0,255,0],"score":0},{"type":16, "data":[141,206,140,205,360],"color":[...'
              multiline
            />
          </div>
          <div className="mt-8 gap-2 flex">
            <div className="flex-1"></div>
            <Button
              variant="contained"
              color="warning"
              disabled={!valid}
              onClick={() => {
                try {
                  const data = JSON.parse(content);
                  store.loadJSON(fPainterToJson(data));
                  enqueueSnackbar(
                    `Import succeeded`,
                    {variant: "success"}
                  );
                  setOpen(false);
                } catch (e) {
                  console.error(e);
                  enqueueSnackbar(
                    `Import failed`,
                    {variant: "error"}
                  );
                }
              }}
            >
              Import from FP
            </Button>
          </div>
        </Box>
      </Modal>
    </>
  );
};

const FMSBExporter = ({ store }) => {
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [valid, setValid] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => {
          setContent(JSON.stringify(jsonToGame(store.toJSON())));
          setValid(true);
          setOpen(true);
        }}
      >
        Import / Export
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box sx={modalStyle}>
          <h2 className="text-2xl">
            Import / Export
          </h2>
          <p className={"mt-4 text-sm text-yellow-500"}>
            Warning: You will be unable to edit in-game if you have more than 50 shapes.
          </p>
          <div className="mt-2 max-h-[50vh] overflow-y-auto py-2">
            <TextField
              className="w-full"
              inputProps={{style: {fontSize: 13}}}
              error={!valid}
              value={content}
              onChange={(event) => {
                let v = event.target.value;
                try {
                  const parsed = JSON.parse(v);
                  setValid(true);
                } catch (e) {
                  setValid(false);
                }
                setContent(v);
              }}
              id="outlined-textarea"
              label="Paste your FMSB JSON here"
              placeholder='{"shapes":[{"type":1, "data":[0,0,1,1],"color":[255,0,255,0],"score":0},{"type":16, "data":[141,206,140,205,360],"color":[...'
              multiline
            />
          </div>
          <div className="mt-8 gap-2 flex">
            <div className="flex-1"></div>
            <Button
              variant="contained"
              disabled={!valid}
              onClick={() => {
                navigator.clipboard.writeText(content);
                enqueueSnackbar(
                  `Copied!`,
                  {variant: "success"}
                );
              }}
            >
              Copy to Clipboard
            </Button>
            <Button
              variant="contained"
              color="warning"
              disabled={!valid}
              onClick={() => {
                try {
                  const data = JSON.parse(content);
                  store.loadJSON(gameToJson(data));
                  enqueueSnackbar(
                    `Import succeeded`,
                    {variant: "success"}
                  );
                  setOpen(false);
                } catch (e) {
                  console.error(e);
                  enqueueSnackbar(
                    `Import failed`,
                    {variant: "error"}
                  );
                }
              }}
            >
              Import from Save
            </Button>
          </div>
        </Box>
      </Modal>
    </>
  );
};

export default function LogoEditor() {

  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);


  useEffect(() => {
    const elements = database.getAllRows("SELECT * FROM Teams_Custom_LogoElements ORDER BY ElementID ASC");
    store.loadJSON(gameToJson(elements));
  }, [])

  if (basicInfo.player.TeamID < 32) {
    return (
      <Alert severity="warning" sx={{my: 2}}>
        <AlertTitle>Error</AlertTitle>
        This feature is only available for Custom Team saves.
      </Alert>
    )
  }


  return (
    <div className="bp5-dark">
      <PolotnoContainer style={{width: '100%', height: '600px'}}>
        <SidePanelWrap>
          <SidePanel store={store} sections={EditorSections} defaultSection="custom"/>
        </SidePanelWrap>
        <WorkspaceWrap>
          <Toolbar
            store={store}
            components={{
              ActionControls,
              SvgFilters: () => null,
              SvgAnimations: () => null,
              SvgColors: ColorPicker,
            }}
          />
          <Workspace store={store} components={{PageControls: () => null}}/>
          <ZoomButtons store={store}/>
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  );
};
