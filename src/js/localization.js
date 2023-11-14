import {teamColors2023, teams2023} from "./localization_2023";
import {staffNames, driverCodes} from "./staffNames";



export const dayToDate = d => new Date((d - 2)*86400000 - 2208988800000)
export const formatDate = d => d.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })

export const teamColors =  (x) => {
  return teamColors2023[x];
}
export const teamNames = (x, version) => {
  return teams2023[x];
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
  "P1", //
  "P1",
  "P2",
  "P3", //
  "P3",
  "Q1",
  "Q2",
  "Q3",
  "Race",
  "Race",
  "End",
  "End",
  "End",
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
  "Singapore",
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
  "IT-EMI", // SMR
  "US-VEGAS", // Las Vegas
  "QA",
]

export const getDriverCode = (d) => {
  return resolveDriverCode(d.DriverCode);
}

export const getDriverName = (d) => {
  return `${resolveName(d.FirstName)} ${resolveName(d.LastName)}`;
}


export const resolveName = (_nameString) => {
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
  return _nameString
}

export const unresolveDriverCode = (_nameString) => {
  for(const s of Object.keys(driverCodes)) {
    if (_nameString === driverCodes[s]) return `[${s}]`;
  }
  return _nameString
}