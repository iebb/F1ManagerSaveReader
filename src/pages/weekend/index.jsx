import {Alert, AlertTitle} from "@mui/material";
import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext} from "../../components/Contexts";
import CarSetup from "../../components/RaceWeekend/CarSetup";
import RaceEditor from "../../components/RaceWeekend/RaceEditor";
import {VTabs} from "../../components/Tabs";

export default function Page() {
  const basicInfo = useContext(BasicInfoContext);

  const { weekend } = basicInfo;

  if (weekend.RaceID < 0) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        <AlertTitle>Unsupported</AlertTitle>
        You are not in a race weekend. Please save inside a race weekend.
      </Alert>
    )
  }

  return (
    <VTabs options={[
      {name: "Setup", tab: <CarSetup />},
      {name: "Race", tab: <RaceEditor />, minVersion: "3.0"},
    ]} />
  );
}
