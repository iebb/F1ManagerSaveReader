import {getDriverCode, getDriverName, resolveDriverCode, resolveName, unresolveDriverCode, unresolveName, teamNames} from "@/js/localization";
import {Autocomplete, Box, Button, Divider, Grid, Modal, TextField, Typography} from "@mui/material";
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import {DataGrid} from "@mui/x-data-grid";
import * as React from "react";
import {useEffect, useState} from "react";
import {countries} from "../../js/staffNames";
import {assignRandomRaceNumber, getDrivers, swapDriverContracts} from "./commons/drivers";
import ContractSwapper from "./subcomponents/ContractSwapper";

const StaffPerformance = [
  "Impr",
  "Aggr", // hack
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

const StaffPerformanceLong = [
  "Improvability",
  "Aggression", // hack
  "Cornering",
  "Braking",
  "Control",
  "Smoothness",
  "Adaptability",
  "Overtaking",
  "Defence",
  "Acceleration",
  "Accuracy",
]

const driverNumbers = ["N/A"];
for(let i = 0; i < 100; i++) {
  driverNumbers.push(i);
}

export default function DriverView(ctx) {

  const { database, basicInfo, metadata } = ctx;

  const [rows, setRows] = useState([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [driverCode, setDriverCode] = useState("");
  const [country, setCountry] = useState("");
  const [driverNumber, setDriverNumber] = useState("");

  const [namePool, setNamePool] = useState([]);
  const [driverCodePool, setDriverCodePool] = useState([]);
  const [surnameMapping, setSurnameMapping] = useState({});



  const [updated, setUpdated] = useState(0);
  const [editRow, _setEditRow] = useState(null);
  const [swapRow, setSwapRow] = useState(null);
  const [stats, setStats] = useState({});


  const refresh = () => setUpdated(+new Date());

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
        "SELECT LastName, DriverCode, FirstName FROM Staff_DriverData_View ORDER BY StaffID DESC"
      );
      for(const row of values) {
        names.push(resolveName(row[0]));
        names.push(resolveName(row[2]));
        driver_codes.push( resolveDriverCode(row[1]) );
        surname_codes[resolveName(row[0])] = resolveDriverCode(row[1]);
      }

    } catch {

    }
    try {
      [{ values }] = database.exec(
        "SELECT FirstName, LastName FROM Staff_BasicData ORDER BY StaffID DESC"
      );
      for(const row of values) {
        names.push(resolveName(row[0]));
        names.push(resolveName(row[1]));
      }

    } catch {

    }
    setNamePool([...new Set(names.sort())])
    setDriverCodePool([...new Set(driver_codes.sort())])
    setSurnameMapping(surname_codes)

  }, [database])

  useEffect(() => {
    setRows(getDrivers(ctx));
  }, [database, updated])

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });


  const setEditRow = (r) => {
    if (r) {
      setStats({...r.performanceStats, 0: r.Improvability, 1: r.Aggression});
      setFirstName(resolveName(r.FirstName));
      setLastName(resolveName(r.LastName));
      setDriverCode(resolveDriverCode(r.DriverCode));
      setCountry(r.Nationality);
      setDriverNumber(r.CurrentNumber ? r.CurrentNumber : "N/A");
    }

    _setEditRow(r);
  }



  return (
    <div>

      {editRow !== null &&
        (
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
                  sx={{ width: 160, m: 1, display: "inline-block" }}
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


                    const haveDriverNumber = !(driverNumber === "N/A" || driverNumber === "");
                    const _driverNumber = haveDriverNumber ? driverNumber : "";
                    if (haveDriverNumber) {
                      if (_driverNumber != 1) {
                        database.exec(`UPDATE Staff_DriverData SET LastKnownDriverNumber = "${_driverNumber}" WHERE StaffID = ${editRow.StaffID}`);
                      }
                      database.exec(`UPDATE Staff_DriverNumbers SET CurrentHolder = NULL WHERE CurrentHolder = ${editRow.StaffID}`);
                      database.exec(`INSERT OR REPLACE INTO Staff_DriverNumbers VALUES(${_driverNumber}, ${editRow.StaffID})`);
                    } else {
                      database.exec(`UPDATE Staff_DriverNumbers SET CurrentHolder = NULL WHERE CurrentHolder = ${editRow.StaffID}`);
                    }
                    refresh();
                  }}>Save Profile</Button>
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
                        setCountry(nv);
                      }
                    }}
                    renderInput={(params) => <TextField {...params} label="Country" autocomplete="off" />}
                  />
                  <Autocomplete
                    disablePortal
                    options={driverNumbers}
                    value={driverNumber}
                    sx={{ width: 160, m: 1, display: "inline-block" }}
                    onInputChange={ (e, nv) => {
                      if (nv) {
                        setDriverNumber(nv);
                      }
                    }}
                    renderInput={(params) => <TextField {...params} label="Number" autocomplete="off" />}
                  />
                </Grid>
              </Grid>


              <Divider variant="fullWidth" sx={{ my: 2 }} />

              <div style={{ display: "grid",
                gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 0, 1].map(x => (
                  <div key={x} style={{ margin: 10 }}>
                    <TextField
                      sx={{ width: 90 }}
                      label={StaffPerformanceLong[x]}
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
                  <Button variant="contained" sx={{ m: 1 }} onClick={() => {
                    [2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => {
                      database.exec(`UPDATE Staff_PerformanceStats SET Val = ${stats[x]} WHERE StaffID = ${editRow.StaffID} AND StatID = ${x}`);
                    })

                    database.exec(`UPDATE Staff_DriverData SET Improvability = ${stats[0]}, Aggression = ${stats[1]} WHERE StaffID = ${editRow.StaffID}`);
                    setUpdated(+new Date());
                  }}>Save Stats</Button>
                </div>
              </div>

              <Divider variant="fullWidth" sx={{ my: 2 }} />

              <div style={{ margin: 10 }}>
                {
                  editRow.Retired ? (
                    <Button color="error" variant="contained" onClick={() => {
                      database.exec(`UPDATE Staff_GameData SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${editRow.StaffID}`);
                      setUpdated(+new Date());
                    }}>Unretire</Button>
                  ) : (
                    <Button color="error" variant="contained" onClick={() => {
                      database.exec(`UPDATE Staff_GameData SET Retired = 1 WHERE StaffID = ${editRow.StaffID}`);
                      setUpdated(+new Date());
                    }}>Retire</Button>
                  )
                }
              </div>
            </Box>
          </Modal>
        )}

      <ContractSwapper {...ctx} swapRow={swapRow} setSwapRow={setSwapRow} refresh={refresh} />
      <Typography variant="h5" component="h5">
        Driver Database
      </Typography>
      <Divider variant="fullWidth" sx={{ my: 2 }} />
      <DataGrid
        rows={rows}
        getRowId={r => r.StaffID}
        columns={[
          {
            field: 'CurrentNumber',
            headerName: '#',
            valueGetter: ({ row }) => row.CurrentNumber || 99999,
            width: 40,
            renderCell: ({ row }) => {
              return (
                <div style={{ fontSize: "90%" }}>
                  {
                    row.CurrentNumber
                  }
                  <br />
                  {
                    getDriverCode(row)
                  }
                </div>
              )
            }
          },
          {
            field: 'StaffID',
            headerName: 'Name',
            width: 150,
            renderCell: ({ row }) => {
              return (
                <div>
                  {resolveName(row.FirstName)}
                  <br />
                  {resolveName(row.LastName)}
                </div>
              )
            }
          },
          ...[2, 3, 4, 5, 6, 7, 8, 9, 10].map(x => (
            {
              field: 'performanceStats.' + x , headerName: StaffPerformance[x], width: 25,
              renderCell: ({ row }) => row.performanceStats[x],
            }
          )),
          {
            field: 'Improvability' , headerName: "Impr", width: 25,
          },
          {
            field: 'Aggression' , headerName: "Aggr", width: 25,
          },
          {
            field: 'Retirement',
            headerName: 'Retirement',
            width: 150,
            renderCell: ({ row }) => {
              const retirementInYears = Math.ceil(row.RetirementAge - (basicInfo.player.Day - row.DOB) / 365.25);
              const extendedRetirementAge = retirementInYears < 5 ? row.RetirementAge + 5 - retirementInYears : row.RetirementAge;
              return (
                row.Retired ? (
                  <div>
                    <span style={{ color: "#ff7777" }}>retired</span>
                    <br />
                    <a style={{ color: "lightblue" }} onClick={() => {
                      database.exec(`UPDATE Staff_GameData SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${row.StaffID}`);
                      setUpdated(+new Date());
                    }}>unretire</a>
                  </div>
                ) : (
                  <div>
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
                  </div>
                )
              )
            }
          },
          {
            field: 'TeamID',
            headerName: 'Team',
            width: 200,
            valueGetter: ({ row }) => row.TeamID || 99999,
            renderCell: ({ row }) => {
              return row.TeamID ? (
                <div>
                  {teamNames(row.TeamID, metadata.version)}<br /><sub>Driver {row.PosInTeam}</sub>
                </div>
              ) : (
                "-"
              )
            }
          },
          {
            field: 'Salary',
            headerName: 'Contract',
            width: 150,
            renderCell: ({ row }) => {
              return row.TeamID ? (
                <div>
                  {formatter.format(row.Salary)}<br /><sub>until {row.EndSeason}</sub>
                </div>
              ) : (
                "Not contracted"
              )
            }
          },
          {
            field: 'ID',
            headerName: 'Edit',
            width: 200,
            renderCell: ({ row }) => {
              return (
                <div>
                  <a onClick={
                    () => setEditRow(row)
                  }>edit driver</a><br />
                  {
                    row.TeamID && <a onClick={
                      () => setSwapRow(row)
                    }>swap contracts</a>
                  }
                </div>
              )
            }
          },

        ]}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 20 },
          },
        }}
        pageSizeOptions={[20, 50, 100]}
      />
    </div>
  );
}