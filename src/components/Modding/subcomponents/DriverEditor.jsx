import {getDriverName, resolveDriverCode, resolveName, unresolveDriverCode, unresolveName} from "@/js/localization";
import {Autocomplete, Box, Button, Divider, Grid, Modal, TextField, Typography} from "@mui/material";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {countries} from "../../../js/staffNames";
import {BasicInfoContext, DatabaseContext, MetadataContext, VersionContext} from "../../Contexts";


const driverNumbers = ["N/A"];
for(let i = 0; i < 100; i++) {
  driverNumbers.push(i);
}
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

export default function DriverEditor(props) {
  const { editRow, setEditRow, refresh } = props;
  const database = useContext(DatabaseContext);
  const version = useContext(VersionContext);
  const metadata = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);

  const ctx = { database, version, basicInfo };


  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [driverCode, setDriverCode] = useState("");
  const [country, setCountry] = useState("");
  const [driverNumber, setDriverNumber] = useState("");
  const [stats, setStats] = useState({});

  const [namePool, setNamePool] = useState([]);
  const [driverCodePool, setDriverCodePool] = useState([]);
  const [surnameMapping, setSurnameMapping] = useState({});


  useEffect(() => {
    if (editRow) {
      setStats({...editRow.performanceStats, 0: editRow.Improvability, 1: editRow.Aggression});
      setFirstName(resolveName(editRow.FirstName));
      setLastName(resolveName(editRow.LastName));
      setCountry(editRow.Nationality);
      setDriverCode(resolveDriverCode(editRow.DriverCode));
      setDriverNumber(editRow.CurrentNumber ? editRow.CurrentNumber : "N/A");
    }
  }, [editRow])



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
      if (version === 2) {
        [{ values }] = database.exec(
          "SELECT FirstName, LastName FROM Staff_BasicData ORDER BY StaffID DESC"
        );
      } else {
        [{ values }] = database.exec(
          "SELECT FirstName, LastName FROM Staff_CommonData ORDER BY StaffID DESC"
        );
      }

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

  if (!editRow) return null;

  return (
    <Modal
      open={editRow}
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
            renderInput={(params) => <TextField {...params} label="First Name" autoComplete="off" />}
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
            renderInput={(params) => <TextField {...params} label="Last Name" autoComplete="off" />}
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
            renderInput={(params) => <TextField {...params} label="Code" autoComplete="off" />}
          />
        </div>
        <Grid direction="row-reverse" container spacing={1}>
          <Grid item>
            <Button color="warning" variant="contained" sx={{ m: 1 }} onClick={() => {
              const _firstName = unresolveName(firstName);
              const _lastName = unresolveName(lastName);
              const _driverCode = unresolveDriverCode(driverCode);

              if (version === 2) {
                database.exec(`UPDATE Staff_CommonData SET FirstName = "${_firstName}", LastName = "${_lastName}", Nationality = "${country}" WHERE StaffID = ${editRow.StaffID}`);
              } else {
                database.exec(`UPDATE Staff_BasicData SET FirstName = "${_firstName}", LastName = "${_lastName}", Nationality = "${country}" WHERE StaffID = ${editRow.StaffID}`);
              }

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
              renderInput={(params) => <TextField {...params} label="Country" autoComplete="off" />}
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
              renderInput={(params) => <TextField {...params} label="Number" autoComplete="off" />}
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
              refresh();
            }}>Save Stats</Button>
          </div>
        </div>

        <Divider variant="fullWidth" sx={{ my: 2 }} />

        <div style={{ margin: 10 }}>
          {
            editRow.Retired ? (
              <Button color="error" variant="contained" onClick={() => {
                database.exec(`UPDATE Staff_GameData SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${editRow.StaffID}`);
                refresh();
              }}>Unretire</Button>
            ) : (
              <Button color="error" variant="contained" onClick={() => {
                database.exec(`UPDATE Staff_GameData SET Retired = 1 WHERE StaffID = ${editRow.StaffID}`);
                refresh();
              }}>Retire</Button>
            )
          }
        </div>
      </Box>
    </Modal>
  )
}