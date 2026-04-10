import {teamColors2023, teams2023, teams2024} from "./Teams2023";
import {staffNames, driverCodes} from "./staffNames";

const f1TeamNamesByBrandYear = {
  2022: {
    1: "Ferrari",
    2: "McLaren",
    3: "Red Bull",
    4: "Mercedes",
    5: "Alpine",
    6: "Williams",
    7: "Haas",
    8: "AlphaTauri",
    9: "Alfa Romeo",
    10: "Aston Martin",
  },
  2023: {
    1: "Ferrari",
    2: "McLaren",
    3: "Red Bull",
    4: "Mercedes",
    5: "Alpine",
    6: "Williams",
    7: "Haas",
    8: "AlphaTauri",
    9: "Alfa Romeo",
    10: "Aston Martin",
  },
  2024: {
    1: "Ferrari",
    2: "McLaren",
    3: "Red Bull",
    4: "Mercedes",
    5: "Alpine",
    6: "Williams",
    7: "Haas",
    8: "Racing Bulls",
    9: "Kick Sauber",
    10: "Aston Martin",
  },
  2025: {
    1: "Ferrari",
    2: "McLaren",
    3: "Red Bull",
    4: "Mercedes",
    5: "Alpine",
    6: "Williams",
    7: "Haas",
    8: "Racing Bulls",
    9: "Kick Sauber",
    10: "Aston Martin",
  },
  2026: {
    1: "Ferrari",
    2: "McLaren",
    3: "Red Bull",
    4: "Mercedes",
    5: "Alpine",
    6: "Williams",
    7: "Haas",
    8: "Racing Bulls",
    9: "Audi",
    10: "Aston Martin",
  },
};

function getTeamBrandingContext(options = {}) {
  const globalContext = typeof window !== "undefined" ? window.__teamBrandingContext || {} : {};
  return {
    currentSeason: options.currentSeason ?? globalContext.currentSeason ?? null,
    startSeason: options.startSeason ?? globalContext.startSeason ?? null,
    useRealWorldTeamBrands: options.useRealWorldTeamBrands ?? globalContext.useRealWorldTeamBrands ?? true,
    brandYearOverride: options.brandYearOverride ?? null,
  };
}

function getDisplayBrandYear(version, options = {}) {
  const saveYear = Math.min(2026, Math.max(2022, version + 2020));
  const { currentSeason, startSeason, useRealWorldTeamBrands, brandYearOverride } = getTeamBrandingContext(options);

  if (Number.isFinite(Number(brandYearOverride))) {
    return Math.min(2026, Math.max(2022, Number(brandYearOverride)));
  }

  if (useRealWorldTeamBrands && Number.isFinite(Number(currentSeason)) && Number.isFinite(Number(startSeason)) && Number(currentSeason) > Number(startSeason)) {
    return Math.min(2026, Math.max(2022, Number(currentSeason)));
  }

  return saveYear;
}

Date.prototype.getWeek = function() {
  var date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  // January 4 is always in week 1.
  var week1 = new Date(date.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000
    - 3 + (week1.getDay() + 6) % 7) / 7);
}

export const dayToDate = d => new Date((d - 2)*86400000 - 2208988800000)
export const dateToDay = d => Math.floor((+d + 2208988800000) / 86400000) + 2
export const localDateToDay = d => {
  const date = d instanceof Date ? d : new Date(d);
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) + 2208988800000) / 86400000) + 2;
}
export const formatISODateLocal = d => {
  const date = d instanceof Date ? d : new Date(d);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export const yearToDateRange = y => [
  (+new Date(`${y}-01-01 00:00+00:00`) + 2208988800000 ) / 86400000 + 2,
  (+new Date(`${y+1}-01-01 00:00+00:00`) + 2208988800000 ) / 86400000 + 2,
]
export const formatDate = d => d.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })


export const teamNames = (x, version, options = {}) => {
  if (x >= 1 && x <= 10) {
    const brandYear = getDisplayBrandYear(version, options);
    return f1TeamNamesByBrandYear[brandYear]?.[x] || teams2024[x] || teams2023[x];
  }

  if (version <= 3) return teams2023[x];
  if (x === 32 && window.customTeamName) {
    return window.customTeamName;
  }
  return teams2024[x];
}


export const weekendStages = [
  "Day 1",
  "Practice 1",
  "Practice 2",
  "Day 2",
  "Practice 3",
  "Qualifying 1",
  "Qualifying 2",
  "Qualifying 3",
  "Day 3",
  "Race",
  "Race End",
  "Race End",
  "Sprint Race",
]

export const weekendStagesAbbrev = [
  "Day 1", //
  "P1",
  "P2",
  "Day 2", //
  "P3",
  "Q1",
  "Q2",
  "Q3",
  "Pre-Race",
  "Race",
  "End",
  "End",
  "Sprint",
]


export const circuitNames = [
  "Unknown",
  "Melbourne",
  "Sakhir",
  "Shanghai",
  "Baku",
  "Barcelona",
  "Monte Carlo",
  "Montréal",
  "Le Castellet",
  "Spielberg",

  "Silverstone",
  "Jeddah",
  "Budapest",
  "Spa-Francorchamps",
  "Monza",
  "Marina Bay",
  "Sochi",
  "Suzuka",
  "Mexico City",
  "Austin",

  "São Paulo",
  "Yas Island",
  "Miami Gardens",
  "Zandvoort",
  "Imola",

  "Las Vegas",
  "Losail",
]
export const countryNames = [
  "Unknown",
  "Australia",
  "Bahrain",
  "China",
  "Azerbaijan",
  "Spain",
  "Monaco",
  "Canada",
  "France",
  "Austria",

  "Great Britain",
  "Saudi Arabia",
  "Hungary",
  "Belgium",
  "Italy",
  "Singapore",
  "Russia",
  "Japan",
  "Mexico",
  "United States",

  "Brazil",
  "Abu Dhabi",
  "United States",
  "Netherlands",
  "Italy",

  "United States",
  "Qatar",
]

export const raceAbbrevs = [
  "Unknown",
  "AUS",
  "BHR",
  "CHN",
  "AZE",
  "ESP",
  "MON",
  "CAN",
  "FRA",
  "AUT",
  "GBR",
  "KSA",
  "HUN",
  "BEL",
  "ITA",
  "SIN",
  "RUS",
  "JPN",
  "MEX",
  "USA",
  "BRA",
  "UAE",
  "MIA", // Miami
  "NED",
  "EMI", // SMR
  "LVG", // Las Vegas
  "QAT",
]
export const raceFlags = [
  "Unknown",
  "AU",
  "BH",
  "CN",
  "AZ",
  "ES",
  "MC",
  "CA",
  "FR",
  "AT",
  "GB",
  "SA",
  "HU",
  "BE",
  "IT",
  "SG",
  "RU",
  "JP",
  "MX",
  "US",
  "BR",
  "AE",
  "US-MIAMI", // Miami
  "NL",
  "IT-45", // SMR
  "US-VEGAS", // Las Vegas
  "QA",
]

export const getDriverCode = (d) => {
  return resolveDriverCode(d.DriverCode);
}

export const getDriverName = (d) => {
  return d ? `${resolveName(d.FirstName)} ${resolveName(d.LastName)}` : "-";
}


export const literal = /LITERAL:Value=\|(.*)\|/
export const stringLiteral = /^\[STRING_LITERAL:Value=\|(.*)\|]$/
const literalFallbacks = {
  Sponsorship_Obligation_RaceHospitality: "Race Hospitality",
  Sponsorship_Obligation_FactoryEvent: "Factory Event",
  Sponsorship_Obligation_MerchandiseItems: "Merchandise Items",
  Sponsorship_Obligation_DriverAppearanceAtGP: "Driver Appearance at GP",
  Sponsorship_Obligation_DriverAppearanceAwayFromGP: "Driver Appearance Away from GP",
  Sponsorship_Obligation_MemorabiliaRoomEvent: "Memorabilia Room Event",
  Sponsorship_Obligation_FactoryRaceDayEvent: "Factory Race Day Event",
  Sponsorship_Obligation_GamingRigHireDay: "Gaming Rig Hire Day",
  SPONSOR_TARGET_CONDITION_FASTEST_LAP: "Fastest Lap",
  SPONSOR_TARGET_CONDITION_REACH_Q2: "Reach Q2",
  SPONSOR_TARGET_CONDITION_REACH_Q3: "Reach Q3",
  SPONSOR_TARGET_CONDITION_QUALI_POS: "Qualifying Position",
  SPONSOR_TARGET_CONDITION_QUALI_STREAK: "Qualifying Streak",
  SPONSOR_TARGET_CONDITION_RACE_POS: "Race Position",
  SPONSOR_TARGET_CONDITION_RACE_STREAK: "Race Streak",
  Sponsorship_Unit_Days: "Days",
  Sponsorship_Unit_Items: "Items",
  Sponsorship_Unit_Hours: "Hours",
};

export const resolveLiteral = (_nameString) => {
  const ex = literal.exec(_nameString);
  if (ex) {
    return ex[1];
  }
  const literalKey = `${_nameString || ""}`.replace(/^\[/, "").replace(/]$/, "");
  if (literalFallbacks[literalKey]) {
    return literalFallbacks[literalKey];
  }
  return _nameString;
}
export const resolveName = (_nameString) => {
  const ex = stringLiteral.exec(_nameString);
  if (ex) {
    return ex[1];
  }
  let nameString = _nameString.replace("[", "").replace("]", "")
  if (staffNames[nameString]) return staffNames[nameString];
  const split = nameString.split("_");
  return split[split.length - 1]
}

export const resolveNameV4 = (_nameString) => {
  const ex = literal.exec(_nameString);
  if (ex) {
    return ex[1];
  }
  let nameString = _nameString.replace("[", "").replace("]", "")
  if (staffNames[nameString]) return staffNames[nameString];
  const split = nameString.split("_");
  return split[split.length - 1]
}

export const resolveDriverCode = (_nameString) => {
  let nameString = _nameString.replace("[", "").replace("]", "")
  if (driverCodes[nameString]) return driverCodes[nameString];
  const split = nameString.split("_");
  return split[split.length - 1].toUpperCase();
}

export const unresolveName = (_nameString) => {
  for(const s of Object.keys(staffNames)) {
    if (_nameString === staffNames[s]) return `[${s}]`;
  }
  return `[STRING_LITERAL:Value=|${_nameString}|]`
}

export const unresolveDriverCode = (_nameString) => {
  for(const s of Object.keys(driverCodes)) {
    if (_nameString === driverCodes[s]) return `[${s}]`;
  }
  return _nameString
}
