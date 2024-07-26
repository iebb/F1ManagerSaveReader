import {Button, Dialog, DialogBody, DialogFooter, TextArea} from "@blueprintjs/core";
import {decode, encode} from "@msgpack/msgpack";
import {enqueueSnackbar} from "notistack";
import pako from 'pako';
import React from "react";
import {gameToJson, jsonToGame} from "../logo/utils";
import {decodeBase91, encodeBase91} from "./base91.js";

const magic = "B91#ieb:";

function compressData(struct) {
  const structStringify = encode(struct);
  const data = pako.deflate(structStringify);
  const compressed = magic + encodeBase91(data);
  const benchmark = JSON.stringify(struct).length;
  console.log("compression:", benchmark, '=>', compressed.length);
  return compressed;
}

function decompressData(data) {
  if (data.substring(0, magic.length) === magic) {
    const buffer = decodeBase91(data.substring(magic.length));
    const inflated = pako.inflate(buffer);
    return decode(inflated);
  } else if (data.substring(0, 1) === "[") {
    return JSON.parse(data);
  } else {
    return [];
  }
}


export const FMSBExporter = ({ store }) => {
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [valid, setValid] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const shapeCount = store?.pages?.[0]?.children?.length || 0;

  return (
    <>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => {
          const struct = jsonToGame(store.toJSON());
          setContent(compressData(struct));
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
        className="w-[75vw]"
      >
        <DialogBody>
          <p className={"text-sm"}>
            Current Shapes: {shapeCount}
            <br/>
            Compressed Size: {content.length}
            <br/>
            Deompressed Size: {JSON.stringify(store.toJSON()).length}
          </p>
          {
            shapeCount >= 50 && (
              <p className={"text-sm text-yellow-500"}>
                Warning: You will be unable to edit in-game if you have more than 50 shapes.
              </p>
            )
          }
          <div className="mt-2 max-h-[50vh] overflow-y-auto py-2">
            <TextArea
              className="w-full"
              intent={valid ? null : "danger"}
              value={content}
              onChange={(event) => {
                let v = event.target.value;
                try {
                  const parsed = decompressData(v);
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
                  const data = decompressData(content);
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
