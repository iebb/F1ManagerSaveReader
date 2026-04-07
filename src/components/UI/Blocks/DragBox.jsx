import {Alert, Box, Link, Stack, Typography} from "@mui/material";
import {useContext} from "react";
import {EnvContext, MetadataContext} from "@/js/Contexts";

export default function DragBox({fullWidth = false, isDragActive = false}) {
  const {version, gameVersion} = useContext(MetadataContext)
  const env = useContext(EnvContext);

  if (env.inApp || version) {
    return null;
  }

  const shellClassName = fullWidth ? "w-full px-4 py-2 md:px-6" : "mx-auto w-full max-w-screen-2xl px-4 py-2 md:px-6";
  return (
    <section className={shellClassName}>
      <Box
        id="dropzone"
        className={`drop-hero ${isDragActive ? "drop-hero--active" : ""}`}
      >
        <div className="drop-hero__header">
          <div className="drop-hero__copy">
            <div className="drop-hero__eyebrow">Start Here</div>
            <Typography variant="h4" component="h2" sx={{fontWeight: 800, letterSpacing: "-0.03em"}}>
              Drop a save to begin.
            </Typography>
            <Typography variant="body1" sx={{color: "text.secondary", maxWidth: 760}}>
              Drop a `.sav` anywhere to open it. After a save is loaded, you can also drop a `.db` to replace the embedded database without changing the save metadata.
            </Typography>
          </div>
          <div className="drop-hero__aside">
            <div className="drop-hero__card">
              <div className="drop-hero__label">Windows App</div>
              <div className="drop-hero__value">Optional desktop helper</div>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1.25 }}>
                Steam and Xbox users can use the{" "}
                <Link href="https://github.com/iebb/F1MSaveApp/releases/" target="_blank" rel="noreferrer">Windows App</Link>
                {" "}for direct save access and one-click overwrite or backup support.
              </Typography>
            </div>
          </div>
        </div>
        <div className="drop-hero__grid">
          <div className="drop-hero__card">
            <div className="drop-hero__label">Save Locations</div>
            <Stack spacing={0.5} sx={{fontFamily: "var(--font-mono)", fontSize: 13, color: "text.secondary", mt: 0.25}}>
              <div>2024: `%LOCALAPPDATA%\\F1Manager24\\Saved\\SaveGames`</div>
              <div>2023: `%LOCALAPPDATA%\\F1Manager23\\Saved\\SaveGames`</div>
              <div>2022: `%LOCALAPPDATA%\\F1Manager22\\Saved\\SaveGames`</div>
            </Stack>
          </div>
          <div className="drop-hero__card">
            <div className="drop-hero__label">Database Replace</div>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
              Use `.db` imports only after loading a save. You will get a confirmation prompt before the embedded SQLite database is swapped.
            </Typography>
          </div>
        </div>
        <Alert severity="info" sx={{mt: 1}}>
          Xbox Store saves may need{" "}
          <Link href="https://github.com/Fr33dan/GPSaveConverter/releases" target="_blank" rel="noreferrer">GPSaveConverter</Link>
          {" "}to convert them into the original format.
        </Alert>
      </Box>
    </section>
  )
}
