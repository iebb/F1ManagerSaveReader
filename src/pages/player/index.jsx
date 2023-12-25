import * as React from "react";
import {VTabs} from "../../components/Tabs";
import TeamSwitch from "@/components/Player/TeamSwitch";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Switch Teams", tab: <TeamSwitch />},
    ]} />
  );
}
