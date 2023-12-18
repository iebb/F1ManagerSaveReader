import {Typography} from "@mui/material";
import {useContext, useEffect, useState} from "react";
import {parseBasicInfo} from "../js/basicInfoParser";
import {BasicInfoHeader} from "./Common/subcomponents/BasicInfoHeader";
import {BasicInfoContext, DatabaseContext, VersionContext} from "./Contexts";
import Modding from "./Modding/Modding";
import Parts from "./Parts/Parts";
import RaceResults from "./RaceResults/RaceResults";
import RaceWeekend from "./RaceWeekend/Weekend";
import CostCap from "./Regulations/CostCap";
import Staff from "./Staff/Staff";
import {VTabs} from "./Tabs";

export default function DataView() {
  const version = useContext(VersionContext);
  const db = useContext(DatabaseContext);
  const [basicInfo, setBasicInfo] = useState(null);

  useEffect(() => {
    if (version) {
      try {
        setBasicInfo(parseBasicInfo({ db, version }))
      } catch (e) {
        console.error(e);
        setBasicInfo(null);
      }
    } else {
      setBasicInfo(null);
    }
  }, [db, version]);

  if (!version) {
    return (
      <Typography variant="h5" component="h5" sx={{ m: 2 }}>
        Please drag a file first. All processing is done client-side so your savefile won't be uploaded.
      </Typography>
    );
  }

  if (!basicInfo) {
    return (
      <Typography variant="h5" component="h5" sx={{ m: 2 }}>
        This savefile is corrupted or unsupported.
      </Typography>
    );
  }

  return (
    <div className={`version_container game_v${version}`} ref={r => window.vc = r}>
      <BasicInfoContext.Provider value={basicInfo}>
        <BasicInfoHeader />
        <VTabs options={[
          {name: "Weekend", tab: <RaceWeekend />},
          {name: "Results", tab: <RaceResults />},
          {name: "Cost Cap", tab: <CostCap />},
          {name: "Staff", tab: <Staff />},
          {name: "Parts", tab: <Parts />},
          {name: "Modding", tab: <Modding />},
        ]} />
      </BasicInfoContext.Provider>
    </div>
  )
}
