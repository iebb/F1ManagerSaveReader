import dynamic from 'next/dynamic';
import MyTeam from "@/components/Player/MyTeam";
import Rename from "@/components/Player/Rename";
import TeamSwitch from "@/components/Player/TeamSwitch";
import TimeMachine from "@/components/Player/TimeMachine";
import {VTabs} from "@/components/Tabs";
import * as React from "react";

const LogoEditor = dynamic(() => import(("@/components/Player/LogoEditor"), {
  ssr: false,
}));

export default function Page() {

  return (
    <VTabs options={[
      {name: "Logo Editor", tab:  <LogoEditor />, minVersion: "4.0"},
      {name: "My Team", tab: <MyTeam />, minVersion: "4.0"},
      {name: "Switch Teams", tab: <TeamSwitch />},
      {name: "Rename", tab: <Rename />},
      {name: "Time Machine", tab: <TimeMachine />},
    ]} />
  );
}
