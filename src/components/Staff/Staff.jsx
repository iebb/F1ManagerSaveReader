import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext} from "@/js/Contexts";
import PitcrewView from "./Pitcrew";
import StaffGeneric from "./StaffGeneric";
import {VTabs} from "../Tabs";


export default function Staff() {
  return (
    <VTabs options={[
      {name: "Drivers", tab: <StaffGeneric StaffType={0} />},
      {name: "Technical Chief", tab: <StaffGeneric StaffType={1} />},
      {name: "Race Engineer", tab: <StaffGeneric StaffType={2} />},
      {name: "Head of Aero", tab: <StaffGeneric StaffType={3} />},
      {name: "Sporting Director", minVersion: "3", tab: <StaffGeneric StaffType={4} />},
      {name: "Mail Senders", minVersion: "3", tab: <StaffGeneric StaffType={5} />},
      {name: "Pit Crew", tab: <PitcrewView />},
    ]} />
  );
}