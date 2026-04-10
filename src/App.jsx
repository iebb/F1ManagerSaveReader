import '@/styles/globals.css'
import {BasicInfoHeader} from "@/components/Common/BasicInfoHeader";
import {parseBasicInfo} from "@/js/BasicInfo";
import {
  BasicInfoContext,
  BasicInfoUpdaterContext,
  DatabaseContext,
  EnvContext,
  MetadataContext,
  UiSettingsContext,
  UiSettingsUpdaterContext,
} from "@/js/Contexts";
import {
  analyzeFileToDatabase,
  detectDatabaseFile,
  loadDatabaseFromFile,
  parseGvasProps
} from "@/js/Parser";
import {createTeamColorTheme} from "@/ui/Theme";
import {
  Backdrop,
  Box,
  Button,
  CircularProgress,
  CssBaseline,
  LinearProgress,
  ThemeProvider,
  Typography
} from "@mui/material";
import {SnackbarProvider, useSnackbar} from "notistack";
import {useCallback, useContext, useEffect, useState} from "react";
import Dropzone from "react-dropzone";
import {Helmet} from "react-helmet";
import MainNav from "./components/Nav";
import DragBox from "./components/UI/Blocks/DragBox";
import Footer from "./components/UI/Footer";
import Header from "./components/UI/Header";
const defaultTheme = createTeamColorTheme(0);

function ParserStartupScreen({
  state,
  progress,
  statusText,
  errorMessage,
  onRetry,
}) {
  const isError = state === "error";

  return (
    <main className="app-startup">
      <section className="app-startup__panel">
        <div className="app-startup__eyebrow">Database Engine</div>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 800, letterSpacing: "-0.04em" }}>
          {isError ? "Parser failed to initialize" : "Preparing the save workspace"}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 620 }}>
          {isError
            ? "The local SQL runtime could not be loaded, so the editor cannot open save data yet."
            : "Loading the local SQLite runtime used to parse and edit save data directly in your browser."}
        </Typography>

        <div className="app-startup__meter">
          <div className="app-startup__meter-head">
            <span>{statusText}</span>
            <span>{isError ? "Error" : `${Math.max(0, Math.min(100, Math.round(progress)))}%`}</span>
          </div>
          <LinearProgress
            variant={isError ? "determinate" : "determinate"}
            value={isError ? 100 : Math.max(6, Math.min(100, progress))}
            color={isError ? "error" : "primary"}
            sx={{
              height: 8,
              borderRadius: 0,
              backgroundColor: "rgba(255,255,255,0.08)",
              "& .MuiLinearProgress-bar": {
                borderRadius: 0,
                background: isError
                  ? "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(239,68,68,0.95))"
                  : "linear-gradient(90deg, rgba(125,211,252,0.95), rgba(56,189,248,0.95))",
              },
            }}
          />
        </div>

        {isError ? (
          <div className="app-startup__error">
            <div className="app-startup__error-label">Load Error</div>
            <div className="app-startup__error-body">{errorMessage || "Unknown initialization error"}</div>
          </div>
        ) : (
          <div className="app-startup__status-grid">
            <div className="app-startup__status-card">
              <div className="app-startup__status-label">Mode</div>
              <div className="app-startup__status-value">Client-side SQLite</div>
            </div>
            <div className="app-startup__status-card">
              <div className="app-startup__status-label">Source</div>
              <div className="app-startup__status-value">SQL.js runtime</div>
            </div>
          </div>
        )}

        {isError ? (
          <div className="app-startup__actions">
            <Button variant="contained" color="error" onClick={onRetry} sx={{ borderRadius: 0, fontWeight: 700 }}>
              Retry parser load
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export function DataView() {
  const {version, gameVersion} = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);

  if (!version) {
    return null;
  }

  if (!basicInfo) {
    return (
      <section className="shell-empty-state">
        <div className="shell-empty-state__eyebrow">Unsupported Save</div>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800 }}>
          This file could not be parsed.
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 760 }}>
          The metadata loaded, but the SQLite data did not match the expected F1 Manager schema for this editor.
        </Typography>
      </section>
    );
  }

  return (
    <div
      className={`version_container game_v${version}`}
      ref={r => window.vc = r}
    >
      <BasicInfoHeader />
      <MainNav />
    </div>
  )
}

function AppShell({
  fullWidth,
  setFullWidth,
  db,
  setDb,
  metadata,
  setMetadata,
  inApp,
  setInApp,
  haveBackup,
  setHaveBackup,
  filePath,
  setFilePath,
  basicInfo,
  setBasicInfo,
  refresh,
}) {
  const { enqueueSnackbar } = useSnackbar();
  const [isImporting, setIsImporting] = useState(false);

  const applyLoadedState = useCallback(({ db: nextDb, metadata: nextMetadata }) => {
    let nextBasicInfo = null;
    if (nextMetadata.version) {
      nextBasicInfo = parseBasicInfo({ db: nextDb, metadata: nextMetadata });
    }

    setDb(nextDb);
    setMetadata(nextMetadata);
    setBasicInfo(nextBasicInfo);
    refresh();
  }, [refresh, setBasicInfo, setDb, setMetadata]);

  const openSaveFile = useCallback(async (file) => {
    setIsImporting(true);
    try {
      const result = await analyzeFileToDatabase(file);
      if (!result) {
        throw new Error("Failed to parse save file");
      }
      applyLoadedState(result);
      enqueueSnackbar(`Loaded ${file.name}`, { variant: "success" });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(`Unable to open save file: ${error.message || error}`, { variant: "error" });
    } finally {
      setIsImporting(false);
    }
  }, [applyLoadedState, enqueueSnackbar]);

  const replaceDatabase = useCallback(async (file) => {
    if (!metadata.version || !db) {
      enqueueSnackbar("Load a save file first. Raw databases only replace the database inside an opened save.", {
        variant: "warning",
      });
      return;
    }

    const confirmed = window.confirm(
      `Replace the current database with ${file.name}? This keeps the loaded save metadata and swaps only the SQLite database.`
    );
    if (!confirmed) {
      return;
    }

    setIsImporting(true);
    try {
      const nextDb = await loadDatabaseFromFile(file);
      parseBasicInfo({ db: nextDb, metadata });
      if (window.db && window.db !== nextDb) {
        window.db.close();
      }
      window.db = nextDb;
      applyLoadedState({
        db: nextDb,
        metadata,
      });
      enqueueSnackbar(`Replaced the loaded database with ${file.name}`, { variant: "success" });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(`Unable to replace database: ${error.message || error}`, { variant: "error" });
    } finally {
      setIsImporting(false);
    }
  }, [applyLoadedState, db, enqueueSnackbar, metadata]);

  const handleDroppedFiles = useCallback(async (files) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    try {
      const isDatabase = await detectDatabaseFile(file);
      if (isDatabase) {
        await replaceDatabase(file);
      } else {
        await openSaveFile(file);
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar(`Unable to inspect dropped file: ${error.message || error}`, { variant: "error" });
    }
  }, [enqueueSnackbar, openSaveFile, replaceDatabase]);

  useEffect(() => {
    const handleLoadFile = async (e) => {
      try {
        setFilePath(e.detail.path);
        setHaveBackup(e.detail.haveBackup);
        setInApp(true);
        window.mode = "app";
        window.file_path = e.detail.path;
        await openSaveFile(e.detail.file);
      } catch (error) {
        console.error(error);
      }
    };

    window.document.addEventListener('loadFile', handleLoadFile, false);
    return () => {
      window.document.removeEventListener('loadFile', handleLoadFile, false);
    };
  }, [openSaveFile, setFilePath, setHaveBackup, setInApp]);

  return (
    <EnvContext.Provider value={{ inApp, filePath, haveBackup }}>
      <Dropzone
        onDrop={handleDroppedFiles}
        noClick
        noKeyboard
        multiple={false}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            id="fullpage_dropzone"
            {...getRootProps({
              className: `app-shell ${isDragActive ? "drag-active" : ""}`,
            })}
          >
            <div className="app-shell__backdrop" />
            <div className="app-shell__ornament app-shell__ornament--one" />
            <div className="app-shell__ornament app-shell__ornament--two" />
            <input {...getInputProps()} hidden />
            <Header
              fullWidth={fullWidth}
              onToggleFullWidth={() => setFullWidth((current) => !current)}
              hasLoadedSave={Boolean(metadata.version && basicInfo)}
            />
            <DragBox fullWidth={fullWidth} isDragActive={isDragActive} />
            <main className={`${fullWidth ? "w-full px-4 md:px-6" : "mx-auto w-full max-w-screen-2xl px-4 md:px-6"} pb-4`}>
              <DataView />
            </main>
            <Footer fullWidth={fullWidth} />
            <Backdrop
              open={isDragActive || isImporting}
              sx={{
                zIndex: 1400,
                backgroundColor: "rgba(4, 10, 14, 0.76)",
                backdropFilter: "blur(10px)",
              }}
            >
              <Box className="drop-overlay">
                {isImporting ? (
                  <>
                    <CircularProgress size={28} thickness={4.5} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Loading file
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 480 }}>
                      Parsing save data locally and refreshing the editor.
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="overline" sx={{ letterSpacing: "0.18em", color: "text.secondary", fontWeight: 700 }}>
                      Drop Anywhere
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      Save file or database
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 560 }}>
                      `.sav` files open directly. `.db` files prompt to replace the currently loaded database.
                    </Typography>
                  </>
                )}
              </Box>
            </Backdrop>
          </div>
        )}
      </Dropzone>
    </EnvContext.Provider>
  );
}

export default function App() {

  const [theme, setTheme] = useState(defaultTheme);
  const [fullWidth, setFullWidth] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [parserState, setParserState] = useState(() => (typeof window !== "undefined" && window.SQL ? "ready" : "loading"));
  const [parserProgress, setParserProgress] = useState(() => (typeof window !== "undefined" && window.SQL ? 100 : 12));
  const [parserStatusText, setParserStatusText] = useState(() => (typeof window !== "undefined" && window.SQL ? "Database engine ready" : "Fetching SQL.js runtime"));
  const [parserError, setParserError] = useState("");
  const [db, setDb] = useState(null);
  const [metadata, setMetadata] = useState({});
  const [inApp, setInApp] = useState(false);
  const [haveBackup, setHaveBackup] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [basicInfo, setBasicInfo] = useState(null);
  const [uiSettings, setUiSettings] = useState(() => {
    if (typeof window === "undefined") {
      return {
        logoStyle: "normal",
        useRealWorldTeamBrands: true,
      };
    }
    const savedLogoStyle = window.localStorage.getItem("f1manager.logoStyle");
    const savedRealWorldTeamBrands = window.localStorage.getItem("f1manager.useRealWorldTeamBrands");
    if (savedLogoStyle === "colored") {
      return {
        logoStyle: "normal",
        useRealWorldTeamBrands: savedRealWorldTeamBrands !== "false",
      };
    }
    return {
      logoStyle: ["normal", "white", "colored-white"].includes(savedLogoStyle) ? savedLogoStyle : "normal",
      useRealWorldTeamBrands: savedRealWorldTeamBrands !== "false",
    };
  });

  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const loadSqlParser = useCallback(async () => {
    if (window.SQL) {
      setParserState("ready");
      setParserProgress(100);
      setParserStatusText("Database engine ready");
      setParserError("");
      setLoaded(true);
      return;
    }

    setLoaded(false);
    setParserState("loading");
    setParserProgress(12);
    setParserStatusText("Fetching SQL.js runtime");
    setParserError("");

    try {
      const SQL = await require('sql.js')({
        locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`
      });
      setParserProgress(74);
      setParserStatusText("Preparing database engine");
      window.SQL = SQL;
      if (!SQL.Database.prototype.getAllRows) {
        SQL.Database.prototype.getAllRows = function(...params) {
          let rows = [];
          const result = this.exec(...params);
          if (result.length) {
            let [{ values, columns }] = result;
            for (const r of values) {
              let row = {};
              r.map((x, _idx) => { row[columns[_idx]] = x });
              rows.push(row);
            }
          }
          return rows;
        };
      }
      setParserProgress(100);
      setParserStatusText("Database engine ready");
      setParserState("ready");
      setLoaded(true);
    } catch (error) {
      console.error(error);
      setParserState("error");
      setParserStatusText("Database engine failed to load");
      setParserError(error?.message || String(error));
      setLoaded(false);
    }
  }, []);

  useEffect(() => {
    setTheme(createTeamColorTheme(metadata.version));
  }, [metadata.version]);

  window.__teamBrandingContext = {
    useRealWorldTeamBrands: uiSettings.useRealWorldTeamBrands !== false,
    currentSeason: basicInfo?.player?.CurrentSeason || metadata?.currentSeason || null,
    startSeason: basicInfo?.player?.StartSeason || null,
  };

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
    if (parserState !== "loading") {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setParserProgress((current) => {
        if (current >= 92) {
          return current;
        }
        if (current < 38) {
          return current + 7;
        }
        if (current < 68) {
          return current + 4;
        }
        return current + 2;
      });
    }, 180);

    return () => window.clearInterval(timer);
  }, [parserState]);

  useEffect(() => {
    if (window?.navigator?.userAgent?.includes("MRCHROME") && !inApp) {
      setInApp(true);
    }
    loadSqlParser();
  }, [inApp, loadSqlParser]);


  return (
    <DatabaseContext.Provider value={db}>
      <MetadataContext.Provider value={metadata}>
        <BasicInfoContext.Provider value={basicInfo}>
          <UiSettingsContext.Provider value={uiSettings}>
            <UiSettingsUpdaterContext.Provider value={(nextSettings) => {
              setUiSettings((current) => {
                const resolved = typeof nextSettings === "function"
                  ? nextSettings(current)
                  : { ...current, ...nextSettings };
                const nextLogoStyle = ["normal", "white", "colored-white"].includes(resolved.logoStyle)
                  ? resolved.logoStyle
                  : "normal";
                window.localStorage.setItem("f1manager.logoStyle", nextLogoStyle);
                window.localStorage.setItem("f1manager.useRealWorldTeamBrands", resolved.useRealWorldTeamBrands === false ? "false" : "true");
                return {
                  ...resolved,
                  logoStyle: nextLogoStyle,
                  useRealWorldTeamBrands: resolved.useRealWorldTeamBrands !== false,
                };
              });
            }}>
              <ThemeProvider theme={theme}>
                <Helmet>
                  <meta name="viewport" content="initial-scale=1, width=device-width"/>
                  <title>F1 Manager Save Browser</title>
                  <meta name="description" content="F1 Manager Save Browser by ieb"/>
                  <link rel="icon" href="/favicon.ico"/>
                </Helmet>
                <SnackbarProvider
                  maxSnack={10}
                  anchorOrigin={{vertical: 'top', horizontal: 'right'}}
                >
                  <CssBaseline />
                  {loaded && parserState === "ready" ? (
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
                        <AppShell
                          fullWidth={fullWidth}
                          setFullWidth={setFullWidth}
                          db={db}
                          setDb={setDb}
                          metadata={metadata}
                          setMetadata={setMetadata}
                          inApp={inApp}
                          setInApp={setInApp}
                          haveBackup={haveBackup}
                          setHaveBackup={setHaveBackup}
                          filePath={filePath}
                          setFilePath={setFilePath}
                          basicInfo={basicInfo}
                          setBasicInfo={setBasicInfo}
                          refresh={refresh}
                        />
                      </BasicInfoUpdaterContext.Provider>
                    ) : (
                      <ParserStartupScreen
                        state={parserState}
                        progress={parserProgress}
                        statusText={parserStatusText}
                        errorMessage={parserError}
                        onRetry={loadSqlParser}
                      />
                    )
                  }
                </SnackbarProvider>
              </ThemeProvider>
            </UiSettingsUpdaterContext.Provider>
          </UiSettingsContext.Provider>
        </BasicInfoContext.Provider>
      </MetadataContext.Provider>
    </DatabaseContext.Provider>
  );
}
