import LogoEditorWrapper from "@/components/MyTeam/LogoEditorWrapper";
import Preview from "@/components/MyTeam/Preview";
import TeamRename from "@/components/MyTeam/TeamRename";
import {VTabs} from "@/components/Tabs";
import * as React from "react";

export default function MyTeam() {

  return (
    <VTabs options={[
      {name: "Logo Editor", tab: <LogoEditorWrapper />, minVersion: "4.0"},
      {name: "Team Preview", tab: <Preview />, minVersion: "4.0"},
      {name: "Team Name", tab: <TeamRename />, minVersion: "4.0"},
    ]} />
  );
}
