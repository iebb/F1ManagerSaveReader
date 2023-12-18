import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import {VTabs} from "../Tabs";
import CostCap from "./CostCap";


export default function Regulations() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const env = useContext(EnvContext);

  let opt = [
    {name: "Cost Cap", tab: <CostCap />},
  ];

  return (
    <div>
      <VTabs options={opt} />
    </div>
  );
}