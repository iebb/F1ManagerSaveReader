import MetadataEditor from "@/components/Modding/Metadata";
import TimeMachine from "@/components/Customize/Player/TimeMachine";
import Rename from "@/components/Customize/Rename";
import TeamSwitch from "@/components/Customize/Player/TeamSwitch";
import {VTabs} from "@/components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Time Machine", tab: <TimeMachine />},
      {name: "Rename", tab: <Rename />},
      {name: "Switch Team", tab: <TeamSwitch />},
      {name: "Metadata", tab: <MetadataEditor />},
    ]} />
  );
}
