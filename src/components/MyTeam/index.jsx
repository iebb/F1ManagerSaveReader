import LogoEditor from "@/components/MyTeam/LogoEditor/LogoEditor";
import Preview from "@/components/MyTeam/Preview";
import TeamRename from "@/components/MyTeam/TeamRename";
import Rename from "@/components/Player/Rename";
import TeamSwitch from "@/components/Player/TeamSwitch";
import TimeMachine from "@/components/Player/TimeMachine";
import {VTabs} from "@/components/Tabs";
import * as React from "react";

export default function MyTeam() {

  return (
    <VTabs options={[
      {name: "Logo Editor", tab: <LogoEditor />, minVersion: "4.0"},
      {name: "Team Preview", tab: <Preview />, minVersion: "4.0"},
      {name: "Team Name", tab: <TeamRename />, minVersion: "4.0"},
    ]} />
  );
}
