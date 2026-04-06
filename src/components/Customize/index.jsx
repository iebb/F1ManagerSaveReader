import LogoEditorWrapper from "@/components/Customize/MyTeam/LogoEditorWrapper";
import {VTabs} from "@/components/Tabs";
import * as React from "react";

export default function Customize() {

  return (
    <VTabs options={[
      {name: "Logo Editor", tab: <LogoEditorWrapper />, minVersion: "4.0"},
    ]} />
  );
}
