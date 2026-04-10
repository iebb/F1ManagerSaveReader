#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import time
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


USER_AGENT = "Mozilla/5.0 (compatible; F1ManagerSaveReader/1.0; +https://github.com/)"
REQUEST_DELAY_SECONDS = 0.25
JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"

BENCHMARK_DRIVERS = {
    "lewis hamilton": "hamilton",
    "max verstappen": "verstappen",
    "charles leclerc": "leclerc",
    "alexander albon": "albon",
    "carlos sainz": "sainz",
    "lance stroll": "stroll",
    "nicholas latifi": "latifi",
    "nikita mazepin": "mazepin",
}

NAME_ALIASES = {
    "alex albon": "alexander albon",
    "pato oward": "patricio o ward",
    "pato o'ward": "patricio o ward",
    "patricio o ward": "pato o ward",
    "zhou guanyu": "guanyu zhou",
}

CIRCUIT_ID_TO_SLUG = {
    "albert_park": "australia",
    "bahrain": "bahrain",
    "jeddah": "saudi-arabia",
    "shanghai": "china",
    "miami": "miami",
    "imola": "emilia-romagna",
    "monaco": "monaco",
    "villeneuve": "canada",
    "catalunya": "spain",
    "red_bull_ring": "austria",
    "silverstone": "great-britain",
    "hungaroring": "hungary",
    "spa": "belgium",
    "zandvoort": "netherlands",
    "monza": "italy",
    "baku": "azerbaijan",
    "marina_bay": "singapore",
    "americas": "united-states",
    "rodriguez": "mexico",
    "interlagos": "brazil",
    "vegas": "las-vegas",
    "losail": "qatar",
    "yas_marina": "abu-dhabi",
    "paul_ricard": "france",
    "suzuka": "japan",
}

ESTIMATION_OVERRIDES: dict[str, dict[str, float]] = {
    "andrea kimi antonelli": {"leclerc": 0.45, "verstappen": 0.2, "albon": 0.2, "sainz": 0.15},
}

SESSION_RESULT_KEYS = ("Results", "QualifyingResults", "SprintResults")
ROW_OVERRIDES: dict[tuple[int, int, str, str], dict[str, Any]] = {
    (2024, 21, "race", "HUL"): {"laps": 30, "positionText": "DQ", "status": "Disqualified"},
}


@dataclass
class DriverSeasonSummary:
    starts: int = 0
    wins: int = 0
    podiums: int = 0
    poles: int = 0
    points: float = 0.0
    best_finish: int | None = None
    best_grid: int | None = None


class JolpicaF1Exporter:
    def __init__(
        self,
        *,
        from_year: int,
        to_year: int,
        output_root: Path,
        mirror_root: Path | None,
        db_path: Path,
    ) -> None:
        self.from_year = from_year
        self.to_year = to_year
        self.output_root = output_root
        self.mirror_root = mirror_root
        self.db_path = db_path
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
        self.page_cache: dict[str, Any] = {}
        self.db = sqlite3.connect(str(db_path))
        self.db.row_factory = sqlite3.Row
        self.staff_lookup_by_name, self.staff_lookup_by_code, self.country_lookup = self.load_staff_lookup()
        self.benchmark_profiles = self.load_benchmark_profiles()

    def run(self) -> dict[str, Any]:
        payload = {
            "series": "f1",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "sourceSummary": {
                "results": "Jolpica F1 / Ergast-compatible API",
                "driverProfiles": str(self.db_path),
                "estimationBenchmarks": list(BENCHMARK_DRIVERS.values()),
            },
            "seasons": {},
        }

        all_driver_profiles: dict[str, Any] = {}

        for year in range(self.from_year, self.to_year + 1):
            print(f"[export] season {year}")
            season_payload = self.export_season(year)
            payload["seasons"][str(year)] = season_payload
            for name, profile in season_payload["driverProfiles"].items():
                all_driver_profiles.setdefault(name, profile)

        payload["driverProfiles"] = dict(sorted(all_driver_profiles.items()))
        self.write_outputs(payload)
        return payload

    def export_season(self, year: int) -> dict[str, Any]:
        schedule = self.fetch_json(f"{JOLPICA_BASE}/{year}.json?limit=100")["MRData"]["RaceTable"]["Races"]
        season_session_payloads = self.fetch_season_session_payloads(year)
        event_payloads: list[dict[str, Any]] = []
        season_summaries: dict[str, DriverSeasonSummary] = defaultdict(DriverSeasonSummary)
        driver_numbers: dict[str, int] = {}
        driver_team_history: dict[str, set[str]] = defaultdict(set)
        previous_lineup: dict[str, list[str]] = {}

        for race in schedule:
            round_number = int(race["round"])
            sessions = {
                key: payload.get(str(round_number))
                for key, payload in season_session_payloads.items()
            }
            event_payload = self.build_event_payload(race, sessions, season_summaries)
            event_payload["lineupChanges"] = self.diff_lineups(previous_lineup, event_payload["lineup"])
            previous_lineup = event_payload["lineup"]
            for session_key in ("race", "sprint", "qualifying"):
                for row in event_payload["sessions"].get(session_key, {}).get("results", []):
                    driver_number = self.safe_int(row.get("driverNumber"))
                    if driver_number is not None:
                        driver_numbers[row["driverName"]] = driver_number
                    if row.get("teamName"):
                        driver_team_history[row["driverName"]].add(row["teamName"])
            event_payloads.append(event_payload)

        driver_profiles = self.build_driver_profiles(season_summaries, event_payloads)
        return {
            "year": year,
            "rules": {
                "fastestLapPointAwarded": year <= 2024,
            },
            "sources": {
                "season": f"{JOLPICA_BASE}/{year}.json",
            },
            "driverNumbers": dict(sorted(driver_numbers.items(), key=lambda item: item[1])),
            "driverTeamHistory": {
                name: sorted(team_names)
                for name, team_names in sorted(driver_team_history.items(), key=lambda item: item[0])
            },
            "driverProfiles": dict(sorted(driver_profiles.items())),
            "events": event_payloads,
        }

    def fetch_season_session_payloads(self, year: int) -> dict[str, dict[str, Any]]:
        session_specs = {
            "qualifying": f"{JOLPICA_BASE}/{year}/qualifying.json",
            "sprint": f"{JOLPICA_BASE}/{year}/sprint.json",
            "race": f"{JOLPICA_BASE}/{year}/results.json",
        }
        payloads: dict[str, dict[str, Any]] = {}
        for key, url in session_specs.items():
            payloads[key] = self.fetch_paginated_race_table(url)
        return payloads

    def build_event_payload(
        self,
        race_meta: dict[str, Any],
        session_payloads: dict[str, Any],
        season_summaries: dict[str, DriverSeasonSummary],
    ) -> dict[str, Any]:
        sessions: dict[str, Any] = {}
        if session_payloads.get("qualifying"):
            qualifying_results = [
                self.convert_qualifying_row(row)
                for row in session_payloads["qualifying"].get("QualifyingResults", [])
            ]
            sessions["qualifying"] = {
                "sourceUrl": f"{JOLPICA_BASE}/{race_meta['season']}/{race_meta['round']}/qualifying.json",
                "tableType": "qualifying",
                "results": qualifying_results,
            }
            self.update_season_summary_from_qualifying(qualifying_results, season_summaries)
        if session_payloads.get("sprint"):
            sprint_results = [
                self.apply_row_override(
                    self.convert_race_like_row(row),
                    year=int(race_meta["season"]),
                    round_number=int(race_meta["round"]),
                    session_key="sprint",
                )
                for row in session_payloads["sprint"].get("SprintResults", [])
            ]
            sessions["sprint"] = {
                "sourceUrl": f"{JOLPICA_BASE}/{race_meta['season']}/{race_meta['round']}/sprint.json",
                "tableType": "sprint",
                "results": sprint_results,
            }
        if session_payloads.get("race"):
            race_results = [
                self.apply_row_override(
                    self.convert_race_like_row(row),
                    year=int(race_meta["season"]),
                    round_number=int(race_meta["round"]),
                    session_key="race",
                )
                for row in session_payloads["race"].get("Results", [])
            ]
            sessions["race"] = {
                "sourceUrl": f"{JOLPICA_BASE}/{race_meta['season']}/{race_meta['round']}/results.json",
                "tableType": "race",
                "results": race_results,
            }
            self.update_season_summary_from_race(race_results, season_summaries)

        race_date = race_meta.get("date")
        race_time = race_meta.get("time")
        circuit_id = ((race_meta.get("Circuit") or {}).get("circuitId") or "").strip().lower()
        event_slug = CIRCUIT_ID_TO_SLUG.get(circuit_id, re.sub(r"[^a-z0-9]+", "-", race_meta["raceName"].lower()).strip("-"))
        lineup_source = (
            sessions.get("race", {}).get("results")
            or sessions.get("sprint", {}).get("results")
            or sessions.get("qualifying", {}).get("results")
            or []
        )
        return {
            "round": int(race_meta["round"]),
            "eventName": race_meta["raceName"],
            "eventDate": race_date,
            "eventTime": race_time,
            "slug": event_slug,
            "f1Slug": event_slug,
            "sources": {
                "race": f"{JOLPICA_BASE}/{race_meta['season']}/{race_meta['round']}/results.json",
                "qualifying": f"{JOLPICA_BASE}/{race_meta['season']}/{race_meta['round']}/qualifying.json",
                "sprint": f"{JOLPICA_BASE}/{race_meta['season']}/{race_meta['round']}/sprint.json",
            },
            "circuit": race_meta.get("Circuit", {}),
            "sessions": sessions,
            "lineup": self.build_lineup_map(lineup_source),
        }

    def build_driver_profiles(
        self,
        season_summaries: dict[str, DriverSeasonSummary],
        event_payloads: list[dict[str, Any]],
    ) -> dict[str, Any]:
        driver_snapshots: dict[str, dict[str, Any]] = {}

        for event in event_payloads:
            for session in event["sessions"].values():
                for row in session["results"]:
                    driver_name = row["driverName"]
                    snapshot = driver_snapshots.setdefault(
                        driver_name,
                        {
                            "driverCode": row.get("driverCode"),
                            "driverNumber": row.get("driverNumber"),
                            "nationality": row.get("driverNationality"),
                            "dateOfBirth": row.get("dateOfBirth"),
                        },
                    )
                    if not snapshot.get("driverNumber") and row.get("driverNumber") is not None:
                        snapshot["driverNumber"] = row["driverNumber"]
                    if not snapshot.get("driverCode") and row.get("driverCode"):
                        snapshot["driverCode"] = row["driverCode"]
                    if not snapshot.get("nationality") and row.get("driverNationality"):
                        snapshot["nationality"] = row["driverNationality"]
                    if not snapshot.get("dateOfBirth") and row.get("dateOfBirth"):
                        snapshot["dateOfBirth"] = row["dateOfBirth"]

        profiles: dict[str, Any] = {}
        for driver_name, snapshot in sorted(driver_snapshots.items()):
            summary = season_summaries.get(driver_name, DriverSeasonSummary())
            profiles[driver_name] = self.resolve_driver_profile(driver_name, snapshot, summary)
        return profiles

    def resolve_driver_profile(
        self,
        driver_name: str,
        snapshot: dict[str, Any],
        summary: DriverSeasonSummary,
    ) -> dict[str, Any]:
        normalized_name = self.normalize_driver_name(driver_name)
        db_match = self.staff_lookup_by_name.get(normalized_name)
        if db_match is None and snapshot.get("driverCode"):
            db_match = self.staff_lookup_by_code.get(self.normalize_driver_code(snapshot["driverCode"]))

        if db_match is not None:
            date_of_birth = db_match["basicData"].get("DOB_ISO")
            if not self.is_valid_iso_date(date_of_birth):
                date_of_birth = snapshot.get("dateOfBirth")
            driver_number = db_match["driverNumber"] or self.safe_int(snapshot.get("driverNumber"))
            basic_data = dict(db_match["basicData"])
            basic_data["DOB_ISO"] = date_of_birth
            return {
                "source": "save2024.db",
                "staffId": db_match["staffId"],
                "name": db_match["displayName"],
                "firstName": db_match["basicData"].get("FirstName"),
                "lastName": db_match["basicData"].get("LastName"),
                "code": db_match["driverCodeAlpha"],
                "countryCandidates": [db_match["countryName"]] if db_match["countryName"] else [],
                "dob": date_of_birth,
                "driverCode": db_match["driverCodeAlpha"],
                "driverNumber": driver_number,
                "nationality": db_match["countryName"],
                "dateOfBirth": date_of_birth,
                "staffBasicData": basic_data,
                "staffGameData": db_match["gameData"],
                "staffDriverData": db_match["driverData"],
                "staffPerformanceStats": db_match["performanceStats"],
                "staffPerformanceStatsById": db_match["performanceStatsById"],
                "matchedBy": db_match["matchedBy"],
            }

        estimation = self.estimate_driver_profile(driver_name, snapshot, summary)
        return estimation

    def estimate_driver_profile(
        self,
        driver_name: str,
        snapshot: dict[str, Any],
        summary: DriverSeasonSummary,
    ) -> dict[str, Any]:
        mix = self.determine_benchmark_mix(driver_name, summary)
        weighted_driver_data = self.weighted_record("driverData", mix)
        weighted_game_data = self.weighted_record("gameData", mix)
        weighted_stats = self.weighted_performance_stats(mix)
        country_name = self.normalize_country_name(snapshot.get("nationality"))
        country_id = self.country_lookup.get(country_name)
        code = self.normalize_driver_code(snapshot.get("driverCode") or driver_name)
        driver_number = self.safe_int(snapshot.get("driverNumber"))
        parts = self.split_driver_name(driver_name)

        basic_data = {
            "FirstName": parts["firstName"],
            "LastName": parts["lastName"],
            "CountryID": country_id,
            "DOB_ISO": snapshot.get("dateOfBirth"),
            "IsGeneratedStaff": 1,
        }

        driver_data = dict(weighted_driver_data)
        driver_data.update(
            {
                "DriverCode": code,
                "LastKnownDriverNumber": driver_number,
                "AssignedCarNumber": driver_number,
            }
        )

        return {
            "source": "estimated",
            "name": driver_name,
            "firstName": parts["firstName"],
            "lastName": parts["lastName"],
            "code": code,
            "countryCandidates": [country_name] if country_name else [],
            "dob": snapshot.get("dateOfBirth"),
            "driverCode": code,
            "driverNumber": driver_number,
            "nationality": country_name,
            "dateOfBirth": snapshot.get("dateOfBirth"),
            "benchmarkMix": mix,
            "staffBasicData": basic_data,
            "staffGameData": weighted_game_data,
            "staffDriverData": driver_data,
            "staffPerformanceStats": weighted_stats["byName"],
            "staffPerformanceStatsById": weighted_stats["byId"],
            "seasonSummary": {
                "starts": summary.starts,
                "wins": summary.wins,
                "podiums": summary.podiums,
                "poles": summary.poles,
                "points": round(summary.points, 2),
                "bestFinish": summary.best_finish,
                "bestGrid": summary.best_grid,
            },
        }

    def determine_benchmark_mix(self, driver_name: str, summary: DriverSeasonSummary) -> dict[str, float]:
        normalized_name = self.normalize_driver_name(driver_name)
        if normalized_name in ESTIMATION_OVERRIDES:
            return ESTIMATION_OVERRIDES[normalized_name]
        if summary.wins > 0 or summary.points >= 180:
            return {"verstappen": 0.45, "leclerc": 0.25, "hamilton": 0.15, "sainz": 0.15}
        if summary.podiums >= 2 or summary.points >= 80:
            return {"leclerc": 0.35, "sainz": 0.25, "albon": 0.2, "hamilton": 0.2}
        if summary.points >= 15:
            return {"albon": 0.45, "sainz": 0.25, "stroll": 0.2, "latifi": 0.1}
        if summary.starts <= 3 and (summary.best_finish or 99) <= 6:
            return {"albon": 0.35, "leclerc": 0.3, "sainz": 0.2, "stroll": 0.15}
        if summary.starts <= 5:
            return {"stroll": 0.45, "latifi": 0.3, "albon": 0.15, "mazepin": 0.1}
        return {"stroll": 0.35, "latifi": 0.35, "mazepin": 0.2, "albon": 0.1}

    def weighted_record(self, section: str, mix: dict[str, float]) -> dict[str, Any]:
        first = next(iter(mix))
        template = self.benchmark_profiles[first][section]
        result: dict[str, Any] = {}
        for key, value in template.items():
            if isinstance(value, (int, float)):
                weighted_value = 0.0
                for benchmark_key, weight in mix.items():
                    benchmark_value = self.benchmark_profiles[benchmark_key][section].get(key, value)
                    if isinstance(benchmark_value, (int, float)):
                        weighted_value += float(benchmark_value) * weight
                result[key] = int(round(weighted_value))
            else:
                result[key] = value
        result["Retired"] = 0
        return result

    def weighted_performance_stats(self, mix: dict[str, float]) -> dict[str, Any]:
        stat_keys = sorted(self.benchmark_profiles[next(iter(mix))]["performanceStatsById"])
        by_id: dict[str, Any] = {}
        by_name: dict[str, Any] = {}
        for stat_id in stat_keys:
            weighted_val = 0.0
            weighted_max = 0.0
            stat_name = None
            for benchmark_key, weight in mix.items():
                stat = self.benchmark_profiles[benchmark_key]["performanceStatsById"][stat_id]
                weighted_val += float(stat["Val"]) * weight
                weighted_max += float(stat["Max"]) * weight
                stat_name = stat["name"]
            rounded = {"name": stat_name, "Val": int(round(weighted_val)), "Max": int(round(weighted_max))}
            by_id[str(stat_id)] = rounded
            by_name[stat_name] = {"Val": rounded["Val"], "Max": rounded["Max"]}
        return {"byId": by_id, "byName": by_name}

    def update_season_summary_from_qualifying(
        self,
        qualifying_results: list[dict[str, Any]],
        summaries: dict[str, DriverSeasonSummary],
    ) -> None:
        for row in qualifying_results:
            summary = summaries[row["driverName"]]
            position = self.safe_int(row.get("position"))
            if position == 1:
                summary.poles += 1
            if position is not None:
                summary.best_grid = position if summary.best_grid is None else min(summary.best_grid, position)

    def update_season_summary_from_race(
        self,
        race_results: list[dict[str, Any]],
        summaries: dict[str, DriverSeasonSummary],
    ) -> None:
        for row in race_results:
            summary = summaries[row["driverName"]]
            summary.starts += 1
            position = self.safe_int(row.get("position"))
            points = self.safe_float(row.get("points")) or 0.0
            summary.points += points
            if position == 1:
                summary.wins += 1
            if position is not None and position <= 3:
                summary.podiums += 1
            if position is not None:
                summary.best_finish = position if summary.best_finish is None else min(summary.best_finish, position)

    def load_staff_lookup(self) -> tuple[dict[str, Any], dict[str, Any], dict[str, int]]:
        country_lookup: dict[str, int] = {}
        country_rows = self.db.execute("SELECT CountryID, Name FROM Countries").fetchall()
        for row in country_rows:
            country_name = self.normalize_country_name(row["Name"])
            if country_name:
                country_lookup[country_name] = row["CountryID"]

        stat_name_lookup = {
            row["Value"]: row["ReadableName"]
            for row in self.db.execute(
                "SELECT Value, ReadableName FROM (SELECT Value, Name AS ReadableName FROM Staff_Enum_PerformanceStatTypes)"
            ).fetchall()
        }

        rows = self.db.execute(
            """
            SELECT
              sb.StaffID,
              sb.FirstName,
              sb.LastName,
              sb.CountryID,
              sb.DOB_ISO,
              sd.DriverCode,
              sd.LastKnownDriverNumber,
              sd.AssignedCarNumber,
              sd.Improvability,
              sd.Aggression,
              sd.WantsChampionDriverNumber,
              sd.HasSuperLicense,
              sd.HasWonF2,
              sd.HasWonF3,
              sd.HasRacedEnoughToJoinF1,
              sd.PerformanceEvaluationDay,
              sd.Marketability,
              sd.TargetMarketability,
              sd.MarketabilityProgress,
              sd.FeederSeriesAssignedCarNumber,
              sg.StaffType,
              sg.RetirementAge,
              sg.Retired,
              sg.PermaTraitSpawnBoost,
              sg.BestTeamFormula,
              sg.BestF1PosInTeamSinceGameStart,
              sg.DevelopmentPlan,
              sg.ExpectedRankForTeam,
              sg.AchievementScore,
              sg.ExpectedQualityScore,
              sg.ExpectedTimeScore,
              c.Name AS CountryName
            FROM Staff_BasicData sb
            JOIN Staff_DriverData sd ON sd.StaffID = sb.StaffID
            LEFT JOIN Staff_GameData sg ON sg.StaffID = sb.StaffID
            LEFT JOIN Countries c ON c.CountryID = sb.CountryID
            """
        ).fetchall()

        performance_rows = self.db.execute(
            "SELECT StaffID, StatID, Val, Max FROM Staff_PerformanceStats"
        ).fetchall()
        performance_by_staff: dict[int, list[sqlite3.Row]] = defaultdict(list)
        for row in performance_rows:
            performance_by_staff[row["StaffID"]].append(row)

        lookup_by_name: dict[str, Any] = {}
        lookup_by_code: dict[str, Any] = {}
        for row in rows:
            first_name = self.resolve_loc_key_name(row["FirstName"])
            last_name = self.resolve_loc_key_name(row["LastName"])
            display_name = self.normalize_display_name(" ".join(part for part in (first_name, last_name) if part))
            country_name = self.normalize_country_name(row["CountryName"])
            driver_code_alpha = self.resolve_driver_code(row["DriverCode"])
            driver_number = row["AssignedCarNumber"] or row["LastKnownDriverNumber"]
            dob_iso = row["DOB_ISO"] if self.is_valid_iso_date(row["DOB_ISO"]) else None
            perf_by_id: dict[int, Any] = {}
            perf_by_name: dict[str, Any] = {}
            for perf_row in performance_by_staff.get(row["StaffID"], []):
                stat_name = stat_name_lookup.get(perf_row["StatID"], str(perf_row["StatID"]))
                payload = {"name": stat_name, "Val": perf_row["Val"], "Max": perf_row["Max"]}
                perf_by_id[perf_row["StatID"]] = payload
                perf_by_name[stat_name] = {"Val": perf_row["Val"], "Max": perf_row["Max"]}

            basic_data = {
                "FirstName": first_name,
                "LastName": last_name,
                "CountryID": row["CountryID"],
                "DOB_ISO": dob_iso,
                "IsGeneratedStaff": 0,
            }
            driver_data = {
                "Improvability": row["Improvability"],
                "Aggression": row["Aggression"],
                "DriverCode": driver_code_alpha,
                "WantsChampionDriverNumber": row["WantsChampionDriverNumber"],
                "LastKnownDriverNumber": row["LastKnownDriverNumber"],
                "AssignedCarNumber": row["AssignedCarNumber"],
                "HasSuperLicense": row["HasSuperLicense"],
                "HasWonF2": row["HasWonF2"],
                "HasWonF3": row["HasWonF3"],
                "HasRacedEnoughToJoinF1": row["HasRacedEnoughToJoinF1"],
                "PerformanceEvaluationDay": row["PerformanceEvaluationDay"],
                "Marketability": row["Marketability"],
                "TargetMarketability": row["TargetMarketability"],
                "MarketabilityProgress": row["MarketabilityProgress"],
                "FeederSeriesAssignedCarNumber": row["FeederSeriesAssignedCarNumber"],
            }
            game_data = {
                "StaffType": row["StaffType"],
                "RetirementAge": row["RetirementAge"],
                "Retired": row["Retired"],
                "PermaTraitSpawnBoost": row["PermaTraitSpawnBoost"],
                "BestTeamFormula": row["BestTeamFormula"],
                "BestF1PosInTeamSinceGameStart": row["BestF1PosInTeamSinceGameStart"],
                "DevelopmentPlan": row["DevelopmentPlan"],
                "ExpectedRankForTeam": row["ExpectedRankForTeam"],
                "AchievementScore": row["AchievementScore"],
                "ExpectedQualityScore": row["ExpectedQualityScore"],
                "ExpectedTimeScore": row["ExpectedTimeScore"],
            }
            payload = {
                "staffId": row["StaffID"],
                "displayName": display_name,
                "countryName": country_name,
                "driverCodeAlpha": driver_code_alpha,
                "driverNumber": driver_number,
                "basicData": basic_data,
                "driverData": driver_data,
                "gameData": game_data,
                "performanceStats": perf_by_name,
                "performanceStatsById": {str(k): v for k, v in sorted(perf_by_id.items())},
                "matchedBy": "name",
            }
            lookup_by_name[self.normalize_driver_name(display_name)] = payload
            if driver_code_alpha:
                code_payload = dict(payload)
                code_payload["matchedBy"] = "driverCode"
                lookup_by_code[driver_code_alpha] = code_payload
        return lookup_by_name, lookup_by_code, country_lookup

    def load_benchmark_profiles(self) -> dict[str, Any]:
        profiles: dict[str, Any] = {}
        for full_name, benchmark_key in BENCHMARK_DRIVERS.items():
            payload = self.staff_lookup_by_name.get(self.normalize_driver_name(full_name))
            if payload is None:
                raise RuntimeError(f"Missing benchmark driver in save2024.db: {full_name}")
            profiles[benchmark_key] = {
                "driverData": payload["driverData"],
                "gameData": payload["gameData"],
                "performanceStatsById": {
                    int(stat_id): value for stat_id, value in payload["performanceStatsById"].items()
                },
            }
        return profiles

    def convert_qualifying_row(self, row: dict[str, Any]) -> dict[str, Any]:
        driver = row.get("Driver", {})
        constructor = row.get("Constructor", {})
        return {
            "position": self.safe_int(row.get("position")),
            "driverNumber": self.safe_int(row.get("number")) or self.safe_int(driver.get("permanentNumber")),
            "driverName": self.normalize_display_name(
                f"{driver.get('givenName', '').strip()} {driver.get('familyName', '').strip()}".strip()
            ),
            "driverCode": self.normalize_driver_code(driver.get("code")),
            "driverNationality": self.normalize_country_name(driver.get("nationality")),
            "dateOfBirth": driver.get("dateOfBirth"),
            "teamName": constructor.get("name"),
            "q1": row.get("Q1"),
            "q2": row.get("Q2"),
            "q3": row.get("Q3"),
        }

    def convert_race_like_row(self, row: dict[str, Any]) -> dict[str, Any]:
        driver = row.get("Driver", {})
        constructor = row.get("Constructor", {})
        fastest_lap = row.get("FastestLap", {}) or {}
        fastest_lap_time = fastest_lap.get("Time", {}) if isinstance(fastest_lap.get("Time"), dict) else {}
        return {
            "position": self.safe_int(row.get("position")),
            "positionText": row.get("positionText"),
            "driverNumber": self.safe_int(row.get("number")) or self.safe_int(driver.get("permanentNumber")),
            "driverName": self.normalize_display_name(
                f"{driver.get('givenName', '').strip()} {driver.get('familyName', '').strip()}".strip()
            ),
            "driverCode": self.normalize_driver_code(driver.get("code")),
            "driverNationality": self.normalize_country_name(driver.get("nationality")),
            "dateOfBirth": driver.get("dateOfBirth"),
            "teamName": constructor.get("name"),
            "grid": self.safe_int(row.get("grid")),
            "laps": self.safe_int(row.get("laps")),
            "status": row.get("status"),
            "classificationStatus": row.get("status"),
            "points": self.safe_float(row.get("points")),
            "time": (row.get("Time") or {}).get("time") if isinstance(row.get("Time"), dict) else None,
            "timeMillis": self.safe_int((row.get("Time") or {}).get("millis")) if isinstance(row.get("Time"), dict) else None,
            "fastestLapRank": self.safe_int(fastest_lap.get("rank")),
            "fastestLapLap": self.safe_int(fastest_lap.get("lap")),
            "fastestLap": fastest_lap_time.get("time"),
        }

    def build_lineup_map(self, rows: list[dict[str, Any]]) -> dict[str, list[str]]:
        by_team: dict[str, list[str]] = defaultdict(list)
        for row in rows:
            if row.get("driverName") and row.get("teamName") and row["driverName"] not in by_team[row["teamName"]]:
                by_team[row["teamName"]].append(row["driverName"])
        return {team: drivers for team, drivers in sorted(by_team.items(), key=lambda item: item[0])}

    def diff_lineups(self, previous: dict[str, list[str]], current: dict[str, list[str]]) -> list[dict[str, Any]]:
        changes = []
        for team in sorted(set(previous) | set(current)):
            prev_set = set(previous.get(team, []))
            curr_set = set(current.get(team, []))
            if prev_set == curr_set:
                continue
            changes.append(
                {
                    "teamName": team,
                    "incomingDrivers": sorted(curr_set - prev_set),
                    "outgoingDrivers": sorted(prev_set - curr_set),
                    "previousLineup": previous.get(team, []),
                    "currentLineup": current.get(team, []),
                }
            )
        return changes

    def write_outputs(self, payload: dict[str, Any]) -> None:
        self.write_dataset_tree(self.output_root, payload)
        if self.mirror_root is not None:
            self.write_dataset_tree(self.mirror_root, payload)

    def write_dataset_tree(self, root: Path, payload: dict[str, Any]) -> None:
        root.mkdir(parents=True, exist_ok=True)
        for year, season_payload in payload["seasons"].items():
            season_wrapper = {
                "series": payload["series"],
                "generatedAt": payload["generatedAt"],
                "sourceSummary": payload["sourceSummary"],
                "seasons": {year: season_payload},
                "driverProfiles": season_payload["driverProfiles"],
            }
            (root / f"{year}.json").write_text(
                json.dumps(season_wrapper, indent=2, ensure_ascii=True) + "\n",
                encoding="utf-8",
            )

    def fetch_json(self, url: str) -> Any:
        if url in self.page_cache:
            return self.page_cache[url]
        last_error: Exception | None = None
        for attempt in range(5):
            response = self.session.get(url, timeout=30)
            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                try:
                    wait_seconds = float(retry_after) if retry_after is not None else (2 ** attempt)
                except ValueError:
                    wait_seconds = float(2 ** attempt)
                time.sleep(max(wait_seconds, REQUEST_DELAY_SECONDS))
                continue
            try:
                response.raise_for_status()
                payload = response.json()
                self.page_cache[url] = payload
                time.sleep(REQUEST_DELAY_SECONDS)
                return payload
            except Exception as exc:
                last_error = exc
                time.sleep(max(REQUEST_DELAY_SECONDS, 0.5 * (attempt + 1)))
        if last_error is not None:
            raise last_error
        raise RuntimeError(f"Failed to fetch {url}")

    def fetch_paginated_race_table(self, base_url: str) -> dict[str, Any]:
        limit = 100
        offset = 0
        merged_by_round: dict[str, Any] = {}

        while True:
            separator = "&" if "?" in base_url else "?"
            page_url = f"{base_url}{separator}limit={limit}&offset={offset}"
            data = self.fetch_json(page_url)
            mr_data = data.get("MRData", {})
            race_table = mr_data.get("RaceTable", {})
            races = race_table.get("Races", [])
            for race in races:
                round_key = str(race["round"])
                merged_by_round[round_key] = self.merge_race_payloads(merged_by_round.get(round_key), race)

            total = self.safe_int(mr_data.get("total")) or len(races)
            page_limit = self.safe_int(mr_data.get("limit")) or limit
            page_offset = self.safe_int(mr_data.get("offset")) or offset
            fetched_count = len(races)
            if fetched_count == 0 or (page_offset + page_limit) >= total:
                break
            offset = page_offset + page_limit

        return merged_by_round

    def merge_race_payloads(self, existing: dict[str, Any] | None, incoming: dict[str, Any]) -> dict[str, Any]:
        if existing is None:
            return incoming

        merged = dict(existing)
        for key, value in incoming.items():
            if key in SESSION_RESULT_KEYS:
                merged[key] = self.merge_session_rows(existing.get(key, []), value or [])
            elif value not in (None, "", []):
                merged[key] = value
            elif key not in merged:
                merged[key] = value
        return merged

    def merge_session_rows(self, existing_rows: list[dict[str, Any]], incoming_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        merged_rows: list[dict[str, Any]] = []
        seen: set[str] = set()
        for row in [*existing_rows, *incoming_rows]:
            signature = self.session_row_signature(row)
            if signature in seen:
                continue
            seen.add(signature)
            merged_rows.append(row)
        return merged_rows

    def session_row_signature(self, row: dict[str, Any]) -> str:
        driver = row.get("Driver", {}) if isinstance(row.get("Driver"), dict) else {}
        return "|".join(
            str(part or "")
            for part in (
                row.get("position"),
                driver.get("driverId"),
                driver.get("code"),
                row.get("number"),
            )
        )

    def apply_row_override(
        self,
        row: dict[str, Any],
        *,
        year: int,
        round_number: int,
        session_key: str,
    ) -> dict[str, Any]:
        override = ROW_OVERRIDES.get((year, round_number, session_key, self.normalize_driver_code(row.get("driverCode"))))
        if not override:
            return row
        return {**row, **override, "classificationStatus": override.get("status", row.get("classificationStatus"))}

    def resolve_loc_key_name(self, value: str | None) -> str:
        text = str(value or "")
        if text.startswith("[") and text.endswith("]"):
            text = text[1:-1]
        text = re.sub(r"^StaffName_Forename_(Male|Female)_", "", text)
        text = re.sub(r"^StaffName_Surname_", "", text)
        text = re.sub(r"([a-z])([A-Z])", r"\1 \2", text)
        text = re.sub(r"(\D)\d+$", r"\1", text)
        text = text.replace("_", " ")
        text = text.replace("OWard", "O'Ward")
        return self.normalize_display_name(text)

    def normalize_display_name(self, value: str) -> str:
        value = re.sub(r"\s+", " ", value).strip()
        value = value.replace(" O Ward", " O'Ward")
        value = value.replace(" Oward", " O'Ward")
        value = value.replace("Guanyu Zhou", "Guanyu Zhou")
        return value

    def normalize_driver_name(self, value: str | None) -> str:
        normalized = unicodedata.normalize("NFKD", value or "")
        ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
        text = re.sub(r"[^a-z0-9]+", " ", ascii_text.lower()).strip()
        return NAME_ALIASES.get(text, text)

    def normalize_driver_code(self, value: Any) -> str:
        text = re.sub(r"[^A-Za-z]+", "", str(value or "")).upper()
        return text[:3]

    def resolve_driver_code(self, value: Any) -> str:
        text = str(value or "")
        if text.startswith("[") and text.endswith("]"):
            text = text[1:-1]
        text = re.sub(r"^DriverCode_", "", text)
        return self.normalize_driver_code(text)

    def normalize_country_name(self, value: str | None) -> str | None:
        if value is None:
            return None
        text = str(value)
        if text.startswith("[") and text.endswith("]"):
            text = text[1:-1]
        text = re.sub(r"^Nationality_", "", text)
        text = text.replace("British", "UnitedKingdom")
        text = text.replace("Thai", "Thailand")
        text = text.replace("Dutch", "Netherlands")
        text = text.replace("Monegasque", "Monaco")
        text = text.replace("Argentine", "Argentina")
        text = text.replace("New Zealander", "NewZealand")
        text = text.replace("American", "UnitedStates")
        text = text.replace("Irish", "Ireland")
        text = text.replace("Brazilian", "Brazil")
        text = text.replace("Australian", "Australia")
        text = text.replace("French", "France")
        text = text.replace("German", "Germany")
        text = text.replace("Mexican", "Mexico")
        text = text.replace("Italian", "Italy")
        text = text.replace("Japanese", "Japan")
        text = text.replace("Chinese", "China")
        text = text.replace("Spanish", "Spain")
        text = text.replace("Finnish", "Finland")
        text = text.replace("Danish", "Denmark")
        text = text.replace("Polish", "Poland")
        text = text.replace("Israeli", "Israel")
        text = text.replace("Canadian", "Canada")
        text = text.replace("Swedish", "Sweden")
        text = text.replace("Estonian", "Estonia")
        return re.sub(r"[^A-Za-z0-9]+", "", text) or None

    def is_valid_iso_date(self, value: Any) -> bool:
        return isinstance(value, str) and bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", value))

    def split_driver_name(self, driver_name: str) -> dict[str, str]:
        parts = driver_name.split()
        if len(parts) == 1:
            return {"firstName": parts[0], "lastName": "Driver"}
        return {"firstName": " ".join(parts[:-1]), "lastName": parts[-1]}

    def safe_int(self, value: Any) -> int | None:
        if value in (None, ""):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def safe_float(self, value: Any) -> float | None:
        if value in (None, ""):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export F1 race, sprint and qualifying data from Jolpica and enrich drivers from save2024.db."
    )
    parser.add_argument("--from-year", type=int, required=True)
    parser.add_argument("--to-year", type=int, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--mirror-root", type=Path)
    parser.add_argument("--db", type=Path, default=Path("save2024.db"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    exporter = JolpicaF1Exporter(
        from_year=args.from_year,
        to_year=args.to_year,
        output_root=args.output_root,
        mirror_root=args.mirror_root,
        db_path=args.db,
    )
    exporter.run()
    print(f"[export] wrote {args.output_root}")


if __name__ == "__main__":
    main()
