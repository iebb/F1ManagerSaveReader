import {gameToJson, jsonToGame} from "../logo/utils";
import {Button, Dialog, DialogBody, DialogFooter, TextArea} from "@blueprintjs/core";
import {enqueueSnackbar} from "notistack";
import React from "react";


export const FMSBExporter = ({ store }) => {
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
      <Dialog
        isOpen={open}
        onClose={handleClose}
        title="Import / Export"
        className="bp5-dark w-[75vw]"
      >
        <DialogBody>
          <p className={"text-sm text-yellow-500"}>
            Warning: You will be unable to edit in-game if you have more than 50 shapes.
          </p>
          <div className="mt-2 max-h-[50vh] overflow-y-auto py-2">
            <TextArea
              className="w-full"
              intent={valid ? null : "danger"}
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
              label="Paste your FMSB JSON here"
              placeholder='{"shapes":[{"type":1, "data":[0,0,1,1],"color":[255,0,255,0],"score":0},{"type":16, "data":[141,206,140,205,360],"color":[...'
              autoResize
            />
          </div>
        </DialogBody>
        <DialogFooter actions={
          <div>
            <Button
              intent="primary"
              variant="contained"
              disabled={!valid}
              text="Copy to Clipboard"
              onClick={() => {
                navigator.clipboard.writeText(content);
                enqueueSnackbar(
                  `Copied!`,
                  {variant: "success"}
                );
              }} />
            <Button
              intent="primary"
              variant="contained"
              disabled={!valid}
              text="Import Save"
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
              }} />
          </div>
        } />
      </Dialog>
    </>
  );
};
