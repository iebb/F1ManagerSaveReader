import {Box, Divider, Link, Typography} from "@mui/material";

export default function Footer({fullWidth = false}) {
  const shellClassName = fullWidth ? "w-full px-4 pb-3 md:px-6" : "mx-auto w-full max-w-screen-2xl px-4 pb-3 md:px-6";
  return (
    <footer className={shellClassName}>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Box sx={{display: "grid", gap: 0.75, color: "text.secondary"}}>
        <Typography variant="body2">
          Tutorial: <Link href="https://steamcommunity.com/sharedfiles/filedetails/?id=3011785417" underline="hover">Steam Guide</Link>
        </Typography>
        <Typography variant="body2">
          Another ieb Project · Bug & Feedback: <Link href="https://discord.gg/u46QWWaNfV" underline="hover">Discord</Link>
          {" "}· Contact: <Link href="https://twitter.com/CyberHono" underline="hover">@CyberHono</Link>
        </Typography>
      </Box>
      <Typography sx={{ color: "#777", fontSize: 12, pt: 2.5, maxWidth: 1000 }}>
        This website is unofficial and is not associated in any way with the Formula 1 companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are trade marks of Formula One Licensing B.V.
      </Typography>
    </footer>
  )
}
