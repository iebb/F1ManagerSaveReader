import {fPainterToJson} from "../logo/utils";
import {Button, Dialog, DialogBody, DialogFooter, TextArea} from "@blueprintjs/core";
import {enqueueSnackbar} from "notistack";
import React from "react";

export const ForzaImporter = ({ store }) => {
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
      <Dialog
        isOpen={open}
        onClose={handleClose}
        title="Import from Forza Painter"
        className="w-[75vw]"
      >
        <DialogBody>
          <p className={"text-md"}>
            Forza Painter can be used to convert any picture into ovals and ellipses, making it possible to use in F1M.
          </p>
          <p className={"mt-4 text-sm text-yellow-500"}>
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
                  setValid(parsed.shapes[0].type === 1);
                } catch (e) {
                  setValid(false);
                }
                setContent(v);
              }}
              label="Paste your Forza Painter JSON here"
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
              text="Import from FP"
              onClick={() => {
                try {
                  const data = JSON.parse(content);
                  store.loadJSON(fPainterToJson(data));
                  enqueueSnackbar(
                    `Import succeeded`,
                    {variant: "success"}
                  );
                  handleClose();
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
