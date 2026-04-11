import TeamLogo from "@/components/Common/TeamLogo";
import { UiSettingsContext } from "@/js/Contexts";
import { circuitNames, raceAbbrevs, raceFlags } from "@/js/localization";
import {
  calculateAverage,
  calculateMedian,
  formatPitStopSeconds,
  normalizePitStopSeconds
} from "@/components/Modding/saveOperationsShared";
import * as React from "react";
import { useContext, useMemo, useState } from "react";

export default function PitStopWorkspace({ pitStopRows, timingRows }) {
  const { logoStyle = "normal" } = useContext(UiSettingsContext);
  const [expandedRaces, setExpandedRaces] = useState({});

  const seasonStandings = useMemo(() => {
    const standingsMap = new Map();
    pitStopRows.forEach((row) => {
      const teamId = Number(row.TeamID);
      const current = standingsMap.get(teamId) || {
        TeamID: teamId,
        Team: row.Team,
        Points: 0,
        Wins: 0,
        Podiums: 0,
        Stops: [],
        BestStop: Number.POSITIVE_INFINITY,
        WorstStop: null,
        AverageStop: null,
        MedianStop: null,
      };
      current.Points += Number(row.Points || 0);
      const stopTime = normalizePitStopSeconds(row.FastestPitStopTime);
      if (Number.isFinite(stopTime)) {
        current.Stops.push(stopTime);
      }
      current.BestStop = Math.min(current.BestStop, Number.isFinite(stopTime) ? stopTime : Number.POSITIVE_INFINITY);
      current.WorstStop = Number.isFinite(stopTime)
        ? Math.max(Number(current.WorstStop ?? stopTime), stopTime)
        : current.WorstStop;
      if (Number(row.FinishPosition) === 1) current.Wins += 1;
      if (Number(row.FinishPosition) <= 3) current.Podiums += 1;
      standingsMap.set(teamId, current);
    });
    return [...standingsMap.values()]
      .map((row) => ({
        ...row,
        AverageStop: calculateAverage(row.Stops),
        MedianStop: calculateMedian(row.Stops),
      }))
      .sort((left, right) => (
        right.Points - left.Points
        || right.Wins - left.Wins
        || left.BestStop - right.BestStop
        || left.TeamID - right.TeamID
      ))
      .map((row, index) => ({ ...row, Position: index + 1 }));
  }, [pitStopRows]);

  const rounds = useMemo(() => {
    const timingByRace = timingRows.reduce((map, row) => {
      const key = Number(row.RaceID);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(row);
      return map;
    }, new Map());

    return [...pitStopRows.reduce((map, row) => {
      const raceId = Number(row.RaceID);
      if (!map.has(raceId)) {
        map.set(raceId, {
          RaceID: raceId,
          Race: row.Race,
          TrackID: Number(row.TrackID),
          rows: [],
        });
      }
      map.get(raceId).rows.push(row);
      return map;
    }, new Map()).values()]
      .map((race) => {
        const rows = [...race.rows].sort((left, right) => (
          Number(left.FinishPosition || 999) - Number(right.FinishPosition || 999)
          || (normalizePitStopSeconds(left.FastestPitStopTime) ?? Number.POSITIVE_INFINITY) - (normalizePitStopSeconds(right.FastestPitStopTime) ?? Number.POSITIVE_INFINITY)
        ));
        const raceTimingRows = timingByRace.get(race.RaceID) || [];
        const stopKeys = new Set(raceTimingRows.map((row) => `${row.DriverID}:${row.PitStopID}`));
        const totalDelay = raceTimingRows.reduce((sum, row) => sum + Number(row.IncidentDelay || 0), 0);
        return {
          ...race,
          rows,
          winner: rows[0] || null,
          stopCount: stopKeys.size,
          totalDelay,
        };
      })
      .sort((left, right) => right.RaceID - left.RaceID);
  }, [pitStopRows, timingRows]);

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Season Results</div>
        <h3 className="mt-2 text-base font-bold text-white">Pit Crew Championship</h3>
        <p className="mt-2 text-sm text-slate-400">
          Points, wins, podiums, and stop-time benchmarks across the season.
        </p>
        <div className="mt-4 grid gap-2">
          <div className="grid grid-cols-[38px_minmax(0,1.3fr)_52px_52px_70px_70px_70px_70px_84px] items-center gap-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <div>Pos</div>
            <div>Team</div>
            <div className="text-right">Wins</div>
            <div className="text-right">Pods</div>
            <div className="text-right">Avg</div>
            <div className="text-right">Median</div>
            <div className="text-right">Best</div>
            <div className="text-right">Worst</div>
            <div className="text-right">Pts</div>
          </div>
          {seasonStandings.map((row) => (
            <div key={row.TeamID} className="grid grid-cols-[38px_minmax(0,1.3fr)_52px_52px_70px_70px_70px_70px_84px] items-center gap-3 bg-black/20 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="text-sm font-bold text-white">{row.Position}</div>
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo TeamID={row.TeamID} size="sm" logoStyleOverride={logoStyle} alt={row.Team} className="opacity-95" />
                <div className="truncate text-sm font-semibold text-white">{row.Team}</div>
              </div>
              <div className="text-right text-sm text-slate-300">{row.Wins}W</div>
              <div className="text-right text-sm text-slate-300">{row.Podiums}P</div>
              <div className="text-right text-xs text-slate-300">{formatPitStopSeconds(row.AverageStop)}</div>
              <div className="text-right text-xs text-slate-300">{formatPitStopSeconds(row.MedianStop)}</div>
              <div className="text-right text-xs text-emerald-300">{formatPitStopSeconds(row.BestStop)}</div>
              <div className="text-right text-xs text-rose-300">{formatPitStopSeconds(row.WorstStop)}</div>
              <div className="text-right text-sm font-semibold text-sky-300">{row.Points} pts</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Per Race</div>
            <h3 className="mt-2 text-base font-bold text-white">Fastest Pit Stop By Round</h3>
          </div>
          <div className="text-xs text-slate-500">Read-only season summary</div>
        </div>
        <div className="mt-3 grid gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
          {rounds.map((race) => (
            <div key={race.RaceID} className="bg-[linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.32))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {(() => {
                const remainingRows = race.rows.slice(race.winner ? 1 : 0);
                const visibleRows = expandedRaces[race.RaceID] ? remainingRows : remainingRows.slice(0, 2);
                return (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {raceFlags[race.TrackID] ? (
                          <img
                            src={`/flags/${raceFlags[race.TrackID]}.svg`}
                            alt={race.Race}
                            className="mt-0.5 h-[18px] w-7 rounded-[2px] border border-white/8 object-cover"
                          />
                        ) : null}
                        <div className="pt-[1px] text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {raceAbbrevs[race.TrackID] || `R${race.RaceID}`}
                        </div>
                      </div>
                      <div className="pt-[1px] text-right text-sm font-semibold text-white">
                        {circuitNames[race.TrackID] || race.Race}
                      </div>
                    </div>
                    {race.winner ? (
                      <div className="mt-2.5 bg-amber-500/10 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(251,191,36,0.18)]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-300/18 text-sm font-bold tabular-nums text-amber-200">
                              1
                            </div>
                            <TeamLogo TeamID={race.winner.TeamID} size="sm" logoStyleOverride={logoStyle} alt={race.winner.Team} className="opacity-95" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white">{race.winner.Team}</div>
                              <div className="truncate text-xs text-slate-400">{race.winner.Driver}</div>
                            </div>
                          </div>
                          <div className="text-sm font-bold text-amber-300">{formatPitStopSeconds(race.winner.FastestPitStopTime)}</div>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-2.5 grid gap-1.5">
                      {visibleRows.map((row) => (
                        <div
                          key={`${row.RaceID}-${row.TeamID}-${row.FinishPosition}`}
                          className="grid w-full grid-cols-[28px_minmax(0,1fr)_76px] items-center gap-2.5 bg-white/[0.04] px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                        >
                          <div className="flex h-7 w-7 items-center justify-center text-sm font-bold tabular-nums text-white">
                            {row.FinishPosition}
                          </div>
                          <div className="flex min-w-0 items-center gap-2">
                            <TeamLogo TeamID={row.TeamID} size="sm" logoStyleOverride={logoStyle} alt={row.Team} className="opacity-95" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white">{row.Team}</div>
                              <div className="truncate text-xs text-slate-400">{row.Driver}</div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-sky-300">{formatPitStopSeconds(row.FastestPitStopTime)}</div>
                        </div>
                      ))}
                    </div>
                    {remainingRows.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedRaces((current) => ({
                          ...current,
                          [race.RaceID]: !current[race.RaceID],
                        }))}
                        className="mt-2.5 text-sm font-medium text-sky-300 transition hover:text-sky-200"
                      >
                        {expandedRaces[race.RaceID]
                          ? "Show top 3"
                          : `Show ${remainingRows.length - 2} more`}
                      </button>
                    ) : null}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
