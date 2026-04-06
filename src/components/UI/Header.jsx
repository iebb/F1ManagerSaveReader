import {Box, Container, Divider, Link, Typography} from "@mui/material";
import KofiButton from "./Kofi/Kofi";

export default function Header() {
  return (
    <Container maxWidth={false} component="header" sx={{px: {xs: 2, md: 3}, pt: 2}}>
      <Box sx={{
        border: "1px solid rgba(255,255,255,0.08)",
        px: {xs: 2, md: 2.5},
        py: 2,
        backgroundColor: "rgba(255,255,255,0.02)",
      }}>
        <div className="headerContainer">
          <div className="headerTitle">
            <Typography variant="h4" component="h1" sx={{fontWeight: 700, lineHeight: 1.1}}>
              F1 Manager Save Browser
            </Typography>
            <Typography variant="body2" sx={{mt: 0.75, color: "text.secondary", maxWidth: 760}}>
              Tool for browsing, editing, and exporting F1 Manager save data locally.
            </Typography>
          </div>
          <div className="headerUser">
            <KofiButton kofiID='A0A8ERCTF' title="Support on Ko-fi" color='#29abe0' />
          </div>
        </div>
        <Typography variant="body2" sx={{pt: 1.25, color: "text.secondary"}}>
          Support:
          {" "}
          <Link href="https://github.com/iebb/F1ManagerSaveReader/issues" target="_blank" rel="noreferrer" underline="hover" color="inherit">
            GitHub issues
          </Link>
          {" · "}
          Local processing only
        </Typography>
      </Box>
      <Divider variant="fullWidth" sx={{mt: 1.5}} />
    </Container>
  )
}
