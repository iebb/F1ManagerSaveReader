import AllDesignView from "@/components/Parts/AllDesigns";
import CarAnalysis from "./CarAnalysis";
import DesignView from "./Design";
import DesignValueView from "./DesignV";
import ExpertiseView from "./Expertise";
import {VTabs} from "../Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Car Analysis", tab: <CarAnalysis />},
      {name: "Car Parts", tab: <DesignView />},
      {name: "All Parts", tab: <AllDesignView />},
      {name: "Expertise", tab: <ExpertiseView />},
      {name: "Exp. Next Year", tab: <ExpertiseView type='next' />},
      {name: "Part Values", tab: <DesignValueView />, devOnly: true },
    ]} />
  );
}
