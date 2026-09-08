const buttonClass = (selected) => `border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300 ${selected
  ? "border-sky-300/40 bg-sky-500/10 text-white"
  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"}`;

export default function PeopleToolbar({ label, onCreate, view, onViewChange, supportsStatsView = true, statusFilter, onStatusChange, nameFilter, onNameChange, count }) {
  return (
    <div className="grid min-w-0 gap-3 border border-white/10 bg-black/10 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onCreate} className={`${buttonClass(false)} !border-emerald-300/30 !text-emerald-100`}>
          New {label}
        </button>
        {supportsStatsView && (
          <div role="group" aria-label="People view" className="flex flex-wrap gap-1">
            {[{ id: "contract", label: "Contract" }, { id: "stats", label: "Stats" }].map((option) => (
              <button key={option.id} type="button" aria-pressed={view === option.id} onClick={() => onViewChange(option.id)} className={buttonClass(view === option.id)}>
                {option.label}
              </button>
            ))}
          </div>
        )}
        <span className="text-xs text-slate-400">{count} {count === 1 ? "person" : "people"}</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div role="group" aria-label="Employment status" className="flex flex-wrap gap-1">
          {[
            { id: "all", label: "All" },
            { id: "contracted", label: "Contracted" },
            { id: "available", label: "Available" },
            { id: "retired", label: "Retired" },
          ].map((option) => (
            <button key={option.id} type="button" aria-pressed={statusFilter === option.id} onClick={() => onStatusChange(option.id)} className={buttonClass(statusFilter === option.id)}>
              {option.label}
            </button>
          ))}
        </div>
        <label className="ml-auto block w-full min-w-0 sm:w-64">
          <span className="mb-1 block text-xs text-slate-400">Search people</span>
          <input type="search" value={nameFilter} onChange={(event) => onNameChange(event.target.value)} placeholder="Filter by name" className="w-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-300/60" />
        </label>
        {(nameFilter || statusFilter !== "all") && (
          <button type="button" className={buttonClass(false)} onClick={() => { onNameChange(""); onStatusChange("all"); }}>
            Clear filters
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">Double-click a cell to edit. Enter saves; Escape cancels. Hover a stat heading for its full name.</p>
    </div>
  );
}
