import {ShapeTypes} from "geometrizejs";
import {logoElements} from "./shapes.js";

const imageObjects = Object.fromEntries(
  logoElements.flatMap((section) => section.icons.map((icon) => [icon.hash, icon]))
);

export const defaultSize = 1024;

export const defaultJson = {
  width: defaultSize,
  height: defaultSize,
  fonts: [],
  pages: [{
    id: "default",
    children: [],
    width: defaultSize,
    height: defaultSize,
    background: "transparent",
    bleed: 0,
  }],
  unit: "px",
  dpi: 72,
};

const fallbackObject = {hash: 4136501132, url: "/svg/circle/circle.svg"};
const svgAssetCache = new Map();

export function getLogoElementByHash(hash) {
  return imageObjects[hash] || fallbackObject;
}

export function getLayerColor(layer) {
  return layer?.colorsReplace?.["#fff"] || "#ffffff";
}

export function withLayerColor(layer, color) {
  return {
    ...layer,
    colorsReplace: {
      "#fff": color,
    },
  };
}

export function withLayerAsset(layer, asset) {
  return {
    ...layer,
    name: `${asset.hash}`,
    object: asset.hash,
    src: asset.url,
  };
}

export function makeLayerFromAsset(asset, idx = Date.now()) {
  const scale = 0.42;
  const element = {
    ElementID: idx,
    PartHash: asset.hash,
    Colour: 0xffffffff,
    PositionX: 0,
    PositionY: 0,
    Rotation: 0,
    ScaleX: scale,
    ScaleY: scale,
  };
  return gameElementToLayer(element, idx);
}

export function getDocumentChildren(data) {
  return data?.pages?.[0]?.children || [];
}

export function normalizeLogoJson(data) {
  if (!data) {
    return structuredClone(defaultJson);
  }

  try {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    if (!parsed?.pages?.[0]?.children) {
      return structuredClone(defaultJson);
    }
    return parsed;
  } catch (error) {
    return structuredClone(defaultJson);
  }
}

export function layerToGeometry(layer, idx) {
  const gameElement = jsonLayerToGameElement(layer, idx);
  const width = Math.abs(gameElement.ScaleX) * defaultSize;
  const height = Math.abs(gameElement.ScaleY) * defaultSize;

  return {
    element: gameElement,
    centerX: (0.5 + gameElement.PositionX / 2) * defaultSize,
    centerY: (0.5 - gameElement.PositionY / 2) * defaultSize,
    width,
    height,
    rotationDeg: -gameElement.Rotation * 180 / Math.PI,
    flipX: gameElement.ScaleX < 0,
    flipY: gameElement.ScaleY < 0,
  };
}

export function gameElementToLayer(e, idx = 0) {
  const alpha = ((e.Colour >>> 24) & 0xff) / 255;
  const hexColor = (e.Colour & 0xffffff).toString(16).padStart(6, "0");
  const obj = getLogoElementByHash(e.PartHash);

  const absX = Math.abs(e.ScaleX);
  const absY = Math.abs(e.ScaleY);
  const translateX = (0.5 + e.PositionX / 2 - absX / 2) * defaultSize;
  const translateY = (0.5 - e.PositionY / 2 - absY / 2) * defaultSize;
  const rotation = -e.Rotation;
  const sinA = Math.sin(rotation);
  const cosA = Math.cos(rotation);
  const xRotated = -(absX * cosA - absY * sinA - absX) * defaultSize / 2;
  const yRotated = -(absX * sinA + absY * cosA - absY) * defaultSize / 2;

  return {
    id: `${e.ElementID ?? idx}_${obj.hash}`,
    type: "svg",
    name: `${obj.hash}`,
    object: obj.hash,
    opacity: alpha,
    visible: true,
    selectable: true,
    removable: true,
    x: translateX + xRotated,
    y: translateY + yRotated,
    width: absX * defaultSize,
    height: absY * defaultSize,
    flipX: e.ScaleX < 0,
    flipY: e.ScaleY < 0,
    rotation: rotation * 180 / Math.PI,
    draggable: true,
    resizable: true,
    keepRatio: false,
    src: obj.url,
    borderColor: "black",
    borderSize: 0,
    cornerRadius: 0,
    colorsReplace: {
      "#fff": `#${hexColor}`,
    },
  };
}

export function jsonLayerToGameElement(ch, idx = 0) {
  const rotation = ch.rotation / 180 * Math.PI;
  const alpha = Math.round(clamp01(ch.opacity ?? 1) * 255).toString(16).padStart(2, "0");
  const rgb = (getLayerColor(ch) || "#ffffff").replace("#", "");

  const absX = Math.abs(ch.width / defaultSize);
  const absY = Math.abs(ch.height / defaultSize);
  const sinA = Math.sin(rotation);
  const cosA = Math.cos(rotation);
  const xRotated = -(absX * cosA - absY * sinA - absX) * defaultSize / 2;
  const yRotated = -(absX * sinA + absY * cosA - absY) * defaultSize / 2;

  const untranslateX = (ch.x - xRotated) / defaultSize * 2 + absX - 1;
  const untranslateY = -((ch.y - yRotated) / defaultSize * 2 + absY - 1);
  return {
    ElementID: idx,
    PartHash: parseInt(ch.name, 10),
    Colour: parseInt(`${alpha}${rgb}`, 16),
    PositionX: untranslateX,
    PositionY: untranslateY,
    Rotation: -rotation,
    ScaleX: absX * (ch.flipX ? -1 : 1),
    ScaleY: absY * (ch.flipY ? -1 : 1),
  };
}

export const gameToJson = (elements) => ({
  width: defaultSize,
  height: defaultSize,
  fonts: [],
  pages: [{
    id: "default",
    children: elements.map((element, idx) => gameElementToLayer(element, idx)),
    width: defaultSize,
    height: defaultSize,
    background: "transparent",
    bleed: 0,
  }],
  unit: "px",
  dpi: 72,
});

export const jsonToGame = (data) => getDocumentChildren(data).map((layer, idx) => jsonLayerToGameElement(layer, idx));

export async function loadSvgAsset(url) {
  if (!svgAssetCache.has(url)) {
    svgAssetCache.set(url, fetch(url).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${url}`);
      }
      return response.text();
    }));
  }

  return svgAssetCache.get(url);
}

export function recolorSvgMarkup(markup, color) {
  return markup
    .replace(/<svg\b([^>]*)>/i, (match, attrs) => {
      const cleanedAttrs = attrs.replace(/\s*preserveAspectRatio="[^"]*"/i, "");
      return `<svg${cleanedAttrs} preserveAspectRatio="none">`;
    })
    .replace(/#ffffff/gi, color)
    .replace(/#fff\b/gi, color);
}

export async function getLayerSvgMarkup(layer) {
  const base = await loadSvgAsset(layer.src);
  return recolorSvgMarkup(base, getLayerColor(layer));
}

export async function getLayerSvgDataUrl(layer) {
  const markup = await getLayerSvgMarkup(layer);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function exportLogoToDataUrl(data) {
  const canvas = document.createElement("canvas");
  canvas.width = defaultSize;
  canvas.height = defaultSize;
  const ctx = canvas.getContext("2d");

  for (const [idx, layer] of getDocumentChildren(data).entries()) {
    const {centerX, centerY, width, height, rotationDeg, flipX, flipY} = layerToGeometry(layer, idx);
    const image = await loadImage(await getLayerSvgDataUrl(layer));

    ctx.save();
    ctx.globalAlpha = clamp01(layer.opacity ?? 1);
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationDeg * Math.PI / 180);
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export const geometrizerToJson = (data) => {
  const shapes = data.shapes.slice(1);
  const scale = Math.max(data.w, data.h);
  const dx = (scale - data.w) / 2;
  const dy = (scale - data.h) / 2;
  const N = 12 / 8.5;

  return {
    width: defaultSize,
    height: defaultSize,
    fonts: [],
    pages: [{
      id: "default",
      children: shapes.map(({shape, color}, idx) => {
        const type = shape.getType();
        const normalizedColor = (color < 0 ? color + (2 ** 32) : color);
        const alpha = normalizedColor & 0xff;
        const hexColor = (normalizedColor >>> 8).toString(16).padStart(6, "0");

        const e = type === ShapeTypes.ROTATED_RECTANGLE ? {
          PositionX: 2 * (((shape.x1 + shape.x2) / 2 + dx / 2) / scale - 0.5),
          PositionY: 2 * (-(((shape.y1 + shape.y2) / 2 + dy / 2) / scale - 0.5)),
          ScaleX: (shape.x2 - shape.x1) / scale * N,
          ScaleY: -((shape.y2 - shape.y1) / scale) * N,
          Rotation: -shape.angle / 180 * Math.PI,
        } : type === ShapeTypes.ROTATED_ELLIPSE ? {
          PositionX: 2 * ((shape.x + dx / 2) / scale - 0.5),
          PositionY: 2 * (-((shape.y + dy / 2) / scale - 0.5)),
          ScaleX: 2 * shape.rx / scale * N,
          ScaleY: -(2 * shape.ry / scale) * N,
          Rotation: -shape.angle / 180 * Math.PI,
        } : null;

        const shapeId = type === ShapeTypes.ROTATED_RECTANGLE ? 1020510907 : 4136501132;

        return gameElementToLayer({
          ElementID: idx,
          PartHash: shapeId,
          Colour: parseInt(`${alpha.toString(16).padStart(2, "0")}${hexColor}`, 16),
          PositionX: e.PositionX,
          PositionY: e.PositionY,
          Rotation: e.Rotation,
          ScaleX: e.ScaleX,
          ScaleY: e.ScaleY,
        }, idx);
      }),
      width: defaultSize,
      height: defaultSize,
      background: "transparent",
      bleed: 0,
    }],
    unit: "px",
    dpi: 72,
  };
};

export const fPainterToJson = (data) => {
  const shapes = data.shapes;
  const scale = Math.max(shapes[0].data[2], shapes[0].data[3]);
  const dx = (scale - shapes[0].data[2]) / 2;
  const dy = (scale - shapes[0].data[3]) / 2;
  const N = 12 / 8.5;

  return {
    width: defaultSize,
    height: defaultSize,
    fonts: [],
    pages: [{
      id: "default",
      children: shapes.filter((shape) => shape.type === 16).map((shape, idx) => gameElementToLayer({
        ElementID: idx,
        PartHash: 4136501132,
        Colour: parseInt(`ff${shape.color[0].toString(16).padStart(2, "0")}${shape.color[1].toString(16).padStart(2, "0")}${shape.color[2].toString(16).padStart(2, "0")}`, 16),
        PositionX: 2 * ((shape.data[0] + dx / 2) / scale - 0.5),
        PositionY: 2 * (-((shape.data[1] + dy / 2) / scale - 0.5)),
        Rotation: -shape.data[4] / 180 * Math.PI,
        ScaleX: 2 * shape.data[2] / scale * N,
        ScaleY: -(2 * shape.data[3] / scale) * N,
      }, idx)),
      width: defaultSize,
      height: defaultSize,
      background: "transparent",
      bleed: 0,
    }],
    unit: "px",
    dpi: 72,
  };
};
