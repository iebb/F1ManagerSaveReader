import {TeamName} from "@/components/Localization/Localization";
import {getOfficialTeamLogo} from "@/components/Common/teamLogos";
import {circuitNames, countryNames, getDriverName} from "@/js/localization";
import {
  Button,
  Divider,
  Typography
} from "@mui/material";

import * as React from "react";
import {useContext, useEffect, useMemo, useState} from "react";
import {repack} from "@/js/Parser";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext, UiSettingsContext} from "@/js/Contexts";

export const CarSetupParams = [
  {
    // name: "Front Wing Angle",
    name: "Front Angle",
    index: 0,
    min: 0,
    max: 10,
    step: 0.5,
    decimals: 1,
    effect: [99/32, (-3)/8, (-3)/2, 9/32, (-115)/64],
    render: x => x.toFixed(1),
  },
  {
    // name: "Rear Wing Angle",
    name: "Rear Angle",
    index: 1,
    min: 9,
    max: 16,
    step: 0.5,
    decimals: 1,
    effect: [(-11)/32, 1/24, 1/6, (-1)/32, (-175)/192],
    render: x => x.toFixed(1),
  },
  {
    name: "Anti-Roll",
    index: 2,
    min: 1,
    max: 9,
    step: 1,
    decimals: 0,
    effect: [7/16, 1/4, 1, 37/16, 25/32],
    render: x => {
      if (Math.abs(Math.round(x) - x) < 1e-6) {
        return `${(10-x).toFixed(0)}:${x.toFixed(0)}`
      }
      return `${(10-x).toFixed(2)}:${x.toFixed(2)}`
    },
  },
  {
    name: "Tyre Camber",
    index: 3,
    min: 2.7,
    max: 3.5,
    step: 0.05,
    decimals: 2,
    effect: [(-53)/16, 23/12, 23/3, 17/16, 415/96],
    render: x => `-${x.toFixed(2)}°`,
  },
  {
    name: "Toe-Out",
    index: 4,
    min: 0,
    max: 1,
    step: 0.05,
    decimals: 2,
    effect: [(-33)/32, 163/24, 43/6, (-3)/32, 755/192],
    render: x => `${x.toFixed(2)}°`,
  },
];
export default function CarSetup() {

  const database = useContext(DatabaseContext);
  const env = useContext(EnvContext);
  const {version, gameVersion, careerSaveMetadata} = useContext(MetadataContext)
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const {logoStyle = "colored"} = useContext(UiSettingsContext);

  const [rows, setRows] = useState([]);
  const [teamOnly, setTeamOnly] = useState(false);

  const {driverMap, teamMap, weekend, player, races } = basicInfo;
  const trackId = weekend.RaceID > 0 ? races[weekend.RaceID].TrackID : player.LastRaceTrackID;

  useEffect(() => {
    let values;
    let _teamID = (version >= 3) ? `TeamID` : basicInfo.player.TeamID;
    try {
      [{ values }] = database.exec(
        `select LoadOutID, ${_teamID}, PerfectSetupFrontWingAngle, PerfectSetupRearWingAngle, PerfectSetupAntiRollBars, PerfectSetupCamber, PerfectSetupToe  from Save_CarConfig`
      );
      const _rows = values.map(val => ({
        LoadOutID: val[0],
        TeamID: val[1] === 11 ? 32 : val[1],
        Team: teamMap[val[1] === 11 ? 32 : val[1]],
        Setups: [val[2], val[3], val[4], val[5], val[6]],
      }));
      setRows(_rows);
    } catch {

    }

  }, [database])

  const alternativeId = basicInfo.player.TeamID === 32 ? 11 : basicInfo.player.TeamID
  const currentTeamId = basicInfo.player.TeamID;
  const visibleRows = useMemo(() => rows
    .filter(teamOnly ? (row => currentTeamId === row.TeamID) : () => true)
    .map(row => ({
      ...row,
      order: (currentTeamId === row.TeamID ? 0 : row.TeamID) * 100 + row.LoadOutID
    }))
    .sort((x, y) => x.order - y.order), [currentTeamId, rows, teamOnly]);
  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || player?.CustomTeamLogoBase64;
  const exportedLabel = env.inApp ? "Modify Savefile to Optimal" : "Export Optimal Savefile";

  const applyOptimalSetup = (shouldExport) => {
    database.exec(
      "Update Save_CarConfig SET " +
      "CurrentSetupFrontWingAngle = PerfectSetupFrontWingAngle, BestSetupFrontWingAngle = PerfectSetupFrontWingAngle, " +
      "CurrentSetupAntiRollBars = PerfectSetupAntiRollBars, BestSetupAntiRollBars = PerfectSetupAntiRollBars, " +
      "CurrentSetupCamber = PerfectSetupCamber, BestSetupCamber = PerfectSetupCamber, " +
      "CurrentSetupToe = PerfectSetupToe, BestSetupToe = PerfectSetupToe, " +
      "CurrentSetupRearWingAngle = PerfectSetupRearWingAngle, BestSetupRearWingAngle = PerfectSetupRearWingAngle " +
      `WHERE TeamID = ${alternativeId}`
    );

    if (shouldExport) {
      repack(database, metadata, true);
    }
  };

  return (
    <div className="grid gap-4">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Weekend Operations</div>
            <Typography variant="h4" component="h2" sx={{mt: 1, fontWeight: 800, letterSpacing: "-0.03em"}}>
              Setup Briefing
            </Typography>
            <Typography variant="body1" sx={{mt: 1.5, color: "text.secondary", maxWidth: 760}}>
              Review the perfect setup targets for {circuitNames[trackId]}, {countryNames[trackId]} and push the optimal values into your team save when you are ready.
            </Typography>
          </div>
          <div className="grid grid-cols-2 gap-2 xl:min-w-[240px]">
            {[
              {label: "Circuit", value: circuitNames[trackId] || "Unknown"},
              {label: "Country", value: countryNames[trackId] || "Unknown"},
            ].map((item) => (
              <div key={item.label} className="border border-white/10 bg-black/10 p-3">
                <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
                <div className="mt-1 text-base font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <Divider variant="fullWidth" sx={{my: 3}} />

        <div className="flex flex-wrap gap-2">
          <Button color="warning" variant="contained" onClick={() => applyOptimalSetup(true)}>
            {exportedLabel}
          </Button>
          <Button color="secondary" variant="contained" onClick={() => applyOptimalSetup(false)}>
            Update to Optimal Without Exporting
          </Button>
          <Button
            color={teamOnly ? "inherit" : "primary"}
            variant={teamOnly ? "outlined" : "contained"}
            onClick={() => setTeamOnly(false)}
          >
            Show Entire Grid
          </Button>
          <Button
            color={teamOnly ? "primary" : "inherit"}
            variant={teamOnly ? "contained" : "outlined"}
            onClick={() => setTeamOnly(true)}
          >
            Show My Team Only
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {visibleRows.map((row) => {
          const driverSlot = row.LoadOutID === 0 ? 1 : 2;
          const driverId = row.Team?.[`Driver${driverSlot}ID`];
          const driverName = driverId ? getDriverName(driverMap[driverId]) : `Driver ${driverSlot}`;
          const isCurrentTeam = currentTeamId === row.TeamID;

          return (
            <article
              key={`${row.TeamID}_${row.LoadOutID}`}
              className={`border p-3 ${
                isCurrentTeam
                  ? "border-sky-300/40 bg-sky-500/[0.08]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  {((row.TeamID >= 32 && customTeamLogoBase64)
                    ? `data:image/png;base64,${customTeamLogoBase64}`
                    : getOfficialTeamLogo(version, row.TeamID, logoStyle)) ? (
                    <img
                      src={(row.TeamID >= 32 && customTeamLogoBase64)
                        ? `data:image/png;base64,${customTeamLogoBase64}`
                        : getOfficialTeamLogo(version, row.TeamID, logoStyle)}
                      alt=""
                      className="mt-0.5 h-8 w-8 shrink-0 object-contain"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {isCurrentTeam ? "Player Team" : "Grid Reference"}
                    </div>
                    <div className="mt-1">
                      <TeamName
                        TeamID={row.TeamID}
                        type="fanfare"
                        description={driverName}
                      />
                    </div>
                  </div>
                </div>
                <div className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  isCurrentTeam ? "border-sky-300/40 text-sky-200" : "border-white/10 text-slate-400"
                }`}>
                  Car {row.LoadOutID + 1}
                </div>
              </div>

              <div className="mt-3 grid gap-1.5">
                {CarSetupParams.map((p) => {
                  const rawValue = p.min + (p.max - p.min) * row.Setups[p.index];
                  const value = p.render(rawValue);
                  const progress = ((rawValue - p.min) / (p.max - p.min)) * 100;
                  return (
                    <div key={p.index} className="border border-white/10 bg-black/10 p-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 text-[10px] uppercase tracking-[0.12em] text-slate-500">{p.name}</div>
                        <div className="shrink-0 text-[13px] font-semibold text-white">{value}</div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="text-[10px] text-slate-500">{p.render(p.min)}</div>
                        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                          <div
                            className="absolute inset-y-0 left-0 bg-sky-400/70"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500">{p.render(p.max)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
