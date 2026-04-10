import {
  Alert,
  AlertTitle,
  Button,
} from "@mui/material";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import { BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext } from "@/js/Contexts";
import {
  applyRealWorldSeasonImport,
  fetchBundledRealWorldDataset,
  getAvailableImportYears,
  getLockedCompletedRounds,
  getSeasonImportPreview,
} from "@/components/Experimental/realWorldSeasonImportUtils";
import { raceAbbrevs, raceFlags, resolveLiteral, resolveName } from "@/js/localization";

export default function RealWorldSeasonImporter() {
  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();

  const [datasets, setDatasets] = useState({});
  const [datasetYearsLoaded, setDatasetYearsLoaded] = useState({ f1: [], f2: [], f3: [] });
  const [datasetStatus, setDatasetStatus] = useState({ f1: "idle", f2: "idle", f3: "idle" });
  const [datasetErrors, setDatasetErrors] = useState({});
  const [targetYear, setTargetYear] = useState("");
  const [lastRound, setLastRound] = useState(0);
  const [isApplying, setIsApplying] = useState(false);
  const [customTeamBaselinePosition, setCustomTeamBaselinePosition] = useState(18);
  const [customTeamDerivation, setCustomTeamDerivation] = useState(3);
  const [driverReplacementSelections, setDriverReplacementSelections] = useState({});
  const currentSeason = Number(basicInfo?.player?.CurrentSeason || 0);
  const lockedCompletedRounds = useMemo(() => getLockedCompletedRounds(basicInfo), [basicInfo]);
  const customF1Team = useMemo(() => {
    if (!basicInfo?.player?.CustomTeamEnabled) {
      return null;
    }
    const team = basicInfo?.teamMap?.[32];
    return Number(team?.Formula) === 1 ? team : null;
  }, [basicInfo]);

  const availableYears = useMemo(() => (
    getAvailableImportYears(datasets.f1).filter((year) => year >= currentSeason)
  ), [currentSeason, datasets.f1]);

  const preview = useMemo(
    () => getSeasonImportPreview({ dataset: datasets.f1, basicInfo, targetYear, lastCompletedRound: lastRound }),
    [basicInfo, datasets.f1, lastRound, targetYear]
  );
  const driverOptions = useMemo(() => (
    Object.values(basicInfo?.driverMap || {})
      .map((driver) => ({
        staffId: Number(driver.StaffID),
        label: [resolveName(`${driver.FirstName || ""}`), resolveName(`${driver.LastName || ""}`)]
          .filter(Boolean)
          .join(" ")
          .trim(),
      }))
      .map((driver) => ({
        ...driver,
        label: driver.label || `Driver ${driver.staffId}`,
      }))
      .filter((driver) => Number.isFinite(driver.staffId))
      .sort((left, right) => left.label.localeCompare(right.label))
  ), [basicInfo]);
  const unresolvedDriverConflicts = useMemo(() => (
    (preview?.driverConflicts || []).filter((conflict) => !driverReplacementSelections[conflict.importedDriverName])
  ), [driverReplacementSelections, preview?.driverConflicts]);

  useEffect(() => {
    const activeConflicts = new Set((preview?.driverConflicts || []).map((conflict) => conflict.importedDriverName));
    setDriverReplacementSelections((current) => Object.fromEntries(
      Object.entries(current).filter(([driverName]) => activeConflicts.has(driverName))
    ));
  }, [preview?.driverConflicts]);

  const gridRows = useMemo(() => {
    return availableYears.map((year) => {
      const season = datasets.f1?.seasons?.[`${year}`];
      const isCurrentSeason = year === currentSeason;
      const events = isCurrentSeason
        ? (basicInfo?.currentSeasonRaces || []).map((race, index) => ({
          round: index + 1,
          label: raceAbbrevs[race.TrackID] || `R${index + 1}`,
          description: raceAbbrevs[race.TrackID] || `Race ${index + 1}`,
          flag: raceFlags[race.TrackID] || null,
          locked: index < lockedCompletedRounds,
        }))
        : (season?.events || []).map((event, index) => ({
          round: index + 1,
          label: getRoundAbbrev(event),
          description: event.eventName,
          flag: getRoundFlag(event),
          locked: false,
        }));
      return { year, isCurrentSeason, events };
    });
  }, [availableYears, basicInfo?.currentSeasonRaces, currentSeason, datasets.f1, lockedCompletedRounds]);

  const maxGridRounds = useMemo(
    () => gridRows.reduce((max, row) => Math.max(max, row.events.length), 0),
    [gridRows]
  );

  const selectedRangeByYear = useMemo(() => {
    const ranges = {};
    const numericTargetYear = Number(targetYear);
    if (!numericTargetYear || numericTargetYear < currentSeason) {
      return ranges;
    }

    for (let year = currentSeason; year <= numericTargetYear; year += 1) {
      if (year === currentSeason) {
        const currentRow = gridRows.find((row) => row.year === year);
        const startRound = lockedCompletedRounds + 1;
        const endRound = year === numericTargetYear ? Number(lastRound) : (currentRow?.events?.length || 0);
        if (endRound >= startRound) {
          ranges[year] = { startRound, endRound };
        }
        continue;
      }

      const row = gridRows.find((entry) => entry.year === year);
      const endRound = year === numericTargetYear ? Number(lastRound) : (row?.events?.length || 0);
      if (endRound >= 1) {
        ranges[year] = { startRound: 1, endRound };
      }
    }

    return ranges;
  }, [currentSeason, gridRows, lastRound, lockedCompletedRounds, targetYear]);

  const ensureDatasetLoaded = async (seriesKey, years = [2022, 2023, 2024, 2025]) => {
    const requestedYears = [...new Set(years.map((value) => Number(value)).filter((value) => Number.isFinite(value)))].sort((left, right) => left - right);
    const loadedYears = datasetYearsLoaded[seriesKey] || [];
    const missingYears = requestedYears.filter((year) => !loadedYears.includes(year));
    if (!missingYears.length && datasets[seriesKey]) {
      return datasets[seriesKey];
    }
    if (datasetStatus[seriesKey] === "loading") {
      return null;
    }
    setDatasetStatus((current) => ({ ...current, [seriesKey]: "loading" }));
    try {
      const parsed = await fetchBundledRealWorldDataset(seriesKey, missingYears);
      const nextDataset = {
        series: parsed?.series || seriesKey,
        seasons: {
          ...(datasets[seriesKey]?.seasons || {}),
          ...(parsed?.seasons || {}),
        },
      };
      setDatasets((current) => ({ ...current, [seriesKey]: nextDataset }));
      setDatasetYearsLoaded((current) => ({
        ...current,
        [seriesKey]: [...new Set([...(current[seriesKey] || []), ...Object.keys(parsed?.seasons || {}).map((value) => Number(value))])]
          .filter((value) => Number.isFinite(value))
          .sort((left, right) => left - right),
      }));
      setDatasetStatus((current) => ({ ...current, [seriesKey]: "ready" }));
      setDatasetErrors((current) => {
        const next = { ...current };
        delete next[seriesKey];
        return next;
      });
      if (seriesKey === "f1") {
        const nextYears = getAvailableImportYears(nextDataset);
        const futureYears = nextYears.filter((year) => year >= currentSeason);
        if (futureYears.length) {
          const nextYear = futureYears[0];
          setTargetYear(nextYear);
          if (nextYear === currentSeason) {
            setLastRound(Math.max(lockedCompletedRounds, basicInfo?.currentSeasonRaces?.length || 0));
          } else {
            const firstSeason = nextDataset.seasons?.[`${nextYear}`];
            setLastRound(firstSeason?.events?.length || 0);
          }
        }
      }
      return nextDataset;
    } catch (error) {
      setDatasetStatus((current) => ({ ...current, [seriesKey]: "error" }));
      setDatasetErrors((current) => ({ ...current, [seriesKey]: error.message || `${error}` }));
      if (seriesKey === "f1") {
        enqueueSnackbar(`Failed to load bundled ${seriesKey.toUpperCase()} dataset: ${error.message || error}`, { variant: "error" });
      }
      return null;
    }
  };

  useEffect(() => {
    ensureDatasetLoaded("f1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!availableYears.length) {
      return;
    }
    if (!availableYears.includes(Number(targetYear))) {
      const nextYear = availableYears[0];
      setTargetYear(nextYear);
      if (nextYear === currentSeason) {
        setLastRound(Math.max(lockedCompletedRounds, basicInfo?.currentSeasonRaces?.length || 0));
      } else {
        setLastRound(datasets.f1?.seasons?.[`${nextYear}`]?.events?.length || 0);
      }
    }
  }, [availableYears, basicInfo?.currentSeasonRaces?.length, currentSeason, datasets.f1, lockedCompletedRounds, targetYear]);

  const handleApply = async () => {
    const f1Dataset = datasets.f1 || await ensureDatasetLoaded("f1");
    if (!f1Dataset || !targetYear) {
      enqueueSnackbar("Bundled F1 dataset is not available.", { variant: "error" });
      return;
    }

    const confirmed = window.confirm(
      `Rewrite the loaded save into the ${targetYear} real-world season and mark results through round ${lastRound}? This is experimental and can break long-term career history.`
    );
    if (!confirmed) {
      return;
    }

    setIsApplying(true);
    try {
      const importYears = Array.from(
        { length: Math.max(0, Number(targetYear) - currentSeason) + 1 },
        (_, index) => currentSeason + index
      );
      const feederResults = await Promise.all(["f2", "f3"].map((seriesKey) => ensureDatasetLoaded(seriesKey, importYears)));
      const nextDatasets = {
        f1: f1Dataset,
        ...(feederResults[0] ? { f2: feederResults[0] } : {}),
        ...(feederResults[1] ? { f3: feederResults[1] } : {}),
      };
      const result = applyRealWorldSeasonImport({
        database,
        metadata,
        basicInfo,
        basicInfoUpdater,
        datasets: nextDatasets,
        targetYear: Number(targetYear),
        lastCompletedRound: Number(lastRound),
        customTeamRandomization: customF1Team ? {
          baselinePosition: Number(customTeamBaselinePosition),
          derivation: Number(customTeamDerivation),
        } : null,
        driverReplacements: Object.fromEntries(
          Object.entries(driverReplacementSelections)
            .filter(([, value]) => value && value !== "__create__")
            .map(([driverName, value]) => [driverName, Number(value)])
        ),
      });
      enqueueSnackbar(
        `Imported ${targetYear} through round ${lastRound}. Created ${result.createdDrivers.length} driver(s).`,
        { variant: "success" }
      );
    } catch (error) {
      console.error(error);
      enqueueSnackbar(`Import failed: ${error.message || error}`, { variant: "error" });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="grid gap-3">
      <section className="border border-rose-400/20 bg-rose-500/[0.06] p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200/80">Experimental</div>
        <h2 className="mt-2 text-lg font-bold text-white">Real-World Season Importer</h2>
        <p className="mt-2 max-w-[900px] text-sm text-slate-200/90">
          This rewrites the active save into a selected real-world season shell, applies race weekend results through a chosen round,
          creates missing drivers when needed, remaps the real-world F1 teams onto the in-game teams, and simulates component wear on the live car loadouts.
        </p>
        <p className="mt-2 max-w-[900px] text-sm text-slate-300">
          Bundled F1, F2 and F3 datasets are loaded from the app’s included `/public/real-world` files. The importer fetches feeder datasets when needed,
          one season file per year, so you do not need to browse for JSON files manually.
        </p>
      </section>
      <section className="border border-white/10 bg-white/[0.015] p-5">
        <div className="mb-4 text-sm text-slate-300">
          Pick a year and race cell. The current-season row follows the save’s remaining in-game calendar; future-season rows use the bundled real-world calendars.
          Selecting a cell imports results through that race, inclusive. If you pick a future season, the importer first completes the remaining current season,
          carries the save forward across the season boundary, and then applies the selected future-season rounds.
        </div>
        <div className="overflow-x-auto">
          <div
            className="grid gap-px border border-white/10 bg-white/10"
            style={{ gridTemplateColumns: `120px repeat(${Math.max(1, maxGridRounds)}, minmax(32px, 1fr))` }}
          >
            <div className="bg-black/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Year</div>
            {Array.from({ length: maxGridRounds }, (_, index) => (
              <div key={index} className="bg-black/30 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                R{index + 1}
              </div>
            ))}

            {gridRows.map((row) => (
              <React.Fragment key={row.year}>
                <div className="bg-black/30 px-3 py-3 text-sm font-semibold text-white">
                  {row.year}
                  {row.isCurrentSeason ? <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-amber-300">Current Save Season</div> : null}
                </div>
                {Array.from({ length: maxGridRounds }, (_, index) => {
                  const event = row.events[index];
                  if (!event) {
                    return <div key={`${row.year}-${index}`} className="bg-black/10 px-2 py-3" />;
                  }
                  const yearRange = selectedRangeByYear[row.year];
                  const inSelectedRange = Boolean(yearRange && event.round >= yearRange.startRound && event.round <= yearRange.endRound);
                  const selected = Number(targetYear) === row.year && Number(lastRound) === event.round;
                  const isPassed = row.isCurrentSeason && event.locked;
                  const disabled = isPassed;
                  const buttonClassName = [
                    "relative min-h-[78px] w-full overflow-hidden p-0 text-center transition-colors",
                    isPassed
                      ? "cursor-not-allowed bg-slate-500/18 text-slate-500"
                      : inSelectedRange
                        ? "bg-amber-500/26 text-white hover:bg-amber-500/30"
                        : "bg-black/20 text-slate-100 hover:bg-amber-500/18",
                    inSelectedRange
                      ? "shadow-[inset_0_0_0_999px_rgba(245,158,11,0.10)]"
                      : "",
                    selected ? "bg-amber-500/40 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.7)]" : "",
                  ].join(" ");
                  return (
                    <button
                      key={`${row.year}-${event.round}`}
                      type="button"
                      disabled={disabled}
                      title={`Round ${event.round}: ${event.description}`}
                      onClick={() => {
                        setTargetYear(row.year);
                        setLastRound(event.round);
                      }}
                      className={buttonClassName}
                    >
                      {event.flag ? (
                        <img
                          src={`/flags/${event.flag}.svg`}
                          alt={event.description}
                          className={`mx-auto h-[18px] w-7 border border-white/10 object-cover ${isPassed ? "opacity-40 grayscale" : inSelectedRange ? "opacity-100" : "opacity-90"}`}
                        />
                      ) : (
                        <div className="h-[18px]" />
                      )}
                      <div
                        className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] leading-tight ${
                          isPassed ? "text-slate-500" : inSelectedRange ? "text-amber-50" : ""
                        }`}
                      >
                        {event.label}
                      </div>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="min-w-[260px] text-sm text-slate-300">
            {targetYear ? (
              <>
                Import target: <span className="font-semibold text-white">{targetYear}</span>, through round <span className="font-semibold text-white">{lastRound}</span>.
              </>
            ) : "No import target selected."}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="contained"
              color="warning"
              disabled={isApplying || !datasets.f1 || !targetYear || unresolvedDriverConflicts.length > 0}
              onClick={handleApply}
            >
              {isApplying ? "Importing..." : "Apply Import"}
            </Button>
          </div>
        </div>
        {unresolvedDriverConflicts.length ? (
          <div className="mt-3 text-sm text-amber-300">
            Resolve all driver conflicts below before applying the import.
          </div>
        ) : null}

        {customF1Team ? (
          <div className="mt-4 overflow-hidden border border-amber-300/20 bg-[linear-gradient(135deg,rgba(245,158,11,0.14),rgba(15,23,42,0.18)_45%,rgba(15,23,42,0.58))]">
            <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
              <div className="p-4 md:p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100/80">Custom Team</div>
                <div className="mt-2 text-lg font-bold text-white">
                  Eleventh-team results will be synthesized for {customF1Team.TeamNameLocKey ? resolveLiteral(customF1Team.TeamNameLocKey) : "the player team"}.
                </div>
                <div className="mt-2 max-w-[560px] text-sm text-slate-200/90">
                  The importer inserts generated qualifying, sprint, and race placements for the player team whenever this save carries 11 Formula 1 teams.
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <div className="border border-white/10 bg-black/20 px-2 py-1 text-slate-200">Applies to 2022-2025 imports</div>
                  <div className="border border-white/10 bg-black/20 px-2 py-1 text-slate-200">Deterministic per event</div>
                  <div className="border border-white/10 bg-black/20 px-2 py-1 text-slate-200">Uses team 32 seats</div>
                </div>
              </div>
              <div className="border-t border-white/10 bg-black/20 p-4 md:border-l md:border-t-0 md:p-5">
                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm text-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">Baseline Finish</span>
                      <span className="min-w-[52px] text-right font-semibold text-amber-200">P{customTeamBaselinePosition}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={1}
                      value={customTeamBaselinePosition}
                      onChange={(event) => setCustomTeamBaselinePosition(Number(event.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <div className="text-xs text-slate-400">Target finishing band before event variation.</div>
                  </label>
                  <label className="grid gap-2 text-sm text-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-white">Variation</span>
                      <span className="min-w-[52px] text-right font-semibold text-amber-200">{customTeamDerivation}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={customTeamDerivation}
                      onChange={(event) => setCustomTeamDerivation(Number(event.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <div className="text-xs text-slate-400">How far results can swing around the baseline.</div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {preview ? (
        <Alert severity="info">
          <AlertTitle>Preview</AlertTitle>
          {preview.eventCount} race weekends available. {preview.importedDriverCount} distinct drivers found in the F1 dataset.
          <br />
          {Number(targetYear) === currentSeason
            ? `Current-season imports keep the save's existing remaining calendar and preserve ${lockedCompletedRounds} completed round(s).`
            : "Future-season imports first complete the remaining current season, then rebuild the next season shell from the bundled real-world calendar."}
        {preview.missingDrivers.length ? (
          <>
            <br />
            Missing drivers that will be generated if needed: {preview.missingDrivers.join(", ")}.
          </>
          ) : (
            <>
              <br />
              All imported F1 drivers already exist in this save.
            </>
          )}
        </Alert>
      ) : (
        <Alert severity="warning">
          <AlertTitle>Dataset Needed</AlertTitle>
          The bundled F1 dataset is still loading, or it could not be fetched from `/real-world/f1/&lt;year&gt;.json`.
        </Alert>
      )}

      {preview?.driverConflicts?.length ? (
        <section className="border border-amber-400/20 bg-amber-500/[0.06] p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200/80">Driver Conflicts</div>
          <div className="mt-2 text-sm text-slate-200">
            These imported drivers do not exist in the save. Pick a replacement driver, or explicitly keep driver generation.
          </div>
          <div className="mt-4 grid gap-3">
            {preview.driverConflicts.map((conflict) => (
              <div key={`${conflict.teamId}-${conflict.posInTeam}-${conflict.importedDriverName}`} className="border border-white/10 bg-black/20 p-3">
                <div className="text-sm font-semibold text-white">{conflict.importedDriverName}</div>
                <div className="mt-1 text-xs text-slate-300">
                  {conflict.teamName}, seat {conflict.posInTeam}. Current save occupant: {conflict.conflictingDriverName || "empty"}.
                </div>
                <label className="mt-3 grid gap-1 text-sm text-slate-300">
                  <span>Replacement</span>
                  <select
                    value={driverReplacementSelections[conflict.importedDriverName] || ""}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setDriverReplacementSelections((current) => ({
                        ...current,
                        [conflict.importedDriverName]: nextValue,
                      }));
                    }}
                    className="border border-white/10 bg-black/30 px-3 py-2 text-white outline-none"
                  >
                    <option value="">Select replacement</option>
                    <option value="__create__">Create generated driver</option>
                    {conflict.conflictingDriverId ? (
                      <option value={String(conflict.conflictingDriverId)}>
                        {conflict.conflictingDriverName} (current occupant)
                      </option>
                    ) : null}
                    {driverOptions
                      .filter((driver) => driver.staffId !== conflict.conflictingDriverId)
                      .map((driver) => (
                        <option key={driver.staffId} value={String(driver.staffId)}>
                          {driver.label}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Alert severity="warning">
        <AlertTitle>Current Scope</AlertTitle>
        The importer is intentionally conservative. It rewrites the current season shell, applies sporting rows, updates current contracts to the latest imported
        F1 lineup, and tracks component wear through an experimental ledger plus live part condition changes. It does not rebuild every downstream mail, finance,
        or record-history table.
      </Alert>
    </div>
  );
}

const JOLPICA_CIRCUIT_ID_TO_SLUG = {
  albert_park: "australia",
  bahrain: "bahrain",
  jeddah: "saudi-arabia",
  shanghai: "china",
  miami: "miami",
  imola: "emilia-romagna",
  monaco: "monaco",
  villeneuve: "canada",
  catalunya: "spain",
  red_bull_ring: "austria",
  silverstone: "great-britain",
  hungaroring: "hungary",
  spa: "belgium",
  zandvoort: "netherlands",
  monza: "italy",
  baku: "azerbaijan",
  marina_bay: "singapore",
  americas: "united-states",
  rodriguez: "mexico",
  interlagos: "brazil",
  vegas: "las-vegas",
  losail: "qatar",
  yas_marina: "abu-dhabi",
  paul_ricard: "france",
  suzuka: "japan",
};

function getEventSlug(event) {
  const directSlug = `${event?.f1Slug || event?.slug || ""}`.trim();
  if (directSlug) {
    return directSlug;
  }
  const circuitId = `${event?.circuit?.circuitId || ""}`.trim().toLowerCase();
  return JOLPICA_CIRCUIT_ID_TO_SLUG[circuitId] || "";
}

function getRoundAbbrev(event) {
  const slug = getEventSlug(event);
  const abbreviations = {
    australia: "AUS",
    bahrain: "BHR",
    china: "CHN",
    azerbaijan: "AZE",
    spain: "ESP",
    monaco: "MON",
    canada: "CAN",
    france: "FRA",
    austria: "AUT",
    "great-britain": "GBR",
    "saudi-arabia": "KSA",
    hungary: "HUN",
    belgium: "BEL",
    italy: "ITA",
    singapore: "SIN",
    japan: "JPN",
    mexico: "MEX",
    "united-states": "USA",
    brazil: "BRA",
    "abu-dhabi": "UAE",
    miami: "MIA",
    netherlands: "NED",
    "emilia-romagna": "EMI",
    "las-vegas": "LVG",
    qatar: "QAT",
  };
  return abbreviations[slug] || `${event?.eventName || "RND"}`.slice(0, 3).toUpperCase();
}

function getRoundFlag(event) {
  const slug = getEventSlug(event);
  const flags = {
    australia: "AU",
    bahrain: "BH",
    china: "CN",
    azerbaijan: "AZ",
    spain: "ES",
    monaco: "MC",
    canada: "CA",
    france: "FR",
    austria: "AT",
    "great-britain": "GB",
    "saudi-arabia": "SA",
    hungary: "HU",
    belgium: "BE",
    italy: "IT",
    singapore: "SG",
    japan: "JP",
    mexico: "MX",
    "united-states": "US",
    brazil: "BR",
    "abu-dhabi": "AE",
    miami: "US-MIAMI",
    netherlands: "NL",
    "emilia-romagna": "IT-45",
    "las-vegas": "US-VEGAS",
    qatar: "QA",
  };
  return flags[slug] || null;
}
