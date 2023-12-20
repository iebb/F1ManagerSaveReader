import {NavTabs} from "../Tabs";

export default function Nav(props) {
  return (
    <NavTabs options={[
      {name: "Weekend", navigator: '/weekend'},
      {name: "Results", navigator: '/results'},
      {name: "Regulations", navigator: '/regulations'},
      {name: "Staff", navigator: '/staff'},
      {name: "Facilities", navigator: '/facilities'},
      {name: "Parts", navigator: '/parts'},
      {name: "Modding", navigator: '/modding'},
    ]} />
  )
}