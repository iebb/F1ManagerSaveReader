export const getDriverCode = (loc) => {
  return loc.replace("[DriverCode_", "").replace("]", "").toUpperCase();
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
  "Race End",
]
export const circuitNames = [
  "Unknown",
  "Melbourne",
  "Silverstone",
  "Sakhir",
  "China",
  "Baku",
  "Barcelona",
  "Monte Carlo",
  "Montréal",
  "Le Castellet",
  "Spielberg",

  "Jeddah",
  "Budapest",
  "Spa-Francorchamps",
  "Monza",
  "Singapore",
  "Russia",
  "Suzuka",
  "Mexico City",
  "Austin",

  "São Paulo",
  "Yas Island",
  "Miami Gardens",
  "Zandvoort",
  "Imola",

  "Losail",
  "Las Vegas",
]
export const countryNames = [
  "Unknown",
  "Australia",
  "Great Britain",
  "Bahrain",
  "China",
  "Azerbaijan",
  "Spain",
  "Monaco",
  "Canada",
  "France",
  "Austria",

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

  "Qatar",
  "United States",
]