import LogoEditor from "@/components/LogoEditor/LogoEditor";
import MyTeam from "@/components/Player/MyTeam";
import Rename from "@/components/Player/Rename";
import TeamSwitch from "@/components/Player/TeamSwitch";
import TimeMachine from "@/components/Player/TimeMachine";
import {VTabs} from "@/components/Tabs";
import * as React from "react";

export default function Page() {

  return (
    <VTabs options={[
      {name: "My Team", tab: <MyTeam />, minVersion: "4.0"},
      {name: "Switch Teams", tab: <TeamSwitch />},
      {name: "Rename", tab: <Rename />},
      {name: "Time Machine", tab: <TimeMachine />},
    ]} />
  );
}
