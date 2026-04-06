import {
  Button,
  Grid,
  Input,
  Slider,
  Stack,
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

  const updateRegulation = (id, value) => {
    database.exec(`UPDATE Regulations_Enum_Changes SET CurrentValue = ${value} WHERE Name = "${id}"`);
    refresh();
  };


  return (
    <div className="grid gap-2">
      <div className="border border-white/10 bg-white/[0.02] p-5">
        <h2 className="text-xl font-bold text-white">
          Sporting Regulations
        </h2>
        <p className="mt-2 max-w-[920px] text-sm text-slate-400">
          Adjust season-wide sporting rules, points allocation, and aerodynamic testing packages from one workspace.
        </p>
      </div>

      <div className="border border-white/10 bg-white/[0.015] p-5">
        <Typography variant="subtitle1" sx={{fontWeight: 700, mb: 1.5}}>
          Core Rules
        </Typography>
        <Stack spacing={1.5}>
          {allRegulations.filter((reg) => reg.id === "SpendingCap").map((reg) => (
            <div
              key={reg.id}
              className="border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Typography variant="body2" sx={{fontWeight: 700}}>
                    {reg.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={8}>
                  {reg.type === "switch" ? (
                    <Stack direction={{xs: "column", sm: "row"}} spacing={1} alignItems={{xs: "stretch", sm: "center"}}>
                      <div className="inline-grid min-w-[180px] grid-cols-2 overflow-hidden border border-white/10 bg-white/[0.03]">
                        <Button
                          variant={regulations[reg.id].CurrentValue === 1 ? "contained" : "text"}
                          color={regulations[reg.id].CurrentValue === 1 ? "primary" : "inherit"}
                          onClick={() => updateRegulation(reg.id, 1)}
                          sx={{borderRadius: 0, boxShadow: "none"}}
                        >
                          Enabled
                        </Button>
                        <Button
                          variant={regulations[reg.id].CurrentValue === 0 ? "contained" : "text"}
                          color={regulations[reg.id].CurrentValue === 0 ? "inherit" : "inherit"}
                          onClick={() => updateRegulation(reg.id, 0)}
                          sx={{
                            borderRadius: 0,
                            boxShadow: "none",
                            backgroundColor: regulations[reg.id].CurrentValue === 0 ? "rgba(255,255,255,0.08)" : "transparent",
                          }}
                        >
                          Disabled
                        </Button>
                      </div>
                    </Stack>
                  ) : reg.id === "EngineLimit" || reg.id === "ErsLimit" || reg.id === "GearboxLimit" ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        variant="outlined"
                        onClick={() => updateRegulation(reg.id, Math.max(regulations[reg.id].MinValue, regulations[reg.id].CurrentValue - reg.step))}
                      >
                        -
                      </Button>
                      <div className="min-w-24 border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                        <Typography variant="h6" sx={{lineHeight: 1, fontWeight: 700}}>
                          {regulations[reg.id].CurrentValue}
                        </Typography>
                      </div>
                      <Button
                        variant="outlined"
                        onClick={() => updateRegulation(reg.id, Math.min(regulations[reg.id].MaxValue, regulations[reg.id].CurrentValue + reg.step))}
                      >
                        +
                      </Button>
                    </Stack>
                  ) : (
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm="auto">
                        <Input
                          value={regulations[reg.id].CurrentValue}
                          size="small"
                          sx={{width: 160}}
                          onChange={(event) => {
                            const newValue = Number(event.target.value);
                            updateRegulation(reg.id, newValue);
                          }}
                          inputProps={{
                            step: reg.step,
                            min: 0,
                            type: 'number',
                            style: { textAlign: "right" },
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
                            updateRegulation(reg.id, newValue);
                          }}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Grid>
              </Grid>
            </div>
          ))}
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
            {allRegulations.filter((reg) => reg.id !== "SpendingCap").map((reg) => (
              <div
                key={reg.id}
                className="border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <Stack spacing={1.25}>
                  <Typography variant="body2" sx={{fontWeight: 700}}>
                    {reg.name}
                  </Typography>
                  {reg.type === "switch" ? (
                    <Stack spacing={1} alignItems="stretch">
                      <div className="inline-grid grid-cols-2 overflow-hidden border border-white/10 bg-white/[0.03]">
                        <Button
                          variant={regulations[reg.id].CurrentValue === 1 ? "contained" : "text"}
                          color={regulations[reg.id].CurrentValue === 1 ? "primary" : "inherit"}
                          onClick={() => updateRegulation(reg.id, 1)}
                          sx={{borderRadius: 0, boxShadow: "none"}}
                        >
                          Enabled
                        </Button>
                        <Button
                          variant={regulations[reg.id].CurrentValue === 0 ? "contained" : "text"}
                          color="inherit"
                          onClick={() => updateRegulation(reg.id, 0)}
                          sx={{
                            borderRadius: 0,
                            boxShadow: "none",
                            backgroundColor: regulations[reg.id].CurrentValue === 0 ? "rgba(255,255,255,0.08)" : "transparent",
                          }}
                        >
                          Disabled
                        </Button>
                      </div>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        variant="outlined"
                        onClick={() => updateRegulation(reg.id, Math.max(regulations[reg.id].MinValue, regulations[reg.id].CurrentValue - reg.step))}
                      >
                        -
                      </Button>
                      <div className="min-w-[72px] border border-white/10 bg-white/[0.03] px-3 py-3 text-center">
                        <Typography variant="h6" sx={{lineHeight: 1, fontWeight: 700}}>
                          {regulations[reg.id].CurrentValue}
                        </Typography>
                      </div>
                      <Button
                        variant="outlined"
                        onClick={() => updateRegulation(reg.id, Math.min(regulations[reg.id].MaxValue, regulations[reg.id].CurrentValue + reg.step))}
                      >
                        +
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </div>
            ))}
          </div>
        </Stack>
      </div>

      <Stack spacing={2}>
        <div>
          <div className="border border-white/10 bg-white/[0.015] p-5">
            <Typography variant="subtitle1" sx={{fontWeight: 700}}>
              Points System
            </Typography>
            <Typography variant="body2" sx={{mt: 0.25, mb: 1.5, color: "text.secondary"}}>
              Choose the active scoring model and edit the points awarded for each finishing position.
            </Typography>
            <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} alignItems={{xs: "stretch", sm: "center"}} sx={{mb: 2}}>
              <FormControl variant="standard" sx={{minWidth: 220}}>
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
                  {Object.keys(regulationDetails.pointSchemes).map((k) => (
                    <MenuItem value={k} key={k}>{regulationDetails.pointSchemes[k].name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button onClick={() => {
                const SQL = "INSERT INTO Regulations_NonTechnical_PointSchemes VALUES " +
                  "($, 1, 10), ($, 2, 9), ($, 3, 8), ($, 4, 7), ($, 5, 6), ($, 6, 5), ($, 7, 4), ($, 8, 3), ($, 9, 2), ($, 10, 1);";
                database.exec(SQL.replaceAll('$', (regulationDetails.maxPointSchemes + 1).toString(10)));
                database.exec(`UPDATE Regulations_Enum_Changes SET CurrentValue = ${(regulationDetails.maxPointSchemes + 1)} WHERE Name = "PointScheme"`);
                refresh();
              }}>
                Create New Scheme
              </Button>
            </Stack>
            <div className="overflow-x-auto">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Position</TableCell>
                    {regulationDetails.pointSchemes[1].scheme.map((x) => <TableCell key={x.RacePos}><b>P{x.RacePos}</b></TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{fontWeight: 700}}>Points</TableCell>
                    {regulationDetails.pointSchemes[1].scheme.map((_, x) => {
                      const currentPointsScheme = regulations.PointScheme.CurrentValue;
                      const currentPosition = regulationDetails.pointSchemes[currentPointsScheme].scheme[x]?.RacePos;
                      const currentPoints = regulationDetails.pointSchemes[currentPointsScheme].scheme[x]?.Points || 0;
                      return (
                        <TableCell key={x}>
                          <Input
                            value={currentPoints}
                            sx={{maxWidth: 64}}
                            onChange={(event) => {
                              const newValue = Number(event.target.value);
                              database.exec(`UPDATE Regulations_NonTechnical_PointSchemes SET Points = ${newValue} WHERE PointScheme = ${currentPointsScheme} AND RacePos = ${currentPosition}`);
                              refresh();
                            }}
                            inputProps={{step: 1, min: 0, type: 'number', style: { textAlign: "right" }}}
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div>
          <div className="border border-white/10 bg-white/[0.015] p-5">
            <Typography variant="subtitle1" sx={{fontWeight: 700}}>
              Wind Tunnel & CFD
            </Typography>
            <Typography variant="body2" sx={{mt: 0.25, mb: 1.5, color: "text.secondary"}}>
              Select the active aero testing package and edit the allocation by previous championship position.
            </Typography>
            <Stack direction={{xs: "column", sm: "row"}} spacing={1.5} alignItems={{xs: "stretch", sm: "center"}} sx={{mb: 2}}>
              <FormControl variant="standard" sx={{minWidth: 220}}>
                <InputLabel id="resource-package-label">Resource Package</InputLabel>
                <Select
                  labelId="resource-package-label"
                  id="resource-package"
                  value={regulations.PartDevResourceLimit.CurrentValue}
                  onChange={(event) => {
                    database.exec(`UPDATE Regulations_Enum_Changes SET CurrentValue = ${event.target.value} WHERE Name = "PartDevResourceLimit"`);
                    refresh();
                  }}
                  label="System"
                >
                  {Object.keys(regulationDetails.partResources).map((k) => (
                    <MenuItem value={k} key={k}>{regulationDetails.partResources[k].name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button onClick={() => {
                const SQL = "INSERT INTO Regulations_NonTechnical_PartResources VALUES " +
                  Array.from(Array(version <= 3 ? 10 : 11)).map((_, x) => `($, ${x + 1}, 72, 72)`).join(",");
                database.exec(SQL.replaceAll('$', (regulationDetails.maxPartResources + 1).toString(10)));
                database.exec(`UPDATE Regulations_Enum_Changes SET CurrentValue = ${(regulationDetails.maxPartResources + 1)} WHERE Name = "PartDevResourceLimit"`);
                refresh();
              }}>
                Create New Package
              </Button>
            </Stack>
            <div className="overflow-x-auto">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prev Standing</TableCell>
                    {regulationDetails.partResources[1].scheme.map((x) => <TableCell key={x.Pos}><b>P{x.Pos}</b></TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{fontWeight: 700}}>Wind Tunnel</TableCell>
                    {regulationDetails.partResources[1].scheme.map((_, x) => {
                      const currentPR = regulations.PartDevResourceLimit.CurrentValue;
                      const currentPosition = regulationDetails.partResources[currentPR].scheme[x]?.Pos;
                      const currentWindTunnel = regulationDetails.partResources[currentPR].scheme[x]?.WindTunnel || 0;
                      return (
                        <TableCell key={`wt-${x}`}>
                          <Input
                            value={currentWindTunnel}
                            sx={{maxWidth: 64}}
                            onChange={(event) => {
                              const newValue = Number(event.target.value);
                              database.exec(`UPDATE Regulations_NonTechnical_PartResources SET WindTunnelBlocks = ${newValue} WHERE ResourcePackage = ${currentPR} AND StandingPos = ${currentPosition}`);
                              refresh();
                            }}
                            inputProps={{step: 1, min: 0, type: 'number', style: { textAlign: "right" }}}
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{fontWeight: 700}}>CFD</TableCell>
                    {regulationDetails.partResources[1].scheme.map((_, x) => {
                      const currentPR = regulations.PartDevResourceLimit.CurrentValue;
                      const currentPosition = regulationDetails.partResources[currentPR].scheme[x]?.Pos;
                      const currentCFD = regulationDetails.partResources[currentPR].scheme[x]?.CFD || 0;
                      return (
                        <TableCell key={`cfd-${x}`}>
                          <Input
                            value={currentCFD}
                            sx={{maxWidth: 64}}
                            onChange={(event) => {
                              const newValue = Number(event.target.value);
                              database.exec(`UPDATE Regulations_NonTechnical_PartResources SET CfdBlocks = ${newValue} WHERE ResourcePackage = ${currentPR} AND StandingPos = ${currentPosition}`);
                              refresh();
                            }}
                            inputProps={{step: 1, min: 0, type: 'number', style: { textAlign: "right" }}}
                          />
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </Stack>
    </div>
  );
}
