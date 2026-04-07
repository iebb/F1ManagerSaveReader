import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {dateToDay, dayToDate, formatDate, localDateToDay} from "@/js/localization";
import {
  Alert,
  AlertTitle,
  Button,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@mui/material";
import {DatePicker} from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from "dayjs";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useMemo, useState} from "react";
import {
  getExistingTableSet,
  recalculateRaceStandings,
  setCareerSaveMetadataFields
} from "@/components/Customize/Player/timeMachineUtils";

const isPrintableASCII = string => /^[\x20-\x7F]*$/.test(string);

const seasonRaceDeleteTables = [
  {table: "Races_Results", seasonColumn: "Season"},
  {table: "Races_FeatureRaceResults", seasonColumn: "SeasonID"},
  {table: "Races_SprintResults", seasonColumn: "SeasonID"},
  {table: "Races_QualifyingResults", seasonColumn: "SeasonID"},
  {table: "Races_PracticeResults", seasonColumn: "SeasonID"},
  {table: "Races_PitStopResults", seasonColumn: "SeasonID"},
  {table: "Races_PitStopTimings", seasonColumn: "SeasonID"},
];

export default function TimeMachine() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const {version, gameVersion, careerSaveMetadata = {}} = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();
  const [travelYear, setTravelYear] = useState(basicInfo.player.CurrentSeason);
  const [travelDate, setTravelDate] = useState(dayjs(dayToDate(basicInfo.player.Day)));
  const [rewindRaceId, setRewindRaceId] = useState("");
  const existingTables = useMemo(() => getExistingTableSet(database), [database]);

  const currentSeasonRaces = useMemo(
    () => [...basicInfo.currentSeasonRaces].sort((left, right) => left.Day - right.Day || left.RaceID - right.RaceID),
    [basicInfo.currentSeasonRaces]
  );
  const completedSeasonRaces = useMemo(
    () => currentSeasonRaces.filter((race) => race.State === 2),
    [currentSeasonRaces]
  );
  const rewindTargetRace = useMemo(
    () => currentSeasonRaces.find((race) => race.RaceID === Number(rewindRaceId)) || null,
    [currentSeasonRaces, rewindRaceId]
  );
  const rewindRaceIndex = useMemo(
    () => currentSeasonRaces.findIndex((race) => race.RaceID === Number(rewindRaceId)),
    [currentSeasonRaces, rewindRaceId]
  );

  useEffect(() => {
    if (!completedSeasonRaces.length) {
      setRewindRaceId("");
      return;
    }

    if (!completedSeasonRaces.some((race) => race.RaceID === Number(rewindRaceId))) {
      setRewindRaceId(completedSeasonRaces.at(-1).RaceID);
    }
  }, [completedSeasonRaces, rewindRaceId]);

  const rewindPreview = useMemo(() => {
    if (!database || !rewindTargetRace) {
      return null;
    }

    const params = {
      ":season": basicInfo.player.CurrentSeason,
      ":targetRaceId": rewindTargetRace.RaceID,
      ":targetDay": rewindTargetRace.Day,
    };
    const countRows = (query) => {
      try {
        const rows = database.getAllRows(query, params);
        return Number(rows[0]?.Count || 0);
      } catch {
        return 0;
      }
    };

    const tableCounts = seasonRaceDeleteTables
      .filter(({table}) => existingTables.has(table))
      .map(({table, seasonColumn}) => ({
        table,
        count: countRows(
          `SELECT COUNT(*) AS Count FROM ${table}
           WHERE ${seasonColumn} = :season
             AND RaceID >= :targetRaceId`
        ),
      }))
      .filter(({count}) => count > 0);

    if (existingTables.has("Parts_InspectionResults")) {
      const inspectionCount = countRows(
        `SELECT COUNT(*) AS Count
         FROM Parts_InspectionResults
         WHERE RaceID IN (
           SELECT RaceID
           FROM Races
           WHERE SeasonID = :season
             AND RaceID >= :targetRaceId
         )`
      );
      if (inspectionCount > 0) {
        tableCounts.push({
          table: "Parts_InspectionResults",
          count: inspectionCount,
        });
      }
    }

    if (existingTables.has("Board_Confidence_RaceHistory")) {
      const historyCount = countRows(
        `SELECT COUNT(*) AS Count
         FROM Board_Confidence_RaceHistory
         WHERE Day >= :targetDay`
      );
      if (historyCount > 0) {
        tableCounts.push({
          table: "Board_Confidence_RaceHistory",
          count: historyCount,
        });
      }
    }

    if (existingTables.has("Races_GridPenalties")) {
      const penaltyCount = countRows("SELECT COUNT(*) AS Count FROM Races_GridPenalties");
      if (penaltyCount > 0) {
        tableCounts.push({
          table: "Races_GridPenalties",
          count: penaltyCount,
        });
      }
    }

    const racesReset = currentSeasonRaces.filter((race) => race.RaceID >= rewindTargetRace.RaceID).length;
    const completedRaceCount = currentSeasonRaces.filter((race) => race.State === 2 && race.RaceID >= rewindTargetRace.RaceID).length;

    return {
      completedRaceCount,
      racesReset,
      rowsDeleted: tableCounts.reduce((sum, entry) => sum + entry.count, 0),
      tableCounts,
      rewindDay: Math.max(
        dateToDay(new Date(`${basicInfo.player.CurrentSeason}-01-01`)),
        rewindTargetRace.Day - 4
      ),
    };
  }, [basicInfo.player.CurrentSeason, currentSeasonRaces, database, existingTables, rewindTargetRace]);

  const setCareerMetadata = (updates) => {
    setCareerSaveMetadataFields(metadata, updates);
  };

  const timeTravelWithData = ( dayNumber, extend = false ) => {
    try {
      const wayBackSeason = dayToDate(dayNumber).getFullYear();
      const vanillaSeason = basicInfo.player.CurrentSeason;

      const seasonStartDayNumber = dateToDay(new Date(`${wayBackSeason}-01-01`));
      const vanillaDayNumber = dateToDay(new Date(`${vanillaSeason}-01-01`));
      const dd = vanillaDayNumber - seasonStartDayNumber;
      const yd = vanillaSeason - wayBackSeason;

      setCareerMetadata({
        Day: dayNumber,
      });

      database.exec(`UPDATE Player_State SET Day = ${dayNumber}`);
      database.exec(`UPDATE Player_State SET CurrentSeason = ${wayBackSeason}`);

      if (existingTables.has("Calendar_LastActivityDates")) {
        database.exec(`UPDATE Calendar_LastActivityDates SET
LastScoutDate = ${seasonStartDayNumber}, LastEngineerDate = ${seasonStartDayNumber},
LastDesignProjectDate = ${seasonStartDayNumber}, LastResearchProjectDate = ${seasonStartDayNumber}`);
      }

      if (existingTables.has("Parts_Designs")) {
        database.exec(`UPDATE Parts_Designs SET DayCreated = DayCreated - ${dd} WHERE DayCreated > 0`);
        database.exec(`UPDATE Parts_Designs SET DayCompleted = DayCompleted - ${dd} WHERE DayCompleted > 0`);
        database.exec(`UPDATE Parts_Designs SET ValidFrom = ValidFrom - ${yd}`);
      }

      if (existingTables.has("Sponsorship_GuaranteesAndIncentives")) {
        database.exec(`DELETE FROM Sponsorship_GuaranteesAndIncentives`);
      }

      database.exec(`DELETE FROM Races WHERE SeasonID != ${vanillaSeason}`);
      database.exec(`DELETE FROM Seasons WHERE SeasonID != ${vanillaSeason}`);

      if (extend) {
        database.exec(`UPDATE Races SET SeasonID = ${wayBackSeason}, Day = Day - ${dd}, State = 2 WHERE SeasonID = ${vanillaSeason}`);
      } else {
        database.exec(`UPDATE Races SET SeasonID = ${wayBackSeason}, Day = Day - ${dd} WHERE SeasonID = ${vanillaSeason}`);
      }

      if (existingTables.has("Seasons_Deadlines")) {
        database.exec(
          `UPDATE Seasons_Deadlines SET SeasonID = SeasonID - ${yd}, Day = Day - ${dd}`
        );
      }

      if (version >= 3) {
        if (existingTables.has("Player")) {
          database.exec(`UPDATE Player SET FirstGameDay = ${dayNumber}`);
        }
        if (existingTables.has("Player_Record")) {
          database.exec(`UPDATE Player_Record SET StartSeason = ${wayBackSeason}`);
        }
        if (existingTables.has("Player_History")) {
          database.exec(`UPDATE Player_History SET StartDay = ${seasonStartDayNumber}`);
        }
        if (existingTables.has("Staff_PitCrew_DevelopmentPlan")) {
          database.exec(
            `UPDATE Staff_PitCrew_DevelopmentPlan SET Day = Day - ${dd} WHERE Day > 40000`
          );
        }
        if (existingTables.has("Onboarding_Tutorial_RestrictedActions")) {
          database.exec(
            `UPDATE Onboarding_Tutorial_RestrictedActions SET TutorialIsActiveSetting = 0`
          );
        }
      }

      if (version === 2 && existingTables.has("Onboarding_Tutorial_RestrictedActions")) {
        database.exec(
          `UPDATE Onboarding_Tutorial_RestrictedActions SET Allowed = 0`
        );
      }

      const moddingPairs = [
        {
          table: ["Staff_Contracts"],
          modDay: ["StartDay"],
          modSeason: ["EndSeason"],
        },
        {
          table: ["Staff_CareerHistory"],
          modDay: ["StartDay", "EndDay"],
          modSeason: [],
        },
        {
          table: ["Mail_EventPool_Cooldown"],
          modDay: ["NextTriggerDay"],
          modSeason: [],
          versions: [3],
        },
        {
          table: ["Board_Confidence"],
          modDay: [],
          modSeason: ["Season"],
        },
        {
          table: ["Board_Objectives"],
          modDay: [],
          modSeason: ["StartYear", "TargetEndYear"],
        },
        {
          table: ["Board_Prestige", "Board_SeasonObjectives", "Seasons", "Parts_TeamHistory", "Races_Strategies", "Staff_Driver_RaceRecordPerSeason"],
          modDay: [],
          modSeason: ["SeasonID"],
        },
        {
          table: ["Mail_Inbox", "Sponsorship_ObligationCalendar"],
          modDay: ["Day"],
          modSeason: [],
        },
        {
          table: ["Races_DriverStandings", "Races_TeamStandings"],
          modDay: [],
          modSeason: ["SeasonID"],
        },
        {
          table: ["Races_PitCrewStandings"],
          modDay: [],
          modSeason: ["SeasonID"],
          versions: [3],
        }
      ];

      for(const pair of moddingPairs) {
        if (pair.versions && !pair.versions.includes(version)) {
          continue;
        }
        for(const table of pair.table) {
          if (!existingTables.has(table)) {
            continue;
          }
          for(const md of pair.modDay) {
            database.exec(`UPDATE ${table} SET ${md} = ${md} - ${dd}`);
          }
          for(const ms of pair.modSeason) {
            database.exec(`UPDATE ${table} SET ${ms} = ${ms} - ${yd}`);
          }
        }
      }

      let [{ values }] = database.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC");
      for(const [ table ] of values) {
        if (
          table.startsWith("Teams_RaceRecord") ||
          0
        ) {
          database.exec(`DELETE FROM ${table}`);
        }

        if (table === "Races_Results") {
          database.exec(`DELETE FROM ${table} WHERE Season != ${vanillaSeason}`);
          database.exec(`UPDATE ${table} SET Season = Season - ${yd} WHERE Season = ${vanillaSeason}`);
        } else if ((table.startsWith("Races") && table.endsWith("Results"))) {
          database.exec(`DELETE FROM ${table} WHERE SeasonID != ${vanillaSeason}`);
          database.exec(`UPDATE ${table} SET SeasonID = SeasonID - ${yd} WHERE SeasonID = ${vanillaSeason}`);
        }
      }

      if (extend && existingTables.has("Staff_Contracts")) {
        database.exec(
          `UPDATE Staff_Contracts SET EndSeason = EndSeason + 1`
        );
      }

      basicInfoUpdater({ metadata });
      enqueueSnackbar(
        `Legacy time travel applied`,
        { variant: "success" }
      );
    } catch (error) {
      console.error(error);
      enqueueSnackbar(
        `Legacy time travel failed: ${error.message || error}`,
        { variant: "error" }
      );
    }

  }

  const timeTravelOnly = ( dayNumber ) => {
    setCareerMetadata({
      Day: dayNumber,
    });

    database.exec(`UPDATE Player_State SET Day = ${dayNumber}`);

    basicInfoUpdater({ metadata });
    enqueueSnackbar(
      `Date Updated`,
      { variant: "success" }
    );

  }

  const rewindSeasonSportingState = () => {
    if (!rewindTargetRace || !rewindPreview) {
      return;
    }

    if (careerSaveMetadata.RaceWeekendInProgress || careerSaveMetadata.SessionInProgress) {
      enqueueSnackbar(
        "Finish the active weekend/session before rewinding results.",
        { variant: "error" }
      );
      return;
    }

    const saveWeekendRows = existingTables.has("Save_Weekend")
      ? Number(database.getAllRows("SELECT COUNT(*) AS Count FROM Save_Weekend")[0]?.Count || 0)
      : 0;

    if (saveWeekendRows > 0) {
      enqueueSnackbar(
        "This save still has an in-progress weekend snapshot. Resume the save once and make a clean manual save before rewinding.",
        { variant: "error" }
      );
      return;
    }

    const raceNumber = rewindRaceIndex + 1;
    const confirmed = window.confirm(
      `Delete sporting results from round ${raceNumber} onward and reset the calendar back to ${formatDate(dayToDate(rewindTargetRace.Day))}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const params = {
        ":season": basicInfo.player.CurrentSeason,
        ":targetRaceId": rewindTargetRace.RaceID,
        ":rewindDay": rewindPreview.rewindDay,
        ":targetDay": rewindTargetRace.Day,
      };

      for (const {table, seasonColumn} of seasonRaceDeleteTables) {
        if (!existingTables.has(table)) {
          continue;
        }

        database.exec(
          `DELETE FROM ${table}
           WHERE ${seasonColumn} = :season
             AND RaceID >= :targetRaceId`,
          params
        );
      }

      if (existingTables.has("Parts_InspectionResults")) {
        database.exec(
          `DELETE FROM Parts_InspectionResults
           WHERE RaceID IN (
             SELECT RaceID
             FROM Races
             WHERE SeasonID = :season
               AND RaceID >= :targetRaceId
           )`,
          params
        );
      }

      if (existingTables.has("Board_Confidence_RaceHistory")) {
        database.exec(
          `DELETE FROM Board_Confidence_RaceHistory
           WHERE Day >= :targetDay`,
          params
        );
      }

      if (existingTables.has("Races_GridPenalties")) {
        database.exec("DELETE FROM Races_GridPenalties");
      }

      if (existingTables.has("Save_Weekend")) {
        database.exec("DELETE FROM Save_Weekend");
      }

      database.exec(
        `UPDATE Races
         SET State = CASE WHEN RaceID < :targetRaceId THEN 2 ELSE 0 END
         WHERE SeasonID = :season`,
        params
      );

      database.exec(
        `UPDATE Player_State
         SET Day = :rewindDay`,
        params
      );

      setCareerMetadata({
        Day: rewindPreview.rewindDay,
        CurrentRace: raceNumber,
        TrackID: rewindTargetRace.TrackID,
        RaceWeekendInProgress: 0,
        SessionInProgress: 0,
        WeekendStage: 0,
        CurrentLap: 0,
        LapCount: 0,
        TimeRemaining: 0,
      });

      recalculateRaceStandings({
        database,
        season: basicInfo.player.CurrentSeason,
        tableSet: existingTables,
      });

      basicInfoUpdater({ metadata });
      enqueueSnackbar(
        `Sporting state rewound to round ${raceNumber}`,
        { variant: "success" }
      );
    } catch (error) {
      console.error(error);
      enqueueSnackbar(
        `Sporting rewind failed: ${error.message || error}`,
        { variant: "error" }
      );
    }
  };

  return (
    <div>
      <Typography variant="h5" component="h5">
        Time Machine
      </Typography>
      <Divider variant="fullWidth" sx={{my: 2}}/>
      <Alert severity="success" sx={{my: 2}}>
        <AlertTitle>Sporting Rewind</AlertTitle>
        This save has a clean set of race-linked tables for a current-season rewind. The tool below removes race weekend results from a chosen round onward, recalculates championship standings, and resets the next race pointer without touching unrelated finance or mail history.
      </Alert>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={6}>
          <FormControl variant="standard" fullWidth disabled={!completedSeasonRaces.length}>
            <InputLabel id="rewind-race-label">Delete Results From Round</InputLabel>
            <Select
              labelId="rewind-race-label"
              value={rewindRaceId}
              onChange={(event) => setRewindRaceId(event.target.value)}
              label="Delete Results From Round"
            >
              {completedSeasonRaces.map((race, index) => (
                <MenuItem key={race.RaceID} value={race.RaceID}>
                  Round {index + 1}: {race.Name} ({formatDate(dayToDate(race.Day))})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item>
          <Button
            variant="contained"
            color="success"
            disabled={!rewindTargetRace || !rewindPreview}
            onClick={rewindSeasonSportingState}
          >
            Rewind Sporting State
          </Button>
        </Grid>
      </Grid>
      {rewindPreview ? (
        <Alert severity="info" sx={{my: 2}}>
          <AlertTitle>Preview</AlertTitle>
          Round {rewindRaceIndex + 1} becomes the next race, {rewindPreview.completedRaceCount} completed race(s) are undone, and the in-save date moves to {formatDate(dayToDate(rewindPreview.rewindDay))}.
          <br />
          Rows removed: {rewindPreview.rowsDeleted}. Tables affected: {rewindPreview.tableCounts.map(({table, count}) => `${table} (${count})`).join(", ") || "race state only"}.
        </Alert>
      ) : (
        <Alert severity="info" sx={{my: 2}}>
          <AlertTitle>Preview</AlertTitle>
          No completed rounds are available to rewind in the current season.
        </Alert>
      )}
      <Divider variant="fullWidth" sx={{my: 2}}/>
      <Alert severity="error" sx={{my: 2}}>
        <AlertTitle>Legacy Mode</AlertTitle>
        Cross-season date travel is still destructive and can leave non-sporting history inconsistent. It now skips missing tables in 2024 saves, but it remains an experimental tool compared to the sporting rewind above.
      </Alert>
      <Divider variant="fullWidth" sx={{my: 2}}/>

      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <TextField
            label="Move To Season"
            value={travelYear}
            variant="standard"
            type="number"
            onChange={(event) => {
              setTravelYear(event.target.value);
            }}
          />
        </Grid>
        <Grid item>
          <Button
            sx={{ mx: 1 }}
            variant="contained"
            color="primary"
            disabled={travelYear > 2999 || travelYear < 1901}
            onClick={() => {
              timeTravelWithData(dateToDay(new Date(`${travelYear-1}-12-29`)), true);
            }}
          >To Dec 29, {travelYear-1}</Button>
        </Grid>
        <Grid item>
          <Button
            sx={{ mx: 1 }}
            variant="contained"
            color="secondary"
            disabled={travelYear > 2999 || travelYear < 1901}
            onClick={() => {
              timeTravelWithData(dateToDay(new Date(`${travelYear}-01-01`)), false);
            }}
          >To Jan 1, {travelYear}</Button>
        </Grid>
      </Grid>
      <Divider variant="fullWidth" sx={{my: 2}}/>
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="To Date"
              componentsProps={{
                textField: {
                  variant: "standard"
                }
              }}
              value={travelDate}
              onChange={(newValue) => setTravelDate(newValue)}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item>
          <Button
            sx={{ mx: 1 }}
            variant="contained"
            color="secondary"
            disabled={travelDate.year() === basicInfo.player.CurrentSeason || travelDate.year() > 2999 || travelDate.year() < 1901}
            onClick={() => {
              timeTravelWithData(localDateToDay(travelDate.toDate()), travelDate.month() > 11);
              // extend contract if it's december
            }}
          >Switch Season: To {formatDate(travelDate.toDate())}</Button>
        </Grid>
        <Grid item>
          <Button
            sx={{ mx: 1 }}
            variant="contained"
            color="warning"
            disabled={travelDate.year() !== basicInfo.player.CurrentSeason}
            onClick={() => {
              timeTravelOnly(localDateToDay(travelDate.toDate()), false);
            }}
          >Move to {formatDate(travelDate.toDate())}</Button>
        </Grid>
      </Grid>
    </div>
  );
}
