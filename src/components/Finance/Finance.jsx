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

export default function Finance() {
  const database = useContext(DatabaseContext);
  const {version} = useContext(MetadataContext);
  const {player, teamIds} = useContext(BasicInfoContext);

  const [seriesList, setSeriesList] = useState([]);
  const [xMax, setXMax] = useState(0);
  const [season, setSeason] = useState(player.CurrentSeason);
  const [seasons, setSeasons] = useState([]);
  const [overview, setOverview] = useState({
    playerRevenue: 0,
    fieldLeaderRevenue: 0,
    averageRevenue: 0,
    playerPosition: "-",
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

      const totalRevenueForTeam = Array(12).fill(0);
      const revenueHistoryForTeam = Array.from({length: 12}, () => []);

      [{columns, values}] = database.exec(
        `SELECT TeamID, Day, SUM(value) as Value FROM 'Finance_Transactions'
         WHERE Day >= ${seasonStart} AND Day < ${seasonEnd}
         GROUP BY TeamID, Day ORDER BY Day ASC`
      );
      for (const rowValues of values) {
        const transaction = {};
        rowValues.map((value, index) => transaction[columns[index]] = value);
        totalRevenueForTeam[transaction.TeamID] += transaction.Value;
        revenueHistoryForTeam[transaction.TeamID].push([transaction.Day, totalRevenueForTeam[transaction.TeamID]]);
      }

      const raceMarklines = [];
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

      const rankedTeams = [...teamIds]
        .map((teamId) => ({teamId, total: totalRevenueForTeam[teamId]}))
        .sort((a, b) => b.total - a.total);
      const playerPosition = rankedTeams.findIndex((row) => row.teamId === player.TeamID) + 1;
      const averageRevenue = rankedTeams.length
        ? rankedTeams.reduce((sum, row) => sum + row.total, 0) / rankedTeams.length
        : 0;

      for (const teamId of teamIds) {
        const lastDay = revenueHistoryForTeam[teamId].length
          ? revenueHistoryForTeam[teamId][revenueHistoryForTeam[teamId].length - 1][0]
          : seasonStart - 1;
        revenueHistoryForTeam[teamId].push([
          Math.max(lastDay + 1, Math.min(player.Day, seasonEnd - 1)),
          totalRevenueForTeam[teamId],
        ]);

        const color = getComputedStyle(window.vc).getPropertyValue(`--team${teamId}`);
        const data = [[dayToDate(seasonStart - 1), 0]];
        let previousDate = seasonStart;
        let previousRevenue = 0;
        for (const [day, total] of revenueHistoryForTeam[teamId]) {
          for (let date = previousDate; date < day; date++) {
            data.push([dayToDate(date), previousRevenue]);
          }
          previousRevenue = total;
          previousDate = day;
        }
        data.push([dayToDate(previousDate), previousRevenue]);

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

      setSeriesList(nextSeriesList);
      setOverview({
        playerRevenue: totalRevenueForTeam[player.TeamID] || 0,
        fieldLeaderRevenue: rankedTeams[0]?.total || 0,
        averageRevenue,
        playerPosition: playerPosition || "-",
      });
    } catch (error) {
      console.error(error);
    }
  }, [database, player.Day, player.TeamID, season, teamIds, version]);

  return (
    <WorkspaceShell
      title="Revenue"
      description="Follow cumulative team cashflow through the season and see how the player team stacks up against the rest of the paddock."
      season={season}
      seasons={seasons}
      onSeasonChange={setSeason}
      stats={[
        {label: "Player Revenue", value: currencyFormatter.format(overview.playerRevenue)},
        {label: "Field Leader", value: currencyFormatter.format(overview.fieldLeaderRevenue)},
        {label: "Field Average", value: currencyFormatter.format(overview.averageRevenue)},
        {label: "Player Rank", value: overview.playerPosition === "-" ? "-" : `P${overview.playerPosition}`},
      ]}
    >
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
                name: "Revenue",
                nameTextStyle: {color: "#64748b"},
                axisLine: {show: true, lineStyle: {color: "rgba(255,255,255,0.14)"}},
                splitLine: {lineStyle: {color: "rgba(255,255,255,0.05)"}},
                axisLabel: {
                  color: "#94a3b8",
                  formatter: (value) => formatMillions(value),
                },
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
