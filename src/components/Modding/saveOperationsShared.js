import {
  circuitNames,
} from "@/js/localization";
import {readRows as sharedReadRows} from "@/js/database/utils";
import {getTeamDisplayName as sharedGetTeamDisplayName} from "@/js/utils/teamDisplay";

export const objectiveStateLabels = {
  0: "Ongoing",
  1: "Complete",
  2: "Failed",
  3: "Critically Failed",
};

export const inspectionStateLabels = {
  0: "Exempt",
  1: "Pending",
  2: "Failed",
  3: "Destroyed",
};

export const eventTypeLabels = {
  0: "Building Constructed",
  1: "Building Upgraded",
  2: "Building Refurbished",
  3: "Part Designed",
  4: "Part Manufactured",
  5: "Scouting Completed",
  6: "Part Researched",
};

export const getTeamDisplayName = sharedGetTeamDisplayName;
export const readRows = sharedReadRows;

export const clampPercentage = (value, max) => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / max) * 100));
};

export const normalizePitStopSeconds = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric >= 1e6) {
    return null;
  }
  return numeric;
};

export const formatPitStopSeconds = (value) => {
  const numeric = normalizePitStopSeconds(value);
  return Number.isFinite(numeric) ? `${numeric.toFixed(3)}s` : "NO TIME";
};

export const calculateMedian = (values) => {
  const numericValues = values
    .map((value) => normalizePitStopSeconds(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  if (!numericValues.length) {
    return null;
  }
  const middle = Math.floor(numericValues.length / 2);
  if (numericValues.length % 2 === 1) {
    return numericValues[middle];
  }
  return (numericValues[middle - 1] + numericValues[middle]) / 2;
};

export const calculateAverage = (values) => {
  const numericValues = values
    .map((value) => normalizePitStopSeconds(value))
    .filter((value) => Number.isFinite(value));
  if (!numericValues.length) {
    return null;
  }
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

export const getRaceName = (trackId, raceId) => circuitNames[trackId] || `Race ${raceId}`;
