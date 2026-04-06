import {Button, NumericInput} from "@blueprintjs/core";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {Geometrize} from "./controls/Geometrize.jsx";
import {FMSBExporter} from "./controls/Exporter.jsx";
import {ForzaImporter} from "./controls/ForzaPainter.jsx";
import {
  defaultJson,
  defaultSize,
  exportLogoToDataUrl,
  getDocumentChildren,
  getLayerColor,
  getLayerSvgDataUrl,
  layerToGeometry,
  makeLayerFromAsset,
  normalizeLogoJson,
  withLayerColor,
} from "./logo/utils.jsx";
import {logoElements} from "./logo/shapes.js";

const MIN_SCALE = 0.04;
const HISTORY_LIMIT = 100;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getPointerPosition(event, element) {
  const rect = element.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * defaultSize,
    y: ((event.clientY - rect.top) / rect.height) * defaultSize,
  };
}

function LayerArtwork({layer}) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getLayerSvgDataUrl(layer).then((value) => {
      if (!cancelled) {
        setSrc(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [layer]);

  if (!src) {
    return null;
  }

  return <img src={src} alt="" className="pointer-events-none h-full w-full select-none" draggable={false}/>;
}

function AssetButton({asset, onSelect}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-f1m-logo-asset", JSON.stringify(asset));
        event.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onSelect(asset)}
      className="group border border-[#30404d] bg-[#202b33] p-1.5 transition hover:border-[#5c7080] hover:bg-[#293742]"
      title={asset.hash.toString()}
    >
      <div className="flex aspect-square items-center justify-center border border-[#394b59] bg-[#182026] p-1.5">
        <img src={asset.url} alt="" className="h-full w-full object-contain"/>
      </div>
    </button>
  );
}

export default function LogoEditor({defaultData, onSave}) {
  const [documentData, setDocumentData] = useState(defaultJson);
  const [selectedId, setSelectedId] = useState(null);
  const [activeSection, setActiveSection] = useState(logoElements[0]?.name || "");
  const [inspectorTab, setInspectorTab] = useState("layers");
  const [zoom, setZoom] = useState(1);
  const [isCanvasDragOver, setIsCanvasDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [historyState, setHistoryState] = useState({undo: 0, redo: 0});
  const canvasRef = useRef(null);
  const interactionRef = useRef(null);
  const historyRef = useRef({undoStack: [], redoStack: []});

  function cloneDocument(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function syncHistoryState() {
    setHistoryState({
      undo: historyRef.current.undoStack.length,
      redo: historyRef.current.redoStack.length,
    });
  }

  function pushCurrentToUndo(snapshot = documentData) {
    historyRef.current.undoStack.push(cloneDocument(snapshot));
    if (historyRef.current.undoStack.length > HISTORY_LIMIT) {
      historyRef.current.undoStack.shift();
    }
    historyRef.current.redoStack = [];
    syncHistoryState();
  }

  function commitDocument(nextData, options = {}) {
    const {recordHistory = true, resetHistory = false, nextSelectedId} = options;

    if (resetHistory) {
      historyRef.current = {undoStack: [], redoStack: []};
      syncHistoryState();
    } else if (recordHistory) {
      pushCurrentToUndo();
    }

    setDocumentData(nextData);
    if (nextSelectedId !== undefined) {
      setSelectedId(nextSelectedId);
    }
  }

  useEffect(() => {
    const nextData = normalizeLogoJson(defaultData);
    commitDocument(nextData, {
      recordHistory: false,
      resetHistory: true,
      nextSelectedId: getDocumentChildren(nextData)[0]?.id || null,
    });
  }, [defaultData]);

  const layers = getDocumentChildren(documentData);
  const selectedIndex = layers.findIndex((layer) => layer.id === selectedId);
  const selectedLayer = selectedIndex >= 0 ? layers[selectedIndex] : null;
  const selectedGeometry = selectedLayer ? layerToGeometry(selectedLayer, selectedIndex) : null;
  const activeAssets = logoElements.find((section) => section.name === activeSection)?.icons || [];

  const editor = useMemo(() => ({
    loadJSON: (nextData) => {
      const normalized = normalizeLogoJson(nextData);
      commitDocument(normalized, {
        recordHistory: true,
        nextSelectedId: getDocumentChildren(normalized)[0]?.id || null,
      });
    },
    toJSON: () => documentData,
    toDataURL: () => exportLogoToDataUrl(documentData),
    pages: documentData.pages,
  }), [documentData]);

  useEffect(() => {
    function handlePointerMove(event) {
      const interaction = interactionRef.current;
      const canvas = canvasRef.current;
      if (!interaction || !canvas) {
        return;
      }

      const currentPointer = getPointerPosition(event, canvas);
      const dx = currentPointer.x - interaction.startPointer.x;
      const dy = currentPointer.y - interaction.startPointer.y;

      setDocumentData((current) => {
        const nextLayers = [...getDocumentChildren(current)];
        const currentLayer = nextLayers[interaction.index];
        if (!currentLayer) {
          return current;
        }

        const nextLayer = {...currentLayer};
        const nextElement = {...interaction.startElement};

        if (interaction.mode === "move") {
          nextElement.PositionX = interaction.startElement.PositionX + dx * 2 / defaultSize;
          nextElement.PositionY = interaction.startElement.PositionY - dy * 2 / defaultSize;
        }

        if (interaction.mode === "scale") {
          const cos = Math.cos(interaction.rotationRad);
          const sin = Math.sin(interaction.rotationRad);
          const localDx = dx * cos + dy * sin;
          const localDy = -dx * sin + dy * cos;
          const scaleX = Math.max(MIN_SCALE, Math.abs(interaction.startElement.ScaleX) + interaction.handleX * localDx * 2 / defaultSize);
          const scaleY = Math.max(MIN_SCALE, Math.abs(interaction.startElement.ScaleY) + interaction.handleY * localDy * 2 / defaultSize);
          nextElement.ScaleX = scaleX * Math.sign(interaction.startElement.ScaleX || 1);
          nextElement.ScaleY = scaleY * Math.sign(interaction.startElement.ScaleY || 1);
        }

        if (interaction.mode === "rotate") {
          const center = interaction.center;
          const angle = Math.atan2(currentPointer.y - center.y, currentPointer.x - center.x);
          const delta = angle - interaction.startAngle;
          nextLayer.rotation = interaction.startRotation + delta * 180 / Math.PI;
        } else {
          nextLayer.x = currentLayer.x;
          nextLayer.y = currentLayer.y;
          nextLayer.width = currentLayer.width;
          nextLayer.height = currentLayer.height;
          nextLayer.flipX = currentLayer.flipX;
          nextLayer.flipY = currentLayer.flipY;

          const rebuilt = interaction.rebuild(nextElement);
          nextLayer.x = rebuilt.x;
          nextLayer.y = rebuilt.y;
          nextLayer.width = rebuilt.width;
          nextLayer.height = rebuilt.height;
          nextLayer.rotation = rebuilt.rotation;
          nextLayer.flipX = rebuilt.flipX;
          nextLayer.flipY = rebuilt.flipY;
        }

        nextLayers[interaction.index] = nextLayer;
        return {
          ...current,
          pages: [{
            ...current.pages[0],
            children: nextLayers,
          }],
        };
      });
    }

    function handlePointerUp() {
      interactionRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      const targetTag = target?.tagName?.toLowerCase();
      const isTypingTarget = targetTag === "input" || targetTag === "textarea" || target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if (((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "z") || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y")) {
        event.preventDefault();
        redo();
        return;
      }

      if (!selectedLayer || isTypingTarget) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        reorderSelected(-1);
        return;
      }

      if (event.key === "]") {
        event.preventDefault();
        reorderSelected(1);
        return;
      }

      const step = event.shiftKey ? 8 : 1;
      if (event.key === "ArrowUp") {
        event.preventDefault();
        nudgeSelected(0, -step);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        nudgeSelected(0, step);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeSelected(-step, 0);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeSelected(step, 0);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedLayer, selectedIndex, layers, documentData]);

  useEffect(() => {
    function closeContextMenu() {
      setContextMenu(null);
    }

    window.addEventListener("pointerdown", closeContextMenu);
    window.addEventListener("scroll", closeContextMenu, true);
    return () => {
      window.removeEventListener("pointerdown", closeContextMenu);
      window.removeEventListener("scroll", closeContextMenu, true);
    };
  }, []);

  function replaceLayers(nextLayers) {
    commitDocument({
      ...documentData,
      pages: [{
        ...documentData.pages[0],
        children: nextLayers,
      }],
    });
  }

  function updateSelectedLayer(mutator) {
    if (selectedIndex < 0) {
      return;
    }

    const nextLayers = [...layers];
    nextLayers[selectedIndex] = mutator({...nextLayers[selectedIndex]});
    replaceLayers(nextLayers);
  }

  function rebuildFromElement(index, element, layer) {
    const next = {
      ...layer,
      ...(() => {
        const rotationDeg = -element.Rotation * 180 / Math.PI;
        const width = Math.abs(element.ScaleX) * defaultSize;
        const height = Math.abs(element.ScaleY) * defaultSize;
        const absX = Math.abs(element.ScaleX);
        const absY = Math.abs(element.ScaleY);
        const translateX = (0.5 + element.PositionX / 2 - absX / 2) * defaultSize;
        const translateY = (0.5 - element.PositionY / 2 - absY / 2) * defaultSize;
        const rotation = -element.Rotation;
        const sinA = Math.sin(rotation);
        const cosA = Math.cos(rotation);
        const xRotated = -(absX * cosA - absY * sinA - absX) * defaultSize / 2;
        const yRotated = -(absX * sinA + absY * cosA - absY) * defaultSize / 2;

        return {
          x: translateX + xRotated,
          y: translateY + yRotated,
          width,
          height,
          rotation: rotationDeg,
          flipX: element.ScaleX < 0,
          flipY: element.ScaleY < 0,
        };
      })(),
    };
    return next;
  }

  function beginInteraction(mode, event, extra = {}) {
    if (!selectedLayer || !canvasRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pushCurrentToUndo();

    const geometry = layerToGeometry(selectedLayer, selectedIndex);
    interactionRef.current = {
      mode,
      index: selectedIndex,
      startPointer: getPointerPosition(event, canvasRef.current),
      startElement: geometry.element,
      startRotation: selectedLayer.rotation,
      startAngle: Math.atan2(
        getPointerPosition(event, canvasRef.current).y - geometry.centerY,
        getPointerPosition(event, canvasRef.current).x - geometry.centerX
      ),
      center: {x: geometry.centerX, y: geometry.centerY},
      rotationRad: selectedLayer.rotation * Math.PI / 180,
      rebuild: (element) => rebuildFromElement(selectedIndex, element, selectedLayer),
      ...extra,
    };
  }

  function addLayer(asset, position = null) {
    let layer = makeLayerFromAsset(asset, layers.length);
    if (position) {
      const base = layerToGeometry(layer, layers.length);
      layer = rebuildFromElement(layers.length, {
        ...base.element,
        PositionX: position.x / defaultSize * 2 - 1,
        PositionY: 1 - position.y / defaultSize * 2,
      }, layer);
    }
    const nextLayers = [...layers, layer];
    replaceLayers(nextLayers);
    setSelectedId(layer.id);
  }

  function deleteSelected() {
    if (!selectedLayer) {
      return;
    }

    const nextLayers = layers.filter((layer) => layer.id !== selectedLayer.id);
    replaceLayers(nextLayers);
    setSelectedId(nextLayers[Math.max(0, selectedIndex - 1)]?.id || null);
  }

  function duplicateSelected() {
    if (!selectedLayer) {
      return;
    }

    const duplicate = {
      ...selectedLayer,
      id: `${selectedLayer.id}_copy_${Date.now()}`,
      x: selectedLayer.x + 24,
      y: selectedLayer.y + 24,
    };
    const nextLayers = [...layers];
    nextLayers.splice(selectedIndex + 1, 0, duplicate);
    replaceLayers(nextLayers);
    setSelectedId(duplicate.id);
  }

  function nudgeSelected(deltaX, deltaY) {
    if (!selectedLayer) {
      return;
    }

    const geometry = layerToGeometry(selectedLayer, selectedIndex);
    const nextLayer = rebuildFromElement(selectedIndex, {
      ...geometry.element,
      PositionX: geometry.element.PositionX + deltaX * 2 / defaultSize,
      PositionY: geometry.element.PositionY - deltaY * 2 / defaultSize,
    }, selectedLayer);
    const nextLayers = [...layers];
    nextLayers[selectedIndex] = nextLayer;
    replaceLayers(nextLayers);
  }

  function reorderSelected(offset) {
    if (!selectedLayer) {
      return;
    }

    const nextIndex = selectedIndex + offset;
    if (nextIndex < 0 || nextIndex >= layers.length) {
      return;
    }

    const nextLayers = [...layers];
    const [item] = nextLayers.splice(selectedIndex, 1);
    nextLayers.splice(nextIndex, 0, item);
    replaceLayers(nextLayers);
  }

  function flipSelected(axis) {
    if (!selectedLayer) {
      return;
    }

    const nextLayers = [...layers];
    nextLayers[selectedIndex] = {
      ...selectedLayer,
      [axis]: !selectedLayer[axis],
    };
    replaceLayers(nextLayers);
  }

  function undo() {
    const previous = historyRef.current.undoStack.pop();
    if (!previous) {
      return;
    }

    historyRef.current.redoStack.push(cloneDocument(documentData));
    syncHistoryState();
    setDocumentData(previous);
    const previousChildren = getDocumentChildren(previous);
    setSelectedId((currentSelectedId) => previousChildren.some((layer) => layer.id === currentSelectedId) ? currentSelectedId : previousChildren[0]?.id || null);
  }

  function redo() {
    const next = historyRef.current.redoStack.pop();
    if (!next) {
      return;
    }

    historyRef.current.undoStack.push(cloneDocument(documentData));
    syncHistoryState();
    setDocumentData(next);
    const nextChildren = getDocumentChildren(next);
    setSelectedId((currentSelectedId) => nextChildren.some((layer) => layer.id === currentSelectedId) ? currentSelectedId : nextChildren[0]?.id || null);
  }

  function openContextMenu(event, layerId) {
    if (!canvasRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedId(layerId);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 8, rect.width - 168);
    const y = clamp(event.clientY - rect.top, 8, rect.height - 196);
    setContextMenu({x, y});
  }

  function runContextAction(action) {
    setContextMenu(null);
    action();
  }

  return (
    <div className="flex h-full min-h-0 gap-3 bg-transparent text-slate-100">
      <aside className="flex w-[252px] min-h-0 flex-col border border-[#394b59] bg-[#202b33]">
        <div className="border-b border-[#30404d] px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Assets</div>
          <div className="mt-1 text-sm text-slate-200">Vector Library</div>
        </div>
        <div className="border-b border-[#30404d] bg-[#182026] px-2 pt-2">
          <div className="grid grid-cols-3 gap-1">
            {logoElements.map((section) => (
              <button
                key={section.name}
                type="button"
                onClick={() => setActiveSection(section.name)}
                className={`border px-2 py-1.5 text-center text-xs transition ${
                  activeSection === section.name
                    ? "border-[#5c7080] bg-[#202b33] text-white"
                    : "border-transparent bg-[#293742] text-slate-300 hover:border-[#394b59] hover:bg-[#30404d]"
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid auto-rows-min content-start min-h-0 flex-1 grid-cols-3 gap-1.5 overflow-y-auto p-2">
          {activeAssets.map((asset) => <AssetButton key={asset.hash} asset={asset} onSelect={addLayer}/>)}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col border border-[#394b59] bg-[#202b33]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#30404d] px-3 py-2">
          <Geometrize editor={editor} iconOnly />
          <ForzaImporter editor={editor} iconOnly />
          <FMSBExporter editor={editor} iconOnly />
          <Button icon="undo" minimal title="Undo" disabled={!historyState.undo} onClick={undo}/>
          <Button icon="redo" minimal title="Redo" disabled={!historyState.redo} onClick={redo}/>
          {selectedLayer && (
            <>
              <div className="mx-1 h-6 w-px bg-[#394b59]"/>
              <Button minimal icon="duplicate" title="Duplicate layer" onClick={duplicateSelected}/>
              <Button minimal icon="trash" title="Delete layer" intent="danger" onClick={deleteSelected}/>
              <Button minimal icon="arrow-up" title="Bring forward" onClick={() => reorderSelected(1)}/>
              <Button minimal icon="arrow-down" title="Send back" onClick={() => reorderSelected(-1)}/>
              <Button minimal icon="arrows-horizontal" title="Flip X" onClick={() => flipSelected("flipX")}/>
              <Button minimal icon="arrows-vertical" title="Flip Y" onClick={() => flipSelected("flipY")}/>
              <div className="ml-1 flex items-center gap-2 border border-[#394b59] bg-[#182026] px-2 py-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Fill</span>
                <input
                  type="color"
                  value={getLayerColor(selectedLayer)}
                  onChange={(event) => updateSelectedLayer((layer) => withLayerColor(layer, event.target.value))}
                  className="h-7 w-9 border border-[#5c7080] bg-transparent"
                  title="Layer fill"
                />
              </div>
            </>
          )}
          <Button icon="zoom-out" minimal title="Zoom out" onClick={() => setZoom((current) => clamp(current - 0.1, 0.5, 2))}/>
          <Button text={`${Math.round(zoom * 100)}%`} disabled/>
          <Button icon="zoom-in" minimal title="Zoom in" onClick={() => setZoom((current) => clamp(current + 0.1, 0.5, 2))}/>
          <div className="ml-auto"/>
          <Button intent="primary" text="Save" onClick={() => onSave(editor)}/>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#182026] p-4">
          <div
            className="relative mx-auto"
            style={{
              width: defaultSize * zoom,
              height: defaultSize * zoom,
            }}
          >
          <div
            ref={canvasRef}
            className="relative overflow-hidden border border-[#5c7080] bg-[#10161a] shadow-[0_16px_40px_rgba(0,0,0,0.35)] origin-top-left"
            style={{
              width: defaultSize,
              height: defaultSize,
              transform: `scale(${zoom})`,
              backgroundImage: "linear-gradient(45deg, rgba(41,55,66,0.88) 25%, transparent 25%), linear-gradient(-45deg, rgba(41,55,66,0.88) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(41,55,66,0.88) 75%), linear-gradient(-45deg, transparent 75%, rgba(41,55,66,0.88) 75%)",
              backgroundSize: "64px 64px",
              backgroundPosition: "0 0, 0 32px, 32px -32px, -32px 0px",
            }}
            onPointerDown={() => setSelectedId(null)}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes("application/x-f1m-logo-asset")) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setIsCanvasDragOver(true);
              }
            }}
            onDragLeave={() => setIsCanvasDragOver(false)}
            onDrop={(event) => {
              const raw = event.dataTransfer.getData("application/x-f1m-logo-asset");
              if (!raw) {
                return;
              }
              event.preventDefault();
              setIsCanvasDragOver(false);
              addLayer(JSON.parse(raw), getPointerPosition(event, canvasRef.current));
            }}
          >
            <div className={`absolute inset-0 transition ${isCanvasDragOver ? "bg-[#48aff0]/5 ring-2 ring-inset ring-[#48aff0]" : ""}`}/>

            {layers.map((layer, index) => {
              const geometry = layerToGeometry(layer, index);

              return (
                <button
                  key={layer.id}
                  type="button"
                  className={`absolute block border-0 bg-transparent p-0 ${selectedId === layer.id ? "z-20" : "z-10"}`}
                  style={{
                    left: geometry.centerX,
                    top: geometry.centerY,
                    width: geometry.width,
                    height: geometry.height,
                    transform: `translate(-50%, -50%) rotate(${geometry.rotationDeg}deg) scale(${geometry.flipX ? -1 : 1}, ${geometry.flipY ? -1 : 1})`,
                    transformOrigin: "center",
                  }}
                  onPointerDown={(event) => {
                    setSelectedId(layer.id);
                    pushCurrentToUndo();
                    interactionRef.current = {
                      mode: "move",
                      index,
                      startPointer: getPointerPosition(event, canvasRef.current),
                      startElement: geometry.element,
                      rotationRad: layer.rotation * Math.PI / 180,
                      rebuild: (element) => rebuildFromElement(index, element, layer),
                    };
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onContextMenu={(event) => openContextMenu(event, layer.id)}
                >
                  <LayerArtwork layer={layer}/>
                </button>
              );
            })}

            {selectedGeometry && (
              <svg viewBox={`0 0 ${defaultSize} ${defaultSize}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
                <g transform={`translate(${selectedGeometry.centerX} ${selectedGeometry.centerY}) rotate(${selectedGeometry.rotationDeg})`}>
                  <rect
                    x={-selectedGeometry.width / 2}
                    y={-selectedGeometry.height / 2}
                    width={selectedGeometry.width}
                    height={selectedGeometry.height}
                    fill="none"
                    stroke="#48aff0"
                    strokeWidth="3"
                    strokeDasharray="14 10"
                  />
                  {[
                    {x: -selectedGeometry.width / 2, y: -selectedGeometry.height / 2, handleX: -1, handleY: -1},
                    {x: selectedGeometry.width / 2, y: -selectedGeometry.height / 2, handleX: 1, handleY: -1},
                    {x: selectedGeometry.width / 2, y: selectedGeometry.height / 2, handleX: 1, handleY: 1},
                    {x: -selectedGeometry.width / 2, y: selectedGeometry.height / 2, handleX: -1, handleY: 1},
                  ].map((handle, idx) => (
                    <circle
                      key={idx}
                      cx={handle.x}
                      cy={handle.y}
                      r="14"
                      fill="#f5f8fa"
                      stroke="#30404d"
                      strokeWidth="4"
                      className="pointer-events-auto cursor-nwse-resize"
                      onPointerDown={(event) => {
                        setSelectedId(selectedLayer.id);
                        beginInteraction("scale", event, handle);
                      }}
                    />
                  ))}
                  <line x1="0" y1={-selectedGeometry.height / 2} x2="0" y2={-selectedGeometry.height / 2 - 46} stroke="#48aff0" strokeWidth="3"/>
                  <circle
                    cx="0"
                    cy={-selectedGeometry.height / 2 - 56}
                    r="14"
                    fill="#48aff0"
                    stroke="#106ba3"
                    strokeWidth="4"
                    className="pointer-events-auto cursor-alias"
                    onPointerDown={(event) => {
                      setSelectedId(selectedLayer.id);
                      beginInteraction("rotate", event);
                    }}
                  />
                </g>
              </svg>
            )}
            {contextMenu && selectedLayer && (
              <div
                className="absolute z-30 min-w-[160px] border border-[#5c7080] bg-[#202b33] p-1 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
                style={{left: contextMenu.x, top: contextMenu.y}}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {[
                  {label: "Duplicate", onClick: duplicateSelected},
                  {label: "Delete", onClick: deleteSelected, danger: true},
                  {label: "Bring Forward", onClick: () => reorderSelected(1)},
                  {label: "Send Back", onClick: () => reorderSelected(-1)},
                  {label: "Flip X", onClick: () => flipSelected("flipX")},
                  {label: "Flip Y", onClick: () => flipSelected("flipY")},
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm transition ${
                      item.danger
                        ? "text-[#ff7373] hover:bg-[#5c1f1f]"
                        : "text-slate-100 hover:bg-[#30404d]"
                    }`}
                    onClick={() => runContextAction(item.onClick)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </section>

      <aside className="flex w-[280px] min-h-0 flex-col border border-[#394b59] bg-[#202b33]">
        <div className="border-b border-[#30404d] px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Inspector</div>
          <div className="mt-1 text-sm text-slate-200">Selection</div>
        </div>
        <div className="grid grid-cols-2 gap-px border-b border-[#30404d] bg-[#30404d]">
          <button
            type="button"
            onClick={() => setInspectorTab("layers")}
            className={`px-3 py-2 text-sm transition ${inspectorTab === "layers" ? "bg-[#202b33] text-white" : "bg-[#182026] text-slate-400 hover:bg-[#202b33]"}`}
          >
            Layers
          </button>
          <button
            type="button"
            onClick={() => setInspectorTab("controls")}
            className={`px-3 py-2 text-sm transition ${inspectorTab === "controls" ? "bg-[#202b33] text-white" : "bg-[#182026] text-slate-400 hover:bg-[#202b33]"}`}
          >
            Layer Controls
          </button>
        </div>
        {inspectorTab === "controls" ? (
          selectedLayer ? (
          <>
            <div className="mx-3 border border-[#30404d] bg-[#182026] p-3">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Fill</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={getLayerColor(selectedLayer)}
                  onChange={(event) => updateSelectedLayer((layer) => withLayerColor(layer, event.target.value))}
                  className="h-10 w-14 border border-[#5c7080] bg-transparent"
                />
                <div className="bg-[#293742] px-3 py-2 text-sm">{getLayerColor(selectedLayer)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-3 py-3">
              <label className="text-sm">
                <div className="mb-1 text-xs text-slate-400">X</div>
                <NumericInput
                  fill
                  value={selectedGeometry.element.PositionX.toFixed(3)}
                  onValueChange={(valueAsNumber) => {
                    const next = rebuildFromElement(selectedIndex, {
                      ...selectedGeometry.element,
                      PositionX: valueAsNumber,
                    }, selectedLayer);
                    const nextLayers = [...layers];
                    nextLayers[selectedIndex] = next;
                    replaceLayers(nextLayers);
                  }}
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-xs text-slate-400">Y</div>
                <NumericInput
                  fill
                  value={selectedGeometry.element.PositionY.toFixed(3)}
                  onValueChange={(valueAsNumber) => {
                    const next = rebuildFromElement(selectedIndex, {
                      ...selectedGeometry.element,
                      PositionY: valueAsNumber,
                    }, selectedLayer);
                    const nextLayers = [...layers];
                    nextLayers[selectedIndex] = next;
                    replaceLayers(nextLayers);
                  }}
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-xs text-slate-400">Width</div>
                <NumericInput
                  fill
                  min={MIN_SCALE}
                  value={Math.abs(selectedGeometry.element.ScaleX).toFixed(3)}
                  onValueChange={(valueAsNumber) => {
                    const next = rebuildFromElement(selectedIndex, {
                      ...selectedGeometry.element,
                      ScaleX: Math.max(MIN_SCALE, valueAsNumber) * Math.sign(selectedGeometry.element.ScaleX || 1),
                    }, selectedLayer);
                    const nextLayers = [...layers];
                    nextLayers[selectedIndex] = next;
                    replaceLayers(nextLayers);
                  }}
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-xs text-slate-400">Height</div>
                <NumericInput
                  fill
                  min={MIN_SCALE}
                  value={Math.abs(selectedGeometry.element.ScaleY).toFixed(3)}
                  onValueChange={(valueAsNumber) => {
                    const next = rebuildFromElement(selectedIndex, {
                      ...selectedGeometry.element,
                      ScaleY: Math.max(MIN_SCALE, valueAsNumber) * Math.sign(selectedGeometry.element.ScaleY || 1),
                    }, selectedLayer);
                    const nextLayers = [...layers];
                    nextLayers[selectedIndex] = next;
                    replaceLayers(nextLayers);
                  }}
                />
              </label>
              <label className="text-sm">
                <div className="mb-1 text-xs text-slate-400">Rotation</div>
                <NumericInput
                  fill
                  value={selectedLayer.rotation.toFixed(2)}
                  onValueChange={(valueAsNumber) => updateSelectedLayer((layer) => ({...layer, rotation: valueAsNumber}))}
                />
              </label>
            </div>

            <div className="mx-3 mt-3 border border-[#30404d] bg-[#182026] p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Nudge</div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div/>
                <button type="button" onClick={() => nudgeSelected(0, -8)} className="rounded bg-[#293742] px-3 py-2 text-sm hover:bg-[#30404d]">Up</button>
                <div/>
                <button type="button" onClick={() => nudgeSelected(-8, 0)} className="rounded bg-[#293742] px-3 py-2 text-sm hover:bg-[#30404d]">Left</button>
                <button type="button" onClick={() => nudgeSelected(0, 8)} className="rounded bg-[#293742] px-3 py-2 text-sm hover:bg-[#30404d]">Down</button>
                <button type="button" onClick={() => nudgeSelected(8, 0)} className="rounded bg-[#293742] px-3 py-2 text-sm hover:bg-[#30404d]">Right</button>
              </div>
            </div>
          </>
          ) : (
          <div className="m-3 border border-dashed border-[#5c7080] bg-[#182026] p-4 text-sm text-slate-400">
            Select a layer or add a new part from the asset library to start editing.
          </div>
          )
        ) : (
        <div className="m-3 min-h-0 flex-1 overflow-y-auto border border-[#30404d] bg-[#182026] p-3">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Layers</div>
          <div className="space-y-2">
            {[...layers].reverse().map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setSelectedId(layer.id)}
                className={`flex w-full items-center gap-3 border px-3 py-2 text-left transition ${
                  selectedId === layer.id
                    ? "border-[#48aff0] bg-[#137cbd]/15"
                    : "border-[#30404d] bg-[#202b33] hover:border-[#5c7080]"
                }`}
              >
                <div className="h-10 w-10 border border-[#5c7080] bg-[#10161a] p-1">
                  <img src={layer.src} alt="" className="h-full w-full object-contain"/>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{layer.name}</div>
                  <div className="truncate text-xs text-slate-400">{getLayerColor(layer)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        )}
      </aside>
    </div>
  );
}
