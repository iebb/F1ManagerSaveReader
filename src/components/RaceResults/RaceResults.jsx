import * as React from "react";
import {MetadataContext} from "@/js/Contexts";
import RaceResultsF1 from "./RaceResultsF1";
import RaceResultsF2 from "./RaceResultsF2";
import {useContext, useMemo, useState} from "react";


export default function RaceResults() {
  const {version, gameVersion} = useContext(MetadataContext);
  const cmp = require("semver-compare");
  const modes = useMemo(() => ([
    {id: "f1", name: "Formula 1", eyebrow: "Primary series", description: "Driver championship standings and round-by-round scoring overview.", tab: <RaceResultsF1 />},
    {id: "f2", name: "Formula 2", eyebrow: "Feeder series", description: "F2 standings, feature race results, and sprint scoring.", tab: <RaceResultsF2 formulae={2} />, minVersion: "3.0"},
    {id: "f3", name: "Formula 3", eyebrow: "Feeder series", description: "F3 standings, feature race results, and sprint scoring.", tab: <RaceResultsF2 formulae={3} />, minVersion: "3.0"},
  ]).filter((mode) => {
    if (!mode.minVersion) return true;
    return cmp(`${version}.${gameVersion}`, mode.minVersion) >= 0;
  }), [gameVersion, version]);
  const [activeId, setActiveId] = useState(modes[0]?.id || "f1");
  const activeMode = modes.find((mode) => mode.id === activeId) || modes[0];

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Championship Workspace</div>
            <h2 className="mt-2 text-lg font-bold text-white">Season Results</h2>
            <p className="mt-2 max-w-[860px] text-sm text-slate-400">
              Review championship tables and round-by-round points flow across Formula 1, Formula 2, and Formula 3.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-1 md:grid-cols-3 xl:min-w-[640px]">
            {modes.map((mode) => {
              const selected = mode.id === activeMode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveId(mode.id)}
                  className={`border p-4 text-left transition ${
                    selected
                      ? "border-sky-300/60 bg-sky-600/15"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.eyebrow}</div>
                  <div className="mt-1 text-sm font-bold text-white">{mode.name}</div>
                  <div className="mt-2 text-xs text-slate-400">{mode.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="min-w-0">
        {activeMode?.tab}
      </div>
    </div>
  );
}
