import TeamIdentity from "@/components/Common/TeamIdentity";
import {MetadataContext, UiSettingsContext, UiSettingsUpdaterContext} from "@/js/Contexts";
import {getSettingsPreviewTeams} from "@/components/Common/teamLogos";
import * as React from "react";
import {useContext, useMemo} from "react";

export default function Page() {
  const {version} = useContext(MetadataContext);
  const {logoStyle = "normal", useRealWorldTeamBrands = true} = useContext(UiSettingsContext);
  const updateUiSettings = useContext(UiSettingsUpdaterContext);
  const startYear = version ? version + 2020 : 2025;
  const styleOptions = [
    {value: "normal", label: "Normal"},
    {value: "white", label: "White"},
    {value: "colored-white", label: "Colored-White"},
  ];
  const settingsPreviewTeams = useMemo(
    () => getSettingsPreviewTeams(startYear, useRealWorldTeamBrands),
    [startYear, useRealWorldTeamBrands],
  );

  return (
    <div className="grid gap-4">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="max-w-[840px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Settings</div>
          <h2 className="mt-2 text-lg font-bold text-white">Appearance</h2>
          <p className="mt-2 text-sm text-slate-400">
            Switch logo treatment across the editor and compare every supported team mark side by side before applying it globally.
          </p>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015] p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Team Logos</div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="inline-flex flex-wrap border border-white/10 bg-black/10 p-1">
            {styleOptions.map((option) => {
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

          <div className="justify-self-end">
            <div className="mb-2 text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Branding
            </div>
            <div className="inline-flex flex-wrap border border-white/10 bg-black/10 p-1">
              {[
                {value: true, label: "Future"},
                {value: false, label: "Save-Era"},
              ].map((option) => {
                const selected = useRealWorldTeamBrands === option.value;
                return (
                  <button
                    key={`brands-${String(option.value)}`}
                    type="button"
                    onClick={() => updateUiSettings({useRealWorldTeamBrands: option.value})}
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
          </div>
        </div>

        <div className="mt-5 overflow-x-auto border border-white/10 bg-black/10">
          <div className="grid min-w-[960px] grid-cols-[220px_repeat(3,minmax(0,1fr))]">
            <div className="border-b border-r border-white/10 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Team
            </div>
            {styleOptions.map((option) => (
              <button
                key={`preview-${option.value}`}
                type="button"
                onClick={() => updateUiSettings({logoStyle: option.value})}
                className={`border-b border-r border-white/10 px-4 py-3 text-left transition last:border-r-0 ${
                  logoStyle === option.value
                    ? "bg-sky-500/10 text-white"
                    : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Style
                </div>
                <div className="mt-1 text-sm font-semibold">{option.label}</div>
              </button>
            ))}

            {settingsPreviewTeams.map((team) => (
              <React.Fragment key={team.key}>
                <div className={`border-b border-r border-white/10 px-4 py-3 last:border-b-0 ${team.isSubRow ? "bg-white/[0.015]" : ""}`}>
                  <div className={`flex items-start gap-3 ${team.isSubRow ? "pl-4" : ""}`}>
                    {team.isSubRow ? (
                      <div className="mt-0.5 flex w-4 shrink-0 items-center justify-center text-slate-500">
                        <span className="text-xs leading-none">└</span>
                      </div>
                    ) : (
                      <div className="w-4 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{team.name}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                        {team.subtitle}
                      </div>
                    </div>
                  </div>
                </div>
                {styleOptions.map((option, index) => (
                  <div
                    key={`${team.key}-${option.value}`}
                    className={`border-b border-white/10 px-4 py-3 ${index < styleOptions.length - 1 ? "border-r" : ""} ${team.isSubRow ? "bg-white/[0.015]" : ""}`}
                  >
                    <div className={team.isSubRow ? "pl-8" : ""}>
                      <TeamIdentity
                        TeamID={team.teamId}
                        size="lg"
                        logoStyleOverride={option.value}
                        logoVersionOverride={team.version}
                        brandYearOverride={team.brandYear}
                        teamLabelOverride={team.name}
                        textClassName={logoStyle === option.value ? "text-base font-semibold" : "text-base"}
                      />
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {styleOptions.map((option) => (
            <div key={`active-${option.value}`} className={`border p-4 ${logoStyle === option.value ? "border-sky-300/40 bg-sky-500/[0.06]" : "border-white/10 bg-white/[0.02]"}`}>
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Current Style</div>
              <div className="mt-2 text-base font-semibold text-white">{option.label}</div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => updateUiSettings({logoStyle: option.value})}
                  className={`px-3 py-2 text-sm font-semibold transition ${logoStyle === option.value ? "bg-sky-500/15 text-white" : "bg-black/20 text-slate-300 hover:bg-white/[0.06] hover:text-white"}`}
                >
                  {logoStyle === option.value ? "Active" : "Use This Style"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
