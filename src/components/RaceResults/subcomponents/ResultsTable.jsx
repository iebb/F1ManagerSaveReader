import { BasicInfoContext, DatabaseContext, MetadataContext, UiSettingsContext } from "@/js/Contexts";
import TeamLogo from "@/components/Common/TeamLogo";
import { getDriverCode, getDriverName, raceAbbrevs, raceFlags, resolveLiteral, teamNames } from "@/js/localization";
import { getCountryFlag } from "@/js/localization/ISOCountries";
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import * as React from "react";
import { useContext, useEffect, useMemo, useState } from "react";

export default function ResultsTable(ctx) {
  const { version, gameVersion, careerSaveMetadata } = useContext(MetadataContext)
  const { logoStyle = "normal" } = useContext(UiSettingsContext);
  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);
  const [raceSchedule, setRaceSchedule] = useState([]);

  const { driverMap } = basicInfo;
  const customTeamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64 || basicInfo.player?.CustomTeamLogoBase64;
  const {
    formulae,
    driverTeams,
    championDriverID,
    raceSchedule: _raceSchedule,
    driverStandings,
    driverResults,
    fastestLapOfRace,
    teamHistoryMode = "merge",
  } = ctx;

  useEffect(() => {
    const playerTeams = version >= 3 ? database.getAllRows(`SELECT * FROM Player_History`) : [];
    const playerTeamIDFromDay = (day) => {
      if (version === 2) return basicInfo.player.TeamID;
      const filter = playerTeams.filter(
        p => p.StartDay <= day && (p.EndDay >= day || !p.EndDay)
      );
      if (filter.length) {
        return filter[0].TeamID;
      }
      return basicInfo.player.TeamID;
    }

    setRaceSchedule(_raceSchedule.map(r => {
      r.race.PlayerTeamID = playerTeamIDFromDay(r.race.Day);
      return r;
    }));
  }, [database, _raceSchedule]);

  const resolveTeamLabel = (teamId) => {
    if (!teamId) return "Unknown Team";
    if (teamId > 31 && basicInfo.teamMap?.[teamId]?.TeamNameLocKey) {
      return resolveLiteral(basicInfo.teamMap[teamId].TeamNameLocKey);
    }
    return teamNames(teamId, version);
  };

  const displayRows = useMemo(() => (
    buildDisplayRows({
      driverStandings,
      driverResults,
      driverTeams,
      teamHistoryMode,
    })
  ), [driverResults, driverStandings, driverTeams, teamHistoryMode]);

  const getResultCellStyle = (result, displayRow) => {
    if (!result?.TeamID) {
      return undefined;
    }
    if (displayRow.mode !== "merge" || displayRow.teamIds.length <= 1) {
      return undefined;
    }
    if (Number(result.TeamID) === Number(displayRow.primaryTeamId)) {
      return undefined;
    }
    return {
      background: `rgba(var(--team${result.TeamID}-triplet), 0.22)`,
    };
  };

  const renderSharedCells = (displayRow, row) => (
    <>
      <TableCell
        scope="row"
        sx={{ py: 0.1 }}
        style={{ maxWidth: 50 }}
        rowSpan={displayRow.rowSpan}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-sm font-semibold text-white">
          {row.Position}
        </div>
      </TableCell>
      <TableCell
        component="th"
        scope="row"
        sx={{ py: 0.1 }}
        className={`race_cell_driver`}
        rowSpan={displayRow.rowSpan}
      >
        <div className="flex min-w-[128px] max-w-[136px] items-center">
          <div className="min-w-0 w-full max-w-[112px]">
            <div className="relative flex items-baseline gap-1.5 pl-7 leading-none">
              <img
                src={getCountryFlag(driverMap[row.DriverID].Nationality)}
                style={{ width: 22, height: 16, display: "block" }}
                alt={driverMap[row.DriverID].Nationality}
                className="absolute left-0 top-1/2 -translate-y-1/2 object-cover shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {formulae === 1 ? (
                  (championDriverID === row.DriverID && driverMap[row.DriverID].WantsChampionDriverNumber) ? 1 : driverMap[row.DriverID].PernamentNumber || "N/A"
                ) : (
                  row.DriverAssignedNumber
                )}
              </span>
              <span className="text-[14px] font-semibold text-white">{getDriverCode(driverMap[row.DriverID])}</span>
            </div>
            <div className="mt-0.5 truncate text-[11px] leading-tight text-slate-300">{getDriverName(driverMap[row.DriverID])}</div>
          </div>
        </div>
      </TableCell>
    </>
  );

  const getPrimaryTeamLabelStyle = (displayRow, rowTeamId) => {
    if (displayRow.mode === "merge" && displayRow.teamIds.length > 1) {
      return {
        color: `rgb(var(--team${rowTeamId}-triplet))`,
      };
    }
    return {
      color: `rgb(var(--team${rowTeamId}-triplet))`,
    };
  };

  return (
    <TableContainer component={Paper} className={`table_f${formulae}`}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell
              className={`race_header_cell`}
              sx={{ py: 0.2 }}
              colSpan={3}
            >Race</TableCell>
            {
              raceSchedule.map(({ type, race, span }) => {
                if (span === 0) return null;
                return <TableCell
                  align="center"
                  key={race.RaceID + type}
                  className={`nopad race_header_cell race_cell_${type}`}
                  colSpan={span}
                >
                  <img
                    src={`/flags/${raceFlags[race.TrackID]}.svg`}
                    key={race.TrackID}
                    width={20} height={15}
                    alt={race.Name}
                    className="inline-block"
                  />
                  <br />
                  <span style={{ fontSize: 12 }}>{raceAbbrevs[race.TrackID]}</span>
                </TableCell>
              })
            }
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell
              component="th"
              sx={{ py: 0 }}
              style={{ width: 80 }}
            >#</TableCell>
            <TableCell
              sx={{ py: 0.25 }}
              className={`race_cell_driver`}
            >Driver</TableCell>
            <TableCell
              sx={{ py: 0.25 }}
              className={`race_cell_team`}
            >Team</TableCell>
            {
              raceSchedule.map(({ type, race }) => {
                return <TableCell
                  align="center"
                  key={race.RaceID + type}
                  className={`race_cell_${type}`}
                  sx={{ p: 0, fontSize: 12 }}
                >
                  {type.substring(0, 3)}
                </TableCell>
              })
            }
            <TableCell sx={{ py: 0 }}>Pts</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayRows.map((displayRow) => {
            const row = displayRow.standing;
            const rowDriverId = row.DriverID;
            const rowTeamId = displayRow.primaryTeamId || driverTeams[rowDriverId];
            return (
              <TableRow
                key={displayRow.key}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                {displayRow.showSharedCells ? renderSharedCells(displayRow, row) : null}
                <TableCell
                  sx={{ py: 0.1 }}
                  className={`race_cell_team overflow-hidden`}
                >
                  <div className="flex min-w-[190px] max-w-[230px] items-center gap-2">
                    <TeamLogo
                      TeamID={rowTeamId}
                      size="sm"
                      logoStyleOverride={logoStyle}
                      alt={resolveTeamLabel(rowTeamId)}
                      className="opacity-95"
                    />
                    <div
                      className="truncate text-[13px] font-semibold leading-none"
                      style={getPrimaryTeamLabelStyle(displayRow, rowTeamId)}
                    >
                      {resolveTeamLabel(rowTeamId)}
                    </div>
                  </div>
                </TableCell>
                {
                  raceSchedule.map(({ type, race, span }) => {

                    if (
                      !displayRow.resultsByType[type] ||
                      !displayRow.resultsByType[type][race.RaceID]
                    ) {
                      if (span > 0 && (displayRow.resultsByType.practice && displayRow.resultsByType.practice[race.RaceID])) {
                        const result = displayRow.resultsByType.practice[race.RaceID];
                        return (
                          <TableCell
                            className={`race_cell_${type}`}
                            align="right"
                            key={race.RaceID + type}
                            sx={{ p: 0.25 }}
                            style={{ ...getResultCellStyle(result, displayRow), fontSize: "80%", color: "#ff7" }}
                          >
                            TD
                          </TableCell>
                        );
                      }
                      return <TableCell
                        key={race.RaceID + type}
                        sx={{ p: 0.2, minWidth: 36 }}
                      />;
                    }


                    const result = displayRow.resultsByType[type][race.RaceID];
                    let color = "auto";
                    if (result.FinishingPos === 1) {
                      color = "#ffd700";
                    } else if (result.FinishingPos <= 2) {
                      color = "#b7b7b7";
                    } else if (result.FinishingPos <= 3) {
                      color = "#cd7f32";
                    } else if (result.Points > 0) {
                      color = "#059372";
                    } else {
                      color = "transparent";
                    }
                  let fastest =
                    Number(result.FastestLap) > 10 &&
                    result.FastestLap === fastestLapOfRace[race.RaceID];
                    return <TableCell
                      className={`race_cell_${type}`}
                      align="right"
                      key={race.RaceID + type}
                      sx={{ p: 0.25 }}
                      style={getResultCellStyle(result, displayRow)}
                    >
                      <div style={{ borderTop: `4px solid ${color}`, display: "block" }}>
                        {fastest && (
                          <span style={{
                            background: "#9700ff",
                            borderBottomRightRadius: 2, fontSize: "75%", padding: "0 1px",
                            margin: 0, float: "left"
                          }}>F</span>
                        )}
                        <span style={{ color: result.Points > 0 ? "#fff" : "#777" }}>
                          <span style={{ fontSize: "80%" }}>{result.DNF ? "DNF" : "P"}</span>
                          {
                            !result.DNF && result.FinishingPos
                          }
                        </span>
                      </div>
                      <div style={{ display: "block" }}>
                        {((result.PolePositionPoints !== undefined) || (version === 2 && result.StartingPos === 1)) && (
                          <span style={{
                            background: result.PolePositionPoints ? "#f05" : "#804054",
                            borderBottomRightRadius: 2, fontSize: "75%", padding: "0 1px",
                            margin: 0, float: "left"
                          }}>P</span>
                        )}
                        <span style={{ fontSize: "80%" }}>{result.Points > 0 ? `+${result.Points}` : " "}</span>
                      </div>
                    </TableCell>
                  })
                }
                {displayRow.showSharedCells ? (
                  <TableCell sx={{ py: 0.2 }} rowSpan={displayRow.rowSpan}>{displayRow.points}</TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function buildDisplayRows({ driverStandings, driverResults, driverTeams, teamHistoryMode }) {
  return [...driverStandings].sort((left, right) => compareStandingRows(left, right, driverResults)).flatMap((standing) => {
    const driverId = standing.DriverID;
    const groupedResults = groupResultsByTeam(driverResults?.[driverId] || {});
    const teamIds = groupedResults.teamIds.length
      ? groupedResults.teamIds
      : (driverTeams?.[driverId] ? [Number(driverTeams[driverId])] : []);

    if (teamHistoryMode !== "split" || teamIds.length <= 1) {
      return [{
        key: `${driverId}-merge`,
        mode: "merge",
        standing,
        primaryTeamId: teamIds[teamIds.length - 1] || Number(driverTeams?.[driverId]) || null,
        teamIds,
        resultsByType: driverResults?.[driverId] || {},
        points: standing.Points,
        rowSpan: 1,
        showSharedCells: true,
      }];
    }

    return teamIds.map((teamId, index) => {
      const resultsByType = groupedResults.byTeam[teamId] || {};
      return {
        key: `${driverId}-team-${teamId}`,
        mode: "split",
        standing,
        primaryTeamId: teamId,
        teamIds: [teamId],
        resultsByType,
        points: sumDriverPoints(resultsByType),
        rowSpan: teamIds.length,
        showSharedCells: index === 0,
      };
    });
  });
}

function compareStandingRows(left, right, driverResults) {
  const leftPoints = Number(left?.Points || 0);
  const rightPoints = Number(right?.Points || 0);
  if (rightPoints !== leftPoints) {
    return rightPoints - leftPoints;
  }

  const countbackComparison = compareDriverResultCountback(
    driverResults?.[left?.DriverID] || {},
    driverResults?.[right?.DriverID] || {}
  );
  if (countbackComparison !== 0) {
    return countbackComparison;
  }

  return Number(left?.DriverID || 0) - Number(right?.DriverID || 0);
}

function compareDriverResultCountback(leftResultsByType, rightResultsByType) {
  const leftCountback = buildResultCountback(leftResultsByType);
  const rightCountback = buildResultCountback(rightResultsByType);
  const positions = new Set([...leftCountback.keys(), ...rightCountback.keys()]);

  return [...positions]
    .sort((left, right) => left - right)
    .reduce((comparison, finishingPos) => {
      if (comparison !== 0) {
        return comparison;
      }
      const leftCount = leftCountback.get(finishingPos) || 0;
      const rightCount = rightCountback.get(finishingPos) || 0;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }
      return 0;
    }, 0);
}

function buildResultCountback(resultsByType) {
  const countback = new Map();
  Object.values(resultsByType || {}).forEach((group) => {
    Object.values(group || {}).forEach((result) => {
      const finishingPos = Number(result?.FinishingPos);
      if (!Number.isFinite(finishingPos) || finishingPos <= 0) {
        return;
      }
      countback.set(finishingPos, (countback.get(finishingPos) || 0) + 1);
    });
  });
  return countback;
}

function groupResultsByTeam(resultGroups) {
  const byTeam = {};
  const teamIds = [];
  Object.entries(resultGroups).forEach(([type, group]) => {
    Object.entries(group || {}).forEach(([raceId, result]) => {
      const teamId = Number(result?.TeamID);
      if (!Number.isFinite(teamId) || teamId <= 0) {
        return;
      }
      if (!byTeam[teamId]) {
        byTeam[teamId] = {};
        teamIds.push(teamId);
      }
      if (!byTeam[teamId][type]) {
        byTeam[teamId][type] = {};
      }
      byTeam[teamId][type][raceId] = result;
    });
  });
  return { byTeam, teamIds };
}

function sumDriverPoints(resultsByType) {
  return Object.values(resultsByType || {}).reduce((sum, group) => (
    sum + Object.values(group || {}).reduce((inner, result) => inner + Number(result?.Points || 0), 0)
  ), 0);
}
