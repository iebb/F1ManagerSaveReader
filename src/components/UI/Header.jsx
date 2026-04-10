import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import ViewStreamOutlinedIcon from "@mui/icons-material/ViewStreamOutlined";
import { Divider, IconButton, Tooltip, Typography } from "@mui/material";
import { useContext } from "react";
import { EnvContext, MetadataContext } from "@/js/Contexts";

export default function Header({ fullWidth = false, onToggleFullWidth = () => { }, hasLoadedSave = false }) {
  const env = useContext(EnvContext);
  const metadata = useContext(MetadataContext);
  const shellClassName = fullWidth
    ? "w-full px-4 pt-2 md:px-6"
    : "mx-auto w-full max-w-screen-2xl px-4 pt-2 md:px-6";
  return (
    <header className={shellClassName}>
      <div className="shell-hero">
        <div className="headerContainer">
          <div className="headerTitle">
            <Typography variant="h3" component="h1" sx={{ fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.04em" }}>
              F1 Manager Save Reader
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, color: "text.secondary", maxWidth: 840 }}>
              Browse, edit, and repack F1 Manager saves locally.
            </Typography>
            <div className="headerMetaRow">
              <span className="headerMetaItem">
                <span className="headerMetaItem__label">Mode</span>
                <span className="headerMetaItem__value">{env.inApp ? "Desktop app" : "Browser"}</span>
              </span>
              <span className="headerMetaItem">
                <span className="headerMetaItem__label">File</span>
                <span className="headerMetaItem__value">{metadata.filename || "No save loaded"}</span>
              </span>
              <span className="headerMetaItem">
                <span className="headerMetaItem__label">Drop</span>
                <span className="headerMetaItem__value">{hasLoadedSave ? "Save or DB replace" : "Save import ready"}</span>
              </span>
            </div>
          </div>
          <div className="headerUser">
            <a
              href="https://ko-fi.com/A0A8ERCTF"
              target="_blank"
              rel="noreferrer"
              className="kofi-button"
              aria-label="Support on Ko-fi"
              title="Support on Ko-fi"
            >
              <span className="kofi-button__icon" aria-hidden="true">♡</span>
              <span className="kofi-button__text">Support on Ko-fi</span>
            </a>
            <a
              href="https://github.com/iebb/F1ManagerSaveReader/issues"
              target="_blank"
              rel="noreferrer"
              className="support-button"
              aria-label="GitHub issues"
              title="GitHub issues"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/u46QWWaNfV"
              target="_blank"
              rel="noreferrer"
              className="support-button"
              aria-label="Discord"
              title="Discord"
            >
              Discord
            </a>
            <Tooltip title={fullWidth ? "Use constrained width" : "Use full width"}>
              <IconButton
                size="small"
                sx={{ mr: 1 }}
                onClick={onToggleFullWidth}
                color="inherit"
                aria-label={fullWidth ? "Use constrained width" : "Use full width"}
              >
                {fullWidth ? <ViewStreamOutlinedIcon fontSize="small" /> : <ViewAgendaOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  )
}
