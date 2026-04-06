import Rename from "@/components/Customize/Rename";
import TeamSwitch from "@/components/Customize/Player/TeamSwitch";
import {useState} from "react";

export default function Page() {
  const modes = [
    {
      id: "rename",
      name: "Rename",
      eyebrow: "Identity tools",
      description: "Update player and team names together, with language compatibility guidance.",
      tab: <Rename />,
    },
    {
      id: "switch-team",
      name: "Switch Team",
      eyebrow: "Career tools",
      description: "Move the player career to a different team.",
      tab: <TeamSwitch />,
    },
  ];

  const [activeId, setActiveId] = useState(modes[0].id);
  const activeMode = modes.find((mode) => mode.id === activeId) || modes[0];

  return (
    <div className="grid gap-2">
      <div className="border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-lg font-bold text-white">Team Tools</h2>
        <p className="mt-2 max-w-[880px] text-sm text-slate-400">
          Use these tools for one-off team and career operations that sit outside day-to-day editing.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-1 md:grid-cols-3">
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

      <div className="min-w-0">
        {activeMode.tab}
      </div>
    </div>
  );
}
