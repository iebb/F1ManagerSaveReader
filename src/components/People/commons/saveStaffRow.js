import {dayToDate, localDateToDay, formatISODateLocal} from "@/js/localization";
import {runInTransaction} from "@/js/database/utils";
import {localeStaffStats} from "./staffCommon";

function numericValue(value, label, max = Infinity) {
  const number = Number(value);
  if (value == null || String(value).trim() === "" || !Number.isFinite(number) || number < 0 || number > max) {
    throw new Error(`${label} must be ${max === Infinity ? "a non-negative number" : `a number from 0 to ${max}`}.`);
  }
  return number;
}

export function saveStaffRow({database, version, staffType, staffStats}, newRow, oldRow) {
  const savedRow = {...newRow};
  const basicDataTable = version === 2 ? "Staff_CommonData" : "Staff_BasicData";
  const retirementDataTable = version === 2 ? "Staff_CommonData" : "Staff_GameData";

  return runInTransaction(database, () => {
    for (const stat of staffStats) {
      const field = `performance_stats_${stat}`;
      if (newRow[field] === oldRow[field]) continue;
      savedRow[field] = numericValue(newRow[field], localeStaffStats[`STAFF_STAT_${stat}`] || "Rating", 100);
      database.exec(`INSERT INTO Staff_PerformanceStats (StaffID, StatID, Val, Max)
        VALUES (:staffId, :stat, :value, 100)
        ON CONFLICT(StaffID, StatID) DO UPDATE SET Val = excluded.Val`, {
        ":staffId": newRow.StaffID, ":stat": stat, ":value": savedRow[field],
      });
    }

    if (staffType === 0) {
      const fields = ["Improvability", "Aggression", ...(version >= 4 ? ["Marketability", "TargetMarketability"] : [])];
      for (const field of fields) {
        if (newRow[field] === oldRow[field]) continue;
        savedRow[field] = numericValue(newRow[field], field, 100);
        database.exec(`UPDATE Staff_DriverData SET ${field} = :value WHERE StaffID = :staffId`, {
          ":value": savedRow[field], ":staffId": newRow.StaffID,
        });
      }
    }

    if (newRow.RetirementAge !== oldRow.RetirementAge) {
      savedRow.RetirementAge = numericValue(newRow.RetirementAge, "Retirement age");
      database.exec(`UPDATE ${retirementDataTable} SET RetirementAge = :value WHERE StaffID = :staffId`, {
        ":value": savedRow.RetirementAge, ":staffId": newRow.StaffID,
      });
    }
    if (newRow.Salary !== oldRow.Salary && oldRow.Salary > 0) {
      savedRow.Salary = numericValue(newRow.Salary, "Salary");
      database.exec("UPDATE Staff_Contracts SET Salary = :value WHERE StaffID = :staffId AND ContractType = 0", {
        ":value": savedRow.Salary, ":staffId": newRow.StaffID,
      });
    }
    if (newRow.DOB !== oldRow.DOB) {
      const date = newRow.DOB instanceof Date ? newRow.DOB : dayToDate(newRow.DOB);
      if (newRow.DOB == null || !Number.isFinite(date.getTime())) throw new Error("Enter a valid date of birth.");
      savedRow.DOB = localDateToDay(date);
      database.exec(`UPDATE ${basicDataTable} SET DOB = :day, DOB_ISO = :iso WHERE StaffID = :staffId`, {
        ":day": savedRow.DOB, ":iso": formatISODateLocal(date), ":staffId": newRow.StaffID,
      });
    }
    return savedRow;
  });
}
