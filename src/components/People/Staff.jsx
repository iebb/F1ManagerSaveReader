import StaffDriver2024 from "@/components/People/StaffDriver_2024";
import {MetadataContext} from "@/js/Contexts";
import * as React from "react";
import {useContext, useMemo} from "react";
import {VTabs} from "../Tabs";
import StaffGeneric from "./StaffGeneric";


export default function People() {
  const {version, gameVersion} = useContext(MetadataContext);
  const cmp = require("semver-compare");

  const allOptions = useMemo(() => ([
    {name: "Drivers", description: "Race drivers, reserves, ratings, and contract actions.", tab: <StaffDriver2024 StaffType={0} />},
    {name: "Technical Chief", description: "Chief designers and technical-lead personnel.", tab: <StaffGeneric StaffType={1} />},
    {name: "Race Engineer", description: "Race-side engineers and pairing management.", tab: <StaffGeneric StaffType={2} />},
    {name: "Head of Aero", description: "Aerodynamics leadership and development staff.", tab: <StaffGeneric StaffType={3} />},
    {name: "Sporting Director", description: "Trackside sporting management roles.", minVersion: "3", tab: <StaffGeneric StaffType={4} />},
    {name: "Mail Senders", description: "Narrative and communication-linked staff records.", minVersion: "3", tab: <StaffGeneric StaffType={5} />},
  ]), []);
  const options = useMemo(() => allOptions.filter((item) => {
    if (!item.minVersion) {
      return true;
    }
    return cmp(`${version}.${gameVersion}`, item.minVersion) >= 0;
  }), [allOptions, gameVersion, version]);

  return (
    <div className="grid min-w-0 gap-3">
      <section className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">People</div>
            <h2 className="mt-2 text-lg font-bold text-white">Staff Database</h2>
            <p className="mt-2 max-w-[920px] text-sm text-slate-400">
              Review drivers and staff, adjust ratings and contracts, and open direct edit or swap actions from one place.
            </p>
          </div>
          <div className="border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-400">
            Editor workspace
          </div>
        </div>
      </section>
      <VTabs options={options} />
    </div>
  );
}
