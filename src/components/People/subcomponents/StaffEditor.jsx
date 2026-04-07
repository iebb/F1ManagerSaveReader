import {
  dayToDate,
  formatISODateLocal,
  getDriverName,
  localDateToDay,
  resolveDriverCode,
  resolveName,
  unresolveDriverCode,
  unresolveName
} from "@/js/localization";
import {localeStaffStats} from "@/components/People/commons/staffCommon";
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  Grid, MenuItem,
  Modal, Select,
  TextField,
  Typography
} from "@mui/material";
import InputLabel from "@mui/material/InputLabel";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {countries} from "@/js/localization/staffNames";
import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";


const driverNumbers = Array.from({ length: 99 }, (_, idx) => `${idx + 1}`);

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
  const basicInfo = useContext(BasicInfoContext);
  const database = useContext(DatabaseContext);
  const {version} = useContext(MetadataContext)
  const { enqueueSnackbar } = useSnackbar();


  const [firstName, setFirstName] = useState("Lando");
  const [lastName, setLastName] = useState("Norris");
  const [driverCode, setDriverCode] = useState("NOR");
  const [country, setCountry] = useState("UnitedKingdom");
  const [driverNumber, setDriverNumber] = useState("4");
  const [gender, setGender] = useState(0);
  const [faceType, setFaceType] = useState(0);
  const [faceIndex, setFaceIndex] = useState(0);
  const [ageType, setAgeType] = useState(0);
  const [dobValue, setDobValue] = useState("");
  const [retirementAge, setRetirementAge] = useState(60);
  const [randomBaseline, setRandomBaseline] = useState(50);

  const [namePool, setNamePool] = useState([]);
  const [driverCodePool, setDriverCodePool] = useState([]);
  const [surnameMapping, setSurnameMapping] = useState({});
  const [staffStats, setStaffStats] = useState([]);
  const [statValues, setStatValues] = useState({});
  const isNew = Boolean(editRow?.__isNew);
  const isDriver = editRow?.StaffType === 0;
  const isGenerated = editRow?.IsGeneratedStaff === 1;
  const staffTypeLabel = {
    0: "Driver Profile",
    1: "Technical Chief",
    2: "Race Engineer",
    3: "Head of Aerodynamics",
    4: "Sporting Director",
    5: "Mail Sender",
  }[editRow?.StaffType] || "Staff Profile";


  useEffect(() => {
    if (editRow) {
      setFirstName(resolveName(editRow.FirstName || ""));
      setLastName(resolveName(editRow.LastName || ""));

      setCountry(editRow.Nationality || "UnitedKingdom");
      setGender(editRow.Gender ?? 0);
      setFaceType(editRow.FaceType ?? 0);
      setFaceIndex(editRow.FaceIndex ?? 0);
      setAgeType(editRow.AgeType ?? 0);
      setDobValue(editRow.DOB ? formatISODateLocal(dayToDate(editRow.DOB)) : formatISODateLocal(dayToDate(basicInfo.player.Day - Math.round(25 * 365.2422))));
      setRetirementAge(editRow.RetirementAge ?? 60);
      const nextStatValues = {};
      Object.keys(editRow).forEach((key) => {
        if (key.startsWith("performance_stats_")) {
          nextStatValues[key] = editRow[key] ?? 0;
        }
      });
      if (editRow.StaffType === 0) {
        nextStatValues.Improvability = editRow.Improvability ?? 0;
        nextStatValues.Aggression = editRow.Aggression ?? 0;
        if (editRow.Marketability !== undefined) nextStatValues.Marketability = editRow.Marketability ?? 0;
        if (editRow.TargetMarketability !== undefined) nextStatValues.TargetMarketability = editRow.TargetMarketability ?? 0;
      }
      setStatValues(nextStatValues);
      const numericValues = Object.values(nextStatValues).filter((value) => Number.isFinite(Number(value))).map(Number);
      if (numericValues.length) {
        setRandomBaseline(Math.round(numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length));
      } else {
        setRandomBaseline(50);
      }

      if (editRow.StaffType === 0) {
        setDriverCode(resolveDriverCode(editRow.DriverCode || ""));
        setDriverNumber(editRow.CurrentNumber ? `${editRow.CurrentNumber}` : "");
      }
    } else {
      setDriverCode("");
      setDriverNumber("");
      setStatValues({});
      setDobValue("");
      setRetirementAge(60);
      setRandomBaseline(50);
    }
  }, [basicInfo.player.Day, editRow])



  useEffect(() => {
    let values;
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

  useEffect(() => {
    if (!editRow) return;
    try {
      const result = database.exec(
        `SELECT PerformanceStatType FROM Staff_StaffTypePerformanceStatsTemplate WHERE StaffType = ${editRow.StaffType}`
      );
      if (result.length) {
        const nextStats = result[0].values.map((row) => row[0]);
        setStaffStats(nextStats);
        if (editRow.__isNew) {
          setStatValues((current) => {
            const next = {...current};
            nextStats.forEach((stat) => {
              const key = `performance_stats_${stat}`;
              if (next[key] === undefined) {
                next[key] = 50;
              }
            });
            if (editRow.StaffType === 0) {
              if (next.Improvability === undefined) next.Improvability = 50;
              if (next.Aggression === undefined) next.Aggression = 50;
              if (version >= 4 && next.Marketability === undefined) next.Marketability = 50;
              if (version >= 4 && next.TargetMarketability === undefined) next.TargetMarketability = 50;
            }
            return next;
          });
        }
      } else {
        setStaffStats([]);
      }
    } catch {
      setStaffStats([]);
    }
  }, [database, editRow]);

  if (!editRow) return null;

  const quoteSql = (value) => `'${`${value ?? ""}`.replaceAll("'", "''")}'`;
  const driverDisplayName = [firstName, lastName].filter(Boolean).join(" ").trim() || (isNew ? "New Staff" : getDriverName(editRow));
  const modalTitle = isNew ? `Create ${staffTypeLabel}` : `Edit ${getDriverName(editRow)}`;
  const modalDescription = isNew
    ? "Enter the required profile attributes and save to add a new generated staff record for this role."
    : "Update identity, nationality, appearance, and core driver metadata in one place.";

  function getTemplateStaffId(staffType) {
    try {
      if (staffType === 5) {
        return database.getAllRows("SELECT StaffID FROM Staff_NarrativeData ORDER BY StaffID DESC LIMIT 1")[0]?.StaffID ?? null;
      }
      if (staffType === 0) {
        return database.getAllRows("SELECT StaffID FROM Staff_DriverData ORDER BY StaffID DESC LIMIT 1")[0]?.StaffID ?? null;
      }
      if (version === 2) {
        return database.getAllRows(`SELECT StaffID FROM Staff_CommonData WHERE StaffType = ${staffType} ORDER BY StaffID DESC LIMIT 1`)[0]?.StaffID ?? null;
      }
      return database.getAllRows(`SELECT StaffID FROM Staff_GameData WHERE StaffType = ${staffType} ORDER BY StaffID DESC LIMIT 1`)[0]?.StaffID ?? null;
    } catch {
      return null;
    }
  }

  function getNextStaffId() {
    if (version === 2) {
      return Number(database.getAllRows("SELECT MAX(StaffID) AS MaxID FROM Staff_CommonData")[0]?.MaxID || 0) + 1;
    }
    return Number(database.getAllRows("SELECT MAX(StaffID) AS MaxID FROM Staff_BasicData")[0]?.MaxID || 0) + 1;
  }

  function cloneStaffRow(table, templateId, nextStaffId) {
    const columns = database.getAllRows(`PRAGMA table_info('${table}')`).map((row) => row.name);
    const values = columns.map((column) => column === "StaffID" ? `${nextStaffId}` : column).join(", ");
    database.exec(`INSERT INTO ${table} (${columns.join(", ")}) SELECT ${values} FROM ${table} WHERE StaffID = ${templateId}`);
  }

  function upsertProfile(staffId) {
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedDriverCode = driverCode.trim().toUpperCase();

    if (!normalizedFirstName || !normalizedLastName || !country || !dobValue) {
      enqueueSnackbar("First name, last name, country, and DOB are required.", { variant: "error" });
      return false;
    }

    if (isDriver && !normalizedDriverCode) {
      enqueueSnackbar("Driver code is required for drivers.", { variant: "error" });
      return false;
    }

    const parsedRetirementAge = Number(retirementAge);
    if (!Number.isFinite(parsedRetirementAge) || parsedRetirementAge < 16) {
      enqueueSnackbar("Retirement age must be a valid number.", { variant: "error" });
      return false;
    }

    const dobDay = localDateToDay(dobValue);
    const resolvedFirstName = unresolveName(normalizedFirstName);
    const resolvedLastName = unresolveName(normalizedLastName);
    const resolvedDriverCode = unresolveDriverCode(normalizedDriverCode);

    if (version === 2) {
      database.exec(`UPDATE Staff_CommonData
        SET FirstName = ${quoteSql(resolvedFirstName)},
            LastName = ${quoteSql(resolvedLastName)},
            Nationality = ${quoteSql(country)},
            DOB = ${dobDay},
            Gender = ${gender},
            RetirementAge = ${parsedRetirementAge},
            FaceIndex = ${faceIndex % faceCount[faceType][gender]},
            FaceType = ${faceType},
            AgeType = ${ageType}
        WHERE StaffID = ${staffId}`);
    } else if (version === 3) {
      database.exec(`UPDATE Staff_BasicData
        SET FirstName = ${quoteSql(resolvedFirstName)},
            LastName = ${quoteSql(resolvedLastName)},
            Nationality = ${quoteSql(country)},
            DOB = ${dobDay},
            Gender = ${gender},
            FaceIndex = ${faceIndex % faceCount[faceType][gender]},
            FaceType = ${faceType},
            AgeType = ${ageType}
        WHERE StaffID = ${staffId}`);
      if (editRow.StaffType !== 5) {
        database.exec(`UPDATE Staff_GameData SET RetirementAge = ${parsedRetirementAge}, Retired = 0 WHERE StaffID = ${staffId}`);
      }
    } else if (version >= 4) {
      const countryId = database.getAllRows(`SELECT CountryID FROM Countries WHERE EnumName = ${quoteSql(country)} LIMIT 1`)[0]?.CountryID;
      if (countryId === undefined) {
        enqueueSnackbar("Country could not be resolved for this profile.", { variant: "error" });
        return false;
      }
      database.exec(`UPDATE Staff_BasicData
        SET FirstName = ${quoteSql(resolvedFirstName)},
            LastName = ${quoteSql(resolvedLastName)},
            CountryID = ${countryId},
            DOB = ${dobDay},
            DOB_ISO = ${quoteSql(dobValue)},
            Gender = ${gender},
            PhotoDay = ${basicInfo.player.Day},
            FaceIndex = ${faceIndex % faceCount[faceType][gender]},
            FaceType = ${faceType},
            AgeType = ${ageType}
        WHERE StaffID = ${staffId}`);
      if (editRow.StaffType !== 5) {
        database.exec(`UPDATE Staff_GameData SET RetirementAge = ${parsedRetirementAge}, Retired = 0 WHERE StaffID = ${staffId}`);
      }
    }

    for (const stat of staffStats) {
      const statKey = `performance_stats_${stat}`;
      const statValue = Number(statValues[statKey] ?? 0);
      database.exec(`INSERT INTO Staff_PerformanceStats(StaffID, StatID, Val, Max)
        VALUES(${staffId}, ${stat}, ${statValue}, 100)
        ON CONFLICT(StaffID, StatID) DO
        UPDATE SET Val = ${statValue}
        WHERE StaffID = ${staffId} AND StatID = ${stat};`);
    }

    if (isDriver) {
      database.exec(`UPDATE Staff_DriverData
        SET DriverCode = ${quoteSql(resolvedDriverCode)},
            Improvability = ${Number(statValues.Improvability ?? 0)},
            Aggression = ${Number(statValues.Aggression ?? 0)},
            AssignedCarNumber = NULL
        WHERE StaffID = ${staffId}`);
      if (version >= 4) {
        database.exec(`UPDATE Staff_DriverData
          SET Marketability = ${Number(statValues.Marketability ?? 0)},
              TargetMarketability = ${Number(statValues.TargetMarketability ?? 0)},
              FeederSeriesAssignedCarNumber = NULL
          WHERE StaffID = ${staffId}`);
      }

      if (driverNumber) {
        if (driverNumber !== "1") {
          database.exec(`UPDATE Staff_DriverData SET LastKnownDriverNumber = ${Number(driverNumber)} WHERE StaffID = ${staffId}`);
        }
        database.exec(`UPDATE Staff_DriverNumbers SET CurrentHolder = NULL WHERE CurrentHolder = ${staffId}`);
        database.exec(`INSERT OR REPLACE INTO Staff_DriverNumbers VALUES(${Number(driverNumber)}, ${staffId})`);
      } else {
        database.exec(`UPDATE Staff_DriverNumbers SET CurrentHolder = NULL WHERE CurrentHolder = ${staffId}`);
        database.exec(`UPDATE Staff_DriverData SET LastKnownDriverNumber = NULL WHERE StaffID = ${staffId}`);
      }
    }

    if (editRow.StaffType === 5) {
      database.exec(`UPDATE Staff_NarrativeData SET TeamID = NULL, IsActive = 1 WHERE StaffID = ${staffId}`);
    }

    return true;
  }

  function handleSave() {
    try {
      if (isNew) {
        const templateId = getTemplateStaffId(editRow.StaffType);
        if (!templateId) {
          enqueueSnackbar("No template staff row was found for this staff type.", { variant: "error" });
          return;
        }

        const nextStaffId = getNextStaffId();
        if (version === 2) {
          cloneStaffRow("Staff_CommonData", templateId, nextStaffId);
          if (isDriver) {
            cloneStaffRow("Staff_DriverData", templateId, nextStaffId);
          }
        } else {
          cloneStaffRow("Staff_BasicData", templateId, nextStaffId);
          if (editRow.StaffType === 5) {
            cloneStaffRow("Staff_NarrativeData", templateId, nextStaffId);
          } else {
            cloneStaffRow("Staff_GameData", templateId, nextStaffId);
          }
          if (isDriver) {
            cloneStaffRow("Staff_DriverData", templateId, nextStaffId);
          }
        }

        if (!upsertProfile(nextStaffId)) {
          return;
        }

        enqueueSnackbar(`Created ${driverDisplayName}`, { variant: "success" });
      } else {
        if (!upsertProfile(editRow.StaffID)) {
          return;
        }
        enqueueSnackbar(`Updated ${driverDisplayName}`, { variant: "success" });
      }

      refresh();
      setEditRow(null);
    } catch (error) {
      enqueueSnackbar(`Failed to save staff profile: ${error.message || error}`, { variant: "error" });
    }
  }

  const sectionSx = {
    border: "1px solid rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 2,
  };
  const autocompleteProps = {
    disablePortal: false,
    slotProps: {
      popper: {
        sx: {
          zIndex: 1700,
          "& .MuiAutocomplete-paper": {
            borderRadius: 0,
            border: "1px solid rgba(255,255,255,0.12)",
            backgroundColor: "#131a22",
            color: "#fff",
          },
          "& .MuiAutocomplete-listbox": {
            paddingTop: 0,
            paddingBottom: 0,
          }
        }
      }
    }
  };
  const statFields = [
    ...staffStats.map((stat) => ({
      key: `performance_stats_${stat}`,
      label: localeStaffStats[`STAFF_STAT_${stat}`] || `Stat ${stat}`,
    })),
    ...(isDriver ? [
      { key: "Improvability", label: "Improvability" },
      { key: "Aggression", label: "Aggression" },
      ...(version >= 4 ? [
        { key: "Marketability", label: "Marketability" },
        { key: "TargetMarketability", label: "Target Marketability" },
      ] : []),
    ] : []),
  ];
  const applyBaselineRandomizer = () => {
    const baseline = Math.max(0, Math.min(100, Number(randomBaseline) || 0));
    setStatValues((current) => {
      const next = { ...current };
      statFields.forEach((field, index) => {
        const spread = field.key === "Aggression" ? 18 : field.key === "Improvability" ? 14 : 12;
        const swing = Math.round((Math.random() * 2 - 1) * spread);
        const drift = ((index % 3) - 1) * 2;
        next[field.key] = Math.max(0, Math.min(100, baseline + swing + drift));
      });
      return next;
    });
  };

  return (
    <Modal
      open={Boolean(editRow)}
      key={editRow.StaffID ?? "new-staff"}
      onClose={() => setEditRow(null)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#131a22',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        padding: 0,
        borderRadius: 0,
        width: 860,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 32px)',
        overflow: 'auto',
      }}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <Typography id="modal-modal-title" variant="h6" component="h2" sx={{fontWeight: 700, color: "#fff"}}>
              {modalTitle}
            </Typography>
            <Typography sx={{mt: 0.5, fontSize: 13, color: "#94a3b8"}}>
              {modalDescription}
            </Typography>
          </div>
          <Button variant="outlined" color="inherit" onClick={() => setEditRow(null)}>Close</Button>
        </div>

        <div className="grid gap-4 p-5">
          <Box sx={sectionSx}>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{staffTypeLabel}</div>
                <div className="mt-1 text-lg font-semibold text-white">{driverDisplayName}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="border border-white/10 bg-black/10 px-2 py-1">{country}</span>
                  {isDriver && driverCode ? <span className="border border-white/10 bg-black/10 px-2 py-1">{driverCode}</span> : null}
                  {isDriver && driverNumber ? <span className="border border-white/10 bg-black/10 px-2 py-1">N{driverNumber}</span> : null}
                  <span className="border border-white/10 bg-black/10 px-2 py-1">{gender === 0 ? "Male" : "Female"}</span>
                  {isGenerated ? <span className="border border-white/10 bg-black/10 px-2 py-1">Generated Staff</span> : null}
                </div>
              </div>
              {isGenerated ? (
                <div className="grid min-w-[180px] grid-cols-3 gap-2 text-center text-xs">
                  <div className="border border-white/10 bg-black/10 px-2 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Type</div>
                    <div className="mt-1 text-sm font-semibold text-white">{faceType + 1}</div>
                  </div>
                  <div className="border border-white/10 bg-black/10 px-2 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Face</div>
                    <div className="mt-1 text-sm font-semibold text-white">{faceIndex + 1}</div>
                  </div>
                  <div className="border border-white/10 bg-black/10 px-2 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Photo</div>
                    <div className="mt-1 text-sm font-semibold text-white">{ageType === 0 ? "Young" : "Aged"}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </Box>

          <Box sx={sectionSx}>
            <Typography sx={{fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", mb: 2}}>
              Identity
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Autocomplete
                  key={editRow.StaffID}
                  {...autocompleteProps}
                  options={namePool}
                  value={firstName}
                  onInputChange={ (e, nv, r) => {
                    if (nv && (r === "input" || r === "selectOption")) {
                      setFirstName(nv);
                    }
                  }}
                  renderInput={(params) => <TextField {...params} label="First Name" autoComplete="off" />}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Autocomplete
                  key={editRow.StaffID}
                  {...autocompleteProps}
                  options={namePool}
                  value={lastName}
                  onInputChange={ (e, nv, r) => {
                    if (nv && (r === "input" || r === "selectOption")) {
                      setLastName(nv);
                      if (surnameMapping[nv]) {
                        setDriverCode(surnameMapping[nv])
                      } else {
                        setDriverCode(nv.substring(0, 3).toUpperCase());
                      }
                    }
                  }}
                  renderInput={(params) => <TextField {...params} label="Last Name" autoComplete="off" />}
                />
              </Grid>
              {isDriver && (
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    key={editRow.StaffID}
                    {...autocompleteProps}
                    options={driverCodePool}
                    value={driverCode}
                    onInputChange={ (e, nv, r) => {
                      if (nv && (r === "input" || r === "selectOption")) setDriverCode(nv)
                    }}
                    renderInput={(params) => <TextField {...params} label="Code" autoComplete="off" />}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={4}>
                <Autocomplete
                  {...autocompleteProps}
                  options={countries}
                  value={country}
                  onInputChange={ (e, nv, r) => {
                    if (nv && (r === "input" || r === "selectOption")) setCountry(nv)
                  }}
                  renderInput={(params) => <TextField {...params} label="Country" autoComplete="off" />}
                />
              </Grid>
              {isDriver && (
                <Grid item xs={12} md={4}>
                  <Autocomplete
                    {...autocompleteProps}
                    options={driverNumbers}
                    value={driverNumber}
                    onInputChange={ (e, nv, r) => {
                      if (r === "input" || r === "selectOption") setDriverNumber((nv || "").replace(/\D/g, "").slice(0, 2))
                    }}
                    renderInput={(params) => <TextField {...params} label="N" autoComplete="off" />}
                  />
                </Grid>
              )}
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="standard-label">Gender</InputLabel>
                  <Select
                    labelId="standard-label"
                    value={gender}
                    label="Gender"
                    onChange={(e) => {
                      setGender(e.target.value);
                    }}
                  >
                    <MenuItem value={0}>Male</MenuItem>
                    <MenuItem value={1}>Female</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="DOB"
                  type="date"
                  value={dobValue}
                  onChange={(e) => setDobValue(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              {editRow.StaffType !== 5 ? (
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Retirement Age"
                    type="number"
                    value={retirementAge}
                    onChange={(e) => setRetirementAge(e.target.value)}
                    inputProps={{ min: 16, max: 90 }}
                    required
                  />
                </Grid>
              ) : null}
            </Grid>
          </Box>

          {isGenerated && (
            <Box sx={sectionSx}>
              <Typography sx={{fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8", mb: 2}}>
                Appearance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel id="standard-label-1">Ethnicity</InputLabel>
                    <Select
                      labelId="standard-label-1"
                      value={faceType}
                      label="Ethnicity"
                      onChange={(e) => {
                        setFaceType(e.target.value);
                      }}
                    >
                      {faceTypes.map((ft , _idx) => (
                        <MenuItem key={_idx} value={_idx}>{ft}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel id="standard-label-2">Face</InputLabel>
                    <Select
                      labelId="standard-label-2"
                      value={faceIndex}
                      label="Face"
                      onChange={(e) => {
                        setFaceIndex(e.target.value);
                      }}
                    >
                      {Array.from(Array(faceCount?.[faceType]?.[gender])).map((_ , _idx) => (
                        <MenuItem key={_idx} value={_idx}>Face #{1 + _idx}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel id="standard-label-3">Photo Variant</InputLabel>
                    <Select
                      labelId="standard-label-3"
                      value={ageType}
                      label="Photo Variant"
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
            </Box>
          )}

          {statFields.length > 0 && (
            <Box sx={sectionSx}>
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Typography sx={{fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "#94a3b8"}}>
                  Stats
                </Typography>
                <div className="flex flex-wrap items-center gap-2">
                  <TextField
                    size="small"
                    type="number"
                    label="Baseline"
                    value={randomBaseline}
                    onChange={(e) => setRandomBaseline(e.target.value)}
                    sx={{ width: 120 }}
                  />
                  <button
                    type="button"
                    onClick={applyBaselineRandomizer}
                    className="border border-amber-400/20 bg-amber-500/[0.08] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-amber-100 transition hover:bg-amber-500/[0.14]"
                  >
                    Dice Randomize
                  </button>
                </div>
              </div>
              <Grid container spacing={2}>
                {statFields.map((field) => (
                  <Grid key={field.key} item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label={field.label}
                      value={statValues[field.key] ?? 0}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setStatValues((current) => ({
                          ...current,
                          [field.key]: Number.isFinite(value) ? value : 0,
                        }));
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-white/10 px-5 py-4">
          {!isNew && editRow.Retired !== undefined ? (
            editRow.Retired ? (
            <Button color="error" variant="contained" onClick={() => {
              const retirementInYears = Math.ceil(editRow.RetirementAge - (basicInfo.player.Day - editRow.DOB) / 365.25);
              const extendedRetirementAge = retirementInYears < 5 ? editRow.RetirementAge + 5 - retirementInYears : editRow.RetirementAge;
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
          )) : null}

          <div className="flex-1" />

          <Button color="warning" variant="contained" onClick={handleSave}>
            {isNew ? "Create Staff" : "Save Profile"}
          </Button>
        </div>
      </Box>
    </Modal>
  )
}
