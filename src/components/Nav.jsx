import MyTeam from "@/components/MyTeam";
import Facilities from "@/pages/facilities";
import Finance from "@/pages/finance";
import Modding from "@/pages/modding";
import Parts from "@/pages/parts";
import Player from "@/pages/player";
import Regulations from "@/pages/regulations";
import Results from "@/pages/results";
import Staff from "@/pages/staff";
import Weekend from "@/pages/weekend";
import * as React from "react";
import {VTabs} from "./Tabs";

export default function MainNav(props) {
  return (
    <VTabs options={[
      {name: "Weekend", tab: <Weekend />},
      {name: "Custom Team", tab:  <MyTeam />, minVersion: "4.0"},
      {name: "Results", tab: <Results />},
      {name: "Regulations", tab: <Regulations />},
      {name: "Finance", tab: <Finance />},
      {name: "Staff", tab: <Staff />},
      {name: "Facilities", tab: <Facilities />},
      {name: "Parts", tab: <Parts />},
      {name: "Modding", tab: <Modding />},
      {name: "Player", tab: <Player />},
    ]} />
  )
}