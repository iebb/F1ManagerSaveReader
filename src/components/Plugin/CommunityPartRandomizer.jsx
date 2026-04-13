import {DatabaseContext} from "@/js/Contexts";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Paper,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {useSnackbar} from "notistack";
import * as React from "react";
import {useContext, useState} from "react";

const PART_SCOPE_OPTIONS = [
  { value: "ALL", label: "All teams" },
  { value: "AI", label: "AI only" },
  { value: "PLAYER", label: "Player only" },
];

const DRIVER_STAT_IDS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

function parseTrackerValue(value, fallback) {
  const numeric = Number.parseInt(value, 10);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function dayToIso(dayNumber) {
  if (dayNumber === null || dayNumber === undefined || dayNumber < 0) {
    return "IN DEVELOPMENT";
  }

  const base = new Date(Date.UTC(1900, 0, 1));
  base.setUTCDate(base.getUTCDate() + dayNumber - 2);
  return base.toISOString().slice(0, 10);
}

function formatDriverName(name) {
  if (!name) {
    return "Unknown";
  }
  return String(name).split("_").pop().replace(/\]$/, "");
}

function randomBetweenZeroAndOne() {
  return Math.random();
}

function ensureDiffTable(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS Parts_Designs_diff (
      DesignID INTEGER,
      PartType INTEGER,
      PartStat INTEGER,
      Difference REAL,
      PreviousDesignID INTEGER,
      TeamID INTEGER,
      RandomPercent REAL,
      IsNegativeDifference INTEGER DEFAULT 0,
      PRIMARY KEY (DesignID, PartStat)
    )
  `);

  const columns = (database.getAllRows(`PRAGMA table_info('Parts_Designs_diff')`) || []).map((row) => row.name);
  const missingColumns = [
    ["PreviousDesignID", "INTEGER"],
    ["TeamID", "INTEGER"],
    ["RandomPercent", "REAL"],
    ["PartType", "INTEGER"],
    ["IsNegativeDifference", "INTEGER DEFAULT 0"],
  ].filter(([name]) => !columns.includes(name));

  for (const [name, type] of missingColumns) {
    database.exec(`ALTER TABLE Parts_Designs_diff ADD COLUMN ${name} ${type}`);
  }
}

function calculateDifferencesAndStore(database) {
  ensureDiffTable(database);

  const [{ CurrentSeason: currentSeason }] = database.getAllRows(`
    SELECT CurrentSeason
    FROM Player_State
    LIMIT 1
  `);

  const designs = database.getAllRows(`
    SELECT DesignID, PartType, TeamID
    FROM Parts_Designs
    WHERE ValidFrom <= :currentSeason
    ORDER BY DesignID ASC
  `, {
    ":currentSeason": currentSeason,
  });

  for (const design of designs) {
    const previousDesign = database.getAllRows(`
      SELECT DesignID
      FROM Parts_Designs
      WHERE PartType = :partType
        AND TeamID = :teamId
        AND DesignID < :designId
        AND ValidFrom <= :currentSeason
      ORDER BY DesignID DESC
      LIMIT 1
    `, {
      ":partType": design.PartType,
      ":teamId": design.TeamID,
      ":designId": design.DesignID,
      ":currentSeason": currentSeason,
    })[0];

    if (!previousDesign) {
      continue;
    }

    const previousValues = Object.fromEntries(
      database.getAllRows(`
        SELECT PartStat, Value
        FROM Parts_Designs_StatValues
        WHERE DesignID = :designId
      `, {
        ":designId": previousDesign.DesignID,
      }).map((row) => [row.PartStat, row.Value])
    );

    const currentValues = database.getAllRows(`
      SELECT PartStat, Value
      FROM Parts_Designs_StatValues
      WHERE DesignID = :designId
    `, {
      ":designId": design.DesignID,
    });

    for (const row of currentValues) {
      if (row.PartStat === 15) {
        continue;
      }

      const previousValue = previousValues[row.PartStat];
      if (previousValue === undefined) {
        continue;
      }

      const existing = database.getAllRows(`
        SELECT Difference
        FROM Parts_Designs_diff
        WHERE DesignID = :designId
          AND PartStat = :partStat
        LIMIT 1
      `, {
        ":designId": design.DesignID,
        ":partStat": row.PartStat,
      })[0];

      const difference = existing?.Difference ?? (row.Value - previousValue);

      database.exec(`
        INSERT OR REPLACE INTO Parts_Designs_diff
          (DesignID, PartType, PartStat, Difference, PreviousDesignID, TeamID, RandomPercent, IsNegativeDifference)
        VALUES
          (:designId, :partType, :partStat, :difference, :previousDesignId, :teamId, COALESCE(
            (SELECT RandomPercent FROM Parts_Designs_diff WHERE DesignID = :designId AND PartStat = :partStat),
            0
          ), :isNegativeDifference)
      `, {
        ":designId": design.DesignID,
        ":partType": design.PartType,
        ":partStat": row.PartStat,
        ":difference": difference,
        ":previousDesignId": previousDesign.DesignID,
        ":teamId": design.TeamID,
        ":isNegativeDifference": difference < 0 ? 1 : 0,
      });
    }
  }
}

function buildReport(database) {
  ensureDiffTable(database);

  const player = database.getAllRows(`SELECT TeamID FROM Player LIMIT 1`)[0];
  const state = database.getAllRows(`SELECT CurrentSeason FROM Player_State LIMIT 1`)[0];
  const playerTeamId = player?.TeamID ?? -1;
  const currentSeason = state?.CurrentSeason ?? 0;

  const reportData = database.getAllRows(`
    SELECT
      t.TeamName AS TeamName,
      pdt.name AS PartName,
      d.DayCompleted AS DayCompleted,
      d.WindTunnelTime AS WindTunnelTime,
      d.CFD AS CFD,
      pd.DesignID AS DesignID,
      pd.PreviousDesignID AS PreviousDesignID,
      AVG(pd.RandomPercent) AS AvgRandomPercent,
      t.TeamID AS TeamID,
      d.ValidFrom AS ValidFrom,
      MAX(pd.IsNegativeDifference) AS IsNegativeDifference
    FROM Parts_Designs_diff pd
    JOIN Parts_Designs d ON pd.DesignID = d.DesignID
    JOIN Teams t ON pd.TeamID = t.TeamID
    JOIN Parts_Enum_Type pdt ON pd.PartType = pdt.Value
    GROUP BY pd.DesignID, t.TeamName, pdt.name, d.DayCompleted, d.WindTunnelTime, d.CFD, pd.PreviousDesignID, t.TeamID, d.ValidFrom
    ORDER BY d.DayCompleted DESC, pd.DesignID DESC
  `);

  return reportData.map((row) => {
    const randomPercent = Number(row.AvgRandomPercent ?? 0);
    let rating = "IN DEVELOPMENT";
    let tone = "default";

    if (row.ValidFrom !== currentSeason + 1 && randomPercent !== 0) {
      if (randomPercent < 20) {
        rating = row.IsNegativeDifference ? "GREAT" : "AWFUL";
        tone = row.IsNegativeDifference ? "info" : "error";
      } else if (randomPercent < 40) {
        rating = row.IsNegativeDifference ? "GOOD" : "BAD";
        tone = row.IsNegativeDifference ? "success" : "warning";
      } else if (randomPercent < 60) {
        rating = "AS EXPECTED";
      } else if (randomPercent < 80) {
        rating = row.IsNegativeDifference ? "BAD" : "GOOD";
        tone = row.IsNegativeDifference ? "warning" : "success";
      } else {
        rating = row.IsNegativeDifference ? "AWFUL" : "GREAT";
        tone = row.IsNegativeDifference ? "error" : "info";
      }
    }

    return {
      id: `${row.DesignID}-${row.ValidFrom}`,
      teamName: row.TeamName,
      partName: row.PartName,
      dayCompleted: dayToIso(row.DayCompleted),
      windTunnel: row.WindTunnelTime,
      cfd: row.CFD,
      designId: row.DesignID,
      previousDesignId: row.PreviousDesignID,
      progress: row.ValidFrom === currentSeason + 1 ? "RESEARCH" : rating,
      tone,
      isPlayerTeam: row.TeamID === playerTeamId,
      isResearch: row.ValidFrom === currentSeason + 1,
    };
  });
}

export default function CommunityPartRandomizer() {
  const database = useContext(DatabaseContext);
  const { enqueueSnackbar } = useSnackbar();

  const [scope, setScope] = useState("ALL");
  const [difficulty, setDifficulty] = useState(1);
  const [multiplier, setMultiplier] = useState(1.5);
  const [log, setLog] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [busyAction, setBusyAction] = useState("");

  const runPartRandomizer = () => {
    if (!database) {
      return;
    }

    setBusyAction("parts");

    try {
      database.exec("BEGIN");
      ensureDiffTable(database);
      calculateDifferencesAndStore(database);

      const state = database.getAllRows(`
        SELECT Day, CurrentSeason
        FROM Player_State
        LIMIT 1
      `)[0];
      const player = database.getAllRows(`
        SELECT TeamID
        FROM Player
        LIMIT 1
      `)[0];
      const lastRunRow = database.getAllRows(`
        SELECT name
        FROM Parts_Enum_Stats
        WHERE Value = 12
        LIMIT 1
      `)[0];

      const currentDate = state?.Day ?? 0;
      const currentSeason = state?.CurrentSeason ?? 0;
      const playerTeamId = player?.TeamID ?? -1;
      const previousUpdateDate = parseTrackerValue(lastRunRow?.name, 45341);

      const params = {
        ":previousUpdateDate": previousUpdateDate,
        ":currentDate": currentDate,
        ":currentSeason": currentSeason,
        ":playerTeamId": playerTeamId,
      };

      const scopeClause = scope === "AI"
        ? "AND TeamID != :playerTeamId"
        : (scope === "PLAYER" ? "AND TeamID = :playerTeamId" : "");

      const designsToModify = database.getAllRows(`
        SELECT DesignID, PartType, TeamID
        FROM Parts_Designs
        WHERE DayCompleted BETWEEN :previousUpdateDate AND :currentDate
          ${scopeClause}
          AND ValidFrom <= :currentSeason
        ORDER BY DesignID ASC
      `, params);

      const detailedLogs = [];
      let updateCount = 0;

      for (const design of designsToModify) {
        const randomPercentage = randomBetweenZeroAndOne();
        const previousDesign = database.getAllRows(`
          SELECT DesignID
          FROM Parts_Designs
          WHERE PartType = :partType
            AND TeamID = :teamId
            AND DesignID < :designId
            AND ValidFrom <= :currentSeason
          ORDER BY DesignID DESC
          LIMIT 1
        `, {
          ":partType": design.PartType,
          ":teamId": design.TeamID,
          ":designId": design.DesignID,
          ":currentSeason": currentSeason,
        })[0];

        if (!previousDesign) {
          continue;
        }

        const previousValues = Object.fromEntries(
          database.getAllRows(`
            SELECT PartStat, Value
            FROM Parts_Designs_StatValues
            WHERE DesignID = :designId
          `, {
            ":designId": previousDesign.DesignID,
          }).map((row) => [row.PartStat, row.Value])
        );

        const currentValues = database.getAllRows(`
          SELECT PartStat, Value
          FROM Parts_Designs_StatValues
          WHERE DesignID = :designId
        `, {
          ":designId": design.DesignID,
        });

        for (const statRow of currentValues) {
          if (statRow.PartStat === 15) {
            continue;
          }

          const previousValue = previousValues[statRow.PartStat];
          if (previousValue === undefined) {
            continue;
          }

          const existingDiff = database.getAllRows(`
            SELECT Difference
            FROM Parts_Designs_diff
            WHERE DesignID = :designId
              AND PartStat = :partStat
            LIMIT 1
          `, {
            ":designId": design.DesignID,
            ":partStat": statRow.PartStat,
          })[0];

          if (!existingDiff) {
            continue;
          }

          const originalDifference = Number(existingDiff.Difference);
          const low = previousValue;
          const high = design.TeamID === playerTeamId
            ? previousValue + (2 * originalDifference)
            : previousValue + (2 * (originalDifference * multiplier));

          let newValue = low + ((high - low) * randomPercentage);
          let adjustment = 0;

          if (design.TeamID !== playerTeamId) {
            adjustment = originalDifference * (difficulty - 1);
            newValue += adjustment;
          }

          database.exec(`
            UPDATE Parts_Designs_StatValues
            SET Value = :value, UnitValue = :unitValue
            WHERE DesignID = :designId
              AND PartStat = :partStat
          `, {
            ":value": newValue,
            ":unitValue": newValue / 10,
            ":designId": design.DesignID,
            ":partStat": statRow.PartStat,
          });

          database.exec(`
            INSERT OR REPLACE INTO Parts_Designs_diff
              (DesignID, PartType, PartStat, Difference, PreviousDesignID, TeamID, RandomPercent, IsNegativeDifference)
            VALUES
              (:designId, :partType, :partStat, :difference, :previousDesignId, :teamId, :randomPercent, :isNegativeDifference)
          `, {
            ":designId": design.DesignID,
            ":partType": design.PartType,
            ":partStat": statRow.PartStat,
            ":difference": originalDifference,
            ":previousDesignId": previousDesign.DesignID,
            ":teamId": design.TeamID,
            ":randomPercent": randomPercentage * 100,
            ":isNegativeDifference": originalDifference < 0 ? 1 : 0,
          });

          detailedLogs.push(
            `Design ${design.DesignID} Stat ${statRow.PartStat}: prev=${previousValue}, current=${statRow.Value}, diff=${originalDifference}, random=${(randomPercentage * 100).toFixed(2)}%, adjustment=${adjustment.toFixed(3)}, new=${newValue.toFixed(3)}`
          );
          updateCount += 1;
        }
      }

      database.exec(`
        UPDATE Parts_Enum_Stats
        SET name = :nextDate
        WHERE Value = 12
      `, {
        ":nextDate": currentDate + 1,
      });

      database.exec("COMMIT");

      const nextReport = buildReport(database);
      setReportRows(nextReport);
      setLog([
        `@sam_fakt Part Randomizer`,
        `Scope: ${scope}`,
        `Multiplier: ${multiplier.toFixed(1)}`,
        `Difficulty: ${difficulty.toFixed(1)}`,
        `Updated stat rows: ${updateCount}`,
        "",
        detailedLogs.length ? detailedLogs.join("\n") : "No eligible part stat rows were updated.",
      ].join("\n"));

      enqueueSnackbar(`Updated ${updateCount} part stat rows.`, {
        variant: updateCount ? "success" : "warning",
      });
    } catch (error) {
      try {
        database.exec("ROLLBACK");
      } catch {
        // Ignore rollback failures after partial transaction state changes.
      }
      enqueueSnackbar(`Part randomizer failed: ${error.message || error}`, { variant: "error" });
    } finally {
      setBusyAction("");
    }
  };

  const runDriverRandomizer = () => {
    if (!database) {
      return;
    }

    setBusyAction("drivers");

    try {
      database.exec("BEGIN");

      const state = database.getAllRows(`
        SELECT Day, CurrentSeason
        FROM Player_State
        LIMIT 1
      `)[0];
      const lastRunRow = database.getAllRows(`
        SELECT name
        FROM Parts_Enum_Stats
        WHERE Value = 13
        LIMIT 1
      `)[0];

      const currentDate = state?.Day ?? 0;
      const currentSeason = state?.CurrentSeason ?? 0;
      const lastUpdateDate = parseTrackerValue(lastRunRow?.name, 45341);
      const daysSinceLastUpdate = Math.max(0, currentDate - lastUpdateDate);

      const drivers = database.getAllRows(`
        SELECT DISTINCT sps.StaffID, sbd.FirstName, sbd.LastName
        FROM Staff_PerformanceStats sps
        JOIN Staff_DriverData sdd ON sdd.StaffID = sps.StaffID
        LEFT JOIN Staff_BasicData sbd ON sbd.StaffID = sps.StaffID
        ORDER BY sps.StaffID ASC
      `);

      const driverLogs = [`Days since last driver update: ${daysSinceLastUpdate}`];
      let statUpdates = 0;
      let improvabilityUpdates = 0;

      for (const driver of drivers) {
        const driverName = `${formatDriverName(driver.FirstName)} ${formatDriverName(driver.LastName)}`.trim();

        const averagePerformanceRow = database.getAllRows(`
          SELECT AVG(
            CASE
              WHEN CombinedResults.Performance = 3 THEN 2
              ELSE CombinedResults.Performance
            END +
            CASE
              WHEN CombinedResults.FinishingPos = 1 THEN 0.35
              WHEN CombinedResults.FinishingPos = 2 THEN 0.15
              WHEN CombinedResults.FinishingPos = 3 THEN 0.05
              ELSE 0
            END
          ) AS AvgPerformance
          FROM (
            SELECT rr.Performance, rr.FinishingPos
            FROM Races_Results rr
            JOIN Races r ON rr.RaceID = r.RaceID
            WHERE rr.DriverID = :driverId
              AND r.SeasonID = :currentSeason
              AND r.Day > :lastUpdateDate
            UNION ALL
            SELECT frr.Performance, frr.FinishingPos
            FROM Races_FeatureRaceResults frr
            JOIN Races r ON frr.RaceID = r.RaceID
            WHERE frr.DriverID = :driverId
              AND r.SeasonID = :currentSeason
              AND r.Day > :lastUpdateDate
          ) AS CombinedResults
        `, {
          ":driverId": driver.StaffID,
          ":currentSeason": currentSeason,
          ":lastUpdateDate": lastUpdateDate,
        })[0];

        const averagePerformance = averagePerformanceRow?.AvgPerformance ?? 1.05388;
        const adjustmentFactor = Math.max(0.210776, Math.min(0.843104, averagePerformance - 0.52694)) / 1.05388;

        driverLogs.push(``);
        driverLogs.push(`Driver: ${driverName || `Staff ${driver.StaffID}`}`);
        driverLogs.push(`Performance factor: ${adjustmentFactor.toFixed(3)}`);

        for (const statId of DRIVER_STAT_IDS) {
          const statRow = database.getAllRows(`
            SELECT Val
            FROM Staff_PerformanceStats
            WHERE StaffID = :driverId
              AND StatID = :statId
            LIMIT 1
          `, {
            ":driverId": driver.StaffID,
            ":statId": statId,
          })[0];

          if (!statRow) {
            continue;
          }

          let currentValue = statRow.Val;
          let changed = false;

          for (let day = 0; day < daysSinceLastUpdate; day += 1) {
            if (Math.random() < 0.0125) {
              const change = Math.random() < adjustmentFactor ? 1 : -1;
              const nextValue = Math.max(1, Math.min(99, currentValue + change));
              if (nextValue !== currentValue) {
                driverLogs.push(`Stat ${statId} day ${day + 1}: ${currentValue} -> ${nextValue}`);
                currentValue = nextValue;
                changed = true;
              }
            }
          }

          if (changed) {
            database.exec(`
              UPDATE Staff_PerformanceStats
              SET Val = :value
              WHERE StaffID = :driverId
                AND StatID = :statId
            `, {
              ":value": currentValue,
              ":driverId": driver.StaffID,
              ":statId": statId,
            });
            statUpdates += 1;
          }
        }

        const improvabilityRow = database.getAllRows(`
          SELECT Improvability
          FROM Staff_DriverData
          WHERE StaffID = :driverId
          LIMIT 1
        `, {
          ":driverId": driver.StaffID,
        })[0];

        let improvability = improvabilityRow?.Improvability ?? 50;
        let improvabilityChanged = false;

        for (let day = 0; day < daysSinceLastUpdate; day += 1) {
          if (Math.random() < 0.0125) {
            const change = Math.random() < adjustmentFactor ? 1 : -1;
            const nextValue = Math.max(1, Math.min(99, improvability + change));
            if (nextValue !== improvability) {
              driverLogs.push(`Improvability day ${day + 1}: ${improvability} -> ${nextValue}`);
              improvability = nextValue;
              improvabilityChanged = true;
            }
          }
        }

        if (improvabilityChanged) {
          database.exec(`
            UPDATE Staff_DriverData
            SET Improvability = :value
            WHERE StaffID = :driverId
          `, {
            ":value": improvability,
            ":driverId": driver.StaffID,
          });
          improvabilityUpdates += 1;
        }
      }

      database.exec(`
        UPDATE Parts_Enum_Stats
        SET name = :currentDate
        WHERE Value = 13
      `, {
        ":currentDate": currentDate,
      });

      database.exec("COMMIT");

      setLog([
        `@sam_fakt F1 driver attribute randomizer`,
        `Days simulated: ${daysSinceLastUpdate}`,
        `Drivers processed: ${drivers.length}`,
        `Updated stat rows: ${statUpdates}`,
        `Updated improvability rows: ${improvabilityUpdates}`,
        "",
        driverLogs.join("\n"),
      ].join("\n"));

      enqueueSnackbar(`Updated ${statUpdates} driver stat rows and ${improvabilityUpdates} improvability rows.`, {
        variant: statUpdates || improvabilityUpdates ? "success" : "warning",
      });
    } catch (error) {
      try {
        database.exec("ROLLBACK");
      } catch {
        // Ignore rollback failures after partial transaction state changes.
      }
      enqueueSnackbar(`Driver randomizer failed: ${error.message || error}`, { variant: "error" });
    } finally {
      setBusyAction("");
    }
  };

  const generateReport = () => {
    if (!database) {
      return;
    }

    setBusyAction("report");
    try {
      const nextRows = buildReport(database);
      setReportRows(nextRows);
      setLog([
        `@sam_fakt Part Randomizer report`,
        `Current season entries: ${nextRows.filter((row) => !row.isResearch).length}`,
        `Research entries: ${nextRows.filter((row) => row.isResearch).length}`,
      ].join("\n"));
      enqueueSnackbar(`Generated report for ${nextRows.length} designs.`, { variant: "success" });
    } catch (error) {
      enqueueSnackbar(`Report generation failed: ${error.message || error}`, { variant: "error" });
    } finally {
      setBusyAction("");
    }
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 0, borderColor: "divider", overflow: "hidden" }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider", backgroundColor: "rgba(255,255,255,0.02)" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between">
          <div>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 800 }}>
              @sam_fakt&apos;s Part Randomizer
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, maxWidth: 900 }}>
              Ports `f1_part_randomizer-drivers8.py` into the in-browser database editor, including part stat randomization, F1 driver attribute updates, and the randomizer report.
            </Typography>
          </div>
          <Chip label="Community" color="primary" variant="outlined" />
        </Stack>
      </Box>

      <Box sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Alert severity="info">
            Part randomizer progress is tracked via `Parts_Enum_Stats` values `12` and `13`, matching the original script.
          </Alert>

          <Stack direction={{ xs: "column", xl: "row" }} spacing={3} alignItems="stretch">
            <Paper variant="outlined" sx={{ flex: 1, p: 3, borderRadius: 0 }}>
              <Typography variant="h6" component="h4" sx={{ fontWeight: 700 }}>
                Parts
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, mb: 3 }}>
                Randomizes completed part designs since the last tracked run.
              </Typography>

              <Stack spacing={3}>
                <FormControl>
                  <FormLabel>Scope</FormLabel>
                  <RadioGroup row value={scope} onChange={(event) => setScope(event.target.value)}>
                    {PART_SCOPE_OPTIONS.map((option) => (
                      <FormControlLabel key={option.value} value={option.value} control={<Radio />} label={option.label} />
                    ))}
                  </RadioGroup>
                </FormControl>

                <div>
                  <Typography gutterBottom>Difficulty {difficulty.toFixed(1)}</Typography>
                  <Slider
                    value={difficulty}
                    min={1}
                    max={5}
                    step={0.5}
                    onChange={(_, value) => setDifficulty(Number(value))}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Only affects AI teams, same as the original script.
                  </Typography>
                </div>

                <div>
                  <Typography gutterBottom>Multiplier {multiplier.toFixed(1)}</Typography>
                  <Slider
                    value={multiplier}
                    min={1}
                    max={5}
                    step={0.5}
                    onChange={(_, value) => setMultiplier(Number(value))}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Increases AI variance and ceiling. Player-team parts keep the script&apos;s fixed x2 range.
                  </Typography>
                </div>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button variant="contained" onClick={runPartRandomizer} disabled={busyAction !== ""}>
                    {busyAction === "parts" ? "Running..." : "Run Part Randomizer"}
                  </Button>
                  <Button variant="outlined" onClick={generateReport} disabled={busyAction !== ""}>
                    {busyAction === "report" ? "Generating..." : "Generate Report"}
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ flex: 1, p: 3, borderRadius: 0 }}>
              <Typography variant="h6" component="h4" sx={{ fontWeight: 700 }}>
                Drivers
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, mb: 3 }}>
                Updates F1 driver stats and improvability based on race performance since the last tracked run.
              </Typography>

              <Stack spacing={3}>
                <Alert severity="warning">
                  This action updates every F1 driver found in `Staff_DriverData`.
                </Alert>

                <Button variant="contained" color="secondary" onClick={runDriverRandomizer} disabled={busyAction !== ""}>
                  {busyAction === "drivers" ? "Running..." : "Update Driver Attributes"}
                </Button>

                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Uses the original per-day 1.25% change chance across stat IDs {DRIVER_STAT_IDS.join(", ")} plus driver improvability.
                </Typography>
              </Stack>
            </Paper>
          </Stack>

          <Divider />

          <div>
            <Typography variant="h6" component="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Log
            </Typography>
            <TextField
              value={log}
              fullWidth
              multiline
              minRows={10}
              maxRows={24}
              InputProps={{ readOnly: true }}
              placeholder="Run a tool to see detailed output."
            />
          </div>

          <div>
            <Typography variant="h6" component="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Report
            </Typography>
            {reportRows.length ? (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Team</TableCell>
                      <TableCell>Part</TableCell>
                      <TableCell>Completed</TableCell>
                      <TableCell align="right">Wind Tunnel</TableCell>
                      <TableCell align="right">CFD</TableCell>
                      <TableCell align="right">Design</TableCell>
                      <TableCell align="right">Previous</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportRows.map((row) => (
                      <TableRow key={row.id} sx={row.isPlayerTeam ? { backgroundColor: "action.hover" } : undefined}>
                        <TableCell>{row.teamName}</TableCell>
                        <TableCell>{row.partName}</TableCell>
                        <TableCell>{row.dayCompleted}</TableCell>
                        <TableCell align="right">{row.windTunnel}</TableCell>
                        <TableCell align="right">{row.cfd}</TableCell>
                        <TableCell align="right">{row.designId}</TableCell>
                        <TableCell align="right">{row.previousDesignId}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.progress}
                            color={row.tone === "default" ? "default" : row.tone}
                            variant={row.isResearch ? "outlined" : "filled"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">No report generated yet.</Alert>
            )}
          </div>
        </Stack>
      </Box>
    </Paper>
  );
}
