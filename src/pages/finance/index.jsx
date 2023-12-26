import BoardPayments from "@/components/Finance/BoardPayments";
import SponsorPayments from "@/components/Finance/SponsorPayments";
import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext} from "@/js/Contexts";
import CostCap from "../../components/Finance/CostCap";
import Finance from "../../components/Finance/Finance";
import Spending from "../../components/Finance/Spending";
import {VTabs} from "../../components/Tabs";

export default function Page() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const env = useContext(EnvContext);

  return (
    <VTabs options={[
      {name: "Board Payments", tab: <BoardPayments />},
      {name: "Sponsor Payments", tab: <SponsorPayments />},
      {name: "Cost Cap", tab: <CostCap />},
      {name: "Finance", tab: <Finance />},
      {name: "Spending Breakdown", tab: <Spending />},
    ]} />
  );
}
