import {currencyFormatter} from "@/components/Finance/utils";
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Divider,
  FormControl,
  Grid,
  Input, InputLabel, MenuItem, Select,
  Slider,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  Typography
} from "@mui/material";
import {DataGrid, GridActionsCellItem} from "@mui/x-data-grid";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {TeamName} from "../Localization/Localization";

export default function BoardPayments() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
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

  return (
    <div>
      <Typography variant="h5" component="h5">
        Board Payments
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
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
        columns={[
          {
            field: 'TeamID',
            headerName: "Team",
            width: 120,
            renderCell: ({value}) => <TeamName TeamID={value} type="fanfare"/>,
          },
          {
            field: 'Balance',
            headerName: "Team Balance",
            editable: true,
            type: 'number',
            width: 200,
            // renderCell: ({ value }) => <TeamName TeamID={value} type="fanfare" />,
            renderCell: ({ value }) => currencyFormatter.format(value),
          },
          {
            field: 'TargetPos',
            headerName: "Season Target",
            editable: true,
            type: 'number',
            width: 200,
            renderCell: ({value}) => (
              value + {
                one: "st", two: "nd", few: "rd", other: "th"
              }[new Intl.PluralRules("en", {type: "ordinal"}).select(value)]
            ),
          },
          {
            field: 'Budget',
            headerName: "Board Budget",
            editable: true,
            type: 'number',
            width: 200,
            // renderCell: ({ value }) => <TeamName TeamID={value} type="fanfare" />,
            renderCell: ({ value }) => currencyFormatter.format(value),
          },
          {
            field: '_Budget1',
            headerName: "Initial Payment (1.5x)",
            type: 'number',
            width: 200,
            valueGetter: ({ row }) => row.Budget / 12.5 * 1.5,
            renderCell: ({ value }) => currencyFormatter.format(value),
          },
          {
            field: '_Budget2',
            headerName: "Monthly Payment",
            type: 'number',
            width: 200,
            valueGetter: ({ row }) => row.Budget / 12.5,
            renderCell: ({ value }) => currencyFormatter.format(value),
          },
        ]}
        hideFooter
      />
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={250}>Budget for 1st</TableCell>
            <TableCell>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Input
                    value={initialValue}
                    size="small"
                    style={{width: 150}}
                    onChange={(event) => {
                      setBoardPaymentBySlider(Number(event.target.value), paymentGap)
                      refresh();
                    }}
                    inputProps={{
                      step: 1000000,
                      min: 0,
                      type: 'number',
                      style: {textAlign: "right"},
                      'aria-labelledby': 'input-slider',
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
                    aria-labelledby="input-slider"
                  />
                </Grid>
              </Grid>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={250}>Deduction for Extra Position</TableCell>
            <TableCell>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Input
                    value={paymentGap}
                    size="small"
                    style={{width: 150}}
                    onChange={(event) => {
                      setBoardPaymentBySlider(initialValue, Number(event.target.value))
                      refresh();
                    }}
                    inputProps={{
                      step: 1000000,
                      type: 'number',
                      style: {textAlign: "right"},
                      'aria-labelledby': 'input-slider',
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
                    aria-labelledby="input-slider"
                  />
                </Grid>
              </Grid>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}