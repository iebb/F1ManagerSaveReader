import {raceAbbrevs} from "@/js/localization";
import {Alert, AlertTitle} from "@mui/material";
import {Divider, Typography} from "@mui/material";
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import ReactECharts from "echarts-for-react";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {dayToDate, teamNames} from "@/js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {defaultFontFamily} from "../UI/Fonts";


export default function Finance() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
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

      [{ values }] = database.exec(`SELECT Min(Day), Max(Day) FROM 'Seasons_Deadlines' WHERE SeasonID = ${season}`);
      const [seasonStart, seasonEnd] = values[0];
      setXMax(dayToDate(seasonEnd));

      let totalRevenueForTeam = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      let revenueHistoryForTeam = [[], [], [], [], [], [], [], [], [], [], [], []];
      [{ columns, values }] = database.exec(
        `SELECT TeamID, Day, SUM(value) as Value FROM 'Finance_Transactions' 
        WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} GROUP BY TeamID, Day ORDER BY Day ASC`
      );
      for(const r of values) {
        let transaction = {};
        r.map((x, _idx) => transaction[columns[_idx]] = x)
        //
        totalRevenueForTeam[transaction.TeamID] += transaction.Value;
        revenueHistoryForTeam[transaction.TeamID].push(
          [transaction.Day, totalRevenueForTeam[transaction.TeamID]]
        )
      }

      const raceMarklines = [];

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

      const seriesList = [{
        type: 'line',
        markLine: {
          symbol: 'none',
          data: raceMarklines
        }
      }];




      for(let i = 1; i <= 10; i++) {
        revenueHistoryForTeam[i].push([Math.min(player.Day, seasonEnd - 1), totalRevenueForTeam[i]])
        const color = getComputedStyle(window.vc).getPropertyValue(`--team${i}`);
        const data = [
          [dayToDate(seasonStart - 1), 0]
        ];
        let previousDate = seasonStart;
        let previousCapUsage = 0;
        for(const [day, cap] of revenueHistoryForTeam[i]) {
          for(let i = previousDate; i < day; i++) {
            data.push([dayToDate(i), previousCapUsage]);
          }
          previousCapUsage = cap;
          previousDate = day;
        }
        data.push([dayToDate(previousDate), previousCapUsage]);

        seriesList.push( {
          name: teamNames(i, version),
          type: 'line',
          itemStyle: {color},
          showSymbol: false,
          data
        })
      }

      setSeriesList(seriesList);

    } catch (e) {
      console.error(e);
    }

  }, [database, season])

  return (
    <div>
      <Typography variant="h5" component="h5">
        Revenue Overview for <FormControl variant="standard" sx={{ minWidth: 120, m: -0.5, p: -0.5, ml: 2 }}>
        <InputLabel id="standard-label">Season</InputLabel>
        <Select
          labelId="standard-label"
          id="standard"
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
            legend: {show: true},
            textStyle: {
              fontFamily: defaultFontFamily,
              fontVariantNumeric: 'tabular-nums',
            },
            backgroundColor: "transparent",
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
              name: 'Revenue',
              axisLabel: {
                formatter: val => `${val / 1000000}m`
              },
            },
            grid: {
              right: 60,
              left: 60,
            },
            series: seriesList
          }} />
      </div>
    </div>
  );
}