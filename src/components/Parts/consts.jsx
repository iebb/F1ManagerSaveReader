import {
  PartCalculationStats2024,
  PartStats2024,
  PartStatsCategorized2024,
  PSF2024
} from "@/components/Parts/consts_2024";
import {PartCalculationStats2022, PartStats2022, PSF2022} from "./consts_2022";
import {PartCalculationStats2023, PartStats2023, PartStatsCategorized2023, PSF2023} from "./consts_2023";

export const PartStatsV = {
  2: PartStats2022,
  3: PartStats2023,
  4: PartStats2024,
}

export const PartFactorsV = {
  2: PSF2022,
  3: PSF2023,
  4: PSF2024,
}

export const PartCalculationStatsV = {
  2: PartCalculationStats2022,
  3: PartCalculationStats2023,
  4: PartCalculationStats2024,
}


export const PartStatsCategorizedV = {
  2: PartStatsCategorized2023,
  3: PartStatsCategorized2023,
  4: PartStatsCategorized2024,
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
