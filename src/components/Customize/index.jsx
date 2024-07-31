import LogoEditorWrapper from "@/components/Customize/MyTeam/LogoEditorWrapper";
import Preview from "@/components/Customize/MyTeam/Preview";
import TeamRename from "@/components/Customize/MyTeam/TeamRename";
import {VTabs} from "@/components/Tabs";
import * as React from "react";
import TeamSwitch from "@/components/Customize/Player/TeamSwitch";
import Rename from "@/components/Customize/Player/Rename";
import TimeMachine from "@/components/Customize/Player/TimeMachine";

export default function Customize() {

  return (
    <VTabs options={[
      {name: "Team Preview", tab: <Preview />, minVersion: "4.0"},
      {name: "Logo Editor", tab: <LogoEditorWrapper />, minVersion: "4.0"},
      {name: "Rename Player", tab: <Rename />},
      {name: "Rename Team", tab: <TeamRename />, minVersion: "4.0"},
      {name: "Switch Team", tab: <TeamSwitch />},
      {name: "Time Machine", tab: <TimeMachine />},
    ]} />
  );
}
