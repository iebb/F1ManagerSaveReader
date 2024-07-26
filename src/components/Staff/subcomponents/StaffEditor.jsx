import {
  getDriverName,
  resolveDriverCode,
  resolveName,
  resolveNameV4,
  unresolveDriverCode,
  unresolveName
} from "@/js/localization";
import {
  Autocomplete,
  Box,
  Button,
  Divider, FormControl,
  FormControlLabel,
  Grid, MenuItem,
  Modal, Select,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import InputLabel from "@mui/material/InputLabel";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {countries} from "@/js/localization/staffNames";
import {DatabaseContext, MetadataContext} from "@/js/Contexts";


const driverNumbers = ["N/A"];
for(let i = 0; i < 100; i++) {
  driverNumbers.push(`${i}`);
}

const faceTypes = [
  "🏻 European",
  "🏿 African",
  "🏼 Latin",
  "🏾 South Asian",
  "🏽 East Asian",
]

const faceCount = [
  [35, 10],
  [25, 10],
  [25, 10],
  [25, 10],
  [25, 10],
]


export default function StaffEditor(props) {
  const { editRow, setEditRow, refresh } = props;
  const database = useContext(DatabaseContext);
  const {version, gameVersion} = useContext(MetadataContext)


  const [firstName, setFirstName] = useState("Lando");
  const [lastName, setLastName] = useState("Norris");
  const [driverCode, setDriverCode] = useState("NOR");
  const [country, setCountry] = useState("UnitedKingdom");
  const [driverNumber, setDriverNumber] = useState("4");
  const [gender, setGender] = useState(0);
  const [faceType, setFaceType] = useState(0);
  const [faceIndex, setFaceIndex] = useState(0);
  const [ageType, setAgeType] = useState(0);

  const [namePool, setNamePool] = useState([]);
  const [driverCodePool, setDriverCodePool] = useState([]);
  const [surnameMapping, setSurnameMapping] = useState({});


  useEffect(() => {
    if (editRow) {
      setFirstName(resolveName(editRow.FirstName));
      setLastName(resolveName(editRow.LastName));
      setCountry(editRow.Nationality);
      setGender(editRow.Gender);

      setFaceType(editRow.FaceType);
      setFaceIndex(editRow.FaceIndex);
      setAgeType(editRow.AgeType);

      if (editRow.StaffType === 0) {
        setDriverCode(resolveDriverCode(editRow.DriverCode));
        setDriverNumber(editRow.CurrentNumber ? `${editRow.CurrentNumber}` : "N/A");
      }
    } else {
      setDriverCode("");
      setDriverNumber("");
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
      } else if (version >= 3) {
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
      key={editRow.StaffID}
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

        <Divider variant="fullWidth" sx={{ my: 1 }} />

        <Grid direction="row" container spacing={2} sx={{ my: 1 }}>
          <Grid item>
            <Autocomplete
              disablePortal
              options={namePool}
              value={firstName}
              sx={{ width: 200 }}
              onInputChange={ (e, nv) => {
                if (nv) {
                  setFirstName(nv);
                }
              }}
              renderInput={(params) => <TextField {...params} label="First Name" autoComplete="off" />}
            />
          </Grid>
          <Grid item>
            <Autocomplete
              disablePortal
              options={namePool}
              value={lastName}
              sx={{ width: 200 }}
              onInputChange={ (e, nv) => {
                if (nv) {
                  setLastName(nv);
                  setDriverCode(surnameMapping[nv])
                }
              } }
              renderInput={(params) => <TextField {...params} label="Last Name" autoComplete="off" />}
            />
          </Grid>
          {
            editRow.StaffType === 0 && (
              <Grid item>
                <Autocomplete
                  disablePortal
                  options={driverCodePool}
                  value={driverCode}
                  sx={{ width: 160 }}
                  onInputChange={ (e, nv) => {
                    if (nv) setDriverCode(nv)
                  }}
                  renderInput={(params) => <TextField {...params} label="Code" autoComplete="off" />}
                />
              </Grid>
            )
          }
        </Grid>
        <Grid direction="row" container spacing={2} sx={{ my: 1 }}>
          <Grid item>
            <Autocomplete
              disablePortal
              options={countries}
              value={country}
              sx={{ width: 200 }}
              onChange={ (e, nv) => {
                if (nv) setCountry(nv)
              }}
              renderInput={(params) => <TextField {...params} label="Country" autoComplete="off" />}
            />
          </Grid>

          {
            editRow.StaffType === 0 && (
              <Grid item>
                <Autocomplete
                  disablePortal
                  options={driverNumbers}
                  value={driverNumber}
                  sx={{ width: 160 }}
                  onInputChange={ (e, nv) => {
                    if (nv) setDriverNumber(nv)
                  }}
                  renderInput={(params) => <TextField {...params} label="F1 Number" autoComplete="off" />}
                />
              </Grid>
            )
          }
          <Grid item>
            <FormControl>
              <InputLabel id="standard-label">Gender</InputLabel>
              <Select
                labelId="standard-label"
                value={gender}
                sx={{ width: 160, display: "inline-block" }}
                onChange={(e) => {
                  setGender(e.target.value);
                }}
              >
                <MenuItem value={0}>Male</MenuItem>
                <MenuItem value={1}>Female</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {
          editRow.IsGeneratedStaff === 1 && (
            <Grid direction="row" container spacing={2} sx={{ my: 1 }}>
              <Grid item>
                <FormControl>
                  <InputLabel id="standard-label-1">Ethnicity</InputLabel>
                  <Select
                    labelId="standard-label-1"
                    value={faceType}
                    sx={{ width: 160 }}
                    onChange={(e) => {
                      setFaceType(e.target.value);
                    }}
                  >
                    {
                      faceTypes.map((ft , _idx) => (
                        <MenuItem value={_idx}>{ft}</MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl>
                  <InputLabel id="standard-label-2">Face</InputLabel>
                  <Select
                    labelId="standard-label-2"
                    value={faceIndex}
                    sx={{ width: 160 }}
                    onChange={(e) => {
                      setFaceIndex(e.target.value);
                    }}
                  >
                    {
                      Array.from(Array(faceCount?.[faceType]?.[gender])).map((_ , _idx) => (
                        <MenuItem value={_idx}>Face #{1 + _idx}</MenuItem>
                      ))
                    }
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl>
                  <InputLabel id="standard-label-3">Photo Variant</InputLabel>
                  <Select
                    labelId="standard-label-3"
                    value={ageType}
                    sx={{ width: 160 }}
                    onChange={(e) => {
                      setAgeType(e.target.value);
                    }}
                  >
                    <MenuItem value={0}>Young (30-)</MenuItem>
                    <MenuItem value={1}>Aged (30+)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )
        }



        <Divider variant="fullWidth" sx={{ my: 2 }} />

        <Grid direction="row" container spacing={1}>
          <Grid item>
            {
              editRow.Retired ? (
                <Button color="error" variant="contained" onClick={() => {
                  const retirementInYears = Math.ceil(row.RetirementAge - (basicInfo.player.Day - row.DOB) / 365.25);
                  const extendedRetirementAge = retirementInYears < 5 ? row.RetirementAge + 5 - retirementInYears : row.RetirementAge;
                  if (version === 2) {
                    database.exec(`UPDATE Staff_CommonData SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${editRow.StaffID}`);
                  } else if (version >= 3) {
                    database.exec(`UPDATE Staff_GameData SET Retired = 0, RetirementAge = ${extendedRetirementAge} WHERE StaffID = ${editRow.StaffID}`);
                  }
                  refresh();
                }}>Unretire</Button>
              ) : (
                <Button color="error" variant="contained" onClick={() => {
                  if (version === 2) {
                    database.exec(`UPDATE Staff_CommonData SET Retired = 1 WHERE StaffID = ${editRow.StaffID}`);
                  } else if (version >= 3) {
                    database.exec(`UPDATE Staff_GameData SET Retired = 1 WHERE StaffID = ${editRow.StaffID}`);
                  }
                  refresh();
                }}>Retire</Button>
              )
            }

          </Grid>
          <Grid item style={{ flex: 1 }}>
          </Grid>
          <Grid item>
            <Button color="warning" variant="contained" onClick={() => {
              const _firstName = unresolveName(firstName);
              const _lastName = unresolveName(lastName);
              const _driverCode = unresolveDriverCode(driverCode);

              if (version === 2) {
                database.exec(`UPDATE Staff_CommonData SET FirstName = "${_firstName}", LastName = "${_lastName}", Nationality = "${country}", Gender = ${gender} WHERE StaffID = ${editRow.StaffID}`);
              } else if (version === 3) {
                database.exec(`UPDATE Staff_BasicData SET FirstName = "${_firstName}", LastName = "${_lastName}", Nationality = "${country}", Gender = ${gender} WHERE StaffID = ${editRow.StaffID}`);
              } else if (version >= 4) {
                let [{ values }] = database.exec(`SELECT CountryID FROM Countries WHERE EnumName = "${country}"`);
                let value = values[0];
                database.exec(`UPDATE Staff_BasicData SET FirstName = "${_firstName}", LastName = "${_lastName}", CountryID = ${value}, Gender = ${gender} WHERE StaffID = ${editRow.StaffID}`);
              }

              if (editRow.IsGeneratedStaff) {
                const FaceIndex = faceIndex % faceCount[faceType][gender];
                if (version === 2) {
                  database.exec(`UPDATE Staff_CommonData SET FaceIndex = ${FaceIndex}, FaceType = ${faceType}, AgeType = ${ageType} WHERE StaffID = ${editRow.StaffID}`);
                } else if (version >= 3) {
                  database.exec(`UPDATE Staff_BasicData SET FaceIndex = ${FaceIndex}, FaceType = ${faceType}, AgeType = ${ageType} WHERE StaffID = ${editRow.StaffID}`);
                }
              }


              if (editRow.StaffType === 0) {
                database.exec(`UPDATE Staff_DriverData SET DriverCode = "${_driverCode}" WHERE StaffID = ${editRow.StaffID}`);

                const haveDriverNumber = !(driverNumber === "N/A" || driverNumber === "");
                const _driverNumber = haveDriverNumber ? driverNumber : "";
                if (haveDriverNumber) {
                  if (_driverNumber !== 1) {
                    database.exec(`UPDATE Staff_DriverData SET LastKnownDriverNumber = "${_driverNumber}" WHERE StaffID = ${editRow.StaffID}`);
                  }
                  database.exec(`UPDATE Staff_DriverNumbers SET CurrentHolder = NULL WHERE CurrentHolder = ${editRow.StaffID}`);
                  database.exec(`INSERT OR REPLACE INTO Staff_DriverNumbers VALUES(${_driverNumber}, ${editRow.StaffID})`);
                } else {
                  database.exec(`UPDATE Staff_DriverNumbers SET CurrentHolder = NULL WHERE CurrentHolder = ${editRow.StaffID}`);
                }
              }
              refresh();
            }}>Save Profile</Button>
          </Grid>
        </Grid>
      </Box>
    </Modal>
  )
}