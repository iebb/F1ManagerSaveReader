import {circuitNames, countryNames, dayToDate, formatDate, raceAbbrevs, raceFlags, weekendStagesAbbrev} from "@/js/localization";

import {Button, Divider, Step, StepLabel, Stepper, Typography} from "@mui/material";
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

  const currentRaceIdx = currentSeasonRaces.map(x => x.RaceID).indexOf(weekend.RaceID);

  let { CurrentRace, RacesInSeason, Day, FirstName, LastName, TeamID, TrackID, CurrentLap, LapCount,
    RaceWeekendInProgress, SessionInProgress, WeekendStage, TimeRemaining } = careerSaveMetadata;
  if (!WeekendStage && weekend.WeekendStage) {
    WeekendStage = weekend.WeekendStage;
  }
  const team = teamMap[TeamID];

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

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 24, gap: 24 }}>
        <Typography variant="p" component="p" style={{ color: "#ccc", marginBottom: 12, flex: 1, flexBasis: 720 }}>
          Playing as {FirstName} {LastName} for <span style={{
          color: `var(--team${team.TeamID}-fanfare1)`,
          borderBottom: `3px solid var(--team${team.TeamID}-fanfare2)`
        }}>{team.TeamName}</span> in {version + 2020} Game (v{metadata.gameVersion}), savefile {metadata.filename}
          <br />
          It's {formatDate(dayToDate(Day))}, {statusMark}.
        </Typography>
        <div style={{ textAlign: "right" }}>
          <div>
            {
              env.inApp && (
                <Button color="error" variant="contained" sx={{ mr: 2 }} onClick={() => repack(database, metadata, true)}>
                  Overwrite DB
                </Button>
              )
            }
            <Button color="warning" variant="contained" sx={{ mr: 2 }} onClick={() => repack(database, metadata, false)}>
              Export Savefile
            </Button>
            <Button variant="contained" sx={{ mr: 2 }} onClick={() => dump(database, metadata)}>
              Dump DB
            </Button>
          </div>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <Stepper
          activeStep={currentRaceIdx}
          alternativeLabel
          key={Day}
        >
          {currentSeasonRaces.map((race) => (
            <Step key={race.RaceID}>
              <StepLabel
                StepIconComponent={() => <img
                  src={require(`../../assets/flags/${raceFlags[race.TrackID]}.svg`).default.src}
                  width={24} height={18}
                  alt={race.Name}
                  style={{ opacity: race.Day >= Day ? 1 : 0.3 }}
                />}
              >
                {raceAbbrevs[race.TrackID]}
                <br />
                {
                  race.RaceID === weekend.RaceID ? weekendStagesAbbrev[weekend.WeekendStage] :
                    race.Day < Day ? "✅" : `${(race.Day - Day)}d`
                }
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>
      <Divider variant="fullWidth" sx={{
        mt: 2, mb: 2, py: 0.25,
        background: `repeating-linear-gradient(135deg, 
                            rgba(var(--team${team.TeamID}-fanfare1-triplet), 1), rgba(var(--team${team.TeamID}-fanfare1-triplet), 1) ${seasonPercentage}%, 
                            rgba(var(--team${team.TeamID}-fanfare2-triplet), 1) 8px, rgba(var(--team${team.TeamID}-fanfare2-triplet), 1) 100%)`,
        border: "transparent",
        borderRadius: 4,
      }} />
    </div>
  )
}