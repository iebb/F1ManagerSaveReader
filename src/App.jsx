import '@/styles/globals.css'
import {BasicInfoHeader} from "@/components/Common/BasicInfoHeader";
import {parseBasicInfo} from "@/js/BasicInfo";
import {
  BasicInfoContext,
  BasicInfoUpdaterContext,
  DatabaseContext,
  DatabaseUpdaterContext,
  EnvContext,
  MetadataContext,
} from "@/js/Contexts";
import {analyzeFileToDatabase, parseGvasProps} from "@/js/Parser";
import {defaultFontFamily} from "@/ui/Fonts";
import {createTeamColorTheme} from "@/ui/Theme";
import {Container, createTheme, CssBaseline, ThemeProvider, Typography} from "@mui/material";
import {SnackbarProvider} from "notistack";
import {useContext, useEffect, useState} from "react";
import Dropzone from "react-dropzone";
import {Helmet} from "react-helmet";
import MainNav from "./components/Nav";
import DragBox from "./components/UI/Blocks/DragBox";
import Footer from "./components/UI/Footer";
import Header from "./components/UI/Header";

const defaultTheme = createTheme({
  palette: {
    mode: 'dark',
    white: {
      main: '#eee',
      contrastText: '#222',
    },
  },
  typography: { fontFamily: defaultFontFamily },
});



export function DataView() {
  const {version, gameVersion} = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);

  if (!version) {
    return (
      <Typography variant="h5" component="h5" sx={{ m: 2 }}>
        Please drag a file first. All processing is done client-side so your savefile won't be uploaded.
      </Typography>
    );
  }

  if (!basicInfo) {
    return (
      <Typography variant="h5" component="h5" sx={{ m: 2 }}>
        This savefile is corrupted or unsupported.
      </Typography>
    );
  }

  return (
    <div className={`version_container game_v${version}`} ref={r => window.vc = r}>
      <BasicInfoHeader />
      <MainNav />
    </div>
  )
}


export default function App() {

  const [theme, setTheme] = useState(defaultTheme);
  const [loaded, setLoaded] = useState(false);
  const [db, setDb] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [inApp, setInApp] = useState(false);
  const [haveBackup, setHaveBackup] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [basicInfo, setBasicInfo] = useState(null);

  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  useEffect(() => {
    setTheme(createTeamColorTheme(metadata.version));
  }, [metadata.version]);

  const openFile = (f) => {
    try {
      analyzeFileToDatabase(f).then(({db, metadata}) => {
        setDb(db);
        setMetadata(metadata);
        if (metadata.version) {
          try {
            setBasicInfo(parseBasicInfo({ db, metadata }))
            refresh();
          } catch (e) {
            console.error(e);
            setBasicInfo(null);
          }
        } else {
          setBasicInfo(null);
        }
      });
    } catch (e) {

    }
  }

  const updateBasicInfo = () => {
    try {
      setBasicInfo(parseBasicInfo({
        db, metadata
      }))
    } catch (e) {
      console.error(e);
      setBasicInfo(null);
    }
  }


  useEffect(() => {
    if (window?.navigator?.userAgent?.includes("MRCHROME") && !inApp) {
      setInApp(true);
    }
    if (!window.initialized) {
      window.initialized = true;
      require('sql.js')({
        locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
      }).then(SQL => {
        window.SQL = SQL;
        SQL.Database.prototype.getAllRows = function(...params) {
          let rows = [];
          const result = this.exec(...params);
          if (result.length) {
            let [{ values, columns }] = result;
            for (const r of values) {
              let row = {};
              r.map((x, _idx) => { row[columns[_idx]] = x })
              rows.push(row);
            }
          }
          return rows;
        }
        setLoaded(true);
      });

      window.document.addEventListener('loadFile', e => {
        console.log(e.detail);
        openFile(e.detail.file);
        setFilePath(e.detail.path);
        setHaveBackup(e.detail.haveBackup);
        setInApp(true);
        window.mode = "app";
        window.file_path = e.detail.path;
      }, false)
    }
  }, []);


  return (
    <DatabaseContext.Provider value={db}>
      <DatabaseUpdaterContext.Provider value={setDb}>
        <MetadataContext.Provider value={metadata}>
          <BasicInfoContext.Provider value={basicInfo}>
            <ThemeProvider theme={theme}>
              <Helmet>
                <meta name="viewport" content="initial-scale=1, width=device-width"/>
                <title>F1 Manager Save Browser - F1Setup.CFD</title>
                <meta name="description" content="F1 Manager Save Browser by ieb"/>
                <link rel="icon" href="/favicon.ico"/>
              </Helmet>
              <SnackbarProvider
                maxSnack={10}
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
              >
                <CssBaseline />
                {
                  loaded ? (
                    <BasicInfoUpdaterContext.Provider value={({ metadata }) => {
                      if (metadata) {
                        metadata = {
                          ...metadata,
                          ...parseGvasProps(metadata.gvasMeta.Properties),
                        };
                        setMetadata(metadata);
                      }
                      updateBasicInfo()
                    }}>
                      <EnvContext.Provider value={{ inApp, filePath, haveBackup }}>
                        <Dropzone
                          onDropAccepted={files => openFile(files[0])}
                          noClick
                          multiple={false}
                        >
                          {({ getRootProps, getInputProps }) => (
                            <div id="fullpage_dropzone" {...getRootProps()}>
                              <Header />
                              <input {...getInputProps()} hidden />
                              <DragBox />
                              <Container maxWidth={false} component="main">
                                <DataView key={updated} />
                              </Container>
                              <Footer />
                            </div>
                          )}
                        </Dropzone>
                      </EnvContext.Provider>
                    </BasicInfoUpdaterContext.Provider>
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
          </BasicInfoContext.Provider>
        </MetadataContext.Provider>
      </DatabaseUpdaterContext.Provider>
    </DatabaseContext.Provider>
  );
}
