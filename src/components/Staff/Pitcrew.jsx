import { BasicInfoContext, DatabaseContext, MetadataContext } from "@/js/Contexts";
import TeamIdentity from "@/components/Common/TeamIdentity";
import { Edit, Remove, Add } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import * as React from "react";
import { useContext, useEffect, useState } from "react";

const PitCrewStatsList = {
  2: [
    { id: 32, digits: 6, displayDigits: 3, name: "Jacks" },
    { id: 33, digits: 6, displayDigits: 3, name: "Tyres" },
    { id: 34, digits: 6, displayDigits: 3, name: "Wings" },
    { id: 35, digits: 6, displayDigits: 3, name: "Car Release" },
  ],
  3: [
    { id: 32, digits: 6, displayDigits: 3, name: "Jacks" },
    { id: 41, digits: 6, displayDigits: 3, name: "Tyres Off" },
    { id: 42, digits: 6, displayDigits: 3, name: "Tyres On" },
    { id: 40, digits: 6, displayDigits: 3, name: "Wheel Gun" },
    { id: 35, digits: 6, displayDigits: 3, name: "Car Release" },
    { id: 39, digits: 6, displayDigits: 3, name: "Car Building" },
    { id: 34, digits: 0, displayDigits: 3, name: "Wings" },
    { id: 36, digits: 6, displayDigits: 3, name: "Speed" },
    { id: 38, digits: 6, displayDigits: 3, negative: true, name: "Fatigue" },
  ],
  4: [
    { id: 32, digits: 6, displayDigits: 3, name: "Jacks" },
    { id: 41, digits: 6, displayDigits: 3, name: "Tyres Off" },
    { id: 42, digits: 6, displayDigits: 3, name: "Tyres On" },
    { id: 40, digits: 6, displayDigits: 3, name: "Wheel Gun" },
    { id: 35, digits: 6, displayDigits: 3, name: "Car Release" },
    { id: 39, digits: 6, displayDigits: 3, name: "Car Building" },
    { id: 34, digits: 0, displayDigits: 3, name: "Wings" },
    { id: 36, digits: 6, displayDigits: 3, name: "Speed" },
    { id: 38, digits: 6, displayDigits: 3, negative: true, name: "Fatigue" },
  ],
};

function ActionButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center border border-white/10 bg-black/20 text-[10px] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </button>
  );
}

function getDeltaTone(delta, negative) {
  if (!delta) return "text-slate-500";
  return (negative ? delta < 0 : delta > 0) ? "text-emerald-300" : "text-rose-300";
}

function getValueTone(value, negative = false, min = 0, max = 100) {
  if (Math.abs(max - min) < 1e-9) {
    return {
      color: "rgb(226 232 240)",
    };
  }

  const range = max - min;
  const normalized = Math.max(0, Math.min(1, (value - min) / range));
  const hue = negative ? 120 - normalized * 120 : normalized * 120;
  return {
    color: `hsl(${hue}, 80%, 68%)`,
  };
}

export default function PitcrewView() {
  const database = useContext(DatabaseContext);
  const { version } = useContext(MetadataContext);
  const { teamIds } = useContext(BasicInfoContext);
  const [updated, setUpdated] = useState(0);
  const [pitCrewStats, setPitCrewStats] = useState([]);
  const [displayDigits, setDisplayDigits] = useState(1);
  const refresh = () => setUpdated(Date.now());
  const stats = PitCrewStatsList[version] || PitCrewStatsList[4];
  const statRanges = stats.reduce((acc, stat) => {
    const values = pitCrewStats
      .map((row) => Number(row[`stat_${stat.id}`]))
      .filter((value) => !Number.isNaN(value));
    acc[stat.id] = {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 100,
    };
    return acc;
  }, {});

  useEffect(() => {
    const nextStats = {};
    const [{ values }] = database.exec(`SELECT * FROM Staff_PitCrew_PerformanceStats`);
    for (const row of values) {
      if (!nextStats[row[0]]) {
        nextStats[row[0]] = {};
      }
      nextStats[row[0]][`stat_${row[1]}`] = row[2];
      nextStats[row[0]][`month_start_stat_${row[1]}`] = row[3];
    }

    setPitCrewStats(
      teamIds.map((teamIndex) => ({
        id: teamIndex,
        TeamID: teamIndex,
        ...nextStats[teamIndex],
      }))
    );
  }, [database, teamIds, updated]);

  const updatePitStat = (row, stat, nextValue) => {
    const currentValue = Number(row[`stat_${stat.id}`] || 0);
    const clampedValue = Math.max(0, nextValue);
    if (Number.isNaN(nextValue) || clampedValue === currentValue) {
      return;
    }

    if (version === 2) {
      database.exec(`UPDATE Staff_PitCrew_PerformanceStats SET Val = :value WHERE TeamID = :teamID AND StatID = :statID`, {
        ":teamID": row.TeamID,
        ":value": clampedValue,
        ":statID": stat.id,
      });
    } else {
      const delta = clampedValue - currentValue;
      if (stat.id === 38) {
        database.exec(`UPDATE Staff_PitCrew_RaceWeekendFatigue SET Val = Val + :value WHERE TeamID = :teamID`, {
          ":teamID": row.TeamID,
          ":value": delta,
        });
      }

      database.exec(`UPDATE Staff_PitCrew_PerformanceStats SET Val = :value, MonthStartVal = :monthStart WHERE TeamID = :teamID AND StatID = :statID`, {
        ":teamID": row.TeamID,
        ":value": clampedValue,
        ":monthStart": Number(row[`month_start_stat_${stat.id}`] || 0) + delta,
        ":statID": stat.id,
      });
    }

    refresh();
  };

  const getShownDigits = (stat) => Math.min(displayDigits, stat.displayDigits);
  const getValueFontSize = () => {
    if (displayDigits === 0) return "17px";
    if (displayDigits === 1) return "15px";
    return "13px";
  };

  return (
    <div className="grid gap-3">
      <div className="border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Pit Crew Workspace</h2>
            <p className="mt-2 max-w-[920px] text-sm text-slate-400">
              Tune each team&apos;s stop performance with direct controls for quick balancing and testing.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Display Digits</div>
            <div className="flex gap-1">
              {[0, 1, 3].map((digits) => {
                const selected = displayDigits === digits;
                return (
                  <button
                    key={digits}
                    type="button"
                    onClick={() => setDisplayDigits(digits)}
                    className={`min-w-10 border px-3 py-1.5 text-xs font-semibold transition ${selected
                      ? "border-sky-300/60 bg-sky-600/15 text-sky-100"
                      : "border-white/10 bg-black/10 text-slate-300 hover:border-white/20 hover:bg-white/[0.04]"
                      }`}
                  >
                    {digits}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 border border-white/10 bg-black/10 p-2">
        <DataGrid
          rows={pitCrewStats}
          getRowId={(row) => row.TeamID}
          disableColumnFilter
          disableColumnMenu
          disableColumnSelector
          disableDensitySelector
          rowHeight={62}
          columnHeaderHeight={44}
          sx={{
            border: 0,
            color: "#e5e7eb",
            backgroundColor: "transparent",
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            },
            "& .MuiDataGrid-columnHeader": {
              paddingInline: "10px",
            },
            "& .MuiDataGrid-columnHeaderTitleContainer": {
              padding: 0,
            },
            "& .MuiDataGrid-cell": {
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              paddingInline: "10px",
              alignItems: "stretch",
            },
            "& .MuiDataGrid-row:nth-of-type(odd)": {
              backgroundColor: "rgba(255,255,255,0.015)",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: "rgba(255,255,255,0.035)",
            },
            "& .MuiDataGrid-virtualScroller": {
              minHeight: 320,
            },
          }}
          columns={[
            {
              field: "TeamID",
              headerName: "Team",
              width: 190,
              sortable: false,
              renderHeader: () => (
                <div className="flex h-full items-center py-1">
                  <span className="text-xs font-semibold text-slate-200">Team</span>
                </div>
              ),
              renderCell: ({ value }) => {
                return (
                  <div className="flex h-full items-center py-1.5">
                    <TeamIdentity TeamID={value} size="sm" textClassName="text-[13px] leading-5" />
                  </div>
                );
              },
            },
            ...stats.map((stat) => ({
              field: `stat_${stat.id}`,
              headerName: stat.name,
              minWidth: 100,
              flex: 1,
              sortable: false,
              renderHeader: () => (
                <div className="flex h-full items-center py-1">
                  <span className="text-xs font-semibold text-slate-200">{stat.name}</span>
                </div>
              ),
              renderCell: ({ row }) => {
                const value = Number(row[`stat_${stat.id}`] || 0);
                const monthStart = Number(row[`month_start_stat_${stat.id}`] || 0);
                const delta = value - monthStart;
                const shownDigits = getShownDigits(stat);
                const range = statRanges[stat.id] || {min: 0, max: 100};
                return (
                  <div className="flex h-full w-full items-center py-1.5">
                    <div className="flex w-full items-start justify-between">
                      <div className="grid min-h-[34px] min-w-0 content-between gap-0.5 self-stretch">
                        <div
                          className="font-semibold leading-none"
                          style={{
                            ...getValueTone(value, stat.negative, range.min, range.max),
                            fontSize: getValueFontSize(),
                          }}
                        >
                          {value.toFixed(shownDigits)}
                        </div>
                        <div className={`self-end text-[9px] leading-none ${getDeltaTone(delta, stat.negative)}`}>
                          {delta ? `${delta > 0 ? "+" : ""}${delta.toFixed(Math.min(3, Math.max(0, shownDigits)))}` : ""}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="h-5 w-5" />
                        <ActionButton
                          title="Edit"
                          onClick={() => {
                            const nextValue = window.prompt(`Set ${stat.name}`, value.toString());
                            if (nextValue === null) {
                              return;
                            }
                            const parsed = Number(nextValue);
                            if (Number.isNaN(parsed)) {
                              return;
                            }
                            updatePitStat(row, stat, parsed);
                          }}
                        >
                          <Edit fontSize="inherit" />
                        </ActionButton>
                        <ActionButton title="-10" onClick={() => updatePitStat(row, stat, value - 10)}>
                          <Remove fontSize="inherit" />
                        </ActionButton>
                        <ActionButton title="+10" onClick={() => updatePitStat(row, stat, value + 10)}>
                          <Add fontSize="inherit" />
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                );
              },
            })),
          ]}
          hideFooter
        />
      </div>
    </div>
  );
}
