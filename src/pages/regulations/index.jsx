import * as React from "react";
import CostCap from "../../components/Finance/CostCap";
import CustomCalendar from "../../components/Regulations/Calendar";
import SportingRegulations from "../../components/Regulations/Sporting";
import {VTabs} from "../../components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Calendar", tab: <CustomCalendar />},
      {name: "Sporting Regulations", tab: <SportingRegulations />},
    ]} />
  );
}
