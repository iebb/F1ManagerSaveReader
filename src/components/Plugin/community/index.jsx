import CommunityPartRandomizer from "@/components/Plugin/community/CommunityPartRandomizer";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

export default function CommunityPlugins() {
  return (
    <div className="space-y-6">
      <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: "divider", overflow: "hidden" }}>
        <Box sx={{ px: 3, py: 2.5, borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.02)" }}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
            <div>
              <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 700, letterSpacing: "0.12em" }}>
                Catalog
              </Typography>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 800 }}>
                Installed Community Tools
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75, maxWidth: 760 }}>
                A compact list of installed entries before the full editor workspace.
              </Typography>
            </div>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
              <Chip icon={<ExtensionOutlinedIcon />} label="1 installed" variant="outlined" />
              <Chip label="Editor-integrated" color="primary" variant="outlined" />
            </Stack>
          </Stack>
        </Box>

        <Box sx={{ p: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 0,
              borderColor: "rgba(255,255,255,0.12)",
              backgroundColor: "rgba(255,255,255,0.025)",
              p: 2.5,
            }}
          >
            <Stack direction={{ xs: "column", xl: "row" }} spacing={2.5} justifyContent="space-between">
              <div>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="h6" component="h4" sx={{ fontWeight: 800 }}>
                    @sam_fakt&apos;s Part Randomizer
                  </Typography>
                  <Chip size="small" label="Integrated" color="success" variant="outlined" />
                </Stack>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, maxWidth: 820 }}>
                  Randomizes part development outcomes, generates a readable progress report, and updates F1 driver attributes from race performance without leaving the editor.
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                  <Chip size="small" label="Persistent diff tracking" variant="outlined" />
                  <Chip size="small" label="Report view" variant="outlined" />
                  <Chip size="small" label="Driver stat updates" variant="outlined" />
                </Stack>
              </div>
              <Stack direction={{ xs: "column", md: "column" }} spacing={1} alignItems={{ xs: "flex-start", xl: "flex-end" }}>
                <Chip icon={<PrecisionManufacturingOutlinedIcon />} label="Parts" variant="outlined" />
                <Chip icon={<PeopleOutlineOutlinedIcon />} label="Drivers" variant="outlined" />
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    const target = document.getElementById("community-part-randomizer");
                    if (target) {
                      target.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                >
                  Open Tool
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Paper>

      <CommunityPartRandomizer />
    </div>
  );
}
