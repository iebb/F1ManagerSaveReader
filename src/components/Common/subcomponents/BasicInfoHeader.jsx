import {circuitNames, dayToDate, formatDate, raceAbbrevs, raceFlags, weekendStagesAbbrev} from "@/js/localization";

import {Button, Divider, Step, StepLabel, Stepper, Typography} from "@mui/material";
import * as React from "react";
import {useContext} from "react";
import {dump, repack} from "../../../js/fileAnalyzer";
import {BasicInfoContext, DatabaseContext, EnvContext, MetadataContext} from "../../Contexts";

export const BasicInfoHeader = () => {
  const basicInfo = useContext(BasicInfoContext);
  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const metadata = useContext(MetadataContext);
  const env = useContext(EnvContext);

  const { player, teamMap, weekend, races, currentSeasonRaces } = basicInfo;
  const team = teamMap[player.TeamID];

  const currentRaceIdx = currentSeasonRaces.map(x => x.RaceID).indexOf(weekend.RaceID);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 24, gap: 24 }}>
        <Typography variant="p" component="p" style={{ color: "#ccc", margin: 12, flex: 1, flexBasis: 720 }}>
          Playing as {player.FirstName} {player.LastName} for <span style={{
          color: `var(--team${team.TeamID}-fanfare1)`,
          borderBottom: `3px solid var(--team${team.TeamID}-fanfare2)`
        }}>{team.TeamName}</span> in {version + 2020} Game (v{metadata.gameVersion}), savefile {metadata.filename}
          <br />
          It's {formatDate(dayToDate(player.Day))} in-game{player.LastRaceTrackID ? ` and last raced at ${circuitNames[player.LastRaceTrackID]}` : ""}.
        </Typography>
        <div style={{ textAlign: "right" }}>
          <div>
            {
              env.inApp && (
                <Button color="error" variant="contained" sx={{ mr: 2 }} onClick={() => repack(database, metadata, true)}>
                  Overwrite Database
                </Button>
              )
            }
            <Button color="warning" variant="contained" sx={{ mr: 2 }} onClick={() => repack(database, metadata, false)}>Re-export Savefile</Button>
            <Button variant="contained" sx={{ mr: 2 }} onClick={() => dump(database, metadata)}>
              Dump Database
            </Button>
          </div>
        </div>
      </div>
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
        mt: 2, mb: 2, py: 0.25,
        background: `repeating-linear-gradient(135deg, 
                            rgba(var(--team${team.TeamID}-triplet), 1), rgba(var(--team${team.TeamID}-triplet), 1) 8px, 
                            rgba(var(--team${team.TeamID}-fanfare2-triplet), 1) 8px, rgba(var(--team${team.TeamID}-fanfare2-triplet), 1) 12px)`,
        border: "transparent",
        borderRadius: 4,
      }} />
    </div>
  )
}