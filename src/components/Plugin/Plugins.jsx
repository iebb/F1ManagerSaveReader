import CommunityPlugins from "@/components/Plugin/community";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

export default function Plugins() {
  return (
    <div className="space-y-6">
      <Paper
        variant="outlined"
        sx={{
          overflow: "hidden",
          borderRadius: 0,
          borderColor: "divider",
          backgroundColor: "rgba(255,255,255,0.02)",
        }}
      >
        <Box
          sx={{
            px: { xs: 3, md: 4 },
            py: { xs: 3, md: 4 },
          }}
        >
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "flex-start" }} justifyContent="space-between">
              <div>
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Chip icon={<HubOutlinedIcon />} label="Plugins" color="primary" size="small" variant="outlined" />
                  <Chip label="Community" size="small" variant="outlined" />
                </Stack>
                <Typography variant="h4" component="h2" sx={{ fontWeight: 800, letterSpacing: "-0.03em" }}>
                  Community Tools
                </Typography>
                <Typography variant="body1" sx={{ color: "text.secondary", mt: 1.25, maxWidth: 820 }}>
                  Extra save workflows contributed by the community and packaged into the editor as native tools.
                </Typography>
              </div>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {[
                  { label: "Installed", value: "1" },
                  { label: "Type", value: "Native UI" },
                  { label: "Access", value: "Live DB" },
                ].map((item) => (
                  <Box key={item.label} sx={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)", px: 1.5, py: 1.1, minWidth: 96 }}>
                    <Typography variant="caption" sx={{ display: "block", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Box>
      </Paper>

      <Alert severity="warning">
        <AlertTitle>Direct database edits</AlertTitle>
        These tools modify the loaded save immediately. Keep a backup before running community scripts on a career you care about.
      </Alert>
      <CommunityPlugins />
    </div>
  );
}
