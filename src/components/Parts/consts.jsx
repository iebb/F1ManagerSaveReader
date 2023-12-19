import {PartCalculationStats2022, PartStats2022, PSF2022} from "./consts_2022";
import {PartCalculationStats2023, PartStats2023, PartStatsCategorized2023, PSF2023} from "./consts_2023";

export const PartStatsV = {
  2: PartStats2022,
  3: PartStats2023,
}

export const PartFactorsV = {
  2: PSF2022,
  3: PSF2023,
}

export const PartCalculationStatsV = {
  2: PartCalculationStats2022,
  3: PartCalculationStats2023,
}


export const PartStatsCategorizedV = {
  2: PartStatsCategorized2023,
  3: PartStatsCategorized2023
};


export const PartNames = [
  "Engine",
  "ERS",
  "Gearbox",
  "Chassis",
  "Front Wing",
  "Rear Wing",
  "Sidepods",
  "Underfloor",
  "Suspension",
];


export const PartStatNames = [
  "Airflow Front",
  "Airflow Sensitivity",
  "Brake Cooling",
  "DRS Delta",
  "Drag Reduction",
  "Engine Cooling",
  "Fuel Efficiency",
  "Low Speed Downforce",
  "Med Speed Downforce",
  "High Speed Downforce",
  "Power",
  "Power Loss Threshold",
  "Wear Resistance",
  "Airflow Middle",
  "Thermal Resistance",
  "Minimum Lifespan",
];
