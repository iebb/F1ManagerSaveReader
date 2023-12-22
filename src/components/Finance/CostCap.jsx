import {raceAbbrevs} from "@/js/localization";
import {Alert, AlertTitle, Divider, FormControl, InputLabel, MenuItem, Select, Typography} from "@mui/material";
import ReactECharts from "echarts-for-react";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {dayToDate, teamNames} from "@/js/localization";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "../Contexts";
import {defaultFontFamily} from "../UI/Fonts";


export default function CostCap() {

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

      [{ values }] = database.exec(`SELECT CurrentValue FROM 'Regulations_Enum_Changes' WHERE Name = 'SpendingCap'`);
      const [costCap] = values[0];

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
          [transaction.Day, totalCostCapForTeam[transaction.TeamID]]
        )
      }

      let costCapFines = database.exec(
        `SELECT FTA.TeamID, FTA.Day, FTA.Value - SUM(FTB.Value) FROM (
          SELECT TeamID, Day, SUM(value) as Value FROM 'Finance_Transactions' WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} AND TransactionType = 33 GROUP BY TeamID, Day
        ) as FTA, (
          SELECT TeamID, Day, SUM(value) as Value FROM 'Finance_Transactions' WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} AND AffectsCostCap = 1 GROUP BY TeamID, Day
        ) as FTB WHERE FTB.Day <= FTA.Day AND FTA.TeamID = FTB.TeamID GROUP BY FTA.TeamID, FTA.Day`
      );

      const raceMarklines = [];

      if (costCapFines.length) {
        let [{ values: [[TeamID, Day, CCF]] }] = costCapFines;
        if (CCF > 0) {
          raceMarklines.push({
            name: "Calculated Cost Cap",
            yAxis: CCF,
            symbol: 'none',
            label: {
              formatter: x => `${x.name}: ${(x.value / 1000000).toFixed(1)}m`,
              position: 'insideStartBottom'
            }
          });
        }
      }

      if (!raceMarklines.length) {
        raceMarklines.push({
          name: "Current Cost Cap",
          yAxis: costCap,
          label: {
            formatter: x => `${x.name}: ${(x.value / 1000000).toFixed(1)}m`,
            position: 'insideStartBottom'
          }
        });
      }


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




      let calcYMax = costCap;
      for(let i = 1; i <= 10; i++) {
        costCapHistoryForTeam[i].push([Math.min(player.Day, seasonEnd - 1), totalCostCapForTeam[i]])
        if (totalCostCapForTeam[i] > calcYMax) {
          calcYMax = totalCostCapForTeam[i];
        }
        const color = getComputedStyle(window.vc).getPropertyValue(`--team${i}`);
        const data = [];
        let previousDate = seasonStart;
        let previousCapUsage = 0;
        for(const [day, cap] of costCapHistoryForTeam[i]) {
          for(let i = previousDate; i < day; i++) {
            data.push([dayToDate(i), previousCapUsage]);
          }
          previousCapUsage = cap;
          previousDate = day;
          // data.push([dayToDate(day), cap]);
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
      setYMax(
        Math.floor(calcYMax * 1.2 / 10000000) * 10000000
      );

    } catch (e) {
      console.error(e);
    }

  }, [database, season])

  return (
    <div>
      <Typography variant="h5" component="h5">
        Cost Cap Overview for <FormControl variant="standard" sx={{ minWidth: 120, m: -0.5, p: -0.5, ml: 2 }}>
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
      <Alert severity="warning" sx={{ my: 2 }}>
        <AlertTitle>Warning</AlertTitle>
        AI Teams <b>DO NOT</b> follow the cost cap, <b>NOR</b> will they be fined for breaching it. The inclusion of AI Teams is only for informative purposes.
        <br/>
        Game <b>DOES NOT</b> track previous caps. However if you have been fined for breaching the cap, it can be calculated from the fines.
      </Alert>
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
              name: 'Cost Cap',
              axisLabel: {
                formatter: val => `${val / 1000000}m`
              },
              max: yMax,
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