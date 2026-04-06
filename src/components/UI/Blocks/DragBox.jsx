import {Alert, Box, Container, Link, Stack, Typography} from "@mui/material";
import {useContext} from "react";
import {EnvContext, MetadataContext} from "@/js/Contexts";

export default function DragBox() {
  const {version, gameVersion} = useContext(MetadataContext)
  const env = useContext(EnvContext);

  if (env.inApp || version) {
    return null;
  }

  return (
    <Container maxWidth={false} component="main" sx={{px: {xs: 2, md: 3}, py: 2}}>
      <Box
        id="dropzone"
        sx={{
          display: "grid",
          gap: 1.5,
          textAlign: "left",
          border: "1px dashed rgba(255,255,255,0.18)",
          p: {xs: 2, md: 2.5},
          backgroundColor: "rgba(255,255,255,0.015)",
        }}
      >
        <Typography variant="h6" component="h2" sx={{fontWeight: 700}}>
          Drag a savefile here to get started.
        </Typography>
        <Typography variant="body2" sx={{color: "text.secondary", maxWidth: 880}}>
          Steam and Xbox users can also use the{" "}
          <Link href="https://github.com/iebb/F1MSaveApp/releases/" target="_blank" rel="noreferrer">Windows App</Link>
          {" "}for direct save access.
        </Typography>
        <Stack spacing={0.5} sx={{fontFamily: "var(--font-mono)", fontSize: 13, color: "text.secondary"}}>
          <div>2024: `%LOCALAPPDATA%\\F1Manager24\\Saved\\SaveGames`</div>
          <div>2023: `%LOCALAPPDATA%\\F1Manager23\\Saved\\SaveGames`</div>
          <div>2022: `%LOCALAPPDATA%\\F1Manager22\\Saved\\SaveGames`</div>
        </Stack>
        <Alert severity="info" sx={{mt: 1}}>
          Xbox Store saves may need{" "}
          <Link href="https://github.com/Fr33dan/GPSaveConverter/releases" target="_blank" rel="noreferrer">GPSaveConverter</Link>
          {" "}to convert them into the original format.
        </Alert>
      </Box>
    </Container>
  )
}
