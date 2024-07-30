import * as React from "react";
import {VTabs} from "../Tabs";
import PitcrewView from "./Pitcrew";
import TeamSize from "@/components/Staff/TeamSize";


export default function Staff() {
  return (
    <VTabs options={[
      {name: "Pit Crew", tab: <PitcrewView />},
      {name: "Engineering & Scouting", tab: <TeamSize />},
    ]} />
  );
}