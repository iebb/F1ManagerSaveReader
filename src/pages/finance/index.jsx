import FinanceOperations from "@/components/Finance/FinanceOperations";
import CostCap from "../../components/Finance/CostCap";
import Finance from "../../components/Finance/Finance";
import Spending from "../../components/Finance/Spending";
import {VTabs} from "../../components/Tabs";

export default function Page() {
  return (
    <VTabs options={[
      {name: "Cost Cap", tab: <CostCap />},
      {name: "Finance", tab: <Finance />},
      {name: "Finance DB", tab: <FinanceOperations />},
      {name: "Spending Breakdown", tab: <Spending />},
    ]} />
  );
}
