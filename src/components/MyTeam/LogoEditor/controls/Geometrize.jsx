import {Button, Dialog, DialogBody, DialogFooter, FileInput, Slider} from "@blueprintjs/core";
import {Bitmap, ImageRunner, ShapeTypes, SvgExporter} from 'geometrizejs';
import {enqueueSnackbar} from "notistack";
import React, {useRef, useState} from "react";
import {geometrizerToJson} from "../logo/utils.jsx";
import "jimp/browser/lib/jimp";

const { Jimp } = window;

function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export const Geometrize = ({ store }) => {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [imageStr, setImageStr] = useState('');
  const [svgImageStr, setSvgImageStr] = useState('');

  const [maxResolution, setMaxResolution] = useState(768);
  const [iteration, setIteration] = useState(1000);
  const [mutation, setMutation] = useState(150);
  const [candidate, setCandidate] = useState(150);

  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);

  const working = useRef(true);

  const options = {
    candidateShapesPerStep: candidate,
    alpha: 255,
    shapeMutationsPerStep: mutation,
    shapeTypes: [ShapeTypes.ROTATED_ELLIPSE],
  }


  async function geometrize(image, onStep) {
    working.current = true;
    const im = image.clone();
    if (im.bitmap.width > maxResolution || im.bitmap.height > maxResolution) {
      const scale = Math.max(im.bitmap.width, im.bitmap.height) / im.bitmap.width;
      await im.resize(
        im.bitmap.width / scale, im.bitmap.height / scale,
        Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE
      );
    }
    const bitmap = Bitmap.createFromByteArray(im.bitmap.width, im.bitmap.height, im.bitmap.data);
    const runner = new ImageRunner(bitmap);


    const toSvg = (svgData) => SvgExporter.getSvgPrelude() + SvgExporter.getSvgNodeOpen(bitmap.width, bitmap.height) + svgData + SvgExporter.getSvgNodeClose();
    const shapeData = [];

    let t = 0;

    for (let i = 0; i < iteration; i++) {
      const step = runner.step(options);
      await new Promise(r => setTimeout(r, 1));
      shapeData.push(step[0]);
      if (+new Date() - t > 50) {
        setProgress(i);
        if (onStep) {
          onStep(toSvg(SvgExporter.exportShapes(shapeData)))
          await new Promise(r => setTimeout(r, 1));
        }
        t = +new Date();
      }
      if (!working.current) {
        onStep(toSvg(SvgExporter.exportShapes(shapeData)))
        return {
          shapes: shapeData,
          w: image.bitmap.width,
          h: image.bitmap.height
        };
      }
      // await sleep(state.stepTimeout || 1)
    }
    onStep(toSvg(SvgExporter.exportShapes(shapeData)))
    setProgress(options.iterations);
    working.current = false;
    return {
      shapes: shapeData,
      w: image.bitmap.width,
      h: image.bitmap.height
    };
    // return SvgExporter.getSvgPrelude() + SvgExporter.getSvgNodeOpen(bitmap.width, bitmap.height) + svgData.join('\n') + SvgExporter.getSvgNodeClose()
  }

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className="bp5-dark">
      <Button
        intent="warning"
        onClick={() => {
          setOpen(true);
          setImage(null);
          setSvgImageStr(null);
          setResult(null);
          setImageStr(null);
          working.current = false;
        }}
      >
        Import Image
      </Button>
      <Dialog
        isOpen={open}
        onClose={handleClose}
        title="Import Image (Experimental)"
        className="w-[75vw] max-w-[1200px]"
      >
        <DialogBody>
          <div className="my-2 flex gap-4 flex-col">
            <div className='flex gap-4 '>

              <FileInput
                text="Choose file..."
                accept="image/*"
                onInputChange={async e => {
                  if (e?.currentTarget?.files?.length) {
                    const blob = e.currentTarget.files[0];
                    const imageStr = await blobToBase64(blob);
                    // svgRef.current.innerHTML = '<svg />';
                    const image = await Jimp.read(imageStr);
                    setImageStr(imageStr);
                    setSvgImageStr('');
                    setImage(image);
                  }
                }}
              />
              <Button
                intent='primary'
                onClick={async () => {
                  setResult(await geometrize(image, s => {
                    setSvgImageStr("data:image/svg+xml," + s)
                    // svgRef.current.innerHTML = s;
                    //this.svg = this.state.svgContainer!.innerHTML = s
                  }))
                }}
                disabled={!image}
              >
                Run
              </Button>
              <Button
                intent='danger'
                onClick={() => working.current = false}
                disabled={!working.current}
              >
                Stop {progress} / {iteration}
              </Button>
              <Button
                intent="success"
                text="Import Result"
                disabled={!result}
                onClick={() => {
                  try {
                    store.loadJSON(geometrizerToJson(result));
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
            <div className="flex gap-10">
              <div>
                <div className="text-sm w-full flex">
                  ◀ Speed
                  <b className="flex-1 text-center">Shapes</b>
                  Quality ▶
                </div>
                <Slider
                  className="w-64"
                  min={10}
                  max={2000}
                  stepSize={10}
                  labelValues={[250, 500, 750, 1000, 1500, 2000]}
                  onChange={n => setIteration(n)}
                  value={iteration}
                  handleHtmlProps={{"aria-label": "Iteration"}}
                />
              </div>
              <div>
                <div className="text-sm w-full flex">
                  ◀ Speed
                  <b className="flex-1 text-center">Mutation</b>
                  Quality ▶
                </div>
                <Slider
                  className="w-64"
                  min={10}
                  max={1000}
                  stepSize={10}
                  labelValues={[10, 100, 300, 500, 750, 1000]}
                  onChange={n => setMutation(n)}
                  value={mutation}
                  handleHtmlProps={{"aria-label": "Mutation"}}
                />
              </div>
              <div>
                <div className="text-sm w-full flex">
                  ◀ Speed
                  <b className="flex-1 text-center">Randomness</b>
                  Quality ▶
                </div>
                <Slider
                  className="w-64"
                  min={10}
                  max={1000}
                  stepSize={10}
                  labelValues={[10, 100, 300, 500, 750, 1000]}
                  onChange={n => setCandidate(n)}
                  value={candidate}
                  handleHtmlProps={{"aria-label": "Mutation"}}
                />
              </div>
              <div>
                <div className="text-sm w-full flex">
                  ◀ Speed
                  <b className="flex-1 text-center">Resolution</b>
                  Quality ▶
                </div>
                <Slider
                  className="w-64"
                  min={10}
                  max={2048}
                  stepSize={10}
                  labelValues={[10, 100, 300, 500, 750, 1000, 2048]}
                  onChange={n => setMaxResolution(n)}
                  value={maxResolution}
                  handleHtmlProps={{"aria-label": "Mutation"}}
                />
              </div>
            </div>
          </div>
          <div>
            <div className="flex gap-10 max-h-[500px] py-2">
              <div className="basis-1/2 flex-grow-0 w-0">
                <p className="my-4">original</p>
                <img src={imageStr}/>
              </div>
              <div className="basis-1/2 flex-grow-0 w-0">
                <p className="my-4">geometrized</p>
                <img src={svgImageStr}/>
              </div>
            </div>
          </div>
        </DialogBody>
        <DialogFooter actions={
          <div className="flex">
            <Button
              intent="success"
              text="Import Result"
              disabled={!result}
              onClick={() => {
                try {
                  store.loadJSON(geometrizerToJson(result));
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
    </div>
  );
};
