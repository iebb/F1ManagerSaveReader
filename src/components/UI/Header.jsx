import {Container, Divider, Typography} from "@mui/material";
import KofiButton from "./Kofi/Kofi";

export default function Header() {
  return (
    <Container maxWidth={false} component="main">
      <div className="headerContainer">
        <div className="headerTitle" >
          <Typography variant="h3" component="h3">
            F1 Manager Save Browser
            <span
              style={{ color: "#777", fontSize: 15, marginInline: 15, textTransform: "uppercase" }}
            >{' '}for F1® Manager 2022/2023 @ F1Setup.CFD
        </span>
          </Typography>
        </div>
        <div className="headerUser">
          <KofiButton kofiID='A0A8ERCTF' title="Support on Ko-fi" color='#29abe0' />
        </div>
      </div>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
    </Container>
  )
}
