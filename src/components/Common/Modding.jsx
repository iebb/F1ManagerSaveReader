import {Button, Divider, Typography} from "@mui/material";
import * as React from "react";
import {useContext} from "react";
import {dump, repack} from "../../js/fileAnalyzer";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import CustomCalendar from "../Modding/Calendar";
import DriverView from "../Modding/Drivers";
import ExpertiseView from "../Modding/Expertise";
import PitcrewView from "../Modding/Pitcrew";
import ReplaceDB from "../Modding/ReplaceDB";
import DataBrowser from "../Modding/SQL";
import Toolbox from "../Modding/Toolbox";
import {VTabs} from "../Tabs";


export default function Modding() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const env = useContext(EnvContext);

  let opt = [];

  if (version === 3) {
    opt = [
      {name: "Drivers", tab: <DriverView />},
      {name: "Pit Crew", tab: <PitcrewView />},
      {name: "Design Expertise", tab: <ExpertiseView />},
      {name: "Calendar", tab: <CustomCalendar />},
      // {name: "Contracts", tab: <ContractView database={database} metadata={metadata} basicInfo={basicInfo} />},
      {name: "Tools / Cheats", tab: <Toolbox />},
      {name: "SQL Browser", tab: <DataBrowser />},
      {name: "Replace Database", tab: <ReplaceDB />},
    ];
  } else {
    opt = [
      {name: "Drivers", tab: <DriverView />},
      {name: "Pit Crew", tab: <PitcrewView />},
      {name: "Design Expertise", tab: <ExpertiseView />},
      {name: "Calendar", tab: <CustomCalendar />},
      {name: "SQL Browser", tab: <DataBrowser />},
      {name: "Replace Database", tab: <ReplaceDB />},
    ];
  }


  return (
    <div>
      <Typography variant="h5" component="h5">
        Database Modding
      </Typography>
      <Typography variant="p" component="p" sx={{ color: "orange" }}>
        Use at your own risk. Always make a backup before changing anything.
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      {
        env.inApp && (
          <Button color="error" variant="contained" sx={{ mr: 2 }} onClick={() => repack(database, metadata, true)}>
            Overwrite Database
          </Button>
        )
      }
      <Button color="warning" variant="contained" sx={{ mr: 2 }} onClick={() => repack(database, metadata, false)}>Re-export Savefile</Button>
      <Button variant="contained" sx={{ mr: 2 }} onClick={() => dump(database, metadata)}>
        Dump Database
      </Button>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <VTabs options={opt} />

    </div>
  );
}