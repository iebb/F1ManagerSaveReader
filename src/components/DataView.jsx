import {Typography} from "@mui/material";
import {useContext, useEffect, useState} from "react";
import {parseBasicInfo} from "../js/basicInfoParser";
import {BasicInfoContext, DatabaseContext, VersionContext} from "./Contexts";
import Modding from "./Modding/Modding";
import Parts from "./Parts/Parts";
import RaceResults from "./RaceResults/RaceResults";
import {Header} from "./RaceResults/subcomponents/Header";
import CarSetup from "./RaceWeekend/CarSetup";
import CostCap from "./Regulations/CostCap";
import Staff from "./Staff/Staff";
import {VTabs} from "./Tabs";

export default function DataView() {
  const version = useContext(VersionContext);
  const db = useContext(DatabaseContext);
  const [basicInfo, setBasicInfo] = useState(null);

  useEffect(() => {
    try {
      setBasicInfo(parseBasicInfo({ db, version }))
    } catch (e) {
      console.error(e);
      setBasicInfo(null);
    }
  }, [version]);

  if (!version) {
    return (
      <div>
        <Typography variant="h5" component="h5" sx={{ m: 2 }}>
          Please drag a file first. All processing is done client-side so your savefile won't be uploaded.
        </Typography>
      </div>
    );
  }

  if (!basicInfo) {
    return (
      <div>
        <Typography variant="h5" component="h5" sx={{ m: 2 }}>
          This savefile is corrupted or unsupported.
        </Typography>
      </div>
    );
  }

  return (
    <div className={`version_container game_v${version}`} ref={r => window.vc = r}>
      <BasicInfoContext.Provider value={basicInfo}>
        <Header />
        <VTabs options={[
          {name: "Setup", tab: <CarSetup />},
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
