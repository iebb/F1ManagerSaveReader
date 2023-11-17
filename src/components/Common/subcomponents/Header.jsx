import {circuitNames, dayToDate, formatDate, raceAbbrevs, raceFlags, weekendStagesAbbrev} from "@/js/localization";
import {useContext} from "react";
import {DatabaseContext, MetadataContext, VersionContext, BasicInfoContext} from "../../Contexts";

import {Divider, Step, StepLabel, Stepper, Typography} from "@mui/material";

export const Header = () => {
  const basicInfo = useContext(BasicInfoContext);
  const version = useContext(VersionContext);

  const { player, teamMap, weekend, races, currentSeasonRaces } = basicInfo;

  const team = teamMap[player.TeamID];

  const currentRaceIdx = currentSeasonRaces.map(x => x.RaceID).indexOf(weekend.RaceID);

  return (
    <div>
      <Typography variant="p" component="p" style={{ color: "#ccc", margin: 12, marginBottom: 24 }}>
        Playing as {player.FirstName} {player.LastName} for <span style={{
        color: `var(--team${team.TeamID})`,
        borderBottom: `3px solid var(--team${team.TeamID}-fanfare2)`,
      }}>{team.TeamName}</span> in {version + 2020} Game.
        <br />
        It's {formatDate(dayToDate(player.Day))} in-game{player.LastRaceTrackID ? ` and last raced at ${circuitNames[player.LastRaceTrackID]}` : ""}.
      </Typography>
      <div style={{ overflowX: "auto" }}>
        <Stepper
          activeStep={currentRaceIdx}
          alternativeLabel
          key={player.Day}
        >
          {currentSeasonRaces.map((race) => (
            <Step key={race.RaceID}>
              <StepLabel
                StepIconComponent={() => <img
                  src={require(`../../../assets/flags/${raceFlags[race.TrackID]}.svg`).default.src}
                  width={24} height={18}
                  alt={race.Name}
                  style={{ opacity: race.Day >= player.Day ? 1 : 0.3 }}
                />}
              >
                {raceAbbrevs[race.TrackID]}
                <br />
                {
                  race.RaceID === weekend.RaceID ? weekendStagesAbbrev[weekend.WeekendStage] :
                    race.Day < player.Day ? "✅" : `${(race.Day - player.Day)}d`
                }
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </div>
      <Divider variant="fullWidth" sx={{
        mt: 2, mb: 2, py: 0.5,
        background: `repeating-linear-gradient(135deg, 
                            rgba(var(--team${team.TeamID}-triplet), 1), rgba(var(--team${team.TeamID}-triplet), 1) 8px, 
                            rgba(var(--team${team.TeamID}-fanfare2-triplet), 1) 8px, rgba(var(--team${team.TeamID}-fanfare2-triplet), 1) 12px)`,
        border: "transparent",
        borderRadius: 4,
      }} />
    </div>
  )
}