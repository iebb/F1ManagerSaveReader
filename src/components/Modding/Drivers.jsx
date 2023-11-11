import {getDriverCode, getDriverName, resolveDriverCode, resolveName, unresolveDriverCode, unresolveName, teamNames} from "@/js/localization";
import {Autocomplete, Box, Button, Divider, Grid, Modal, TextField, Typography} from "@mui/material";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import * as React from "react";
import {useEffect, useState} from "react";
import {countries} from "../../js/staffNames";

const StaffPerformance = [
  "",
  "",
  "Corn",
  "Brak",
  "Cntl",
  "Smth",
  "Adpt",
  "Ovtk",
  "Dfce",
  "Acel",
  "Accu",
]

export default function DriverView({ database, basicInfo, metadata }) {

  const [rows, setRows] = useState([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [driverCode, setDriverCode] = useState("");
  const [country, setCountry] = useState("");

  const [namePool, setNamePool] = useState([]);
  const [surnamePool, setSurnamePool] = useState([]);
  const [driverCodePool, setDriverCodePool] = useState([]);
  const [surnameMapping, setSurnameMapping] = useState({});

  const [updated, setUpdated] = useState(0);
  const [editRow, _setEditRow] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    let values, columns;
    const names = [];
    const driver_codes = [];
    const surname_codes = {};
    [{ values }] = database.exec(
      "SELECT LocKey FROM Staff_ForenamePool"
    );
    for(const row of values) {
      names.push(resolveName(row[0]))
    }
    [{ values }] = database.exec(
      "SELECT LocKey, DriverCodeLocKey FROM Staff_SurnamePool"
    );
    for(const row of values) {
      names.push(resolveName(row[0]));
      driver_codes.push( resolveDriverCode(row[1]) );
      surname_codes[resolveName(row[0])] = resolveDriverCode(row[1]) ;
    }
    try {
      [{ values }] = database.exec(
        "SELECT LastName, DriverCode FROM Staff_DriverData_View ORDER BY StaffID DESC"
      );
      for(const row of values) {
        names.push(resolveName(row[0]));
        driver_codes.push( resolveDriverCode(row[1]) );
        surname_codes[resolveName(row[0])] = resolveDriverCode(row[1]);
      }

    } catch {

    }
    setNamePool([...new Set(names.sort())])
    setDriverCodePool([...new Set(driver_codes.sort())])
    setSurnameMapping(surname_codes)

    const PerformanceStats = {};
    [{ columns, values }] = database.exec(
      "SELECT * FROM Staff_PerformanceStats"
    );
    for(const row of values) {
      if (!PerformanceStats[row[0]]) {
        PerformanceStats[row[0]] = {};
      }
      PerformanceStats[row[0]][row[1]] = row[2];
    }

    [{ columns, values }] = database.exec(
      "SELECT Staff_DriverData.StaffID as StaffID, * from Staff_DriverData \n" +
      "LEFT JOIN Staff_BasicData on Staff_BasicData.StaffID = Staff_DriverData.StaffID\n" +
      "LEFT JOIN Staff_GameData on Staff_GameData.StaffID = Staff_DriverData.StaffID\n" +
      "LEFT JOIN Staff_Contracts on Staff_Contracts.StaffID = Staff_DriverData.StaffID AND Staff_Contracts.ContractType = 0\n"
    );

    setRows(values.map(val => {
      let row = {};
      val.map((x, _idx) => {
        if (x !== null) row[columns[_idx]] = x;
      })
      row.performanceStats = PerformanceStats[row.StaffID];
      return row;
    }));


  }, [database, updated])

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });


  const setEditRow = (r) => {
    if (r) {
      setStats({...r.performanceStats});
      setFirstName(resolveName(r.FirstName));
      setLastName(resolveName(r.LastName));
      setDriverCode(resolveDriverCode(r.DriverCode));
      setCountry(r.Nationality);
    }

    _setEditRow(r);
  }



  return (
    <div>
      {editRow !== null && (
        <Modal
          open={editRow !== null}
          onClose={() => setEditRow(null)}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
        >
          <Box style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#333',
            border: '2px solid #000',
            boxShadow: 24,
            padding: 15,
            borderRadius: 20,
          }}>
            <Typography id="modal-modal-title" variant="h6" component="h2">
              Editing {getDriverName(editRow)}
            </Typography>

            <Divider variant="fullWidth" sx={{ my: 2 }} />

            <div>
              <Autocomplete
                disablePortal
                options={namePool}
                value={firstName}
                sx={{ width: 200, m: 1, display: "inline-block" }}
                onChange={ (e, nv) => {
                  if (nv) {
                    setFirstName(nv);
                  }
                }}
                renderInput={(params) => <TextField {...params} label="First Name" autocomplete="off" />}
              />
              <Autocomplete
                disablePortal
                options={namePool}
                value={lastName}
                sx={{ width: 200, m: 1, display: "inline-block" }}
                onChange={ (e, nv) => {
                  if (nv) {
                    setLastName(nv);
                    setDriverCode(surnameMapping[nv])
                  }
                } }
                renderInput={(params) => <TextField {...params} label="Last Name" autocomplete="off" />}
              />
              <Autocomplete
                disablePortal
                options={driverCodePool}
                value={driverCode}
                sx={{ width: 120, m: 1, display: "inline-block" }}
                onInputChange={ (e, nv) => {
                  if (nv) {
                    setDriverCode(nv);
                  }
                }}
                renderInput={(params) => <TextField {...params} label="Code" autocomplete="off" />}
              />
            </div>
            <Grid direction="row-reverse" container spacing={1}>
              <Grid item>
                <Button color="warning" variant="contained" sx={{ m: 1 }} onClick={() => {
                  const _firstName = unresolveName(firstName);
                  const _lastName = unresolveName(lastName);
                  const _driverCode = unresolveDriverCode(driverCode);
                  database.exec(`UPDATE Staff_BasicData SET FirstName = "${_firstName}", LastName = "${_lastName}", Nationality = "${country}" WHERE StaffID = ${editRow.StaffID}`);
                  database.exec(`UPDATE Staff_DriverData SET DriverCode = "${_driverCode}" WHERE StaffID = ${editRow.StaffID}`);
                  setUpdated(+new Date());
                }}>Save Names</Button>
              </Grid>
              <Grid item>
              </Grid>
              <Grid item style={{ flex: 1 }}>
                <Autocomplete
                  disablePortal
                  options={countries}
                  value={country}
                  sx={{ width: 200, m: 1, display: "inline-block" }}
                  onChange={ (e, nv) => {
                    if (nv) {
                      setCountry(country);
                    }
                  }}
                  renderInput={(params) => <TextField {...params} label="Country" autocomplete="off" />}
                />
              </Grid>
            </Grid>


            <Divider variant="fullWidth" sx={{ my: 2 }} />

            <div style={{ display: "grid",
              gridTemplateColumns: 'repeat(5, 1fr)' }}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => (
                <div key={x} style={{ margin: 10 }}>
                  <TextField
                    sx={{ width: 90 }}
                    label={StaffPerformance[x]}
                    type="number"
                    value={stats[x]}
                    variant="standard"
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]+', step: 1, max: 100, min: 0 }}
                    onChange={
                      (e) => {
                        if (e.target.value <= 100 && e.target.value >= 0) {
                          stats[x] = Number(e.target.value);
                        } else if (e.target.value > 100) {
                          stats[x] = 100;
                        } else {
                          stats[x] = 0;
                        }
                        setStats({...stats});
                      }
                    }
                  />
                </div>
              ))}

              <div style={{ margin: 10 }}>
                <Button color="warning" variant="contained" sx={{ m: 1 }} onClick={() => {
                  [2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => {
                    database.exec(`UPDATE Staff_PerformanceStats SET Val = ${stats[x]} WHERE StaffID = ${editRow.StaffID} AND StatID = ${x}`);
                  })
                  setUpdated(+new Date());
                }}>Save</Button>
              </div>
            </div>
          </Box>
        </Modal>
      )}
      <Typography variant="h5" component="h5">
        Driver Database
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Driver</TableCell>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => (
                <TableCell key={x}>
                  {StaffPerformance[x]}
                </TableCell>
              ))}
              <TableCell>Retirement</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Contract</TableCell>
              <TableCell>Commands</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
                const retirementInYears = Math.ceil(row.RetirementAge - (basicInfo.player.Day - row.DOB) / 365.25);
                const extendedRetirementAge = retirementInYears < 5 ? row.RetirementAge + 5 - retirementInYears : row.RetirementAge;

                return (
                  <TableRow
                    key={`${row.StaffID}`}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell component="th" scope="row">
                      {
                        getDriverName(row)
                      }
                      <br />
                      <sub>{getDriverCode(row)}</sub>
                    </TableCell>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => (
                      <TableCell key={x}>
                        {row.performanceStats[x]}
                      </TableCell>
                    ))}
                    <TableCell>
                      <span
                        style={{ color: retirementInYears > 0 ? "white" : "orange" }}
                      >{retirementInYears > 0 ? `in ${retirementInYears} years` : `${-retirementInYears} years ago`}</span>
                      <br />
                      {
                        retirementInYears < 5 && (
                          <a style={{ color: "lightblue" }} onClick={() => {
                            database.exec(`UPDATE Staff_GameData SET RetirementAge = RetirementAge + 5 - ${retirementInYears} WHERE StaffID = ${row.StaffID}`);
                            setUpdated(+new Date());
                          }}>postpone</a>
                        )
                      }
                    </TableCell>
                    {
                      row.Retired ? (
                        <>
                          <TableCell>
                            Retired
                          </TableCell>
                          <TableCell>
                            <Button color="error" variant="contained" onClick={() => {
                              database.exec(`UPDATE Staff_GameData SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${row.StaffID}`);
                              setUpdated(+new Date());
                            }}>Unretire</Button>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          {
                            row.TeamID ? (
                              <>
                                <TableCell>
                                  {teamNames(row.TeamID, metadata.version)}<br /><sub>Driver {row.PosInTeam}</sub>
                                </TableCell>
                                <TableCell>
                                  {formatter.format(row.Salary)}<br /><sub>until {row.EndSeason}</sub>
                                </TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell colspan={2}>
                                  Not contracted
                                </TableCell>
                              </>
                            )
                          }
                        </>
                      )
                    }
                    <TableCell>
                      <Button variant="contained" sx={{ m: 1 }} onClick={
                        () => setEditRow(row)
                      }>Edit Stats</Button>
                    </TableCell>
                  </TableRow>
                )
              }

            )

            }

          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}