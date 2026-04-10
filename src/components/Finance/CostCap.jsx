import {currencyFormatter} from "@/components/Finance/utils";
import WorkspaceShell from "@/components/Finance/WorkspaceShell";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {dayToDate, raceAbbrevs, teamNames} from "@/js/localization";
import {defaultFontFamily} from "@/ui/Fonts";
import ReactECharts from "echarts-for-react";
import * as React from "react";
import {useContext, useEffect, useState} from "react";

function formatMillions(value) {
  return `${(value / 1000000).toFixed(1)}m`;
}

export default function CostCap() {
  const database = useContext(DatabaseContext);
  const {version} = useContext(MetadataContext);
  const {player, teamIds} = useContext(BasicInfoContext);

  const [seriesList, setSeriesList] = useState([]);
  const [yMax, setYMax] = useState(0);
  const [xMax, setXMax] = useState(0);
  const [season, setSeason] = useState(player.CurrentSeason);
  const [seasons, setSeasons] = useState([]);
  const [overview, setOverview] = useState({
    costCap: 0,
    playerUsed: 0,
    playerRemaining: 0,
    leadingUsed: 0,
  });

  useEffect(() => {
    const seasonList = [];
    for (let s = player.StartSeason; s <= player.CurrentSeason; s++) {
      seasonList.push(s);
    }
    setSeasons(seasonList);
  }, [player.CurrentSeason, player.StartSeason]);

  useEffect(() => {
    try {
      let columns;
      let values;

      [{values}] = database.exec(`SELECT Min(Day), Max(Day) FROM 'Seasons_Deadlines' WHERE SeasonID = ${season}`);
      const [seasonStart, seasonEnd] = values[0];
      setXMax(dayToDate(seasonEnd));

      [{values}] = database.exec(`SELECT CurrentValue FROM 'Regulations_Enum_Changes' WHERE Name = 'SpendingCap'`);
      const [costCap] = values[0];

      const totalCostCapForTeam = {};
      const costCapHistoryForTeam = {};
      for (const team of teamIds) {
        totalCostCapForTeam[team] = 0;
        costCapHistoryForTeam[team] = [];
      }

      [{columns, values}] = database.exec(
        `SELECT TeamID, Day, SUM(value) as Value FROM 'Finance_Transactions'
         WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} AND AffectsCostCap = 1
         GROUP BY TeamID, Day ORDER BY Day ASC`
      );
      for (const rowValues of values) {
        const transaction = {};
        rowValues.map((value, index) => transaction[columns[index]] = value);
        totalCostCapForTeam[transaction.TeamID] -= transaction.Value;
        costCapHistoryForTeam[transaction.TeamID].push([transaction.Day, totalCostCapForTeam[transaction.TeamID]]);
      }

      const costCapFines = database.exec(
        `SELECT FTA.TeamID, FTA.Day, FTA.Value - SUM(FTB.Value) FROM (
            SELECT TeamID, Day, SUM(value) as Value
            FROM 'Finance_Transactions'
            WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} AND TransactionType = 33
            GROUP BY TeamID, Day
          ) as FTA, (
            SELECT TeamID, Day, SUM(value) as Value
            FROM 'Finance_Transactions'
            WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} AND AffectsCostCap = 1
            GROUP BY TeamID, Day
          ) as FTB
         WHERE FTB.Day <= FTA.Day AND FTA.TeamID = FTB.TeamID
         GROUP BY FTA.TeamID, FTA.Day`
      );

      const raceMarklines = [];
      if (costCapFines.length) {
        const [{values: [[, , calculatedCostCap]]}] = costCapFines;
        if (calculatedCostCap > 0) {
          raceMarklines.push({
            name: "Calculated Cost Cap",
            yAxis: calculatedCostCap,
            symbol: "none",
            lineStyle: {
              color: "#facc15",
              type: "dashed",
            },
            label: {
              formatter: (item) => `${item.name}: ${formatMillions(item.value)}`,
              position: "insideStartBottom",
            },
          });
        }
      }

      if (!raceMarklines.length) {
        raceMarklines.push({
          name: "Current Cost Cap",
          yAxis: costCap,
          symbol: "none",
          lineStyle: {
            color: "#7dd3fc",
            type: "dashed",
          },
          label: {
            formatter: (item) => `${item.name}: ${formatMillions(item.value)}`,
            position: "insideStartBottom",
          },
        });
      }

      [{columns, values}] = database.exec(
        `SELECT * FROM Races JOIN Races_Tracks ON Races.TrackID = Races_Tracks.TrackID
         WHERE SeasonID = ${season} ORDER BY Day ASC`
      );
      for (const rowValues of values) {
        const race = {};
        rowValues.map((value, index) => race[columns[index]] = value);
        raceMarklines.push({
          name: raceAbbrevs[race.TrackID],
          xAxis: dayToDate(race.Day),
          itemStyle: {
            color: "rgba(125, 211, 252, 0.24)",
          },
          label: {
            formatter: "{b}",
            position: "insideStart",
          },
        });
      }

      const nextSeriesList = [{
        type: "line",
        markLine: {
          symbol: "none",
          data: raceMarklines,
        },
      }];

      let calcYMax = costCap;
      let leadingUsed = 0;

      for (const teamId of teamIds) {
        costCapHistoryForTeam[teamId].push([Math.min(player.Day, seasonEnd - 1), totalCostCapForTeam[teamId]]);
        if (totalCostCapForTeam[teamId] > calcYMax) {
          calcYMax = totalCostCapForTeam[teamId];
        }
        if (totalCostCapForTeam[teamId] > leadingUsed) {
          leadingUsed = totalCostCapForTeam[teamId];
        }
        const color = getComputedStyle(window.vc).getPropertyValue(`--team${teamId}`);
        const data = [];
        let previousDate = seasonStart;
        let previousCapUsage = 0;
        for (const [day, cap] of costCapHistoryForTeam[teamId]) {
          for (let date = previousDate; date < day; date++) {
            data.push([dayToDate(date), previousCapUsage]);
          }
          previousCapUsage = cap;
          previousDate = day;
        }
        data.push([dayToDate(previousDate), previousCapUsage]);

        nextSeriesList.push({
          name: teamNames(teamId, version),
          type: "line",
          itemStyle: {color},
          lineStyle: {width: teamId === player.TeamID ? 3 : 2},
          emphasis: {
            focus: "series",
          },
          showSymbol: false,
          data,
        });
      }

      setOverview({
        costCap,
        playerUsed: totalCostCapForTeam[player.TeamID] || 0,
        playerRemaining: costCap - (totalCostCapForTeam[player.TeamID] || 0),
        leadingUsed,
      });
      setSeriesList(nextSeriesList);
      setYMax(Math.floor(calcYMax * 1.2 / 10000000) * 10000000);
    } catch (error) {
      console.error(error);
    }
  }, [database, player.Day, player.TeamID, season, teamIds, version]);

  return (
    <WorkspaceShell
      title="Cost Cap"
      description="Track season spend against the live cap, compare team trajectories, and see where your current program sits relative to the ceiling."
      season={season}
      seasons={seasons}
      onSeasonChange={setSeason}
      stats={[
        {label: "Current Cap", value: currencyFormatter.format(overview.costCap)},
        {label: "Player Spend", value: currencyFormatter.format(overview.playerUsed)},
        {
          label: "Player Headroom",
          value: currencyFormatter.format(overview.playerRemaining),
          valueClassName: overview.playerRemaining < 0 ? "text-rose-300" : "text-emerald-300",
        },
        {label: "Highest Spend", value: currencyFormatter.format(overview.leadingUsed)},
      ]}
    >
      <section className="border border-amber-300/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100">
        AI teams do not obey the cost cap or receive breach fines. Their lines are still shown for comparison, and older caps can only be inferred when the save contains fines.
      </section>
      <section className="border border-white/10 bg-white/[0.015] p-3">
        <div className="min-w-0 overflow-x-auto">
          <ReactECharts
            theme="dark"
            style={{height: 520}}
            option={{
              legend: {
                top: 8,
                textStyle: {
                  color: "#cbd5e1",
                  fontSize: 12,
                },
              },
              textStyle: {
                fontFamily: defaultFontFamily,
                fontVariantNumeric: "tabular-nums",
              },
              backgroundColor: "transparent",
              tooltip: {
                order: "valueDesc",
                trigger: "axis",
                valueFormatter: (value) => currencyFormatter.format(value),
              },
              xAxis: {
                type: "time",
                max: xMax,
                axisLine: {lineStyle: {color: "rgba(255,255,255,0.14)"}},
                splitLine: {lineStyle: {color: "rgba(255,255,255,0.05)"}},
                axisLabel: {color: "#94a3b8"},
              },
              yAxis: {
                type: "value",
                name: "Cost Cap Spend",
                nameTextStyle: {color: "#64748b"},
                axisLine: {show: true, lineStyle: {color: "rgba(255,255,255,0.14)"}},
                splitLine: {lineStyle: {color: "rgba(255,255,255,0.05)"}},
                axisLabel: {
                  color: "#94a3b8",
                  formatter: (value) => formatMillions(value),
                },
                max: yMax,
              },
              grid: {
                top: 64,
                right: 28,
                bottom: 28,
                left: 72,
              },
              series: seriesList,
            }}
          />
        </div>
      </section>
    </WorkspaceShell>
  );
}
