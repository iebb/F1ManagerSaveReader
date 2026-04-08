import SponsorPayments from "@/components/Finance/SponsorPayments";
import { getExistingTableSet } from "@/components/Customize/Player/timeMachineUtils";
import Sponsors from "@/components/Team/Sponsors";
import {DatabaseContext} from "@/js/Contexts";
import {useContext, useMemo} from "react";
import {VTabs} from "@/components/Tabs";

export default function Page() {
  const database = useContext(DatabaseContext);
  const existingTables = useMemo(() => getExistingTableSet(database), [database]);
  const showSponsorPayments = existingTables.has("Sponsorship_Values")
    && existingTables.has("Sponsorship_Constants")
    && existingTables.has("Sponsorship_ContractObligations")
    && existingTables.has("Sponsorship_Enum_Obligations")
    && (existingTables.has("Board_Prestige") || existingTables.has("Board_TeamRating"));

  return (
    <VTabs options={[
      {name: "Sponsorship", tab: <Sponsors />},
      ...(showSponsorPayments ? [{name: "Sponsor Payments", tab: <SponsorPayments />}] : []),
    ]} />
  );
}
