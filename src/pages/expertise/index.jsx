import ExpertiseView from "@/components/Parts/Expertise";
import {useState} from "react";

export default function Page() {
  const modes = [
    {
      id: "current",
      name: "Current Expertise",
      eyebrow: "Live development",
      description: "Edit the expertise values teams are using in the current season.",
      tab: <ExpertiseView />,
    },
    {
      id: "next",
      name: "Next Year Expertise",
      eyebrow: "Future planning",
      description: "Adjust the carry-over expertise values for the next season.",
      tab: <ExpertiseView type="next" />,
    },
  ];

  const [activeId, setActiveId] = useState(modes[0].id);
  const activeMode = modes.find((mode) => mode.id === activeId) || modes[0];

  return (
    <div className="grid gap-2">
      <div className="border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white">Expertise Workspace</h2>
        <p className="mt-2 max-w-[880px] text-sm text-slate-400">
          Use current expertise for in-season balancing and next year expertise for planning the carry-over development state.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-1 md:grid-cols-2">
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
        <div className="text-base font-bold text-white">{activeMode.name}</div>
        <p className="mt-1 text-sm text-slate-400">{activeMode.description}</p>
      </div>

      <div className="min-w-0">
        {activeMode.tab}
      </div>
    </div>
  );
}
