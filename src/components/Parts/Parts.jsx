import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import {VTabs} from "../Tabs";
import DesignView from "./Design";
import ExpertiseView from "./Expertise";


export default function Parts() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const env = useContext(EnvContext);

  let opt = [
    {name: "Car Analysis", tab: <DesignView />},
    {name: "Expertise", tab: <ExpertiseView />},
  ];


  return (
    <div>
      <VTabs options={opt} />
    </div>
  );
}