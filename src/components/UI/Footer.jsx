import {Container, Divider, Typography} from "@mui/material";
import GoogleAd from "./GoogleAd";

export default function Footer() {
  return (
    <Container maxWidth={false} component="main">
      <Divider variant="fullWidth" />
      <div style={{ padding: 20 }}>
        <GoogleAd
          style={{ display: 'block' }}
          googleAdId="ca-pub-3253159471656308"
          format="autorelaxed"
          slot="1185564246"
        />
      </div>
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