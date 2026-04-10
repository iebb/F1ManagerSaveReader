import * as React from "react";

export default function WorkspaceShell({
  title,
  description,
  season,
  seasons,
  onSeasonChange,
  stats = [],
  children,
}) {
  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Finance Workspace</div>
            <h2 className="mt-1.5 text-lg font-bold text-white">{title}</h2>
            {description ? (
              <p className="mt-1.5 max-w-[760px] text-sm text-slate-400">{description}</p>
            ) : null}
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-end gap-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Season</div>
              <select
                value={season}
                onChange={(event) => onSeasonChange(Number(event.target.value))}
                className="min-w-[120px] border border-white/10 bg-black/20 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-sky-400"
              >
                {seasons.map((seasonOption) => (
                  <option key={seasonOption} value={seasonOption} className="bg-slate-950 text-white">
                    {seasonOption}
                  </option>
                ))}
              </select>
            </div>
            {stats.length ? (
              <div className="grid grid-cols-2 gap-2">
                {stats.map((stat) => (
                  <div key={stat.label} className="border border-white/10 bg-black/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{stat.label}</div>
                    <div className={`mt-1.5 text-lg font-bold ${stat.valueClassName || "text-white"}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}
