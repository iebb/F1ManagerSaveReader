import MyTeam from "@/components/MyTeam";
import Facilities from "@/pages/facilities";
import Finance from "@/pages/finance";
import Modding from "@/pages/modding";
import Parts from "@/pages/parts";
import Player from "@/pages/player";
import Regulations from "@/pages/regulations";
import Results from "@/pages/results";
import Staff from "@/components/Staff/Staff";
import Weekend from "@/pages/weekend";
import {VTabs} from "./Tabs";
import People from "@/components/People/Staff";

export default function MainNav() {
  return (
    <VTabs options={[
      {name: "Weekend", tab: <Weekend />},
      {name: "Custom Team", tab:  <MyTeam />, minVersion: "4.0"},
      {name: "Results", tab: <Results />},
      {name: "Regulations", tab: <Regulations />},
      {name: "Finance", tab: <Finance />},
      {name: "People", tab: <People />},
      {name: "Staff", tab: <Staff />},
      {name: "Facilities", tab: <Facilities />},
      {name: "Parts", tab: <Parts />},
      {name: "Modding", tab: <Modding />},
      {name: "Player", tab: <Player />},
    ]} />
  )
}