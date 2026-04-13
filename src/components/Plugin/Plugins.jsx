import CommunityPartRandomizer from "@/components/Plugin/CommunityPartRandomizer";
import {Alert, AlertTitle, Divider, Typography} from "@mui/material";

export default function Plugins() {
  return (
    <div className="space-y-6">
      <div>
        <Typography variant="h4" component="h2" sx={{ fontWeight: 800 }}>
          Community
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mt: 1, maxWidth: 860 }}>
          Community-contributed save tools integrated directly into the editor.
        </Typography>
      </div>

      <Alert severity="warning">
        <AlertTitle>Direct database edits</AlertTitle>
        These tools modify the loaded save immediately. Keep a backup before running community scripts on a career you care about.
      </Alert>

      <Divider />
      <CommunityPartRandomizer />
    </div>
  );
}
