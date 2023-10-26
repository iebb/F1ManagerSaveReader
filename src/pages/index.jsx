import {Container, Typography} from "@mui/material";
import Head from 'next/head'
import {useState} from "react";
import Dropzone from 'react-dropzone'
import DataView from "../components/F1M2023/DataView";

export default function Home() {

  const [file, setFile] = useState(undefined);

  return (
    <>
      <Head>
        <title>F1 Manager Save Viewer</title>
        <meta name="description" content="F1 Manager Save Viewer by ieb" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Container maxWidth="xl" component="main" sx={{ pt: 1, pb: 1 }}>
        <Dropzone
          onDropAccepted={files => setFile(files[0])}
          noClick
          multiple={false}
        >
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} hidden />
              <div id="dropzone">
                <Typography variant="h5" component="h5">
                  Drag your F1 Manager 2023 savefile here to get started.
                </Typography>
                <Typography variant="p" component="p" sx={{ mt: 2 }}>
                  F1 Manager 2023: %LOCALAPPDATA%\F1Manager23\Saved\SaveGames
                  <br />
                  If you are playing Xbox Store version, please use <a
                    href="https://github.com/Fr33dan/GPSaveConverter/releases">
                    GPSaveConverter
                  </a> to convert the savefile into original format.
                  <br />
                  F1 Manager 2022 savefiles will not work.
                </Typography>
              </div>
            </div>
          )}
        </Dropzone>
      </Container>
      <Container maxWidth="xl" component="main" sx={{ pt: 1, pb: 1 }}>
        <DataView file={file} />
      </Container>
    </>
  )
}
