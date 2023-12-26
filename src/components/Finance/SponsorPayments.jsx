import {currencyFormatter} from "@/components/Finance/utils";
import {statRenderer} from "@/components/Parts/consts_2023";
import KeyboardDoubleArrowDownIcon from '@mui/icons-material/KeyboardDoubleArrowDown';
import KeyboardDoubleArrowUpIcon from '@mui/icons-material/KeyboardDoubleArrowUp';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert, AlertTitle,
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

export default function SponsorPayments() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const {player, currentSeasonRaces} = useContext(BasicInfoContext)
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const [prestiges, setPrestiges] = useState([]);
  const [SponsorshipValues, setSponsorshipValues] = useState([]);

  const season = player.CurrentSeason;

  const races = {
    2: 22,
    3: 23
  }[version]; // based on original race count

  useEffect(() => {
    const sponsorValues = database.getAllRows(`SELECT * FROM Sponsorship_Values ORDER BY "StandingPosition" ASC`);
    setSponsorshipValues(sponsorValues);
    const sponsorConsts =  database.getAllRows(`SELECT * FROM Sponsorship_Constants`)[0];
    const { LumpSumPercentage, MerchandiseCostRatio } = sponsorConsts;

    // const prestigeCY = {};
    // database.getAllRows(
    //   `SELECT Board_Prestige.TeamID, PtsFromConstructorResults + PtsFromDriverResults + PtsFromSeasonsEntered + PtsFromChampionshipsWon AS Prestige,
    //              PtsFromConstructorResults, PtsFromDriverResults, PtsFromSeasonsEntered, PtsFromChampionshipsWon
    //              FROM Board_Prestige WHERE ( SeasonID = ${season} ) ORDER BY Prestige DESC`
    // ).map((x, _idx) => {
    //   prestigeCY[x.TeamID] ={
    //     ...x,
    //     Rank: _idx + 1,
    //   }
    // });
    setPrestiges(
      database.getAllRows(
        `SELECT Board_Prestige.TeamID, PtsFromConstructorResults + PtsFromDriverResults + PtsFromSeasonsEntered + PtsFromChampionshipsWon AS Prestige,
                   PtsFromConstructorResults, PtsFromDriverResults, PtsFromSeasonsEntered, PtsFromChampionshipsWon,
                   ObligationReward, MerchandiseNum, MerchReward
                   FROM Board_Prestige LEFT JOIN (
                     SELECT TeamID, SUM(Quantity * UnitReward) as ObligationReward
                     FROM Sponsorship_ContractObligations LEFT JOIN Sponsorship_Enum_Obligations
                     ON Sponsorship_ContractObligations.ObligationID = Sponsorship_Enum_Obligations.ObligationID
                     WHERE Accepted = 1 AND Sponsorship_ContractObligations.ObligationID != 7 GROUP BY TeamID ORDER BY TeamID ASC
                  ) ob1 ON ob1.TeamID = Board_Prestige.TeamID
                   LEFT JOIN (
                     SELECT TeamID, SUM(Quantity * UnitReward) as MerchReward, SUM(Quantity) as MerchandiseNum
                     FROM Sponsorship_ContractObligations LEFT JOIN Sponsorship_Enum_Obligations
                     ON Sponsorship_ContractObligations.ObligationID = Sponsorship_Enum_Obligations.ObligationID
                     WHERE Accepted = 1 AND Sponsorship_ContractObligations.ObligationID = 7 GROUP BY TeamID ORDER BY TeamID ASC
                  ) ob2 ON ob2.TeamID = Board_Prestige.TeamID WHERE ( SeasonID = ${season - 1} ) ORDER BY Prestige DESC`
      ).map((x, _idx) => {

        const SponsorPackage = sponsorValues[_idx].SponsorValue;
        const LumpSum = SponsorPackage * LumpSumPercentage * 0.01;
        const MerchandiseCost = x.MerchReward * (
          sponsorValues[_idx].SponsorValue / sponsorValues[0].SponsorValue
        ) * MerchandiseCostRatio;
        const PackagePR = Math.floor((SponsorPackage - LumpSum) / races);
        const MerchandisePR = Math.floor(MerchandiseCost * 1.5 / races);
        const LumpSumRounded = LumpSum + ((SponsorPackage - LumpSum) - PackagePR * races) + (MerchandiseCost * 1.5 - MerchandisePR * races);

        return {
          ...x,
          Rank: _idx + 1,
          SponsorPackage,
          ObligationReward: x.ObligationReward * sponsorValues[_idx].SponsorValue / sponsorValues[0].SponsorValue,
          LumpSum: LumpSumRounded,
          LumpSumAdjusted: LumpSumRounded - MerchandiseCost,
          Merchandise: MerchandiseCost * 0.5,
          MerchandiseCost,
          PackagePR,
          MerchandisePR,
          TotalPR: PackagePR + MerchandiseCost * 1.5 / races,
        }
      })
    );

  }, [database, season, updated])


  const setSponsorshipValueBySlider = (initialValue, targetGap) => {
    database.exec(
      `UPDATE Sponsorship_Values SET SponsorValue = ROUND((:initialValue - (StandingPosition - 1) * :targetGap) / 10000, 0) * 10000`, {
        ":initialValue": initialValue,
        ":targetGap": targetGap,
      })
  }

  if (!SponsorshipValues.length) return null;
  const initialValue = SponsorshipValues[0].SponsorValue;
  const paymentGap = Math.round((SponsorshipValues[0].SponsorValue - SponsorshipValues[9].SponsorValue) / 9);
  const minSponsorValueFor1st = 5000000;
  const maxSponsorValueFor1st = 200000000;
  const maxGap =  10000000;
  const minGap = -10000000;


  return (
    <div>
      <Typography variant="h5" component="h5">
        Sponsor Payments ({races} Races)
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      {
        currentSeasonRaces.length !== races && (
          <Alert severity="warning" sx={{ my: 2 }}>
            <AlertTitle>Warning</AlertTitle>
            Per-race income would not change even if you have a calendar different than {races} races. That would result in additional funding for extra races.
          </Alert>
        )
      }
      <DataGrid
        rows={prestiges}
        getRowId={r => r.TeamID}
        onProcessRowUpdateError={e => console.error(e)}
        processRowUpdate={(newRow, oldRow) => {
          if (newRow.SponsorPackage !== oldRow.SponsorPackage) {
            database.exec(
              `UPDATE Sponsorship_Values SET SponsorValue = :SponsorPackage WHERE StandingPosition = :StandingPosition`, {
                ":StandingPosition": newRow.Rank,
                ":SponsorPackage": newRow.SponsorPackage,
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
            field: 'Prestige',
            headerName: `Prestige ${season-1}`,
            width: 150,
            align: "right",
            headerAlign: "right",
            // renderCell: ({ value }) => <TeamName TeamID={value} type="fanfare" />,
            renderCell: ({ value, row }) => <div>
              <span>{value} / {row.Rank + {
                one: "st", two: "nd", few: "rd", other: "th"
              }[new Intl.PluralRules("en", {type: "ordinal"}).select(row.Rank)]}</span>
            </div>,
          },
          {
            field: 'SponsorPackage',
            headerName: "Sponsor Package",
            editable: true,
            type: 'number',
            width: 200,
            renderCell: ({ value, row }) => (
              <div style={{textAlign: "right", padding: 6}}>
                <span>+{currencyFormatter.format(value)}</span>
                <br/>
                <span style={{
                  fontSize: 12, color: "#777"
                }}>for {row.Rank + {
                  one: "st", two: "nd", few: "rd", other: "th"
                }[new Intl.PluralRules("en", {type: "ordinal"}).select(row.Rank)]}</span>
              </div>
            ),
          },
          {
            field: 'LumpSumAdjusted',
            headerName: "Lump Sum",
            type: 'number',
            align: "right",
            headerAlign: "right",
            width: 150,
            renderCell: ({ value, row }) => (
              <div style={{textAlign: "right", padding: 6}}>
                <span>+{currencyFormatter.format(value)}</span>
              </div>
            ),
          },
          {
            field: 'Merchandise',
            headerName: "Merch Income / Cost",
            type: 'number',
            width: 200,
            renderCell: ({ value, row }) => (
              <div style={{textAlign: "right", padding: 6}}>
                <span>+{currencyFormatter.format(value)}</span>
                <br/>
                <span style={{
                  fontSize: 12, color: "#777"
                }}>Merch x{row.MerchandiseNum || 0}: -{currencyFormatter.format(row.MerchandiseCost)}</span>
              </div>
            ),
          },
          {
            field: 'ObligationReward',
            headerName: "Obligations Income",
            type: 'number',
            width: 150,
            renderCell: ({ value }) => "+" + currencyFormatter.format(value),
          },
          {
            field: 'PackagePR',
            headerName: "Sponsor/Race",
            type: 'number',
            width: 150,
            renderCell: ({ value, row }) => (
              <div>
                <span>+{currencyFormatter.format(value)}</span>
              </div>
            ),
          },
          {
            field: 'MerchandisePR',
            headerName: "Merch/Race",
            type: 'number',
            width: 150,
            renderCell: ({ value, row }) => (
              <div>
                <span>+{currencyFormatter.format(value)}</span>
              </div>
            ),
          },
          {
            field: 'TotalPR',
            headerName: "Total Income/Race",
            type: 'number',
            width: 150,
            renderCell: ({ value, row }) => (
              <div>
                <span>+{currencyFormatter.format(value)}</span>
              </div>
            ),
          },
        
        ]}
        hideFooter
      />
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={250}>Sponsor Package for 1st</TableCell>
            <TableCell>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <Input
                    value={initialValue}
                    size="small"
                    style={{width: 150}}
                    onChange={(event) => {
                      setSponsorshipValueBySlider(Number(event.target.value), paymentGap)
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
                    min={minSponsorValueFor1st}
                    max={maxSponsorValueFor1st}
                    onChange={(event, newValue) => {
                      setSponsorshipValueBySlider(Number(newValue), paymentGap)
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
                      setSponsorshipValueBySlider(initialValue, Number(event.target.value))
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
                    step={1000000 / 3}
                    min={minGap}
                    max={maxGap}
                    onChange={(event, newValue) => {
                      setSponsorshipValueBySlider(initialValue, Number(newValue))
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