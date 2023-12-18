import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import CustomCalendar from "../Regulations/Calendar";
import ExpertiseView from "../Parts/Expertise";
import ReplaceDB from "./ReplaceDB";
import DataBrowser from "./SQL";
import Toolbox from "./Toolbox";
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
      {name: "Tools / Cheats", tab: <Toolbox />},
      {name: "SQL Browser", tab: <DataBrowser />},
      {name: "Replace Database", tab: <ReplaceDB />},
    ];
  } else {
    opt = [
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