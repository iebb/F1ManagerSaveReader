import * as React from "react";
import {VTabs} from "../../components/Tabs";
import TeamSwitch from "../../components/Teams/TeamSwitch";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Switch Teams", tab: <TeamSwitch />},
    ]} />
  );
}
