import * as React from "react";
import {VTabs} from "@/components/Tabs";
import TeamSwitch from "@/components/Player/TeamSwitch";
import Rename from "@/components/Player/Rename";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Switch Teams", tab: <TeamSwitch />},
      {name: "Rename", tab: <Rename />},
    ]} />
  );
}
