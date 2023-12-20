import {
  Button,
  Divider,
  FormControlLabel,
  Grid,
  Input,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "../Contexts";


export default function SportingRegulations() {

  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)
  const basicInfo = useContext(BasicInfoContext);
  const [regulations, setRegulations] = useState({});
  const [regulationDetails, setRegulationDetails] = useState({});
  const [updated, setUpdated] = useState(0);
  const refresh = () => setUpdated(+new Date());

  const { player } = basicInfo;

  useEffect(() => {
    let columns, values;
    try {
      let regulations = {};
      let r = database.exec(`SELECT * FROM Regulations_Enum_Changes`)
      let _rows = [];
      if (r.length) {
        [{columns, values}] = r;
        for (const r of values) {
          let row = {};
          r.map((x, _idx) => {
            row[columns[_idx]] = x
          });
          regulations[row.Name] = row;
        }
      }
      let regulationDetails = {
        pointSchemes: {
          1: {name: "2010–Present", scheme: []},
          2: {name: "2003-2009", scheme: []},
          3: {name: "1991–2002", scheme: []},
        },
        maxPointSchemes: 3,
      }
      r = database.exec(`SELECT * FROM Regulations_NonTechnical_PointSchemes ORDER BY PointScheme ASC, RacePos ASC`)
      _rows = [];
      if (r.length) {
        [{columns, values}] = r;
        for (const [PointScheme, RacePos, Points] of values) {
          if (!regulationDetails.pointSchemes[PointScheme]) {
            regulationDetails.pointSchemes[PointScheme] = {
              name: `Custom Scheme ${PointScheme}`,
              scheme: [],
            }
          }
          /* RacePos is ignored in 2022 and 2023 games */
          regulationDetails.pointSchemes[PointScheme].scheme.push({ RacePos, Points });
          if (regulationDetails.maxPointSchemes < PointScheme) {
            regulationDetails.maxPointSchemes = PointScheme;
          }
        }
      }
      setRegulationDetails(regulationDetails);
      setRegulations(regulations);
    } catch {

    }

  }, [database, updated])

  const allRegulations = [
    {
      name: "Cost Cap ($)",
      id: "SpendingCap",
      step: 1000000,
      type: "range",
    },
    {
      name: "Season Engine Limit",
      id: "EngineLimit",
      step: 1,
      type: "range",
    },
    {
      name: "Season ERS Limit",
      id: "ErsLimit",
      step: 1,
      type: "range",
    },
    {
      name: "Season Gearbox Limit",
      id: "GearboxLimit",
      step: 1,
      type: "range",
    },
    {
      name: "Double Points for Last Race",
      id: "DoubleLastRacePoints",
      type: "switch",
    },
    {
      name: "1 Point for Fastest Lap",
      id: "FastestLapBonusPoint",
      type: "switch",
    },
    {
      name: "1 Point for Pole Position",
      id: "PolePositionBonusPoint",
      type: "switch",
    },
  ]

  if (!regulations.SpendingCap) {
    return null;
  }


  return (
    <div>
      <Typography variant="h5" component="h5">
        Sporting Regulations
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Regulation</TableCell>
            <TableCell>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {
            allRegulations.map(reg => {
              switch (reg.type) {
                case 'switch':
                  return (
                    <TableRow key={reg.id}>
                      <TableCell>{reg.name}</TableCell>
                      <TableCell>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={regulations[reg.id].CurrentValue}
                              onChange={(e, checked) => {
                                database.exec(
                                  `UPDATE Regulations_Enum_Changes SET CurrentValue = ${checked ? 1 : 0} WHERE Name = "${reg.id}"`
                                );
                                refresh();
                              }}
                            />
                          }
                          label={reg.name}
                        />
                      </TableCell>
                    </TableRow>
                  )
                case 'range':
                  return (
                    <TableRow key={reg.id}>
                      <TableCell>{reg.name}</TableCell>
                      <TableCell>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item>
                            <Input
                              value={regulations[reg.id].CurrentValue}
                              size="small"
                              style={{ width: 150 }}
                              onChange={(event) => {
                                const newValue = Number(event.target.value);
                                database.exec(
                                  `UPDATE Regulations_Enum_Changes SET CurrentValue = ${newValue} WHERE Name = "${reg.id}"`
                                );
                                refresh();
                              }}
                              inputProps={{
                                step: reg.step,
                                min: 0,
                                type: 'number',
                                style: { textAlign: "right" },
                                'aria-labelledby': 'input-slider',
                              }}
                            />
                          </Grid>
                          <Grid item xs>
                            <Slider
                              value={regulations[reg.id].CurrentValue}
                              step={reg.step}
                              min={regulations[reg.id].MinValue}
                              max={regulations[reg.id].MaxValue}
                              onChange={(event, newValue) => {
                                database.exec(
                                  `UPDATE Regulations_Enum_Changes SET CurrentValue = ${newValue} WHERE Name = "${reg.id}"`
                                );
                                refresh();
                              }}
                              aria-labelledby="input-slider"
                            />
                          </Grid>
                        </Grid>
                      </TableCell>
                    </TableRow>
                  )
              }
            })
          }
          <TableRow>
            <TableCell>Point System</TableCell>
            <TableCell>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <FormControl variant="standard">
                    <InputLabel id="point-scheme-label">Point System</InputLabel>
                    <Select
                      labelId="point-scheme-label"
                      id="point-scheme"
                      value={regulations.PointScheme.CurrentValue}
                      onChange={(event) => {
                        database.exec(`UPDATE Regulations_Enum_Changes SET CurrentValue = ${event.target.value} WHERE Name = "PointScheme"`);
                        refresh();
                      }}
                      label="System"
                    >
                      {
                        Object.keys(regulationDetails.pointSchemes).map(
                          k => (
                            <MenuItem value={k}>{regulationDetails.pointSchemes[k].name}</MenuItem>
                          )
                        )
                      }
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <Button onClick={() => {
                    const SQL = "INSERT INTO Regulations_NonTechnical_PointSchemes VALUES " +
                      "($, 1, 10), ($, 2, 9), ($, 3, 8), ($, 4, 7), ($, 5, 6), ($, 6, 5), ($, 7, 4), ($, 8, 3), ($, 9, 2), ($, 10, 1);";
                    db.exec(SQL.replaceAll('$', (regulationDetails.maxPointSchemes + 1).toString(10)));
                    database.exec(`UPDATE Regulations_Enum_Changes SET CurrentValue = ${
                      (regulationDetails.maxPointSchemes + 1)
                    } WHERE Name = "PointScheme"`);
                    refresh();
                  }}>
                    Create a new Point System
                  </Button>
                </Grid>
              </Grid>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Point System Details</TableCell>
            <TableCell>
              <Table>
                <TableRow>{
                  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => <TableCell key={x}><b>P{x}</b></TableCell>)
                }</TableRow>
                <TableRow>{
                  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(x => {
                    const currentPointsScheme = regulations.PointScheme.CurrentValue;
                    const currentPosition = regulationDetails.pointSchemes[currentPointsScheme].scheme[x]?.RacePos;
                    const currentPoints = regulationDetails.pointSchemes[currentPointsScheme].scheme[x]?.Points || 0;
                    return (
                      <TableCell key={x}>
                        <Input
                          value={currentPoints}
                          style={{ maxWidth: 60 }}
                          onChange={(event) => {
                            const newValue = Number(event.target.value);
                            database.exec(
                              `UPDATE Regulations_NonTechnical_PointSchemes SET Points = ${
                                newValue
                              } WHERE PointScheme = ${
                                currentPointsScheme
                              } AND RacePos = ${
                                currentPosition
                              }`
                            );
                            refresh();
                          }}
                          inputProps={{
                            step: 1,
                            min: 0,
                            type: 'number',
                            style: { textAlign: "right" },
                            'aria-labelledby': 'input-slider',
                          }}
                        />
                      </TableCell>
                    )
                  })
                }</TableRow>
              </Table>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}