import {analyzeFileToDatabase} from "@/js/fileAnalyzer";
import {Typography} from "@mui/material";
import {useEffect, useState} from "react";
import DataView2023 from "./F1M2023/View2023";
import DataView2022 from "./F1M2022/View2022";

export default function DataView({file}) {

  const [db, setDb] = useState(null);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    analyzeFileToDatabase(file).then(({db, version}) => {
      setDb(db);
      setVersion(version);
    });
  }, [file])


  if (!file) {
    return (
      <div>
        <Typography variant="h5" component="h5" sx={{ m: 2 }}>
          Please drag a file first. All processing is done client-side so your savefile won't be uploaded.
        </Typography>
      </div>
    );
  }

  if (version === 2) {
    return <DataView2022 db={db} />;
  }
  if (version === 3) {
    return <DataView2023 db={db} />;
  }

  return (
    <div>
      <Typography variant="h5" component="h5" sx={{ m: 2 }}>
        This savefile is not supported.
      </Typography>
    </div>
  );
}
