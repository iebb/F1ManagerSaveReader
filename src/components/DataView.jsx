import {analyzeFileToDatabase} from "@/js/fileAnalyzer";
import {Typography} from "@mui/material";
import {useEffect, useState} from "react";
import DataView2023 from "./F1M2023/View2023";
import DataView2022 from "./F1M2022/View2022";

export default function DataView({db, version, metadata}) {

  if (!version) {
    return (
      <div>
        <Typography variant="h5" component="h5" sx={{ m: 2 }}>
          Please drag a file first. All processing is done client-side so your savefile won't be uploaded.
        </Typography>
      </div>
    );
  }

  if (version === 2) {
    return <DataView2022 db={db} metadata={metadata} />;
  }
  if (version === 3) {
    return <DataView2023 db={db} metadata={metadata} />;
  }

  return (
    <div>
      <Typography variant="h5" component="h5" sx={{ m: 2 }}>
        This savefile is not supported.
      </Typography>
    </div>
  );
}
