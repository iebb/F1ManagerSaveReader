import {Container, Typography} from "@mui/material";
import Head from 'next/head'
import {useEffect, useState} from "react";
import Dropzone from 'react-dropzone'
import DataView from "../components/DataView";
import {analyzeFileToDatabase} from "../js/fileAnalyzer";
import {
  MetadataContext,
  DatabaseContext,
  DatabaseUpdaterContext,
  VersionContext,
  EnvContext
} from "../components/Contexts";

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [db, setDb] = useState(null);
  const [version, setVersion] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [inApp, setInApp] = useState(false);
  const [filePath, setFilePath] = useState("");
  const openFile = (f) => {
    analyzeFileToDatabase(f).then(({db, version, metadata}) => {
      setDb(db);
      setVersion(version);
      setMetadata(metadata);
    });
  }


  useEffect(() => {
    require('sql.js')({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${f}`
    }).then(SQL => {
      window.SQL = SQL;
      setLoaded(true);
    });
    window.document.addEventListener('loadFile', e => {
      openFile(e.detail.file);
      setFilePath(e.detail.path);
      setInApp(true);
      window.mode = "app";
    }, false)
  }, []);

  return (
    <>
      <Head>
        <title>F1 Manager Save Browser - F1Setup.CFD</title>
        <meta name="description" content="F1 Manager Save Browser by ieb" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {
        loaded ? (
          <Dropzone
            onDropAccepted={files => openFile(files[0])}
            noClick
            multiple={false}
          >
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps()}>
                {
                  !inApp && (
                    <Container maxWidth="xl" component="main" sx={{ pt: 1, pb: 1 }}>
                      <input {...getInputProps()} hidden />
                      <div id="dropzone">
                        {
                          version ? (
                            <>
                              <Typography variant="h5" component="h5">
                                Drag another savefile here to start over.
                              </Typography>
                            </>
                          ) : (
                            <>
                              <Typography variant="h5" component="h5">
                                Drag your F1 Manager 2022/2023 savefile here to get started.
                              </Typography>
                              <Typography variant="p" component="p" sx={{ mt: 2 }}>
                                F1 Manager 2023: %LOCALAPPDATA%\F1Manager23\Saved\SaveGames
                                <br />
                                F1 Manager 2022: %LOCALAPPDATA%\F1Manager22\Saved\SaveGames
                                <br />
                                If you are playing Xbox Store version, please use <a
                                href="https://github.com/Fr33dan/GPSaveConverter/releases">
                                GPSaveConverter
                              </a> to convert the savefile into original format.
                                <br />
                                Support for F1 Manager 2022 might be limited.
                              </Typography>
                            </>
                          )
                        }

                      </div>
                    </Container>
                  )
                }
                <Container maxWidth="xl" component="main" sx={{ pt: 1, pb: 1 }}>
                  <VersionContext.Provider value={version}>
                    <DatabaseContext.Provider value={db}>
                      <DatabaseUpdaterContext.Provider value={setDb}>
                        <MetadataContext.Provider value={metadata}>
                          <EnvContext.Provider value={{
                            inApp,
                            filePath,
                          }}>
                            <DataView />
                          </EnvContext.Provider>
                        </MetadataContext.Provider>
                      </DatabaseUpdaterContext.Provider>
                    </DatabaseContext.Provider>
                  </VersionContext.Provider>
                </Container>
              </div>
            )}
          </Dropzone>
        ) : (
          <Container maxWidth="xl" component="main" sx={{ pt: 1, pb: 1 }}>
            <Typography variant="h5" component="h5">
              Loading Database parser. Please wait.
            </Typography>
          </Container>
        )
      }
    </>
  )
}
