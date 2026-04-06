import {BasicInfoContext, DatabaseContext, MetadataContext} from "@/js/Contexts";
import {getDriverName} from "@/js/localization";
import {Autocomplete, TextField} from "@mui/material";
import * as React from "react";
import {useContext, useEffect, useState} from "react";
import {assignRandomRaceNumber, fireDriverContract, getStaff} from "../People/commons/drivers";

export default function TeamContractSwapper(props) {
  const {swapRow, setSwapRow, refresh} = props;
  const database = useContext(DatabaseContext);
  const {version} = useContext(MetadataContext);
  const basicInfo = useContext(BasicInfoContext);
  const {player} = basicInfo;

  const ctx = {database, version, basicInfo};
  const [swapDriver, setSwapDriver] = useState(null);
  const [_drivers, setDrivers] = useState([]);
  const [updated, setUpdated] = useState(0);
  const _refresh = () => setUpdated(+new Date());

  useEffect(() => {
    if (swapRow) {
      setDrivers(getStaff(ctx, swapRow.StaffType)[1]);
      setSwapDriver(null);
    }
  }, [swapRow, updated]);

  if (!swapRow) return null;

  const swapDriverUpdated = _drivers.find((d) => d.StaffID === swapDriver?.id);
  const currentContract = swapRow?.Contracts?.[0];
  const targetContract = swapDriverUpdated?.Contracts?.[0];

  const infoCardClass = "border border-white/10 bg-white/[0.03] p-4";

  const swapContracts = (staff1, staff2, permanentSwap = true) => {
    const season = basicInfo.player.CurrentSeason;
    const staff1ID = staff1.StaffID;
    const staffType = staff1.StaffType;
    const staff2ID = staff2.StaffID;
    let results;
    let values;

    const teamFormulas = {};

    results = database.exec(`SELECT TeamID, Formula FROM Teams`);
    if (results.length) {
      for (const [TeamID, Formula] of results[0].values) {
        teamFormulas[TeamID] = Formula;
      }
    }

    [{values}] = database.exec(`SELECT Min(Day), Max(Day) FROM 'Seasons_Deadlines' WHERE SeasonID = ${season}`);
    const [seasonStart, seasonEnd] = values[0];

    let staff1Team, staff2Team;
    let staff1StartDay, staff2StartDay;
    let staff1PIT, staff2PIT;

    results = database.exec(`SELECT StartDay, TeamID, PosInTeam FROM Staff_Contracts WHERE ContractType = 0 AND StaffID = ${staff1ID}`);
    if (results.length) {
      [[staff1StartDay, staff1Team, staff1PIT]] = results[0].values;
    }

    results = database.exec(`SELECT StartDay, TeamID, PosInTeam FROM Staff_Contracts WHERE ContractType = 0 AND StaffID = ${staff2ID}`);
    if (results.length) {
      [[staff2StartDay, staff2Team, staff2PIT]] = results[0].values;
    }

    const sameFormula = staff1Team && staff2Team && teamFormulas[staff1Team] === teamFormulas[staff2Team];

    database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1ID}, ContractType = 130 WHERE StaffID = ${staff2ID} AND ContractType = 3`);
    database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2ID}, ContractType = 130 WHERE StaffID = ${staff1ID} AND ContractType = 3`);
    database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1ID}, ContractType = 120 WHERE StaffID = ${staff2ID} AND ContractType = 2`);
    database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2ID}, ContractType = 120 WHERE StaffID = ${staff1ID} AND ContractType = 2`);

    if (permanentSwap) {
      database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1ID}, ContractType = 100, StartDay = ${player.Day} WHERE StaffID = ${staff2ID} AND ContractType = 0`);
      database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2ID}, ContractType = 100, StartDay = ${player.Day} WHERE StaffID = ${staff1ID} AND ContractType = 0`);

      database.exec(`DELETE FROM Staff_CareerHistory WHERE EndDay <= StartDay`);

      if (version === 2) {
        if (staff1.StartDay !== player.Day && staff1Team) {
          database.exec(`INSERT INTO Staff_CareerHistory VALUES (${staff1ID}, ${staff1Team}, ${staff1StartDay}, ${player.Day})`);
        }
        if (staff2.StartDay !== player.Day && staff2Team) {
          database.exec(`INSERT INTO Staff_CareerHistory VALUES (${staff2ID}, ${staff2Team}, ${staff2StartDay}, ${player.Day})`);
        }
      } else {
        if (staff1.StartDay !== player.Day && staff1Team) {
          database.exec(`INSERT INTO Staff_CareerHistory VALUES (${staff1ID}, ${staff1Team}, ${staff1StartDay}, ${player.Day}, ${staff1PIT})`);
        }
        if (staff2.StartDay !== player.Day && staff2Team) {
          database.exec(`INSERT INTO Staff_CareerHistory VALUES (${staff2ID}, ${staff2Team}, ${staff2StartDay}, ${player.Day}, ${staff2PIT})`);
        }
      }
    } else {
      database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff1ID}, ContractType = 100 WHERE StaffID = ${staff2ID} AND ContractType = 0`);
      database.exec(`UPDATE Staff_Contracts SET StaffID = ${staff2ID}, ContractType = 100 WHERE StaffID = ${staff1ID} AND ContractType = 0`);
    }

    if (version <= 3) {
      database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 0 WHERE ContractType = 100`);
      database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 2 WHERE ContractType = 120`);
      database.exec(`UPDATE Staff_Contracts SET Accepted = 1, ContractType = 3 WHERE ContractType = 130`);
    } else {
      database.exec(`UPDATE Staff_Contracts SET ContractType = 0 WHERE ContractType = 100`);
      database.exec(`UPDATE Staff_Contracts SET ContractType = 2 WHERE ContractType = 120`);
      database.exec(`UPDATE Staff_Contracts SET ContractType = 3 WHERE ContractType = 130`);
    }

    if (staffType === 0) {
      let [{values: [[AssignedCarNumber1]]}] = database.exec(`SELECT AssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${staff1ID}`);
      let [{values: [[AssignedCarNumber2]]}] = database.exec(`SELECT AssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${staff2ID}`);

      database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = :acn WHERE StaffID = ${staff2ID}`, {":acn": AssignedCarNumber1});
      database.exec(`UPDATE Staff_DriverData SET AssignedCarNumber = :acn WHERE StaffID = ${staff1ID}`, {":acn": AssignedCarNumber2});

      let formulaStaff1 = AssignedCarNumber1 ? teamFormulas[staff1Team] : 0;
      let formulaStaff2 = AssignedCarNumber2 ? teamFormulas[staff2Team] : 0;

      if (version >= 4) {
        let [{values: [[FeederSeriesAssignedCarNumber1]]}] = database.exec(`SELECT FeederSeriesAssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${staff1ID}`);
        let [{values: [[FeederSeriesAssignedCarNumber2]]}] = database.exec(`SELECT FeederSeriesAssignedCarNumber FROM Staff_DriverData WHERE StaffID = ${staff2ID}`);

        database.exec(`UPDATE Staff_DriverData SET FeederSeriesAssignedCarNumber = :acn WHERE StaffID = ${staff2ID}`, {":acn": FeederSeriesAssignedCarNumber1});
        database.exec(`UPDATE Staff_DriverData SET FeederSeriesAssignedCarNumber = :acn WHERE StaffID = ${staff1ID}`, {":acn": FeederSeriesAssignedCarNumber2});

        if (FeederSeriesAssignedCarNumber1) {
          formulaStaff1 = teamFormulas[staff1Team];
          formulaStaff2 = teamFormulas[staff2Team];
        }
      }

      const driverPairs = [
        [staff1ID, staff2ID, formulaStaff1, formulaStaff2],
        [staff2ID, staff1ID, formulaStaff2, formulaStaff1],
      ];
      for (const [A, B, formulaA, formulaB] of driverPairs) {
        results = database.exec(`SELECT RaceEngineerID FROM Staff_RaceEngineerDriverAssignments WHERE IsCurrentAssignment = 1 AND DriverID = ${A}`);
        if (results.length) {
          let [{values: [[engineerA]]}] = results;
          database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 0 WHERE RaceEngineerID = ${engineerA} AND DriverID = ${A}`);
          results = database.exec(`SELECT DaysTogether FROM Staff_RaceEngineerDriverAssignments WHERE RaceEngineerID = ${engineerA} AND DriverID = ${B}`);
          if (results.length) {
            database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 3 WHERE RaceEngineerID = ${engineerA} AND DriverID = ${B}`);
          } else {
            database.exec(`INSERT INTO Staff_RaceEngineerDriverAssignments VALUES (${engineerA}, ${B}, 0, 50, 3)`);
          }
        }

        if (formulaA) {
          switch (version) {
            case 2:
              if (formulaA === 1) {
                results = database.exec(`SELECT 1 FROM Races_DriverStandings WHERE DriverID = ${A} AND SeasonID = ${season}`);
                if (results.length) {
                  results = database.exec(`SELECT 1 FROM Races_DriverStandings WHERE DriverID = ${B} AND SeasonID = ${season}`);
                  if (!results.length) {
                    let [{values: [[Position]]}] = database.exec(`SELECT MAX(Position) + 1 FROM Races_DriverStandings WHERE SeasonID = ${season}`);
                    database.exec(`INSERT INTO Races_DriverStandings VALUES (${season}, ${B}, 0, ${Position}, 0, 0)`);
                  }

                  if (!sameFormula) {
                    results = database.exec(`SELECT * FROM Races_Results LEFT JOIN Races On Races.RaceID = Races_Results.RaceID WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd}`);
                    if (!results.length) {
                      database.exec(`DELETE FROM Races_DriverStandings WHERE SeasonID = ${season} AND DriverID = ${A}`);
                    }
                  }
                }
              }
              break;
            case 3:
            case 4:
              if (formulaA > 0) {
                results = database.exec(`SELECT RaceFormula FROM Races_DriverStandings WHERE DriverID = ${B} AND SeasonID = ${season} AND RaceFormula = ${formulaA}`);
                if (!results.length) {
                  let [{values: [[Position]]}] = database.exec(`SELECT MAX(Position) + 1 FROM Races_DriverStandings WHERE SeasonID = ${season} AND RaceFormula = ${formulaA}`);
                  database.exec(`INSERT INTO Races_DriverStandings VALUES (${season}, ${B}, 0, ${Position}, 0, 0, ${formulaA})`);
                }
              }

              results = database.exec(`SELECT RaceFormula FROM Races_DriverStandings WHERE DriverID = ${A} AND SeasonID = ${season}`);
              if (results.length) {
                for (let {values: [[RaceFormula]]} of results) {
                  if (RaceFormula !== formulaB) {
                    let racesCompleted = false;
                    if (RaceFormula === 1) {
                      results = database.exec(`SELECT * FROM Races_Results LEFT JOIN Races On Races.RaceID = Races_Results.RaceID WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd}`);
                      racesCompleted = results.length > 0;
                    } else {
                      results = database.exec(`SELECT * FROM Races_FeatureRaceResults LEFT JOIN Races On Races.RaceID = Races_FeatureRaceResults.RaceID WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd} AND RaceFormula = ${RaceFormula}`);
                      racesCompleted = results.length > 0;
                    }

                    if (!racesCompleted) {
                      results = database.exec(`SELECT * FROM Races_SprintResults LEFT JOIN Races On Races.RaceID = Races_SprintResults.RaceID WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd} AND RaceFormula = ${RaceFormula}`);
                      racesCompleted = results.length > 0;
                    }

                    if (!racesCompleted) {
                      results = database.exec(`SELECT * FROM Races_QualifyingResults LEFT JOIN Races On Races.RaceID = Races_QualifyingResults.RaceID WHERE DriverID = ${A} AND Day >= ${seasonStart} AND Day <= ${seasonEnd} AND RaceFormula = ${RaceFormula}`);
                      racesCompleted = results.length > 0;
                    }

                    if (!racesCompleted) {
                      database.exec(`DELETE FROM Races_DriverStandings WHERE SeasonID = ${season} AND DriverID = ${A} AND RaceFormula = ${RaceFormula}`);
                    }
                  }
                }
              }
          }
        }
      }

      database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 1 WHERE IsCurrentAssignment = 3`);
    } else if (staffType === 2) {
      const raceEngineerPairs = [[staff1ID, staff2ID], [staff2ID, staff1ID]];
      for (const [A, B] of raceEngineerPairs) {
        results = database.exec(`SELECT DriverID FROM Staff_RaceEngineerDriverAssignments WHERE IsCurrentAssignment = 1 AND RaceEngineerID = ${A}`);
        if (results.length) {
          let [{values: [[engineerA]]}] = results;
          database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 0 WHERE DriverID = ${engineerA} AND RaceEngineerID = ${A}`);
          results = database.exec(`SELECT DaysTogether FROM Staff_RaceEngineerDriverAssignments WHERE DriverID = ${engineerA} AND RaceEngineerID = ${B}`);
          if (results.length) {
            database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 3 WHERE DriverID = ${engineerA} AND RaceEngineerID = ${B}`);
          } else {
            database.exec(`INSERT INTO Staff_RaceEngineerDriverAssignments VALUES (${B}, ${engineerA}, 0, 50, 3)`);
          }
        }
      }
      database.exec(`UPDATE Staff_RaceEngineerDriverAssignments SET IsCurrentAssignment = 1 WHERE IsCurrentAssignment = 3`);
    }
    _refresh();
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-[860px] border border-white/10 bg-[#1c2127] shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between gap-4">
          <div className="p-5 pb-4">
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Contract Replacement</div>
            <h3 className="mt-2 text-lg font-bold text-white">Replace {getDriverName(swapRow)}</h3>
            <p className="mt-2 text-sm text-slate-400">
              Choose another contracted person in the same role, then apply a temporary or permanent swap.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSwapRow(null)}
            className="m-5 border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            Close
          </button>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className={infoCardClass}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Current Contract</div>
              <div className="mt-3 text-base font-semibold text-white">{getDriverName(swapRow)}</div>
              <div className="mt-1 text-sm text-slate-400">
                {currentContract?.TeamID ? `Team ${currentContract.TeamID}` : "Currently unassigned"}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Role</div>
                  <div className="mt-1 text-slate-200">{swapRow.StaffType === 0 ? "Driver" : swapRow.StaffType === 2 ? "Race Engineer" : "Staff"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Contract</div>
                  <div className="mt-1 text-slate-200">
                    {currentContract?.EndSeason ? `Until ${currentContract.EndSeason}` : "Active"}
                  </div>
                </div>
              </div>
            </div>

            <div className={infoCardClass}>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Replacement Target</div>
              <div className="mt-3">
                <Autocomplete
                  disablePortal
                  options={_drivers.filter((x) => x.StaffID !== swapRow.StaffID).map((r) => ({
                    label: getDriverName(r),
                    id: r.StaffID,
                    number: r.CurrentNumber,
                    driver: r,
                  }))}
                  value={swapDriver}
                  isOptionEqualToValue={(opt, val) => opt.id === val.id}
                  onChange={(e, nv) => setSwapDriver(nv)}
                  renderInput={(params) => <TextField {...params} label="Swap with" autoComplete="off" />}
                />
              </div>
              <div className="mt-4 min-h-[72px] border border-white/10 bg-black/10 p-3">
                {swapDriverUpdated ? (
                  <>
                    <div className="text-sm font-semibold text-white">{getDriverName(swapDriverUpdated)}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {targetContract?.TeamID ? `Team ${targetContract.TeamID}` : "Currently unassigned"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {targetContract?.EndSeason ? `Contract until ${targetContract.EndSeason}` : "No active contract details"}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">Select a replacement to review the target contract.</div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="border border-sky-400/20 bg-sky-500/8 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-200">Temporary</div>
              <div className="mt-2 text-sm text-slate-300">Swaps the active contract without writing a clean career-history split.</div>
            </div>
            <div className="border border-amber-400/20 bg-amber-500/8 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">Permanent</div>
              <div className="mt-2 text-sm text-slate-300">Updates career history immediately and makes the move persistent.</div>
            </div>
            <div className="border border-rose-400/20 bg-rose-500/8 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-200">Fire</div>
              <div className="mt-2 text-sm text-slate-300">Removes the current contract from this slot entirely.</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/10 px-5 py-4">
          <div className="text-xs text-slate-500">
            Only same-role contracted staff are available as swap targets.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-white/20 hover:bg-white/[0.06] disabled:cursor-default disabled:opacity-40"
              disabled={!swapDriver || swapRow.StaffID === swapDriver.id}
              onClick={() => {
                if (swapDriver && swapRow.StaffID !== swapDriver.id) {
                  if (swapRow.StaffType === 0 && !swapDriver.number) {
                    assignRandomRaceNumber(ctx, swapDriver.id);
                  }
                  swapContracts(swapRow, swapDriver.driver, false);
                  refresh();
                  setSwapRow(null);
                }
              }}
            >
              Temporary Swap
            </button>
            <button
              type="button"
              className="border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-500/16 disabled:cursor-default disabled:opacity-40"
              disabled={!swapDriver || swapRow.StaffID === swapDriver.id}
              onClick={() => {
                if (swapDriver && swapRow.StaffID !== swapDriver.id) {
                  if (swapRow.StaffType === 0 && !swapDriver.number) {
                    assignRandomRaceNumber(ctx, swapDriver.id);
                  }
                  swapContracts(swapRow, swapDriver.driver, true);
                  refresh();
                  setSwapRow(null);
                }
              }}
            >
              Permanent Swap
            </button>
            <button
              type="button"
              className="border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/16"
              onClick={() => {
                fireDriverContract(ctx, swapRow.StaffID);
                refresh();
                setSwapRow(null);
              }}
            >
              Fire Contract
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
