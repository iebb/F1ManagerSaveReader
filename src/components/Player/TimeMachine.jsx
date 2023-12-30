import {BasicInfoContext, BasicInfoUpdaterContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {dateToDay, dayToDate, formatDate} from "@/js/localization";
import {Alert, AlertTitle, Button, Divider, Grid, TextField, Typography} from "@mui/material";
import {DatePicker} from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from "dayjs";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useState} from "react";

const isPrintableASCII = string => /^[\x20-\x7F]*$/.test(string);

export default function TimeMachine() {

  const database = useContext(DatabaseContext);
  const metadata = useContext(MetadataContext);
  const {version, gameVersion} = metadata;
  const basicInfo = useContext(BasicInfoContext);
  const basicInfoUpdater = useContext(BasicInfoUpdaterContext);
  const { enqueueSnackbar } = useSnackbar();
  const [travelYear, setTravelYear] = useState(basicInfo.player.CurrentSeason);
  const [travelDate, setTravelDate] = useState(dayjs(dayToDate(basicInfo.player.Day)));

  const timeTravelWithData = ( dayNumber, extend = false ) => {
    if (version !== 3) {
    }

    const wayBackSeason = dayToDate(dayNumber).getFullYear();
    const vanillaSeason = basicInfo.player.CurrentSeason;

    const seasonStartDayNumber = dateToDay(new Date(`${wayBackSeason}-01-01`));
    const vanillaDayNumber = dateToDay(new Date(`${vanillaSeason}-01-01`));
    const dd = vanillaDayNumber - seasonStartDayNumber;
    const yd = vanillaSeason - wayBackSeason;



    const metaProperty = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0];
    metaProperty.Properties[0].Properties.forEach(x => {
      if (x.Name === 'Day') {
        x.Property = dayNumber;
      }
    });

    database.exec(`UPDATE Player_State SET Day = ${dayNumber}`);

    database.exec(`UPDATE Player_State SET CurrentSeason = ${wayBackSeason}`);

    database.exec(`UPDATE Calendar_LastActivityDates SET 
LastScoutDate = ${seasonStartDayNumber}, LastEngineerDate = ${seasonStartDayNumber}, 
LastDesignProjectDate = ${seasonStartDayNumber}, LastResearchProjectDate = ${seasonStartDayNumber}`);


    database.exec(`UPDATE Parts_Designs SET DayCreated = DayCreated - ${dd} WHERE DayCreated > 0`);
    database.exec(`UPDATE Parts_Designs SET DayCompleted = DayCompleted - ${dd} WHERE DayCompleted > 0`);
    database.exec(`UPDATE Parts_Designs SET ValidFrom = ValidFrom - ${yd}`);

    database.exec(`DELETE FROM Sponsorship_GuaranteesAndIncentives`); // delete all



    database.exec(`DELETE FROM Races WHERE SeasonID != ${vanillaSeason}`);
    database.exec(`DELETE FROM Seasons WHERE SeasonID != ${vanillaSeason}`);

    if (extend) {
      database.exec(`UPDATE Races SET SeasonID = ${wayBackSeason}, Day = Day - ${dd}, State = 2 WHERE SeasonID = ${vanillaSeason}`);
    } else {
      database.exec(`UPDATE Races SET SeasonID = ${wayBackSeason}, Day = Day - ${dd} WHERE SeasonID = ${vanillaSeason}`);
    }
    database.exec(
      `UPDATE Seasons_Deadlines SET SeasonID = SeasonID - ${yd}, Day = Day - ${dd}`
    );

    if (version === 3) {
      database.exec(`UPDATE Player SET FirstGameDay = ${dayNumber}`);
      database.exec(`UPDATE Player_Record SET StartSeason = ${wayBackSeason}`);
      database.exec(`UPDATE Player_History SET StartDay = ${seasonStartDayNumber}`);
      database.exec(
        `UPDATE Staff_PitCrew_DevelopmentPlan SET Day = Day - ${dd} WHERE Day > 40000`
      );
      database.exec(
        `UPDATE Onboarding_Tutorial_RestrictedActions SET TutorialIsActiveSetting = 0`
      );

    }

    if (version === 2) {
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
    ]

    for(const pair of moddingPairs) {
      if (pair.versions && !pair.versions.includes(version)) {
        continue;
      }
      for(const table of pair.table) {
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
        // table.startsWith("Board_Confidence") ||
        table.startsWith("Teams_RaceRecord") ||
        0
      ) {
        database.exec(`DELETE FROM ${table}`);
      }

      if (table === "Races_Results") {
        console.log(table);
        database.exec(`DELETE FROM ${table} WHERE Season != ${vanillaSeason}`);
        database.exec(`UPDATE ${table} SET Season = Season - ${yd} WHERE Season = ${vanillaSeason}`);
      } else if ((table.startsWith("Races") && table.endsWith("Results"))) {
        console.log(table);
        database.exec(`DELETE FROM ${table} WHERE SeasonID != ${vanillaSeason}`);
        database.exec(`UPDATE ${table} SET SeasonID = SeasonID - ${yd} WHERE SeasonID = ${vanillaSeason}`);
      }
    }

    if (extend) {

      database.exec(
        `UPDATE Staff_Contracts SET EndSeason = EndSeason + 1`
      ); // one more year
    }


    basicInfoUpdater({ metadata });
    enqueueSnackbar(
      `Name changed!`,
      { variant: "success" }
    );

  }

  const timeTravelOnly = ( dayNumber ) => {
    const metaProperty = metadata.gvasMeta.Properties.Properties.filter(p => p.Name === "MetaData")[0];
    metaProperty.Properties[0].Properties.forEach(x => {
      if (x.Name === 'Day') {
        x.Property = dayNumber;
      }
    });

    database.exec(`UPDATE Player_State SET Day = ${dayNumber}`);

    basicInfoUpdater({ metadata });
    enqueueSnackbar(
      `Date Updated`,
      { variant: "success" }
    );

  }

  return (
    <div>
      <Typography variant="h5" component="h5">
        Time Machine
      </Typography>
      <Divider variant="fullWidth" sx={{my: 2}}/>
      <Alert severity="error" sx={{my: 2}}>
        <AlertTitle>Warning</AlertTitle>
        Travelling between years would delete almost all race records and many other things, and modifying dates within a season might get unintended effects. <br />
        Use with extreme caution and may break things. Works best with new saves.
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
              timeTravelWithData(dateToDay(travelDate.toDate()), travelDate.month() > 11);
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
              timeTravelOnly(dateToDay(travelDate.toDate()), false);
            }}
          >Move to {formatDate(travelDate.toDate())}</Button>
        </Grid>
      </Grid>
    </div>
  );
}