import {EditorSections, gameToJson, jsonToGame} from "@/components/Player/logo/consts";
import {BasicInfoContext, DatabaseContext} from "@/js/Contexts";
import {Button} from '@blueprintjs/core';
import {Alert, AlertTitle} from "@mui/material";
import {observer} from "mobx-react-lite";
import {PolotnoContainer, SidePanelWrap, WorkspaceWrap} from 'polotno';
import {Workspace} from 'polotno/canvas/workspace';

import {createStore} from 'polotno/model/store';
import {SidePanel} from 'polotno/side-panel';
import {Toolbar} from 'polotno/toolbar/toolbar';
import {ZoomButtons} from 'polotno/toolbar/zoom-buttons';
import React, {useContext, useEffect} from 'react';

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


export default function LogoEditor() {

  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);


  useEffect(() => {
    const elements = database.getAllRows("SELECT * FROM Teams_Custom_LogoElements ORDER BY ElementID ASC");
    store.loadJSON(gameToJson(elements));
  }, [])

  if (basicInfo.player.TeamID < 32) {
    return (
      <Alert severity="warning" sx={{ my: 2 }}>
        <AlertTitle>Error</AlertTitle>
        This feature is only available for Custom Team saves.
      </Alert>
    )
  }

// it is important to define component onside of `MyToolbar` render function
  const ActionControls = ({ store }) => {
    return (
      <div>
        <Button
          intent="primary"
          onClick={() => {
            const game = jsonToGame(store.toJSON());
            database.exec("DELETE FROM Teams_Custom_LogoElements");
            for(const row of game) {
              database.exec(`INSERT INTO Teams_Custom_LogoElements VALUES(${
                row.ElementID
              }, ${row.PartHash}, ${row.Colour}, ${row.PositionX}, ${row.PositionY}, ${row.Rotation}, ${row.ScaleX}, ${row.ScaleY})`);
            }
          }}
        >
          Save
        </Button>
      </div>
    );
  };

  return (
    <div className="bp5-dark">
      <PolotnoContainer style={{ width: '100%', height: '600px' }}>
        <SidePanelWrap>
          <SidePanel store={store} sections={EditorSections} defaultSection="custom" />
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
          <Workspace store={store}  components={{ PageControls: () => null }} />
          <ZoomButtons store={store} />
        </WorkspaceWrap>
      </PolotnoContainer>
    </div>
  );
};
