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
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";


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
        partResources: {
        },
        maxPartResources: 0,
        pointSchemes: {
          1: {name: "2010–Present", scheme: []},
          2: {name: "2003-2009", scheme: []},
          3: {name: "1991–2002", scheme: []},
        },
        maxPointSchemes: 3,
      }

      r = database.exec(`SELECT * FROM Regulations_NonTechnical_PointSchemes ORDER BY PointScheme ASC, RacePos ASC`)
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

      r = database.exec(`SELECT * FROM Regulations_NonTechnical_PartResources ORDER BY ResourcePackage ASC, StandingPos ASC`)
      if (r.length) {
        [{columns, values}] = r;
        for (const [ResourcePackage, Pos, WindTunnel, CFD] of values) {
          if (!regulationDetails.partResources[ResourcePackage]) {
            regulationDetails.partResources[ResourcePackage] = {
              name: `Custom Package ${ResourcePackage}`,
              scheme: [],
            }
          }
          /* RacePos is ignored in 2022 and 2023 games */
          regulationDetails.partResources[ResourcePackage].scheme.push({ Pos, WindTunnel, CFD });
          if (regulationDetails.maxPartResources < ResourcePackage) {
            regulationDetails.maxPartResources = ResourcePackage;
          }
        }
      }
      setRegulationDetails(regulationDetails);
      setRegulations(regulations);
    } catch (e) {

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
                              checked={regulations[reg.id].CurrentValue === 1}
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
                            <MenuItem value={k} key={k}>{regulationDetails.pointSchemes[k].name}</MenuItem>
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
                <TableHead>
                  <TableRow>
                    <TableCell><b>Pos</b></TableCell>{
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => <TableCell key={x}><b>P{x}</b></TableCell>)
                  }</TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ width: 150 }}><b>Points</b></TableCell>{
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
                </TableBody>
              </Table>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Wind Tunnel & CFD</TableCell>
            <TableCell>
              <Grid container spacing={2} alignItems="center">
                <Grid item>
                  <FormControl variant="standard">
                    <InputLabel id="point-scheme-label">Resource Package</InputLabel>
                    <Select
                      labelId="point-scheme-label"
                      id="point-scheme"
                      value={regulations.PartDevResourceLimit.CurrentValue}
                      onChange={(event) => {
                        database.exec(`UPDATE Regulations_Enum_Changes SET CurrentValue = ${event.target.value} WHERE Name = "PartDevResourceLimit"`);
                        refresh();
                      }}
                      label="System"
                    >
                      {
                        Object.keys(regulationDetails.partResources).map(
                          k => (
                            <MenuItem value={k} key={k}>{regulationDetails.partResources[k].name}</MenuItem>
                          )
                        )
                      }
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <Button onClick={() => {
                    const SQL = "INSERT INTO Regulations_NonTechnical_PartResources VALUES " +
                      "($, 1, 72, 72), ($, 2, 72, 72), ($, 3, 72, 72), ($, 4, 72, 72)," +
                      " ($, 5, 72, 72), ($, 6, 72, 72), ($, 7, 72, 72), ($, 8, 72, 72)," +
                      " ($, 9, 72, 72), ($, 10, 72, 72);";
                    db.exec(SQL.replaceAll('$', (regulationDetails.maxPartResources + 1).toString(10)));
                    database.exec(`UPDATE Regulations_Enum_Changes SET CurrentValue = ${
                      (regulationDetails.maxPartResources + 1)
                    } WHERE Name = "PartDevResourceLimit"`);
                    refresh();
                  }}>
                    Create a new Resource Package
                  </Button>
                </Grid>
              </Grid>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Resource Package Details</TableCell>
            <TableCell>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><b>Prev Standing</b></TableCell>{
                    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => <TableCell key={x}><b>P{x}</b></TableCell>)
                  }</TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ width: 150 }}><b>Wind Tunnel</b></TableCell>
                    {
                      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(x => {
                        const currentPR = regulations.PartDevResourceLimit.CurrentValue;
                        const currentPosition = regulationDetails.partResources[currentPR].scheme[x]?.Pos;
                        const currentWindTunnel = regulationDetails.partResources[currentPR].scheme[x]?.WindTunnel || 0;
                        return (
                          <TableCell key={x}>
                            <Input
                              value={currentWindTunnel}
                              style={{ maxWidth: 60 }}
                              onChange={(event) => {
                                const newValue = Number(event.target.value);
                                database.exec(
                                  `UPDATE Regulations_NonTechnical_PartResources SET WindTunnelBlocks = ${
                                    newValue
                                  } WHERE ResourcePackage = ${
                                    currentPR
                                  } AND StandingPos = ${
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
                  <TableRow>
                    <TableCell sx={{ width: 150 }}><b>CFD</b></TableCell>
                    {
                      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(x => {
                        const currentPR = regulations.PartDevResourceLimit.CurrentValue;
                        const currentPosition = regulationDetails.partResources[currentPR].scheme[x]?.Pos;
                        const currentCFD = regulationDetails.partResources[currentPR].scheme[x]?.CFD || 0;
                        return (
                          <TableCell key={x}>
                            <Input
                              value={currentCFD}
                              style={{ maxWidth: 60 }}
                              onChange={(event) => {
                                const newValue = Number(event.target.value);
                                database.exec(
                                  `UPDATE Regulations_NonTechnical_PartResources SET CfdBlocks = ${
                                    newValue
                                  } WHERE ResourcePackage = ${
                                    currentPR
                                  } AND StandingPos = ${
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
                </TableBody>
              </Table>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}