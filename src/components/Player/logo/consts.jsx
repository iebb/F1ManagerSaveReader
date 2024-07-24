import {logoElements} from "@/components/Player/logo/logos";
import {observer} from "mobx-react-lite";
import {ImagesGrid, SectionTab} from "polotno/side-panel";
import FaShapes from '@meronex/icons/fa/FaShapes';
import React from "react";

const imageObjects = Object.fromEntries(
  logoElements.map(x => x.icons.map(i => [i.hash, i])).flat()
)


const defaultSize = 200;

export const gameToJson = (elements) => {
  return (
    {
      "width": 200,
      "height": 200,
      "fonts": [],
      "pages": [{
        "id": "default",
        "children": elements.map( e => {

          const hexColor = (e.Colour & 0xffffff).toString(16).padStart(6, "0");
          const obj = imageObjects[e.PartHash] || { hash: e.PartHash, url: '/svg/circle.svg'};

          const absX = Math.abs(e.ScaleX);
          const absY = Math.abs(e.ScaleY);
          const translateX = (0.5 + e.PositionX / 2 - absX / 2) * defaultSize;
          const translateY = (0.5 - e.PositionY / 2 - absY / 2) * defaultSize;
          const rotation = -e.Rotation; //e.Rotation * 180 / Math.PI;
          const rotationDeg = rotation * 180 / Math.PI;
          const sinA = Math.sin(rotation);
          const cosA = Math.cos(rotation);
          const xRotated = -(absX * cosA - absY * sinA - absX) * defaultSize / 2;
          const yRotated = -(absX * sinA + absY * cosA - absY) * defaultSize / 2;

          return {
            "id": `${e.ElementID}_${obj.hash}`,
            "type": "svg",
            "name": `${obj.hash}`,
            "object": obj.hash,
            "opacity": 1,
            "visible": true,
            "selectable": true,
            "removable": true,
            "x": translateX + xRotated,
            "y": translateY + yRotated,
            "width": absX * defaultSize,
            "height": absY * defaultSize,
            "flipX": e.ScaleX < 0,
            "flipY": e.ScaleY < 0,
            "rotation": rotationDeg,
            "draggable": true,
            "resizable": true,
            "src": obj.url,
            "keepRatio": false,
            "borderColor": "black",
            "borderSize": 0,
            "cornerRadius": 0,
            "colorsReplace": {
              "#fff": "#" + hexColor
            }
          }
        }),
        "width": defaultSize,
        "height": defaultSize,
        "background": "grey",
        "bleed": 0
      }],
      "unit": "px",
      "dpi": 72
    }
  )
}


export const jsonToGame = (data) => {
  return data.pages[0].children.map((ch, _idx) => {

    const rotation = -ch.rotation / 180 * Math.PI;

    const absX = Math.abs(ch.width / defaultSize);
    const absY = Math.abs(ch.height / defaultSize);
    const sinA = Math.sin(rotation);
    const cosA = Math.cos(rotation);
    const xRotated = -(absX * cosA - absY * sinA - absX) * defaultSize / 2;
    const yRotated = -(absX * sinA + absY * cosA - absY) * defaultSize / 2;

    const untranslateX = (ch.x - xRotated) / defaultSize * 2 + absX - 1;
    const untranslateY = -((ch.y - yRotated) / defaultSize * 2 + absY - 1);
    return {
      "ElementID": _idx,
      "PartHash": parseInt(ch.name, 10),
      "Colour": parseInt(ch.colorsReplace["#fff"].replace("#", "ff"), 16),
      "PositionX": untranslateX,
      "PositionY": untranslateY,
      "Rotation": rotation,
      "ScaleX": absX * (ch.flipX ? -1 : 1),
      "ScaleY": absY * (ch.flipY ? -1 : 1),
    };
  });
}


export const EditorSections = logoElements.map(section => ({
  name: section.name,
  Tab: (props) => (
    <SectionTab name={section.name} {...props}>
      <FaShapes icon="new-text-box" />
    </SectionTab>
  ),
  // we need observer to update component automatically on any store changes
  Panel: observer(({ store }) => {
    const images = section.icons;
    return (
      <div style={{ overflowY: 'auto', height: '100%' }}>
        <ImagesGrid
          images={images}
          getPreview={(image) => image.url}
          onSelect={async (image, pos, element, event) => {
            store.activePage.addElement({
              type: 'svg',
              src: image.url,
              width: defaultSize,
              height: defaultSize,
              x: pos?.x || 0,
              y: pos?.y || 0,
            });
          }}
          rowsNumber={4}
          isLoading={!images.length}
          loadMore={false}
        />
      </div>
    );
  }),
}));