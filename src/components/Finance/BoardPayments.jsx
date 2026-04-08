import {currencyFormatter} from "@/components/Finance/utils";
import {
  Grid,
  Input,
  Slider,
} from "@mui/material";
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import TeamIdentity from "@/components/Common/TeamIdentity";

function formatOrdinal(value) {
  return `${value}${{
    one: "st",
    two: "nd",
    few: "rd",
    other: "th",
  }[new Intl.PluralRules("en", {type: "ordinal"}).select(value)]}`;
}

export default function BoardPayments() {

  const database = useContext(DatabaseContext);
  const {version} = useContext(MetadataContext)
  const {player} = useContext(BasicInfoContext)
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [objectives, setObjectives] = useState([]);
  const [BoardPayments, setBoardPayments] = useState([]);

  const season = player.CurrentSeason;

  useEffect(() => {
    try {
      setObjectives(
        database.getAllRows(
          `SELECT * FROM Board_SeasonObjectives
LEFT JOIN Board_Payments ON Board_Payments.SeasonExpectation = Board_SeasonObjectives.TargetPos
LEFT JOIN Finance_TeamBalance ON Finance_TeamBalance.TeamID = Board_SeasonObjectives.TeamID
WHERE SeasonID = ${season}`
        )
      );

      setBoardPayments(database.getAllRows(
        `SELECT * FROM Board_Payments ORDER BY SeasonExpectation ASC`
      ));
    } catch {

    }

  }, [database, season, updated])


  const setBoardPaymentBySlider = (initialValue, targetGap) => {
    database.exec(
      `UPDATE Board_Payments SET Budget = :initialValue - (SeasonExpectation - 1) * :targetGap`, {
        ":initialValue": initialValue,
        ":targetGap": targetGap,
      })
  }

  if (!BoardPayments.length) return null;
  const initialValue = BoardPayments[0].Budget;
  const paymentGap = (BoardPayments[0].Budget - BoardPayments[9].Budget) / 9;
  const minBudgetFor1st = 10000000;
  const maxBudgetFor1st = 180000000;
  const maxGap =  10000000;
  const minGap = -10000000;
  const currentTargetBudget = objectives.find((row) => Number(row.TeamID) === Number(player.TeamID))?.Budget ?? initialValue;

  return (
    <div className="grid gap-3">
      <section className="border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Finance Workspace</div>
            <h2 className="mt-2 text-lg font-bold text-white">Board Payments</h2>
            <p className="mt-2 max-w-[860px] text-sm text-slate-400">
              Tune the season-wide board payout ladder, then adjust each team&apos;s live target and balance in one pass.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:min-w-[340px]">
            <div className="border border-white/10 bg-black/10 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Budget For 1st</div>
              <div className="mt-2 text-xl font-bold text-white">{currencyFormatter.format(initialValue)}</div>
            </div>
            <div className="border border-white/10 bg-black/10 p-4">
              <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Player-Team Monthly</div>
              <div className="mt-2 text-xl font-bold text-white">{currencyFormatter.format(currentTargetBudget / 12.5)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <div className="border border-white/10 bg-white/[0.015] p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Payout Curve</div>
          <div className="mt-1 text-base font-bold text-white">Budget for 1st</div>
          <div className="mt-3">
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Input
                  value={initialValue}
                  size="small"
                  style={{width: 160}}
                  onChange={(event) => {
                    setBoardPaymentBySlider(Number(event.target.value), paymentGap)
                    refresh();
                  }}
                  inputProps={{
                    step: 1000000,
                    min: 0,
                    type: 'number',
                    style: {textAlign: "right"},
                    'aria-labelledby': 'board-payment-initial',
                  }}
                />
              </Grid>
              <Grid item xs>
                <Slider
                  value={initialValue}
                  step={1000000}
                  min={minBudgetFor1st}
                  max={maxBudgetFor1st}
                  onChange={(event, newValue) => {
                    setBoardPaymentBySlider(Number(newValue), paymentGap)
                    refresh();
                  }}
                  aria-labelledby="board-payment-initial"
                />
              </Grid>
            </Grid>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Sets the top end of the board ladder for the current save.
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.015] p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Position Drop-Off</div>
          <div className="mt-1 text-base font-bold text-white">Deduction per extra position</div>
          <div className="mt-3">
            <Grid container spacing={2} alignItems="center">
              <Grid item>
                <Input
                  value={paymentGap}
                  size="small"
                  style={{width: 160}}
                  onChange={(event) => {
                    setBoardPaymentBySlider(initialValue, Number(event.target.value))
                    refresh();
                  }}
                  inputProps={{
                    step: 1000000,
                    type: 'number',
                    style: {textAlign: "right"},
                    'aria-labelledby': 'board-payment-gap',
                  }}
                />
              </Grid>
              <Grid item xs>
                <Slider
                  value={paymentGap}
                  step={100000}
                  min={minGap}
                  max={maxGap}
                  onChange={(event, newValue) => {
                    setBoardPaymentBySlider(initialValue, Number(newValue))
                    refresh();
                  }}
                  aria-labelledby="board-payment-gap"
                />
              </Grid>
            </Grid>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Controls how sharply budget falls away from P1 to P10.
          </div>
        </div>
      </section>

      <section className="border border-white/10 bg-white/[0.015]">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Team Objectives</div>
          <div className="mt-1 text-base font-bold text-white">Season target, live balance, and scheduled board payouts</div>
        </div>
        <div className="min-w-0 overflow-x-auto bg-black/10 p-2">
          <DataGrid
            rows={objectives}
            getRowId={r => r.TeamID}
            onProcessRowUpdateError={e => console.error(e)}
            processRowUpdate={(newRow, oldRow) => {
              if (newRow.Budget !== oldRow.Budget) {
                database.exec(
                  `UPDATE Board_Payments SET Budget = :Budget WHERE SeasonExpectation = :SeasonExpectation`, {
                    ":SeasonExpectation": newRow.TargetPos,
                    ":Budget": newRow.Budget,
                  })
              }
              if (newRow.Balance !== oldRow.Balance) {
                database.exec(
                  `UPDATE Finance_TeamBalance SET Balance = :Balance WHERE TeamID = :TeamID`, {
                    ":Balance": newRow.Balance,
                    ":TeamID": newRow.TeamID,
                  })
              }
              if (newRow.TargetPos !== oldRow.TargetPos && (newRow.TargetPos >= 1 && newRow.TargetPos <= 10)) {
                database.exec(
                  `UPDATE Board_SeasonObjectives SET TargetPos = :TargetPos WHERE TeamID = :TeamID`, {
                    ":TeamID": newRow.TeamID,
                    ":TargetPos": newRow.TargetPos,
                  })
              }
              refresh();
              return newRow;
            }}
            rowHeight={58}
            columnHeaderHeight={44}
            columns={[
              {
                field: 'TeamID',
                headerName: "Team",
                minWidth: 220,
                flex: 1.1,
                renderCell: ({value}) => (
                  <div className="flex h-full items-center">
                    <TeamIdentity TeamID={value} size="sm" textClassName="text-sm" />
                  </div>
                ),
              },
              {
                field: 'Balance',
                headerName: "Team Balance",
                editable: true,
                type: 'number',
                minWidth: 170,
                flex: 1,
                renderCell: ({ value }) => currencyFormatter.format(value),
              },
              {
                field: 'TargetPos',
                headerName: "Season Target",
                editable: true,
                type: 'number',
                minWidth: 130,
                renderCell: ({value}) => formatOrdinal(value),
              },
              {
                field: 'Budget',
                headerName: "Board Budget",
                editable: true,
                type: 'number',
                minWidth: 170,
                flex: 1,
                renderCell: ({ value }) => currencyFormatter.format(value),
              },
              {
                field: '_Budget1',
                headerName: "Initial Payment",
                type: 'number',
                minWidth: 170,
                flex: 1,
                valueGetter: ({ row }) => row.Budget / 12.5 * 1.5,
                renderCell: ({ value }) => currencyFormatter.format(value),
              },
              {
                field: '_Budget2',
                headerName: "Monthly Payment",
                type: 'number',
                minWidth: 170,
                flex: 1,
                valueGetter: ({ row }) => row.Budget / 12.5,
                renderCell: ({ value }) => currencyFormatter.format(value),
              },
            ]}
            hideFooter
            disableRowSelectionOnClick
            sx={{
              border: 0,
              color: "#e5e7eb",
              backgroundColor: "transparent",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 700,
                fontSize: "0.78rem",
                letterSpacing: "0.04em",
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              },
              "& .MuiDataGrid-row:nth-of-type(even)": {
                backgroundColor: "rgba(255,255,255,0.012)",
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "rgba(255,255,255,0.025)",
              },
            }}
          />
        </div>
      </section>
    </div>
  );
}
