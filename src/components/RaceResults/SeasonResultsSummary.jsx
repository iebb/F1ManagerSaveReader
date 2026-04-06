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

function getGpName(trackId) {
  return grandPrixNames[trackId] || `${countryNames[trackId] || "Unknown"} Grand Prix`;
}

function DriverCell({driver}) {
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

function TeamCell({team}) {
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

export default function SeasonResultsSummary() {
  const basicInfo = useContext(BasicInfoContext);
  const database = useContext(DatabaseContext);
  const {version, careerSaveMetadata} = useContext(MetadataContext);
  const {player, driverMap, teamMap} = basicInfo;
  const [season, setSeason] = useState(player.CurrentSeason);
  const [rows, setRows] = useState([]);

  const seasons = useMemo(() => {
    const all = [];
    for (let s = player.StartSeason; s <= player.CurrentSeason; s++) {
      all.push(s);
    }
    return all.reverse();
  }, [player.CurrentSeason, player.StartSeason]);

  const teamLogoAssets = useMemo(() => import.meta.glob("../../assets/team-logos/**/*.{png,webp}", {
    eager: true,
    import: "default",
  }), []);

  const teamLogoSlugsByYear = useMemo(() => ({
    2022: {1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin"},
    2023: {1: "ferrari", 2: "mclaren", 3: "red-bull-racing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas-f1-team", 8: "alphatauri", 9: "alfa-romeo", 10: "aston-martin"},
    2024: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haas", 8: "rb", 9: "kicksauber", 10: "astonmartin"},
    2025: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "kicksauber", 10: "astonmartin"},
    2026: {1: "ferrari", 2: "mclaren", 3: "redbullracing", 4: "mercedes", 5: "alpine", 6: "williams", 7: "haasf1team", 8: "racingbulls", 9: "audi", 10: "astonmartin", 11: "cadillac"},
  }), []);

  const getOfficialTeamLogo = (teamId) => {
    const year = Math.min(2026, Math.max(2022, version + 2020));
    const slug = teamLogoSlugsByYear[year]?.[teamId];
    if (!slug) return null;
    const extension = year <= 2023 ? "png" : "webp";
    return teamLogoAssets[`../../assets/team-logos/${year}/${slug}.${extension}`] || null;
  };

  const getDriver = (driverId) => {
    const driver = driverMap[driverId];
    if (!driver) return null;
    return {
      id: driverId,
      name: getDriverName(driver),
      flag: driver.Nationality ? getCountryFlag(driver.Nationality) : null,
    };
  };

  const getTeam = (teamId) => {
    if (!teamId) return null;
    const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;
    return {
      id: teamId,
      name: teamId >= 32 && teamMap?.[teamId]?.TeamNameLocKey
        ? resolveLiteral(teamMap[teamId].TeamNameLocKey)
        : teamNames(teamId, version),
      logo: teamId >= 32 && customTeamLogoBase64
        ? `data:image/png;base64,${customTeamLogoBase64}`
        : getOfficialTeamLogo(teamId),
    };
  };

  useEffect(() => {
    const currentSeasonRaces = Object.values(basicInfo.races)
      .filter((race) => race.SeasonID === season)
      .sort((a, b) => a.Day - b.Day);

    const poleByRace = {};
    try {
      const results = version >= 3
        ? database.exec(`SELECT RaceID, DriverID FROM Races_QualifyingResults WHERE SeasonID = ${season} AND QualifyingStage = 3 AND FinishingPos = 1 ORDER BY RaceID ASC`)
        : null;
      if (results?.length) {
        for (const [raceId, driverId] of results[0].values) {
          poleByRace[raceId] = driverId;
        }
      }
    } catch {}

    const raceResultsByRace = {};
    try {
      const results = database.exec(`SELECT * FROM Races_Results WHERE Season = ${season} ORDER BY RaceID ASC, FinishingPos ASC`);
      if (results?.length) {
        const {columns, values} = results[0];
        for (const valueRow of values) {
          const row = {};
          valueRow.forEach((value, index) => {
            row[columns[index]] = value;
          });
          if (!raceResultsByRace[row.RaceID]) {
            raceResultsByRace[row.RaceID] = [];
          }
          raceResultsByRace[row.RaceID].push(row);
        }
      }
    } catch {}

    setRows(currentSeasonRaces.map((race, index) => {
      const raceResults = raceResultsByRace[race.RaceID] || [];
      const poleResult = version >= 3
        ? raceResults.find((result) => result.DriverID === poleByRace[race.RaceID])
        : raceResults.find((result) => result.StartingPos === 1);
      const winner = raceResults.find((result) => result.FinishingPos === 1 && !result.DNF) || raceResults.find((result) => result.FinishingPos === 1);
      const fastest = raceResults
        .filter((result) => result.FastestLap > 0)
        .sort((a, b) => a.FastestLap - b.FastestLap)[0];

      return {
        id: race.RaceID,
        round: index + 1,
        race,
        pole: getDriver(poleResult?.DriverID),
        fastest: getDriver(fastest?.DriverID),
        winner: getDriver(winner?.DriverID),
        constructor: getTeam(winner?.TeamID),
      };
    }));
  }, [basicInfo.races, database, driverMap, season, version]);

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Season Results</div>
            <h2 className="mt-2 text-lg font-bold text-white">Race Results</h2>
            <p className="mt-2 max-w-[860px] text-sm text-slate-400">
              Browse one season at a time with a compact race-by-race summary for pole, fastest lap, race winner, and winning constructor.
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
              {["Round", "Grand Prix", "Pole Position", "Fastest Lap", "Winning Driver", "Winning Constructor"].map((header) => (
                <th key={header} className="border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="bg-white/[0.01] even:bg-white/[0.03]">
                <td className="border border-white/10 px-3 py-2 text-center text-sm font-semibold text-slate-100">{row.round}</td>
                <td className="border border-white/10 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <img src={`/flags/${raceFlags[row.race.TrackID]}.svg`} alt="" className="h-[18px] w-8 border border-white/10 object-cover" />
                    <span className="text-[15px] text-slate-100">{getGpName(row.race.TrackID)}</span>
                  </div>
                </td>
                <td className="border border-white/10 px-3 py-2"><DriverCell driver={row.pole} /></td>
                <td className="border border-white/10 px-3 py-2"><DriverCell driver={row.fastest} /></td>
                <td className="border border-white/10 px-3 py-2"><DriverCell driver={row.winner} /></td>
                <td className="border border-white/10 px-3 py-2"><TeamCell team={row.constructor} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
