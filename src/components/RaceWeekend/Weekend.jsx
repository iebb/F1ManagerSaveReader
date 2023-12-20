import {Alert, AlertTitle} from "@mui/lab";
import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, MetadataContext} from "../Contexts";
import {VTabs} from "../Tabs";
import CarSetup from "./CarSetup";
import RaceEditor from "./RaceEditor";


export default function RaceWeekend() {
  const {version, gameVersion} = useContext(MetadataContext)
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
      <Alert severity="error" sx={{ my: 2 }}>
        <AlertTitle>Unsupported</AlertTitle>
        You are not in a race weekend. Please save inside a race weekend.
      </Alert>
    )
  }

  return (
    <VTabs options={opt} />
  );
}