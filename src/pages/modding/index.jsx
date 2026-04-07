import MetadataEditor from "@/components/Modding/Metadata";
import * as React from "react";
import SaveOperations from "@/components/Modding/SaveOperations";
import DataBrowser from "@/components/Modding/SQL";
import Toolbox from "@/components/Modding/Toolbox";
import TimeMachine from "@/components/Customize/Player/TimeMachine";
import {VTabs} from "@/components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Save Ops", tab: <SaveOperations />},
      {name: "SQL Editor", tab: <DataBrowser />},
      {name: "Metadata Editor", tab: <MetadataEditor />},
      {name: "Time Machine", tab: <TimeMachine />},
      {name: "Toolbox", tab: <Toolbox />, devOnly: true },
    ]} />
  );
}
