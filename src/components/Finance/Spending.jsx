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
import {teams2023} from "../../js/localization/Teams2023";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "../Contexts";
import {defaultFontFamily} from "../UI/Fonts";
import * as Tx from "./consts_transactions"

const grid = {
  left: 100,
  right: 100,
  top: 50,
  bottom: 50
};

export default function Spending() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);

  const { player } = basicInfo;

  const [series, setSeries] = useState([]);
  const [elements, setElements] = useState([]);
  const [teamNameCategories, setTeamNameCategories] = useState([]);
  const [chart, setChart] = useState(null);



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
    if (!chart) return;

    // let season = player.CurrentSeason;
    try {

      let columns, values;

      [{ values }] = database.exec(`SELECT Min(Day), Max(Day) FROM 'Seasons_Deadlines' WHERE SeasonID = ${season}`);
      const [seasonStart, seasonEnd] = values[0];

      let teamNameCategories = [];
      let teamIDtoCategory = {};
      for(let i = 1; i <= 10; i++) {
        teamNameCategories.push(teamNames(i, version));
        teamIDtoCategory[i] = i-1;
      }

      setTeamNameCategories(teamNameCategories);

      let teams = 10;
      const categoryNames = [
        'Entry Fee & PU',
        'Staff',
        'Fac. Upgrade',
        'Fac. Upkeep',
        'Manufacture',
        'Emergency Man.',
        'Design',
        'Research',
        'Additional PU',
        'Misc & Fine',
      ];
      let maxCategories = categoryNames.length;
      // const color = [
      //   '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de'
      // ];


      const rawData = [];
      for(let i = 0; i < maxCategories; i++) {
        rawData.push(Array.from(Array(teams)).map(x => 0));
      }

      let categoriesMapping = {
        [Tx.EntryFee]: 0,
        [Tx.EnginePurchase]: 0,

        [Tx.StaffWages]: 1,
        [Tx.StaffRaceBonus]: 1,
        [Tx.StaffStartingBonus]: 1,
        [Tx.StaffRecruitment]: 1,
        [Tx.SubTeamHire]: 1,
        [Tx.StaffContractTermination]: 1,
        [Tx.EngineerSubTeamWages]: 1,
        [Tx.ScoutSubTeamWages]: 1,
        [Tx.PitCrewWages]: 1,

        [Tx.BuildingUpgrade]: 2,
        [Tx.BuildingRefurbishment]: 2,
        [Tx.BuildingConstruction]: 2,

        [Tx.BuildingUpkeep]: 3,

        [Tx.PartManufacture]: 4,

        [Tx.EmergencyPart]: 5,
        [Tx.RaceWeekendEmergencyPart]: 5,

        [Tx.PartDesign]: 6,
        [Tx.PartResearch]: 7,

        [Tx.EmergencyEngine]: 8,
        [Tx.RaceWeekendEmergencyEngine]: 8,

        [Tx.SponsorshipGuarantees]: 9,
        [Tx.Dilemma]: 9,
        [Tx.Fine]: 9,
      };

      [{ columns, values }] = database.exec(
        `SELECT TeamID, TransactionType, -SUM(value) as Value FROM 'Finance_Transactions' 
        WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} AND Value < 0 GROUP BY TeamID, TransactionType ORDER BY Day ASC`
      );

      for(const [TeamID, TransactionType, Value] of values) {
        if (categoriesMapping[TransactionType] !== undefined) {
          rawData[
            categoriesMapping[TransactionType]
          ][
            teamIDtoCategory[TeamID]
          ] += Value;
        } else {
          rawData[
            categoriesMapping[TransactionType]
            ][
            9
            ] += Value;
        }
      }

      // const gridWidth = chart.getWidth() - grid.left - grid.right;
      // const gridHeight = chart.getHeight() - grid.top - grid.bottom;
      // const categoryWidth = gridWidth / teams;
      // const barWidth = categoryWidth * 0.6;
      // const barPadding = (categoryWidth - barWidth) / 2;


      const series = categoryNames.map((name, sid) => {
        return {
          name,
          type: 'bar',
          stack: 'total',
          barWidth: '50%',
          label: {
            show: true,
            formatter: (params) => (params.value / 1e6).toFixed(2) + `m`,
          },
          data: rawData[sid]
        };
      });

      // const elements = [];
      // for (let j = 1; j <= teams; ++j) {
      //   const leftX = grid.left + categoryWidth * j - barPadding;
      //   const rightX = leftX + barPadding * 2;
      //   let leftY = grid.top + gridHeight;
      //   let rightY = leftY;
      //   for (let i = 0, len = teams; i < len; ++i) {
      //     const points = [];
      //     const leftBarHeight = (rawData[i][j - 1] / 350000000) * gridHeight;
      //     points.push([leftX, leftY]);
      //     points.push([leftX, leftY - leftBarHeight]);
      //     const rightBarHeight = (rawData[i][j] / 350000000) * gridHeight;
      //     points.push([rightX, rightY - rightBarHeight]);
      //     points.push([rightX, rightY]);
      //     points.push([leftX, leftY]);
      //     leftY -= leftBarHeight;
      //     rightY -= rightBarHeight;
      //     elements.push({
      //       type: 'polygon',
      //       shape: {points},
      //       style: {
      //         fill: color[i],
      //         opacity: 0.25
      //       }
      //     });
      //   }
      // }

      setSeries(series);
      setElements(elements);

    } catch (e) {
      console.error(e);
    }

  }, [database, season, chart])

  return (
    <div>
      <Typography variant="h5" component="h5">
        Spending Breakdown for <FormControl variant="standard" sx={{ minWidth: 120, m: -0.5, p: -0.5, ml: 2 }}>
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
          onChartReady={e => setChart(e)}
          style={{ height: 800 }}
          option={{
            backgroundColor: "transparent",
            legend: {show: true},
            textStyle: {
              fontFamily: defaultFontFamily,
              fontVariantNumeric: 'tabular-nums',
            },
            grid,
            yAxis: {
              type: 'value'
            },
            xAxis: {
              type: 'category',
              data: teamNameCategories,
            },
            series,
            graphic: {
              elements
            }
          }} />
      </div>
    </div>
  );
}