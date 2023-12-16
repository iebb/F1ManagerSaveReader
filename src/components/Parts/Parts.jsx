import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import {VTabs} from "../Tabs";
import CarAnalysis from "./CarAnalysis";
import DesignView from "./Design";
import DesignValueView from "./DesignV";
import ExpertiseView from "./Expertise";


export default function Parts() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const env = useContext(EnvContext);

  let opt = [
    {name: "Car Analysis", tab: <CarAnalysis />},
    {name: "Parts Analysis", tab: <DesignView />},
    {name: "Expertise", tab: <ExpertiseView />},
  ];



  if (process.env.NODE_ENV === 'development') {
    opt.push(
      {name: "Part Values", tab: <DesignValueView />}
    )
  }

  return (
    <div>
      <VTabs options={opt} />
    </div>
  );
}