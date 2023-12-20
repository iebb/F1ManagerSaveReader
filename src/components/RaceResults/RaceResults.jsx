import * as React from "react";
import {VTabs} from "../Tabs";
import RaceResultsF1 from "./RaceResultsF1";
import RaceResultsF2 from "./RaceResultsF2";


export default function RaceResults() {
  return (
    <VTabs options={[
      {name: "Formula 1", tab: <RaceResultsF1 />},
      {name: "Formula 2", tab: <RaceResultsF2 formulae={2} />, minVersion: "3.0"},
      {name: "Formula 3", tab: <RaceResultsF2 formulae={3} />, minVersion: "3.0"},
    ]} />
  );
}