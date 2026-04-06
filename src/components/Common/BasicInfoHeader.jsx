import {TeamName} from "@/components/Localization/Localization";
import {circuitNames, countryNames, dayToDate, formatDate, raceAbbrevs, raceFlags, weekendStagesAbbrev} from "@/js/localization";

import {Box, Button, Stack, Tooltip, Typography} from "@mui/material";
import * as React from "react";
import {useContext} from "react";
import {dump, repack} from "@/js/Parser";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext} from "@/js/Contexts";

export const BasicInfoHeader = () => {
  const basicInfo = useContext(BasicInfoContext);
  const database = useContext(DatabaseContext);
  const {version, gameVersion, careerSaveMetadata} = useContext(MetadataContext)
  const metadata = useContext(MetadataContext);
  const env = useContext(EnvContext);

  const { teamMap, weekend, races, currentSeasonRaces } = basicInfo;

  let { ScenarioID, CurrentRace, RacesInSeason, Day, FirstName, LastName, TeamID, TrackID, CurrentLap, LapCount,
    RaceWeekendInProgress, SessionInProgress, WeekendStage, TimeRemaining } = careerSaveMetadata;
  if (!WeekendStage && weekend.WeekendStage) {
    WeekendStage = weekend.WeekendStage;
  }
  const team = teamMap[TeamID];
  const isCustomTeam = basicInfo?.player?.TeamID >= 32;
  const teamLogoBase64 = careerSaveMetadata?.CustomTeamLogoBase64;
  const carPreviewBase64 = basicInfo?.player?.CustomTeamCarLiveryBase64;

  const statusMark = RaceWeekendInProgress ?
    `and racing in ${circuitNames[TrackID]}, ${countryNames[TrackID]} (Race ${CurrentRace} of ${RacesInSeason}): ` + (
      SessionInProgress ? (
        LapCount ?
        `Currently Lap ${CurrentLap}/${LapCount} in ${weekendStagesAbbrev[WeekendStage]}` :
          `${weekendStagesAbbrev[WeekendStage]} in progress, ${
            Math.floor(TimeRemaining / 60).toFixed(0).padStart(2, '0')
          }:${
            Math.floor(TimeRemaining % 60).toFixed(0).padStart(2, '0')
          } remaining`
        ) : `Preparing for ${weekendStagesAbbrev[WeekendStage]}`
    )
    : (TrackID > 0 ? `Next Race (${CurrentRace} of ${RacesInSeason}) is ${circuitNames[TrackID]}` : `and all races are finished this season`);

  const seasonPercentage = CurrentRace ? (100 * (CurrentRace - (RaceWeekendInProgress ? 0.5 : 1)) / RacesInSeason) : 100;

  const getRaceStatus = (race) => {
    if (race.RaceID === weekend.RaceID) {
      return {
        key: "current",
        label: weekendStagesAbbrev[weekend.WeekendStage] || "Live",
        bg: `linear-gradient(135deg, rgba(var(--team${team.TeamID}-fanfare1-triplet), 0.95), rgba(var(--team${team.TeamID}-fanfare2-triplet), 0.9))`,
        color: "#101010",
        border: "rgba(255,255,255,0.08)",
        shadow: "0 0 0 1px rgba(255,255,255,0.04) inset",
      };
    }

    if (race.Day < Day) {
      return {
        key: "done",
        label: raceAbbrevs[race.TrackID],
        bg: "rgba(46, 125, 50, 0.82)",
        color: "#f8fff8",
        border: "rgba(129, 199, 132, 0.32)",
        shadow: "none",
      };
    }

    if (race.Day - Day <= 7) {
      return {
        key: "next",
        label: `${race.Day - Day}d`,
        bg: "rgba(25, 118, 210, 0.82)",
        color: "#f7fbff",
        border: "rgba(144, 202, 249, 0.32)",
        shadow: "none",
      };
    }

    return {
      key: "upcoming",
      label: `${race.Day - Day}d`,
      bg: "rgba(255,255,255,0.07)",
      color: "rgba(255,255,255,0.82)",
      border: "rgba(255,255,255,0.08)",
      shadow: "none",
    };
  };

  return (
    <>
      <Box sx={{
        display: "grid",
        gridTemplateColumns: {xs: "1fr", xl: "minmax(0,1fr) auto"},
        gap: 2,
        mb: 2,
        border: "1px solid rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.02)",
        p: 2,
      }}>
        <Box>
          <Typography variant="overline" sx={{color: "text.secondary", fontWeight: 700, letterSpacing: 1}}>
            Save Overview
          </Typography>
          <Typography variant="h5" sx={{fontWeight: 700, mt: 0.25}}>
            <Box component="span" sx={{display: "inline-flex", alignItems: "center", gap: 1.25}}>
              {!ScenarioID && isCustomTeam && teamLogoBase64 ? (
                <Box
                  component="img"
                  src={`data:image/png;base64,${teamLogoBase64}`}
                  alt="Custom team logo"
                  sx={{
                    width: 24,
                    height: 24,
                    objectFit: "contain",
                    borderRadius: "4px",
                    backgroundColor: "rgba(255,255,255,0.04)",
                    p: 0.25,
                    verticalAlign: "middle",
                  }}
                />
              ) : null}
              <span>{ScenarioID ? "Scenario Mode" : `${FirstName} ${LastName}`}</span>
            </Box>
          </Typography>
          <Typography variant="body1" sx={{mt: 0.75, color: "text.secondary"}}>
            Team:{" "}
            <Box component="span" sx={{
              color: `var(--team${team.TeamID}-fanfare1)`,
              borderBottom: `2px solid var(--team${team.TeamID}-fanfare2)`,
              fontWeight: 700,
            }}>
              <TeamName TeamID={team.TeamID} />
            </Box>
            {" · "}
            F1 Manager {version + 2020} (v{metadata.gameVersion})
            {" · "}
            {metadata.filename}
          </Typography>
          <Typography variant="body2" sx={{mt: 1, color: "text.secondary"}}>
            {formatDate(dayToDate(Day))} · {statusMark}
          </Typography>
        </Box>
        <Stack direction={{xs: "column", sm: "row", xl: "column"}} spacing={0.5} alignItems={{xs: "stretch", xl: "flex-end"}}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap justifyContent={{xl: "flex-end"}}>
            {
              env.inApp && (
                <Button color="error" variant="contained" onClick={() => repack(database, metadata, true)}>
                  Overwrite Save
                </Button>
              )
            }
            {
              env.haveBackup && (
                <Button color="secondary" variant="contained" onClick={() => {
                  window.parent.document.dispatchEvent( new CustomEvent('load-backup-file', {
                    detail: {
                      filepath: window.file_path,
                    }
                  }))
                }}>
                  Restore Backup
                </Button>
              )
            }
            <Button color="warning" variant="contained" onClick={() => repack(database, metadata, false)}>
              Export Savefile
            </Button>
            <Button variant="contained" onClick={() => dump(database, metadata)}>
              Dump DB
            </Button>
          </Stack>
          <Typography variant="caption" sx={{color: "text.secondary"}}>
            Season progress: {seasonPercentage.toFixed(0)}%
          </Typography>
          {isCustomTeam && carPreviewBase64 ? (
            <Box
              sx={{
                mt: 0.25,
                display: "flex",
                justifyContent: {xs: "flex-start", xl: "flex-end"},
              }}
            >
              <Box
                sx={{
                  maxWidth: {xs: 220, xl: 260},
                  width: "100%",
                  height: 48,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  component="img"
                  src={`data:image/png;base64,${carPreviewBase64}`}
                  alt="Custom team car preview"
                  sx={{
                    width: "100%",
                    height: 96,
                    objectFit: "cover",
                    objectPosition: "center",
                    filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.35))",
                  }}
                />
              </Box>
            </Box>
          ) : null}
        </Stack>
        <Box sx={{gridColumn: "1 / -1", pt: 0.5, overflow: "hidden"}}>
        <Box sx={{display: "flex", alignItems: "stretch", width: "100%", py: 0.25, pr: 1}}>
          {currentSeasonRaces.map((race, index) => {
            const status = getRaceStatus(race);
            return (
              <Tooltip
                key={race.RaceID}
                title={`${race.Name} · ${formatDate(dayToDate(race.Day))}`}
                arrow
              >
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    flex: "1 1 0",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 0.35,
                    minWidth: 0,
                    height: 40,
                    pl: index === 0 ? 1.25 : 2,
                    pr: 2.25,
                    ml: index === 0 ? 0 : -1.25,
                    clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)",
                    background: status.bg,
                    color: status.color,
                    border: `1px solid ${status.border}`,
                    boxShadow: status.shadow,
                    zIndex: race.RaceID === weekend.RaceID ? 1 : 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Box
                    component="img"
                    src={`/flags/${raceFlags[race.TrackID]}.svg`}
                    alt={race.Name}
                    sx={{
                      width: 18,
                      height: 13.5,
                      borderRadius: "1px",
                      opacity: status.key === "upcoming" ? 0.72 : 1,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: "inherit",
                      opacity: status.key === "upcoming" ? 0.72 : 0.92,
                      fontWeight: status.key === "current" ? 700 : 500,
                      fontSize: "0.65rem",
                      lineHeight: 1,
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "100%",
                    }}
                  >
                    {status.label || "\u00A0"}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
      </Box>
    </>
  )
}
