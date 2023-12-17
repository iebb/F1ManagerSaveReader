import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, VersionContext} from "../Contexts";
import {VTabs} from "../Tabs";
import CarSetup from "./CarSetup";
import RaceEditor from "./RaceEditor";


export default function RaceWeekend() {
  const version = useContext(VersionContext);
  const basicInfo = useContext(BasicInfoContext);

  const { weekend } = basicInfo;

  let opt = [
    {name: "Setup", tab: <CarSetup />},
  ];

  if (version === 3) {
    opt.push(
      {name: "Race", tab: <RaceEditor />}
    );
  }

  if (weekend.RaceID < 0) {
    return (
      <div>
       <span style={{ color: "yellow", fontSize: 18 }}>
          You are not in a race weekend. Please save inside a race weekend.
        </span>
        <br/>
      </div>
    )
  }

  return (
    <div>
      <VTabs options={opt} />
    </div>
  );
}