import {MetadataContext} from "@/js/Contexts";
import {useContext, useMemo, useState} from "react";
import AllDesignView from "./AllDesigns";
import CarAnalysis from "./CarAnalysis";
import DesignView from "./Design";
import DesignValueView from "./DesignV";

function filterModes(modes, version, gameVersion) {
  const cmp = require("semver-compare");

  return modes.filter((mode) => {
    if (mode.versions) {
      return mode.versions.includes(version);
    }
    if (mode.minVersion) {
      if (typeof mode.minVersion === "number") {
        return version >= mode.minVersion;
      }
      return cmp(`${version}.${gameVersion}`, mode.minVersion) >= 0;
    }
    if (mode.devOnly) {
      return process.env.NODE_ENV === "development";
    }
    return true;
  });
}

export default function Page() {
  const {version, gameVersion} = useContext(MetadataContext);

  const modes = useMemo(() => filterModes([
    {
      id: "overview",
      name: "Overview",
      eyebrow: "Compare the grid",
      description: "See team performance and underlying car attributes side by side.",
      tab: <CarAnalysis />,
    },
    {
      id: "loadouts",
      name: "Current Loadouts",
      eyebrow: "Edit active car parts",
      description: "Adjust the parts currently fitted to each car, including wear and knowledge.",
      tab: <DesignView />,
    },
    {
      id: "archive",
      name: "Design Archive",
      eyebrow: "Browse every design",
      description: "Review and edit all saved part designs across the grid, not just the active loadouts.",
      tab: <AllDesignView />,
    },
    {
      id: "values",
      name: "Raw Values For Parts",
      eyebrow: "Developer view",
      description: "Inspect raw part values and tuning data.",
      tab: <DesignValueView />,
      devOnly: true,
    },
  ], version, gameVersion), [version, gameVersion]);

  const [activeId, setActiveId] = useState(modes[0]?.id || "");
  const activeMode = modes.find((mode) => mode.id === activeId) || modes[0];

  return (
    <div className="grid gap-2">
      <div className="border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white">Parts Workspace</h2>
        <p className="mt-2 max-w-[880px] text-sm text-slate-400">
          Use the overview to compare the field, current loadouts to change live cars, and design archive to edit
          historical designs. Team development expertise now lives in its own workspace.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-1 md:grid-cols-2 xl:grid-cols-5">
          {modes.map((mode) => {
            const selected = mode.id === activeMode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveId(mode.id)}
                className={`p-4 text-left transition ${
                  selected
                    ? "border border-sky-300/60 bg-sky-600/15"
                    : "border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.eyebrow}</div>
                <div className="mt-1 text-sm font-bold text-white">{mode.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-white/10 bg-white/[0.015] px-5 py-4">
        <div className="text-base font-bold text-white">{activeMode?.name}</div>
        <p className="mt-1 text-sm text-slate-400">{activeMode?.description}</p>
      </div>

      <div className="min-w-0">
        {activeMode?.tab}
      </div>
    </div>
  );
}
