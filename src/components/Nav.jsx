
import Weekend from "@/pages/weekend";
import Player from "@/pages/player";
import Results from "@/pages/results";
import Regulations from "@/pages/regulations";
import Finance from "@/pages/finance";
import Staff from "@/pages/staff";
import Facilities from "@/pages/facilities";
import Parts from "@/pages/parts";
import Modding from "@/pages/modding";
import * as React from "react";
import {VTabs} from "./Tabs";

export default function MainNav(props) {
  return (
    <VTabs options={[
      {name: "Weekend", tab: <Weekend />},
      {name: "Player", tab: <Player />},
      {name: "Results", tab: <Results />},
      {name: "Regulations", tab: <Regulations />},
      {name: "Finance", tab: <Finance />},
      {name: "Staff", tab: <Staff />},
      {name: "Facilities", tab: <Facilities />},
      {name: "Parts", tab: <Parts />},
      {name: "Modding", tab: <Modding />},
    ]} />
  )
}