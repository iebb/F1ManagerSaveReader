import {compressData} from "./Exporter";
import {Button} from "@blueprintjs/core";
import {saveAs} from "file-saver";
import React from "react";
import {jsonToGame} from "../logo/utils";


export const Downloader = ({ store }) => {
  return (
    <>
      <Button
        intent="success"
        onClick={() => {
          const struct = jsonToGame(store.toJSON());
          saveAs(new Blob([compressData(struct)], {type: "text/plain"}), "logo.ie6");
        }}
      >
        Download
      </Button>
    </>
  );
};
