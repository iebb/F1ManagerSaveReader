import '@/styles/globals.css'
import {Container, createTheme, CssBaseline, ThemeProvider, Typography} from "@mui/material";
import {Plus_Jakarta_Sans} from 'next/font/google'
import Head from "next/head";
import {SnackbarProvider} from "notistack";
import {useEffect, useState} from "react";
import Dropzone from "react-dropzone";
import {
  DatabaseContext,
  DatabaseUpdaterContext,
  EnvContext,
  MetadataContext,
  VersionContext
} from "../components/Contexts";
import Footer from "../components/UI/Footer";
import Header from "../components/UI/Header";
import {analyzeFileToDatabase} from "../js/fileAnalyzer";

const pjs = Plus_Jakarta_Sans({ subsets: ['latin'] });
const theme = createTheme({
  palette: {
    mode: 'dark',
    white: {
      main: '#eee',
      contrastText: '#222',
    },
  },
  typography: {
    fontFamily: `"Plus Jakarta Sans", ${pjs.style.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", ` +
      'Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
  },
});
export default function App({ Component, pageProps }) {

  const [loaded, setLoaded] = useState(false);
  const [db, setDb] = useState(null);
  const [version, setVersion] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [inApp, setInApp] = useState(false);
  const [filePath, setFilePath] = useState("");
  const openFile = (f) => {
    analyzeFileToDatabase(f).then(({db, metadata}) => {
      setDb(db);
      setVersion(metadata.version);
      setMetadata(metadata);
    });
  }


  useEffect(() => {

    if (window?.navigator?.userAgent?.includes("MRCHROME") && !inApp) {
      setInApp(true);
    }

    require('sql.js')({
      locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.9.0/${f}`
    }).then(SQL => {
      window.SQL = SQL;
      setLoaded(true);
    });

    window.document.addEventListener('loadFile', e => {
      openFile(e.detail.file);
      setFilePath(e.detail.path);
      setInApp(true);
      window.mode = "app";
      window.file_path = e.detail.path;
    }, false)
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width"/>
        <title>F1 Manager Save Browser - F1Setup.CFD</title>
        <meta name="description" content="F1 Manager Save Browser by ieb"/>
        <link rel="icon" href="/favicon.ico"/>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <SnackbarProvider maxSnack={3} anchorOrigin={{vertical: 'top', horizontal: 'right'}}>
        <CssBaseline/>
        {
          loaded ? (
            <Dropzone
              onDropAccepted={files => openFile(files[0])}
              noClick
              multiple={false}
            >
              {({ getRootProps, getInputProps }) => (
                <div {...getRootProps()}>
                  <Header/>
                  {
                    !inApp && (
                      <Container maxWidth={false} component="main">
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
                                  Try our <a href="https://github.com/iebb/F1MSaveApp/releases/">Windows App</a>, which is able to read Steam and Xbox saves directly.
                                </Typography>
                                <Typography variant="h5" component="h5">
                                  Or... drag your F1 Manager 2022/2023 savefile here to get started.
                                </Typography>
                                <Typography variant="p" component="p" sx={{ mt: 2 }}>
                                  F1 Manager 2023: %LOCALAPPDATA%\F1Manager23\Saved\SaveGames
                                  <br />
                                  F1 Manager 2022: %LOCALAPPDATA%\F1Manager22\Saved\SaveGames
                                  <br />
                                  If you are playing Xbox Store version, please use <a
                                  href="https://github.com/Fr33dan/GPSaveConverter/releases">
                                  GPSaveConverter
                                </a> to convert the savefile into original format, or use the Windows App.
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
                  <Container maxWidth={false} component="main">
                    <VersionContext.Provider value={version}>
                      <DatabaseContext.Provider value={db}>
                        <DatabaseUpdaterContext.Provider value={setDb}>
                          <MetadataContext.Provider value={metadata}>
                            <EnvContext.Provider value={{
                              inApp,
                              filePath,
                            }}>
                              <Component {...pageProps} />
                            </EnvContext.Provider>
                          </MetadataContext.Provider>
                        </DatabaseUpdaterContext.Provider>
                      </DatabaseContext.Provider>
                    </VersionContext.Provider>
                  </Container>
                  <Footer />
                </div>
              )}
            </Dropzone>
          ) : (
            <Container maxWidth={false} component="main">
              <Typography variant="h5" component="h5">
                Loading Database parser. Please wait.
              </Typography>
            </Container>
          )
        }
      </SnackbarProvider>
    </ThemeProvider>
  );
}
