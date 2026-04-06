import TeamRename from "@/components/Customize/MyTeam/TeamRename";
import PlayerRename from "@/components/Customize/Player/Rename";
import {Box} from "@mui/material";
import * as React from "react";

export default function Rename() {
  return (
    <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", lg: "1fr 1fr"}, gap: 4, alignItems: "start"}}>
      <PlayerRename />
      <TeamRename />
    </Box>
  );
}
