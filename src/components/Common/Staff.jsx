import * as React from "react";
import {useContext} from "react";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, VersionContext} from "../Contexts";
import PitcrewView from "../Staff/Pitcrew";
import StaffGeneric from "../Staff/StaffGeneric";
import {VTabs} from "../Tabs";


export default function Staff() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const env = useContext(EnvContext);

  let opt = [
      {name: "Drivers", tab: <StaffGeneric StaffType={0} />},
      {name: "Technical Chief", tab: <StaffGeneric StaffType={1} />},
      {name: "Race Engineer", tab: <StaffGeneric StaffType={2} />},
      {name: "Head of Aerodynamics", tab: <StaffGeneric StaffType={3} />},
      ...version === 3 ? [
        {name: "Sporting Director", tab: <StaffGeneric StaffType={4} />},
        {name: "Mail Senders", tab: <StaffGeneric StaffType={5} />},
      ] : [],
      {name: "Pit Crew", tab: <PitcrewView />},
    ];


  return (
    <div>
      <VTabs options={opt} />
    </div>
  );
}