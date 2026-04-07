import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {dayToDate, formatDate, resolveLiteral, teamNames} from "@/js/localization";
import {Alert, AlertTitle, Button} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useMemo, useState} from "react";

const readRows = (database, query, params = {}) => {
  try {
    return database.getAllRows(query, params);
  } catch {
    return [];
  }
};

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const resolveTeamDisplayName = (teamMap, teamId, version) => {
  if (teamId > 31 && teamMap?.[teamId]?.TeamNameLocKey) {
    return resolveLiteral(teamMap[teamId].TeamNameLocKey);
  }
  return teamNames(teamId, version);
};

export default function FinanceOperations() {
  const database = useContext(DatabaseContext);
  const basicInfo = useContext(BasicInfoContext);
  const {version} = useContext(MetadataContext);
  const {enqueueSnackbar} = useSnackbar();
  const {player, teamMap} = basicInfo;
  const [updated, setUpdated] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState(player.TeamID);
  const [selectedSeason, setSelectedSeason] = useState(player.CurrentSeason);
  const [teamBalanceRows, setTeamBalanceRows] = useState([]);
  const [budgetRows, setBudgetRows] = useState([]);
  const [bucketRows, setBucketRows] = useState([]);
  const [transactionRows, setTransactionRows] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState({});
  const [budgetCategories, setBudgetCategories] = useState({});

  const refresh = () => setUpdated(Date.now());

  useEffect(() => {
    if (!database) {
      return;
    }

    const balanceData = readRows(
      database,
      "SELECT TeamID, Balance FROM Finance_TeamBalance ORDER BY TeamID ASC"
    ).map((row) => ({
      id: row.TeamID,
      ...row,
      Team: resolveTeamDisplayName(teamMap, row.TeamID, version),
    }));
    setTeamBalanceRows(balanceData);

    const transactionTypeMap = Object.fromEntries(
      readRows(database, "SELECT Value, Name FROM Finance_Enum_TransactionType").map((row) => [row.Value, row.Name])
    );
    setTransactionTypes(transactionTypeMap);

    const budgetCategoryMap = Object.fromEntries(
      readRows(database, "SELECT Value, Name FROM Finance_Enum_BudgetCategory").map((row) => [row.Value, row.Name])
    );
    setBudgetCategories(budgetCategoryMap);

    const budgetData = readRows(
      database,
      `SELECT TeamID, SeasonID, InitialBalance, FinalBalance, ProjectedIncome, ProjectedSpending,
              TotalIncome, TotalSpending, StrategyPresetID, LastRebalanceDay
       FROM Finance_TeamBudget
       WHERE TeamID = :teamId
         AND SeasonID = :season
       ORDER BY SeasonID DESC`,
      {
        ":teamId": selectedTeam,
        ":season": selectedSeason,
      }
    ).map((row) => ({
      id: `${row.TeamID}-${row.SeasonID}`,
      ...row,
    }));
    setBudgetRows(budgetData);

    const bucketData = readRows(
      database,
      `SELECT TeamID, SeasonID, Category, IsReserved, EstimatedSpending, AllocatedAmount,
              RemainingAmount, Weight, UsedAmount
       FROM Finance_TeamBudget_SpendingBuckets
       WHERE TeamID = :teamId
         AND SeasonID = :season
       ORDER BY Category ASC`,
      {
        ":teamId": selectedTeam,
        ":season": selectedSeason,
      }
    ).map((row) => ({
      id: `${row.TeamID}-${row.SeasonID}-${row.Category}`,
      ...row,
      IsReserved: Boolean(row.IsReserved),
      CategoryLabel: budgetCategoryMap[row.Category] || row.Category,
    }));
    setBucketRows(bucketData);

    const deadlineRow = readRows(
      database,
      "SELECT MIN(Day) AS StartDay, MAX(Day) AS EndDay FROM Seasons_Deadlines WHERE SeasonID = :season",
      {":season": selectedSeason}
    )[0];
    const seasonStart = deadlineRow?.StartDay ?? 0;
    const seasonEnd = deadlineRow?.EndDay ?? 999999;
    const transactions = readRows(
      database,
      `SELECT rowid AS id, TeamID, Day, Value, TransactionType, Reference, AffectsCostCap
       FROM Finance_Transactions
       WHERE TeamID = :teamId
         AND Day >= :startDay
         AND Day <= :endDay
       ORDER BY Day DESC, rowid DESC
       LIMIT 180`,
      {
        ":teamId": selectedTeam,
        ":startDay": seasonStart,
        ":endDay": seasonEnd,
      }
    ).map((row) => ({
      ...row,
      AffectsCostCap: Boolean(row.AffectsCostCap),
      DateLabel: row.Day ? formatDate(dayToDate(row.Day)) : "-",
      TransactionTypeLabel: transactionTypeMap[row.TransactionType] || row.TransactionType,
    }));
    setTransactionRows(transactions);
  }, [database, selectedSeason, selectedTeam, teamMap, updated, version]);

  const teamOptions = useMemo(
    () => teamBalanceRows.map((row) => ({value: row.TeamID, label: row.Team})),
    [teamBalanceRows]
  );

  const seasonOptions = useMemo(() => {
    const minSeason = Number(readRows(database, "SELECT MIN(SeasonID) AS MinSeason FROM Finance_TeamBudget")[0]?.MinSeason || player.CurrentSeason);
    const maxSeason = Number(readRows(database, "SELECT MAX(SeasonID) AS MaxSeason FROM Finance_TeamBudget")[0]?.MaxSeason || player.CurrentSeason);
    const seasons = [];
    for (let season = minSeason; season <= maxSeason; season += 1) {
      seasons.push(season);
    }
    return seasons.length ? seasons : [player.CurrentSeason];
  }, [database, player.CurrentSeason]);

  const currentBalance = teamBalanceRows.find((row) => row.TeamID === selectedTeam)?.Balance ?? 0;
  const currentBudget = budgetRows[0] || null;

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Finance Workspace</div>
            <h2 className="mt-2 text-lg font-bold text-white">Ledger & Budget Tools</h2>
            <p className="mt-2 max-w-[900px] text-sm text-slate-400">
              Edit live balances, season budgets, spending buckets, and recent transactions from the finance area instead of dropping into SQL.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[420px]">
            <label className="border border-white/10 bg-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Team</div>
              <select
                value={selectedTeam}
                onChange={(event) => setSelectedTeam(Number(event.target.value))}
                className="mt-2 w-full border border-white/10 bg-[#131a22] px-3 py-2 text-sm text-white outline-none"
              >
                {teamOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="border border-white/10 bg-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Season</div>
              <select
                value={selectedSeason}
                onChange={(event) => setSelectedSeason(Number(event.target.value))}
                className="mt-2 w-full border border-white/10 bg-[#131a22] px-3 py-2 text-sm text-white outline-none"
              >
                {seasonOptions.map((season) => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {label: "Live Balance", value: formatter.format(currentBalance)},
            {label: "Budget Rows", value: budgetRows.length},
            {label: "Buckets", value: bucketRows.length},
            {label: "Transactions", value: transactionRows.length},
          ].map((item) => (
            <div key={item.label} className="border border-white/10 bg-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{item.label}</div>
              <div className="mt-1 text-base font-semibold text-white">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              if (!currentBudget) {
                enqueueSnackbar("No finance budget row exists for the selected team and season.", {variant: "error"});
                return;
              }
              try {
                database.exec(
                  `UPDATE Finance_TeamBudget
                   SET FinalBalance = :balance
                   WHERE TeamID = :teamId
                     AND SeasonID = :season`,
                  {
                    ":balance": currentBalance,
                    ":teamId": selectedTeam,
                    ":season": selectedSeason,
                  }
                );
                refresh();
                enqueueSnackbar("Synced season final balance to the live team balance.", {variant: "success"});
              } catch (error) {
                enqueueSnackbar(`Failed to sync finance balance: ${error.message || error}`, {variant: "error"});
              }
            }}
          >
            Sync Final Balance To Live
          </Button>
          <Button variant="outlined" color="inherit" onClick={refresh}>
            Reload Finance Data
          </Button>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Team Balances</div>
        <DataGrid
          autoHeight
          hideFooter
          disableRowSelectionOnClick
          rows={teamBalanceRows}
          processRowUpdate={(newRow, oldRow) => {
            try {
              database.exec(
                `UPDATE Finance_TeamBalance
                 SET Balance = :balance
                 WHERE TeamID = :teamId`,
                {
                  ":balance": Number(newRow.Balance),
                  ":teamId": newRow.TeamID,
                }
              );
              refresh();
              return newRow;
            } catch (error) {
              enqueueSnackbar(`Failed to update team balance: ${error.message || error}`, {variant: "error"});
              return oldRow;
            }
          }}
          columns={[
            {field: "TeamID", headerName: "Team ID", width: 90},
            {field: "Team", headerName: "Team", flex: 1, minWidth: 180},
            {
              field: "Balance",
              headerName: "Balance",
              width: 170,
              editable: true,
              type: "number",
              valueFormatter: ({value}) => formatter.format(Number(value || 0)),
            },
          ]}
        />
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Season Budget</div>
        {budgetRows.length ? (
          <DataGrid
            autoHeight
            hideFooter
            disableRowSelectionOnClick
            rows={budgetRows}
            processRowUpdate={(newRow, oldRow) => {
              try {
                database.exec(
                  `UPDATE Finance_TeamBudget
                   SET InitialBalance = :initialBalance,
                       FinalBalance = :finalBalance,
                       ProjectedIncome = :projectedIncome,
                       ProjectedSpending = :projectedSpending,
                       TotalIncome = :totalIncome,
                       TotalSpending = :totalSpending,
                       StrategyPresetID = :strategy,
                       LastRebalanceDay = :lastRebalanceDay
                   WHERE TeamID = :teamId
                     AND SeasonID = :season`,
                  {
                    ":initialBalance": Number(newRow.InitialBalance),
                    ":finalBalance": Number(newRow.FinalBalance),
                    ":projectedIncome": Number(newRow.ProjectedIncome),
                    ":projectedSpending": Number(newRow.ProjectedSpending),
                    ":totalIncome": Number(newRow.TotalIncome),
                    ":totalSpending": Number(newRow.TotalSpending),
                    ":strategy": newRow.StrategyPresetID || null,
                    ":lastRebalanceDay": Number(newRow.LastRebalanceDay),
                    ":teamId": newRow.TeamID,
                    ":season": newRow.SeasonID,
                  }
                );
                refresh();
                return newRow;
              } catch (error) {
                enqueueSnackbar(`Failed to update budget row: ${error.message || error}`, {variant: "error"});
                return oldRow;
              }
            }}
            columns={[
              {field: "SeasonID", headerName: "Season", width: 100},
              {field: "InitialBalance", headerName: "Initial", width: 140, editable: true, type: "number"},
              {field: "FinalBalance", headerName: "Final", width: 140, editable: true, type: "number"},
              {field: "ProjectedIncome", headerName: "Projected Income", width: 160, editable: true, type: "number"},
              {field: "ProjectedSpending", headerName: "Projected Spend", width: 160, editable: true, type: "number"},
              {field: "TotalIncome", headerName: "Total Income", width: 150, editable: true, type: "number"},
              {field: "TotalSpending", headerName: "Total Spend", width: 150, editable: true, type: "number"},
              {field: "StrategyPresetID", headerName: "Strategy", width: 150, editable: true},
              {field: "LastRebalanceDay", headerName: "Rebalance Day", width: 130, editable: true, type: "number"},
            ]}
          />
        ) : (
          <Alert severity="info" sx={{m: 2}}>
            <AlertTitle>No Budget Row</AlertTitle>
            The selected team does not currently have a `Finance_TeamBudget` row for season {selectedSeason}. Custom teams often only expose live balances until the game creates budget records.
          </Alert>
        )}
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Spending Buckets</div>
        {bucketRows.length ? (
          <DataGrid
            autoHeight
            disableRowSelectionOnClick
            rows={bucketRows}
            processRowUpdate={(newRow, oldRow) => {
              try {
                database.exec(
                  `UPDATE Finance_TeamBudget_SpendingBuckets
                   SET IsReserved = :isReserved,
                       EstimatedSpending = :estimatedSpending,
                       AllocatedAmount = :allocatedAmount,
                       RemainingAmount = :remainingAmount,
                       Weight = :weight,
                       UsedAmount = :usedAmount
                   WHERE TeamID = :teamId
                     AND SeasonID = :season
                     AND Category = :category`,
                  {
                    ":isReserved": newRow.IsReserved ? 1 : 0,
                    ":estimatedSpending": Number(newRow.EstimatedSpending),
                    ":allocatedAmount": Number(newRow.AllocatedAmount),
                    ":remainingAmount": Number(newRow.RemainingAmount),
                    ":weight": Number(newRow.Weight),
                    ":usedAmount": Number(newRow.UsedAmount),
                    ":teamId": newRow.TeamID,
                    ":season": newRow.SeasonID,
                    ":category": newRow.Category,
                  }
                );
                refresh();
                return newRow;
              } catch (error) {
                enqueueSnackbar(`Failed to update budget bucket: ${error.message || error}`, {variant: "error"});
                return oldRow;
              }
            }}
            columns={[
              {field: "CategoryLabel", headerName: "Category", flex: 1, minWidth: 180},
              {field: "IsReserved", headerName: "Reserved", width: 100, editable: true, type: "boolean"},
              {field: "EstimatedSpending", headerName: "Estimated", width: 140, editable: true, type: "number"},
              {field: "AllocatedAmount", headerName: "Allocated", width: 140, editable: true, type: "number"},
              {field: "RemainingAmount", headerName: "Remaining", width: 140, editable: true, type: "number"},
              {field: "UsedAmount", headerName: "Used", width: 130, editable: true, type: "number"},
              {field: "Weight", headerName: "Weight", width: 110, editable: true, type: "number"},
            ]}
          />
        ) : (
          <Alert severity="info" sx={{m: 2}}>
            <AlertTitle>No Spending Buckets</AlertTitle>
            This team and season do not currently expose any spending-bucket rows.
          </Alert>
        )}
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Recent Transactions</div>
        <DataGrid
          autoHeight
          disableRowSelectionOnClick
          rows={transactionRows}
          processRowUpdate={(newRow, oldRow) => {
            try {
              database.exec(
                `UPDATE Finance_Transactions
                 SET Day = :day,
                     Value = :value,
                     TransactionType = :transactionType,
                     Reference = :reference,
                     AffectsCostCap = :affectsCostCap
                 WHERE rowid = :rowId`,
                {
                  ":day": Number(newRow.Day),
                  ":value": Number(newRow.Value),
                  ":transactionType": Number(newRow.TransactionType),
                  ":reference": newRow.Reference === "" || newRow.Reference === null ? null : Number(newRow.Reference),
                  ":affectsCostCap": newRow.AffectsCostCap ? 1 : 0,
                  ":rowId": newRow.id,
                }
              );
              refresh();
              return newRow;
            } catch (error) {
              enqueueSnackbar(`Failed to update finance transaction: ${error.message || error}`, {variant: "error"});
              return oldRow;
            }
          }}
          columns={[
            {field: "DateLabel", headerName: "Date", width: 120},
            {field: "Day", headerName: "Day", width: 90, editable: true, type: "number"},
            {field: "Value", headerName: "Value", width: 140, editable: true, type: "number"},
            {
              field: "TransactionType",
              headerName: "Type",
              width: 170,
              editable: true,
              type: "singleSelect",
              valueOptions: Object.entries(transactionTypes).map(([value, label]) => ({
                value: Number(value),
                label,
              })),
              valueFormatter: ({value}) => transactionTypes[value] || value,
            },
            {field: "Reference", headerName: "Reference", width: 120, editable: true, type: "number"},
            {field: "AffectsCostCap", headerName: "Cost Cap", width: 100, editable: true, type: "boolean"},
          ]}
        />
      </section>
    </div>
  );
}
