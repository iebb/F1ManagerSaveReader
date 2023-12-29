import AllDesignView from "@/components/Parts/AllDesigns";
import CarAnalysis from "../../components/Parts/CarAnalysis";
import DesignView from "../../components/Parts/Design";
import DesignValueView from "../../components/Parts/DesignV";
import ExpertiseView from "../../components/Parts/Expertise";
import {VTabs} from "../../components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Car Analysis", tab: <CarAnalysis />},
      {name: "Car Parts", tab: <DesignView />},
      {name: "All Parts", tab: <AllDesignView />},
      {name: "Expertise", tab: <ExpertiseView />},
      {name: "Part Values", tab: <DesignValueView />, devOnly: true },
    ]} />
  );
}
