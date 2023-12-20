import * as React from "react";
import CarAnalysis from "../../components/Parts/CarAnalysis";
import DesignView from "../../components/Parts/Design";
import DesignValueView from "../../components/Parts/DesignV";
import ExpertiseView from "../../components/Parts/Expertise";
import {VTabs} from "../../components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Car Analysis", tab: <CarAnalysis />},
      {name: "Parts Analysis", tab: <DesignView />},
      {name: "Expertise", tab: <ExpertiseView />},
      {name: "Part Values", tab: <DesignValueView />, devOnly: true },
    ]} />
  );
}
