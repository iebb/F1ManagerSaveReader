import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {countryNames, getDriverName, raceFlags, resolveLiteral, teamNames} from "@/js/localization";
import {getCountryFlag} from "@/js/localization/ISOCountries";
import * as React from "react";
import {useContext, useEffect, useMemo, useState} from "react";

const grandPrixNames = {
  1: "Australian Grand Prix",
  2: "Bahrain Grand Prix",
  3: "Chinese Grand Prix",
  4: "Azerbaijan Grand Prix",
  5: "Spanish Grand Prix",
  6: "Monaco Grand Prix",
  7: "Canadian Grand Prix",
  8: "French Grand Prix",
  9: "Austrian Grand Prix",
  10: "British Grand Prix",
  11: "Saudi Arabian Grand Prix",
  12: "Hungarian Grand Prix",
  13: "Belgian Grand Prix",
  14: "Italian Grand Prix",
  15: "Singapore Grand Prix",
  16: "Russian Grand Prix",
  17: "Japanese Grand Prix",
  18: "Mexico City Grand Prix",
  19: "United States Grand Prix",
  20: "São Paulo Grand Prix",
  21: "Abu Dhabi Grand Prix",
  22: "Miami Grand Prix",
  23: "Dutch Grand Prix",
  24: "Emilia-Romagna Grand Prix",
  25: "Las Vegas Grand Prix",
  26: "Qatar Grand Prix",
};

const teamLogoAssets = import.meta.glob("../../assets/team-logos/**/*.{png,webp}", {
  eager: true,
  import: "default",
});

const teamLogoSlugsByYear = {
  2022: {1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin"},
  2023: {1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin"},
  2024: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas", 8: "rb", 9: "kicksauber", 10: "astonmartin"},
  2025: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "kicksauber", 10: "astonmartin"},
  2026: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "audi", 10: "astonmartin", 11: "cadillac"},
};

function getGpName(trackId) {
  return grandPrixNames[trackId] || `${countryNames[trackId] || "Unknown"} Grand Prix`;
}

function getOfficialTeamLogo(version, teamId) {
  const year = Math.min(2026, Math.max(2022, version + 2020));
  const slug = teamLogoSlugsByYear[year]?.[teamId];
  if (!slug) return null;
  const extension = year <= 2023 ? "png" : "webp";
  return teamLogoAssets[`../../assets/team-logos/${year}/${slug}.${extension}`] || null;
}

function getNumericValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function getRawValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function formatRaceSeconds(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  const totalMilliseconds = Math.round(value * 1000);
  const hours = Math.floor(totalMilliseconds / 3600000);
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function getDriverNumber(driver) {
  if (!driver) return "—";
  return driver.CurrentNumber || driver.PernamentNumber || driver.DriverAssignedNumber || "—";
}

function DriverInline({driver}) {
  if (!driver) {
    return <span className="text-slate-600">-</span>;
  }
  return (
    <div className="flex items-center gap-2">
      {driver.flag ? <img src={driver.flag} alt="" className="h-[18px] w-6 border border-white/10 object-cover" /> : null}
      <span className="truncate text-[15px] text-slate-100">{driver.name}</span>
    </div>
  );
}

function TeamInline({team}) {
  if (!team) {
    return <span className="text-slate-600">-</span>;
  }
  return (
    <div className="flex items-center gap-2">
      {team.logo ? <img src={team.logo} alt="" className="h-5 w-5 object-contain" /> : null}
      <span className="truncate text-[15px] text-slate-100">{team.name}</span>
    </div>
  );
}

function getResultStatus(row) {
  const finishPos = getNumericValue(row, ["FinishingPos", "FinishPosition", "Position"]);
  const laps = getNumericValue(row, ["Laps", "LapCount", "CompletedLaps"]);
  const dnf = Boolean(getNumericValue(row, ["DNF", "DidNotFinish"]));
  const retiredReason = getRawValue(row, ["DNFReason", "RetirementReason", "Reason"]);

  if (!dnf && Number.isFinite(finishPos) && finishPos > 0) {
    return `${finishPos}`;
  }
  if (dnf && laps === 0) {
    return "DNS";
  }
  if (dnf && Number.isFinite(finishPos) && finishPos > 0) {
    return "NC";
  }
  if (dnf || retiredReason) {
    return "Ret";
  }
  return Number.isFinite(finishPos) && finishPos > 0 ? `${finishPos}` : "—";
}

function getTimeOrRetired(row, winnerTime, winnerLaps) {
  const dnf = Boolean(getNumericValue(row, ["DNF", "DidNotFinish"]));
  const retiredReason = getRawValue(row, ["DNFReason", "RetirementReason", "Reason"]);
  const ownTime = getNumericValue(row, ["RaceTime", "TotalTime", "Time"]);
  const laps = getNumericValue(row, ["Laps", "LapCount", "CompletedLaps"]);

  if (dnf || retiredReason) {
    if (retiredReason) return `${retiredReason}`;
    return "Retired";
  }
  if (Number.isFinite(ownTime) && Number.isFinite(winnerTime) && ownTime === winnerTime) {
    return formatRaceSeconds(ownTime) || "—";
  }
  if (Number.isFinite(laps) && Number.isFinite(winnerLaps) && laps < winnerLaps) {
    const lapsDown = winnerLaps - laps;
    return `+${lapsDown} lap${lapsDown > 1 ? "s" : ""}`;
  }
  if (Number.isFinite(ownTime) && Number.isFinite(winnerTime) && ownTime > winnerTime) {
    return `+${(ownTime - winnerTime).toFixed(3)}`;
  }
  if (Number.isFinite(ownTime) && ownTime > 0) {
    return formatRaceSeconds(ownTime) || "—";
  }
  return "—";
}

export default function SeasonResultsSummary() {
  const basicInfo = useContext(BasicInfoContext);
  const database = useContext(DatabaseContext);
  const {version, careerSaveMetadata} = useContext(MetadataContext);
  const {player, driverMap, teamMap} = basicInfo;
  const [season, setSeason] = useState(player.CurrentSeason);
  const [selectedRaceId, setSelectedRaceId] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [classificationRows, setClassificationRows] = useState([]);
  const reportRef = React.useRef(null);

  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;

  const getDriver = (driverId) => {
    const driver = driverMap[driverId];
    if (!driver) return null;
    return {
      id: driverId,
      name: getDriverName(driver),
      flag: driver.Nationality ? getCountryFlag(driver.Nationality) : null,
      number: getDriverNumber(driver),
    };
  };

  const getTeam = (teamId) => {
    if (!teamId) return null;
    return {
      id: teamId,
      name: teamId >= 32 && teamMap?.[teamId]?.TeamNameLocKey
        ? resolveLiteral(teamMap[teamId].TeamNameLocKey)
        : teamNames(teamId, version),
      logo: teamId >= 32 && customTeamLogoBase64
        ? `data:image/png;base64,${customTeamLogoBase64}`
        : getOfficialTeamLogo(version, teamId),
    };
  };

  useEffect(() => {
    const resultColumns = database.getAllRows(`PRAGMA table_info('Races_Results')`);
    const hasRaceFormula = resultColumns.some((column) => column.name === "RaceFormula");
    const seasonRows = database.getAllRows(
      `SELECT DISTINCT Season
       FROM Races_Results
       ${hasRaceFormula ? "WHERE RaceFormula = 1" : ""}
       ORDER BY Season DESC`
    ).map((row) => Number(row.Season)).filter((value) => Number.isFinite(value));

    if (seasonRows.length) {
      setSeasons(seasonRows);
      if (!seasonRows.includes(season)) {
        setSeason(seasonRows[0]);
      }
    } else {
      setSeasons([player.CurrentSeason]);
    }
  }, [database, player.CurrentSeason, season]);

  useEffect(() => {
    const resultColumns = database.getAllRows(`PRAGMA table_info('Races_Results')`);
    const hasRaceFormula = resultColumns.some((column) => column.name === "RaceFormula");
    const seasonRaces = database.getAllRows(
      `SELECT Races.RaceID, Races.TrackID, Races.Day
       FROM Races
       WHERE Races.SeasonID = :season
       ORDER BY Races.Day ASC, Races.RaceID ASC`,
      { ":season": season }
    );

    const resultsRows = database.getAllRows(
      `SELECT *
       FROM Races_Results
       WHERE Season = :season
       ${hasRaceFormula ? "AND RaceFormula = 1" : ""}
       ORDER BY RaceID ASC, FinishingPos ASC`,
      { ":season": season }
    );

    const raceResultsByRace = resultsRows.reduce((acc, row) => {
      if (!acc[row.RaceID]) {
        acc[row.RaceID] = [];
      }
      acc[row.RaceID].push(row);
      return acc;
    }, {});

    const fallbackRaceIds = Object.keys(raceResultsByRace)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b)
      .map((raceId) => ({
        RaceID: raceId,
        TrackID: raceResultsByRace[raceId]?.[0]?.TrackID || 0,
        Day: raceResultsByRace[raceId]?.[0]?.Day || raceId,
      }));

    const raceSchedule = (seasonRaces.length ? seasonRaces : fallbackRaceIds).map((race, index) => {
      const raceResults = raceResultsByRace[race.RaceID] || [];
      const poleResult = raceResults.find((result) => Number(result.StartingPos) === 1 || Number(result.GridPosition) === 1);
      const winner = raceResults.find((result) => Number(result.FinishingPos) === 1 && !Number(result.DNF))
        || raceResults.find((result) => Number(result.FinishingPos) === 1);
      const fastest = raceResults
        .filter((result) => Number(result.FastestLap) > 0)
        .sort((a, b) => Number(a.FastestLap) - Number(b.FastestLap))[0];

      return {
        id: race.RaceID,
        round: index + 1,
        race,
        raceResults,
        pole: getDriver(poleResult?.DriverID),
        fastest: getDriver(fastest?.DriverID),
        winner: getDriver(winner?.DriverID),
        constructor: getTeam(winner?.TeamID),
      };
    });

    setSummaryRows(raceSchedule);
    setSelectedRaceId((current) => {
      if (raceSchedule.some((row) => row.id === current)) {
        return current;
      }
      return raceSchedule[0]?.id ?? null;
    });
  }, [database, driverMap, season, teamMap, version]);

  useEffect(() => {
    const selectedRace = summaryRows.find((row) => row.id === selectedRaceId);
    if (!selectedRace) {
      setClassificationRows([]);
      return;
    }

    const winnerRow = selectedRace.raceResults.find((row) => Number(row.FinishingPos) === 1);
    const winnerTime = getNumericValue(
      winnerRow,
      ["RaceTime", "TotalTime", "Time"]
    );
    const winnerLaps = getNumericValue(
      winnerRow,
      ["Laps", "LapCount", "CompletedLaps"]
    );

    const nextRows = selectedRace.raceResults
      .slice()
      .sort((left, right) => {
        const leftFinish = getNumericValue(left, ["FinishingPos", "FinishPosition", "Position"]) ?? 999;
        const rightFinish = getNumericValue(right, ["FinishingPos", "FinishPosition", "Position"]) ?? 999;
        return leftFinish - rightFinish;
      })
      .map((row) => {
        const driver = getDriver(row.DriverID);
        return {
          id: `${selectedRaceId}-${row.DriverID}`,
          driver,
          team: getTeam(row.TeamID),
          pos: getResultStatus(row),
          number: driver?.number || "—",
          laps: getNumericValue(row, ["Laps", "LapCount", "CompletedLaps"]) ?? "—",
          timeOrRetired: getTimeOrRetired(row, winnerTime, winnerLaps),
          grid: getNumericValue(row, ["StartingPos", "GridPosition"]) ?? "—",
          points: getNumericValue(row, ["Points", "ChampionshipPoints"]) ?? "",
        };
      });

    setClassificationRows(nextRows);
  }, [selectedRaceId, summaryRows]);

  const selectedRace = summaryRows.find((row) => row.id === selectedRaceId) || null;
  const openRaceReport = (raceId) => {
    setSelectedRaceId(raceId);
    window.requestAnimationFrame(() => {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Race Results</div>
            <h2 className="mt-2 text-lg font-bold text-white">Season Summary & Race Report</h2>
            <p className="mt-2 max-w-[860px] text-sm text-slate-400">
              Browse stored season summaries from `Races_Results`, then open a race-by-race classification report for any completed grand prix.
            </p>
          </div>
          <label className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-300">Season</span>
            <select
              value={season}
              onChange={(event) => setSeason(Number(event.target.value))}
              className="border border-white/10 bg-black/10 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300/50"
            >
              {seasons.map((value) => (
                <option key={value} value={value} className="bg-[#182026] text-white">
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-x-auto border border-white/10 bg-white/[0.015]">
        <table className="min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="bg-white/[0.04]">
              {["Round", "Grand Prix", "Pole Position", "Fastest Lap", "Winning Driver", "Winning Constructor", "Report"].map((header) => (
                <th key={header} className="border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((row) => (
              <tr
                key={row.id}
                className={`bg-white/[0.01] even:bg-white/[0.03] ${row.id === selectedRaceId ? "bg-sky-500/[0.08] even:bg-sky-500/[0.08]" : ""}`}
              >
                <td className="border border-white/10 px-3 py-2 text-center text-sm font-semibold text-slate-100">{row.round}</td>
                <td className="border border-white/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <img src={`/flags/${raceFlags[row.race.TrackID]}.svg`} alt="" className="h-[18px] w-8 border border-white/10 object-cover" />
                    <span className="text-[15px] text-slate-100">{getGpName(row.race.TrackID)}</span>
                  </div>
                </td>
                <td className="border border-white/10 px-3 py-2"><DriverInline driver={row.pole} /></td>
                <td className="border border-white/10 px-3 py-2"><DriverInline driver={row.fastest} /></td>
                <td className="border border-white/10 px-3 py-2"><DriverInline driver={row.winner} /></td>
                <td className="border border-white/10 px-3 py-2"><TeamInline team={row.constructor} /></td>
                <td className="border border-white/10 px-3 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => openRaceReport(row.id)}
                    className="border border-white/10 bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    Report
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section ref={reportRef} className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Race Classification</div>
          <div className="mt-1 text-lg font-bold text-white">
            {selectedRace ? getGpName(selectedRace.race.TrackID) : "No race selected"}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] border-collapse text-left">
            <thead>
              <tr className="bg-white/[0.04]">
                {["Pos.", "No.", "Driver", "Constructor", "Laps", "Time/Retired", "Grid", "Points"].map((header) => (
                  <th key={header} className="border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classificationRows.map((row) => (
                <tr key={row.id} className="bg-white/[0.01] even:bg-white/[0.03]">
                  <td className="border border-white/10 px-3 py-2 text-center text-sm font-semibold text-slate-100">{row.pos}</td>
                  <td className="border border-white/10 px-3 py-2 text-center text-sm text-slate-200">{row.number}</td>
                  <td className="border border-white/10 px-3 py-2"><DriverInline driver={row.driver} /></td>
                  <td className="border border-white/10 px-3 py-2"><TeamInline team={row.team} /></td>
                  <td className="border border-white/10 px-3 py-2 text-center text-sm text-slate-200">{row.laps}</td>
                  <td className="border border-white/10 px-3 py-2 text-sm text-slate-100">{row.timeOrRetired}</td>
                  <td className="border border-white/10 px-3 py-2 text-center text-sm text-slate-200">{row.grid}</td>
                  <td className="border border-white/10 px-3 py-2 text-center text-sm font-semibold text-slate-100">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
