import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import ViewStreamOutlinedIcon from "@mui/icons-material/ViewStreamOutlined";
import {Divider, IconButton, Link, Tooltip, Typography} from "@mui/material";
import KofiButton from "./Kofi/Kofi";

export default function Header({fullWidth = false, onToggleFullWidth = () => {}}) {
  const shellClassName = fullWidth ? "w-full px-4 pt-2 md:px-6" : "mx-auto w-full max-w-screen-2xl px-4 pt-2 md:px-6";
  return (
    <header className={shellClassName}>
      <div className="px-0.5 py-1">
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
            <Tooltip title={fullWidth ? "Use constrained width" : "Use full width"}>
              <IconButton
                size="small"
                sx={{mr: 1}}
                onClick={onToggleFullWidth}
                color="inherit"
                aria-label={fullWidth ? "Use constrained width" : "Use full width"}
              >
                {fullWidth ? <ViewStreamOutlinedIcon fontSize="small" /> : <ViewAgendaOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
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
      </div>
      <Divider variant="fullWidth" sx={{mt: 1}} />
    </header>
  )
}
