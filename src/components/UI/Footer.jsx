import {Container, Divider, Typography} from "@mui/material";

export default function Footer() {
  return (
    <Container maxWidth={false} component="main">
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Typography className="description">
        <span style={{ paddingRight: 20 }}>
          Tutorial: <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=3011785417">Steam Guide</a>
        </span>
        <span style={{ paddingRight: 20 }}>
          <a href="https://f1setup.it/">F1Setup.it</a> - the calculator
        </span>
      </Typography>
      <Typography>
        Another ieb Project &middot; {' '}
        Bug & Feedbacks: <a href="https://discord.gg/u46QWWaNfV">Discord</a>  &middot; {' '}
        Contact: <a href="https://twitter.com/CyberHono">@CyberHono</a>
      </Typography>
      <Typography sx={{ color: "#777", fontSize: 12, pt: 3 }}>
        This website is unofficial and is not associated in any way with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One Licensing B.V.
      </Typography>
    </Container>
  )
}