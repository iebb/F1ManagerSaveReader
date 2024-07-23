import {NavTabs} from "./Tabs";

export default function Nav(props) {
  return (
    <NavTabs options={[
      {name: "Weekend", navigator: '/weekend'},
      {name: "Player", navigator: '/player'},
      {name: "Results", navigator: '/results'},
      {name: "Regulations", navigator: '/regulations'},
      {name: "Finance", navigator: '/finance'},
      {name: "Staff", navigator: '/staff'},
      {name: "Facilities", navigator: '/facilities'},
      {name: "Parts", navigator: '/parts'},
      {name: "Modding", navigator: '/modding'},
    ]} />
  )
}