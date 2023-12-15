import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import CustomCalendar from "../Modding/Calendar";
import ExpertiseView from "../Parts/Expertise";
import ReplaceDB from "../Modding/ReplaceDB";
import DataBrowser from "../Modding/SQL";
import Toolbox from "../Modding/Toolbox";
import PitcrewView from "../Staff/Pitcrew";
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
      {name: "Calendar", tab: <CustomCalendar />},
      {name: "Tools / Cheats", tab: <Toolbox />},
      {name: "SQL Browser", tab: <DataBrowser />},
      {name: "Replace Database", tab: <ReplaceDB />},
    ];
  } else {
    opt = [
      {name: "Calendar", tab: <CustomCalendar />},
      {name: "SQL Browser", tab: <DataBrowser />},
      {name: "Replace Database", tab: <ReplaceDB />},
    ];
  }


  return (
    <div>
      <VTabs options={opt} />
    </div>
  );
}