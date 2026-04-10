import {currencyFormatter} from "@/components/Finance/utils";
import WorkspaceShell from "@/components/Finance/WorkspaceShell";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {teamNames} from "@/js/localization";
import {defaultFontFamily} from "@/ui/Fonts";
import ReactECharts from "echarts-for-react";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import * as Tx from "./consts_transactions";

function formatMillions(value) {
  return `${(value / 1000000).toFixed(1)}m`;
}

export default function Spending() {
  const database = useContext(DatabaseContext);
  const {version} = useContext(MetadataContext);
  const {player, teamIds} = useContext(BasicInfoContext);

  const [series, setSeries] = useState([]);
  const [teamNameCategories, setTeamNameCategories] = useState([]);
  const [season, setSeason] = useState(player.CurrentSeason);
  const [seasons, setSeasons] = useState([]);
  const [overview, setOverview] = useState({
    playerSpend: 0,
    topSpend: 0,
    largestCategory: "-",
    playerRank: "-",
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
      let values;

      [{values}] = database.exec(`SELECT Min(Day), Max(Day) FROM 'Seasons_Deadlines' WHERE SeasonID = ${season}`);
      const [seasonStart, seasonEnd] = values[0];

      const categoryNames = [
        "Entry Fee & PU",
        "Staff",
        "Fac. Upgrade",
        "Fac. Upkeep",
        "Manufacture",
        "Emergency Man.",
        "Design",
        "Research",
        "Additional PU",
        "Misc & Fine",
      ];

      const rawData = categoryNames.map(() => Object.fromEntries(teamIds.map((teamId) => [teamId, 0])));
      const categoriesMapping = {
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
        [Tx.Sponsorship]: 9,
        [Tx.SponsorshipGuarantees]: 9,
        [Tx.Dilemma]: 9,
        [Tx.Fine]: 9,
      };

      [{values}] = database.exec(
        `SELECT TeamID, TransactionType, -SUM(value) as Value FROM 'Finance_Transactions'
         WHERE Day >= ${seasonStart} AND Day < ${seasonEnd} AND Value < 0
         GROUP BY TeamID, TransactionType ORDER BY Day ASC`
      );

      for (const [teamId, transactionType, value] of values) {
        const categoryIndex = categoriesMapping[transactionType] ?? 9;
        rawData[categoryIndex][teamId] += value;
      }

      const totalsByTeam = teamIds.map((teamId) => ({
        teamId,
        total: rawData.reduce((sum, categoryRow) => sum + (categoryRow[teamId] || 0), 0),
      })).sort((a, b) => b.total - a.total);

      const sortedTeamIds = totalsByTeam.map((row) => row.teamId);
      setTeamNameCategories(sortedTeamIds.map((teamId) => teamNames(teamId, version)));

      const categoryTotals = categoryNames.map((name, index) => ({
        name,
        total: teamIds.reduce((sum, teamId) => sum + (rawData[index][teamId] || 0), 0),
      }));
      const largestCategory = categoryTotals.sort((a, b) => b.total - a.total)[0];
      const playerRank = totalsByTeam.findIndex((row) => row.teamId === player.TeamID) + 1;

      const nextSeries = categoryNames.map((name, index) => ({
        name,
        type: "bar",
        stack: "total",
        barMaxWidth: 22,
        emphasis: {
          focus: "series",
        },
        label: {
          show: false,
        },
        data: sortedTeamIds.map((teamId) => rawData[index][teamId] || 0),
      }));

      setSeries(nextSeries);
      setOverview({
        playerSpend: totalsByTeam.find((row) => row.teamId === player.TeamID)?.total || 0,
        topSpend: totalsByTeam[0]?.total || 0,
        largestCategory: largestCategory?.name || "-",
        playerRank: playerRank || "-",
      });
    } catch (error) {
      console.error(error);
    }
  }, [database, player.TeamID, season, teamIds, version]);

  return (
    <WorkspaceShell
      title="Spending Breakdown"
      description="Compare where teams are burning money across the current season, with a cleaner category view that makes the biggest sinks obvious."
      season={season}
      seasons={seasons}
      onSeasonChange={setSeason}
      stats={[
        {label: "Player Spend", value: currencyFormatter.format(overview.playerSpend)},
        {label: "Top Spend", value: currencyFormatter.format(overview.topSpend)},
        {label: "Largest Category", value: overview.largestCategory},
        {label: "Player Rank", value: overview.playerRank === "-" ? "-" : `P${overview.playerRank}`},
      ]}
    >
      <section className="border border-white/10 bg-white/[0.015] p-3">
        <div className="min-w-0 overflow-x-auto">
          <ReactECharts
            theme="dark"
            style={{height: 640}}
            option={{
              backgroundColor: "transparent",
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
              tooltip: {
                trigger: "axis",
                axisPointer: {type: "shadow"},
                valueFormatter: (value) => currencyFormatter.format(value),
              },
              grid: {
                left: 120,
                right: 28,
                top: 64,
                bottom: 28,
              },
              xAxis: {
                type: "value",
                axisLine: {lineStyle: {color: "rgba(255,255,255,0.14)"}},
                splitLine: {lineStyle: {color: "rgba(255,255,255,0.05)"}},
                axisLabel: {
                  color: "#94a3b8",
                  formatter: (value) => formatMillions(value),
                },
              },
              yAxis: {
                type: "category",
                data: teamNameCategories,
                axisLine: {lineStyle: {color: "rgba(255,255,255,0.14)"}},
                axisTick: {show: false},
                axisLabel: {
                  color: "#cbd5e1",
                  fontWeight: 600,
                },
              },
              series,
            }}
          />
        </div>
      </section>
    </WorkspaceShell>
  );
}
