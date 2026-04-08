import TeamIdentity from "@/components/Common/TeamIdentity";
import {UiSettingsContext, UiSettingsUpdaterContext} from "@/js/Contexts";
import * as React from "react";
import {useContext} from "react";

export default function Page() {
  const {logoStyle = "colored"} = useContext(UiSettingsContext);
  const updateUiSettings = useContext(UiSettingsUpdaterContext);

  return (
    <div className="grid gap-4">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="max-w-[840px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Settings</div>
          <h2 className="mt-2 text-lg font-bold text-white">Appearance</h2>
          <p className="mt-2 text-sm text-slate-400">
            Choose whether official team logos render in their colored or white variants across the editor.
          </p>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015] p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Team Logos</div>
        <div className="mt-4 inline-flex border border-white/10 bg-black/10 p-1">
          {[
            {value: "colored", label: "Colored"},
            {value: "white", label: "White"},
          ].map((option) => {
            const selected = logoStyle === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateUiSettings({logoStyle: option.value})}
                className={`min-w-[120px] px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "bg-sky-500/15 text-white shadow-[inset_0_0_0_1px_rgba(125,211,252,0.35)]"
                    : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((teamId) => (
            <div key={teamId} className="border border-white/10 bg-black/10 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Preview</div>
              <div className="mt-3">
                <TeamIdentity TeamID={teamId} size="lg" textClassName="text-base font-semibold" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
