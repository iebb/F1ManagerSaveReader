import {Geometrize} from "./controls/Geometrize.jsx";
import {Button} from "@blueprintjs/core";
import {PolotnoContainer, SidePanelWrap, WorkspaceWrap} from 'polotno';

import {Workspace} from 'polotno/canvas/workspace';
import {createStore} from 'polotno/model/store';
import {SidePanel} from 'polotno/side-panel';
import {Toolbar} from 'polotno/toolbar/toolbar';
import {ZoomButtons} from 'polotno/toolbar/zoom-buttons';
import React, {useEffect, useMemo} from 'react';
import {Downloader} from "./controls/Download.jsx";
import {FMSBExporter} from "./controls/Exporter.jsx";
import {ForzaImporter} from "./controls/ForzaPainter.jsx";
import {defaultJson, EditorSections} from "./logo/utils.jsx";
import {ColorPicker} from "./utils/ColorPicker.jsx";

const store = createStore({
  key: 'X1QnNnMmJajDWNsBKuVD',
});


export default function LogoEditor({defaultData, onSave}) {

  useEffect(() => {
    try {
      if (typeof defaultData === 'string') {
        defaultData = JSON.parse(defaultData);
      }
      store.loadJSON(defaultData || defaultJson);
    } catch (e) {
      store.loadJSON(defaultJson);
    }
  }, [])

  const ActionControls = useMemo(() => {
    return ({ store }) => {
      return (
        <div className="bp5-dark flex gap-2">
          <Geometrize store={store} />
          <ForzaImporter store={store} />
          <FMSBExporter store={store} />
          {/*<Downloader store={store} />*/}
          <Button onClick={() => onSave(store)} text="Save" intent="primary"/>
        </div>
      );
    }
  }, []);

  return (
    <div className="bp5-dark w-full h-full">
      <PolotnoContainer style={{width: '100%', height: "100%"}}>
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
