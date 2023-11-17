import {analyzeFileToDatabase} from "@/js/fileAnalyzer";
import {Typography} from "@mui/material";
import {useContext, useEffect, useState} from "react";
import {DatabaseContext, MetadataContext, VersionContext} from "./Contexts";
import DataView2023 from "./F1M2023/View2023";
import DataView2022 from "./F1M2022/View2022";

export default function DataView() {
  const version = useContext(VersionContext);
  if (!version) {
    return (
      <div>
        <Typography variant="h5" component="h5" sx={{ m: 2 }}>
          Please drag a file first. All processing is done client-side so your savefile won't be uploaded.
        </Typography>
      </div>
    );
  }

  const VersionMapping = {
    2: DataView2022,
    3: DataView2023,
  }
  const V = VersionMapping[version];

  if (V !== null) {
    return (
      <div className={`version_container game_v${version}`} ref={r => window.vc = r}>
        <V />
      </div>
    )
  }

  return (
    <div>
      <Typography variant="h5" component="h5" sx={{ m: 2 }}>
        This savefile is not supported.
      </Typography>
    </div>
  );
}
