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
    <div className="grid gap-3">
      <section className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_320px] xl:items-end">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Team</div>
            <h2 className="mt-2 text-lg font-bold text-white">Expertise Manager</h2>
            <p className="mt-2 max-w-[920px] text-sm text-slate-400">
              <em>Next year will be our year</em> - Tifosi, This year
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {modes.map((mode) => {
              const selected = mode.id === activeMode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveId(mode.id)}
                  className={`px-3 py-3 text-left transition ${
                    selected
                      ? "border border-sky-300/60 bg-sky-600/15 shadow-[0_0_0_1px_rgba(125,211,252,0.16)]"
                      : "border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="text-sm font-bold text-white">{mode.id === "current" ? "This Year" : "Next Year"}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="min-w-0">
        {activeMode.tab}
      </div>
    </div>
  );
}
