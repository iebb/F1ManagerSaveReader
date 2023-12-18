import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import {VTabs} from "../Tabs";
import CostCap from "./CostCap";
import CustomCalendar from "./Calendar";
import SportingRegulations from "./Sporting";


export default function Regulations() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const env = useContext(EnvContext);

  let opt = [
    {name: "Calendar", tab: <CustomCalendar />},
    {name: "Sporting Regulations", tab: <SportingRegulations />},
    {name: "Cost Cap Visualization", tab: <CostCap />},
  ];

  return (
    <div>
      <VTabs options={opt} />
    </div>
  );
}