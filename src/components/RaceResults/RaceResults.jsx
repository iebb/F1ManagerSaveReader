import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import RaceResultsF1 from "./RaceResultsF1";
import RaceResultsF2 from "./RaceResultsF2";
import {VTabs} from "../Tabs";


export default function RaceResults() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const env = useContext(EnvContext);

  let opt = [
      {name: "Formula 1", tab: <RaceResultsF1 />},
      ...version === 3 ? [
        {name: "Formula 2", tab: <RaceResultsF2 formulae={2} />},
        {name: "Formula 3", tab: <RaceResultsF2 formulae={3} />},
      ] : [],
    ];


  return (
    <div>
      <VTabs options={opt} />
    </div>
  );
}