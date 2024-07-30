import StaffDriver2024 from "@/components/People/StaffDriver_2024";
import * as React from "react";
import {VTabs} from "../Tabs";
import StaffGeneric from "./StaffGeneric";


export default function People() {
  return (
    <VTabs options={[
      {name: "Drivers", tab: <StaffDriver2024 StaffType={0} />},
      {name: "Technical Chief", tab: <StaffGeneric StaffType={1} />},
      {name: "Race Engineer", tab: <StaffGeneric StaffType={2} />},
      {name: "Head of Aero", tab: <StaffGeneric StaffType={3} />},
      {name: "Sporting Director", minVersion: "3", tab: <StaffGeneric StaffType={4} />},
      {name: "Mail Senders", minVersion: "3", tab: <StaffGeneric StaffType={5} />},
    ]} />
  );
}