import {observer} from "mobx-react-lite";
import React from "react";

export const ColorPicker = observer(({ store, element: e, elements: t }) => {
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
