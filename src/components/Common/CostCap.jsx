import {raceAbbrevs} from "@/js/localization";
import {Divider, Typography} from "@mui/material";
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ReactECharts from "echarts-for-react";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {dayToDate, teamColors, teamNames} from "../../js/localization";
import {BasicInfoContext, DatabaseContext, VersionContext} from "../Contexts";


export default function CostCap() {

  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const basicInfo = useContext(BasicInfoContext);

  const { player } = basicInfo;

  const [seriesList, setSeriesList] = useState([]);
  const [yMax, setYMax] = useState(0);
  const [xMax, setXMax] = useState(0);

  const [season, setSeason] = useState(player.CurrentSeason);
  const [seasons, setSeasons] = useState([]);

  useEffect(() => {
    let seasonList = [];
    for(let s = player.StartSeason; s <= player.CurrentSeason; s++) {
      seasonList.push(s);
    }
    setSeasons(seasonList);
  }, [player.CurrentSeason, player.StartSeason]);

  // const [currentSeason, setCurrentSeason] = useState(2023);

  const handleChange = (event) => {
    setSeason(event.target.value);
  };




  useEffect(() => {

    // let season = player.CurrentSeason;
    try {

      let columns, values;

      [{ values }] = database.exec(
        `SELECT Min(Day), Max(Day) FROM 'Seasons_Deadlines' WHERE SeasonID = ${season}`
      );
      const [seasonStart, seasonEnd] = values[0];
      setXMax(dayToDate(seasonEnd));

      [{ values }] = database.exec(
        `SELECT CurrentValue FROM 'Regulations_Enum_Changes' WHERE Name = 'SpendingCap'`
      );
      const [costCap] = values[0];

      const raceMarklines = [{
        name: "Current Cost Cap",
        yAxis: costCap,
        label: {
          formatter: '{b}: {c}',
          position: 'insideStart'
        }
      }];

      [{ columns, values }] = database.exec(
        `select * from Races JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID WHERE SeasonID = ${season} order by Day ASC`
      );
      for(const r of values) {
        let race = {};
        r.map((x, _idx) => {
          race[columns[_idx]] = x;
        })
        raceMarklines.push({
          name: raceAbbrevs[race.TrackID],
          xAxis: dayToDate(race.Day),
          itemStyle: {
            color: 'rgba(255, 173, 177, 0.5)'
          },
          label: {
            formatter: '{b}',
            position: 'insideStart'
          }
        })
      }

      let totalCostCapForTeam = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      let costCapHistoryForTeam = [[], [], [], [], [], [], [], [], [], [], [], []];
      [{ columns, values }] = database.exec(
        `SELECT TeamID, Day, SUM(value) as Value FROM 'Finance_Transactions' 
        WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} AND AffectsCostCap = 1 GROUP BY TeamID, Day ORDER BY Day ASC`
      );
      for(const r of values) {
        let transaction = {};
        r.map((x, _idx) => transaction[columns[_idx]] = x)
        //
        totalCostCapForTeam[transaction.TeamID] -= transaction.Value;
        costCapHistoryForTeam[transaction.TeamID].push(
          [dayToDate(transaction.Day), totalCostCapForTeam[transaction.TeamID]]
        )
      }

      const seriesList = [{
        type: 'line',
        markLine: {
          data: raceMarklines
        }
      },];


      let calcYMax = costCap;
      for(let i = 1; i <= 10; i++) {
        costCapHistoryForTeam[i].push([dayToDate(
          Math.min(player.Day, seasonEnd - 1)
        ), totalCostCapForTeam[i]])
        if (totalCostCapForTeam[i] > calcYMax) {
          calcYMax = totalCostCapForTeam[i];
        }
        const color = getComputedStyle(window.vc).getPropertyValue(`--team${i}`);
        seriesList.push( {
          name: teamNames(i, version),
          type: 'line',
          itemStyle: {color},
          data: costCapHistoryForTeam[i]
        })
      }

      setSeriesList(seriesList);
      setYMax(calcYMax * 1.2);

    } catch (e) {
      console.error(e);
    }

  }, [database, season])

  return (
    <div>
      <Typography variant="h5" component="h5">
        Cost Cap Overview for <FormControl variant="standard" sx={{ minWidth: 120, m: -0.5, p: -0.5, ml: 2 }}>
        <InputLabel id="demo-simple-select-standard-label">Season</InputLabel>
        <Select
          labelId="demo-simple-select-standard-label"
          id="demo-simple-select-standard"
          value={season}
          onChange={handleChange}
          label="Season"
        >
          {seasons.map(s => <MenuItem value={s} key={s}>{s}</MenuItem>)}
        </Select>
      </FormControl>
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <div style={{ overflowX: "auto" }}>
        <ReactECharts
          theme="dark"
          style={{ height: 500 }}
          option={{
            backgroundColor: "transparent",
            // animationDuration: 10000,
            tooltip: {
              order: 'valueDesc',
              trigger: 'axis'
            },
            xAxis: {
              type: 'time',
              nameLocation: 'middle',
              max: xMax,
            },
            yAxis: {
              type: 'value',
              name: 'Cost Cap',
              max: yMax,
            },
            grid: {
              right: 140
            },
            series: seriesList
          }} />
      </div>
    </div>
  );
}