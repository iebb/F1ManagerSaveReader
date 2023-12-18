import {Container, Typography} from "@mui/material";
import {useContext} from "react";
import {EnvContext, VersionContext} from "../../Contexts";

export default function DragBox() {
  const version = useContext(VersionContext);
  const env = useContext(EnvContext);

  if (env.inApp || version) {
    return null;
  }

  return (
    <Container maxWidth={false} component="main">
      <div id="dropzone">
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
      </div>
    </Container>
  )
}