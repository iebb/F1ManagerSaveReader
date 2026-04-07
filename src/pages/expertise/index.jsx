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
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Team</div>
            <h2 className="mt-2 text-lg font-bold text-white">Expertise Manager</h2>
            <p className="mt-2 max-w-[920px] text-sm text-slate-400">
              Tune live expertise and next-season carry-over values with one consistent workspace instead of a flat table dump.
            </p>
          </div>
          <div className="border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-400">
            Parts development balance
          </div>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2">
          {modes.map((mode) => {
            const selected = mode.id === activeMode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveId(mode.id)}
                className={`p-4 text-left transition ${
                  selected
                    ? "border border-sky-300/60 bg-sky-600/15 shadow-[0_0_0_1px_rgba(125,211,252,0.16)]"
                    : "border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                }`}
              >
                <div className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">{mode.eyebrow}</div>
                <div className="mt-1 text-sm font-bold text-white">{mode.name}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{activeMode.eyebrow}</div>
            <div className="mt-1 text-base font-bold text-white">{activeMode.name}</div>
          </div>
          <p className="max-w-[720px] text-sm text-slate-400">{activeMode.description}</p>
        </div>
      </section>

      <div className="min-w-0">
        {activeMode.tab}
      </div>
    </div>
  );
}
