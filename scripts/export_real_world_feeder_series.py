#!/usr/bin/env python3

from __future__ import annotations

import argparse
import io
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

import pandas as pd
import requests
from bs4 import BeautifulSoup


USER_AGENT = "Mozilla/5.0 (compatible; F1ManagerSaveReader/1.0; +https://github.com/)"
REQUEST_DELAY_SECONDS = 0.15
SERIES_IDS = {
    "f2": {2022: 179, 2023: 180, 2024: 181, 2025: 182},
    "f3": {2022: 179, 2023: 180, 2024: 181, 2025: 182},
}
SERIES_CONFIG = {
    "f2": {
        "label": "Formula 2",
        "site_base": "https://www.fiaformula2.com",
        "fia_base": "https://www.fia.com/events/formula-2-championship/season-{year}/formula-2",
        "feature_suffix": "/feature-race-classifications",
        "qualifying_suffix": "/qualifying-classification",
        "sprint_suffix": "/sprint-race-classification",
    },
    "f3": {
        "label": "Formula 3",
        "site_base": "https://www.fiaformula3.com",
        "fia_base": "https://www.fia.com/events/fia-formula-3-championship/season-{year}/fia-formula-3",
        "feature_suffix": "/feature-race-classification",
        "qualifying_suffix": "/qualifying-classification",
        "sprint_suffix": "/sprint-race-classification",
    },
}
F1_SLUG_BY_CIRCUIT = {
    "sakhir": "bahrain",
    "jeddah": "saudi-arabia",
    "melbourne": "australia",
    "imola": "emilia-romagna",
    "monaco": "monaco",
    "barcelona": "spain",
    "spielberg": "austria",
    "silverstone": "great-britain",
    "budapest": "hungary",
    "spa francorchamps": "belgium",
    "zandvoort": "netherlands",
    "monza": "italy",
    "baku": "azerbaijan",
    "yas island": "abu-dhabi",
    "lusail": "qatar",
    "losail": "qatar",
    "le castellet": "france",
}
POLE_BONUS_POINTS = {"f2": 2, "f3": 2}

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

ESTIMATION_OVERRIDES: dict[str, dict[str, float]] = {
    "rafael camara": {"leclerc": 0.35, "sainz": 0.3, "albon": 0.2, "stroll": 0.15},
    "alex dunne": {"leclerc": 0.3, "albon": 0.3, "sainz": 0.25, "stroll": 0.15},
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


class RealWorldFeederExporter:
    def __init__(
        self,
        from_year: int,
        to_year: int,
        output_root: Path,
        cache_dir: Path,
        series_list: list[str],
        db_path: Path,
        mirror_root: Path | None,
    ) -> None:
        self.from_year = from_year
        self.to_year = to_year
        self.output_root = output_root
        self.cache_dir = cache_dir
        self.series_list = series_list
        self.db_path = db_path
        self.mirror_root = mirror_root
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.page_cache: dict[str, str] = {}
        self.db = sqlite3.connect(str(db_path))
        self.db.row_factory = sqlite3.Row
        self.staff_lookup_by_name, self.staff_lookup_by_code, self.country_lookup = self.load_staff_lookup()
        self.benchmark_profiles = self.load_benchmark_profiles()

    def run(self) -> dict[str, dict[str, Any]]:
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        payloads = {}
        for series in self.series_list:
            payload = {
                "series": series,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "sourceSummary": {
                    "calendarAndFullNames": f"{SERIES_CONFIG[series]['site_base']} calendar, results and teams-and-drivers pages",
                    "pointsAndClassifications": "FIA event classification pages",
                    "driverProfiles": str(self.db_path),
                },
                "seasons": {},
            }
            all_driver_profiles: dict[str, Any] = {}
            for year in range(self.from_year, self.to_year + 1):
                season_payload = self.export_season(series, year)
                payload["seasons"][str(year)] = season_payload
                for name, profile in season_payload["driverProfiles"].items():
                    all_driver_profiles.setdefault(name, profile)
            payload["driverProfiles"] = dict(sorted(all_driver_profiles.items()))
            payloads[series] = payload
            self.write_series_outputs(series, payload)
        return payloads

    def write_series_outputs(self, series: str, payload: dict[str, Any]) -> None:
        self.write_dataset_tree(self.output_root / series, payload)
        if self.mirror_root is not None:
            self.write_dataset_tree(self.mirror_root / series, payload)

    def write_dataset_tree(self, series_dir: Path, payload: dict[str, Any]) -> None:
        series_dir.mkdir(parents=True, exist_ok=True)
        for year, season in payload["seasons"].items():
            single_payload = {
                "series": payload["series"],
                "generatedAt": payload["generatedAt"],
                "sourceSummary": payload["sourceSummary"],
                "driverProfiles": season["driverProfiles"],
                "seasons": {year: season},
            }
            (series_dir / f"{year}.json").write_text(json.dumps(single_payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    def export_season(self, series: str, year: int) -> dict[str, Any]:
        season_id = SERIES_IDS[series][year]
        calendar = self.fetch_next_data(f"{SERIES_CONFIG[series]['site_base']}/Calendar?seasonid={season_id}")
        teams_payload = self.fetch_next_data(f"{SERIES_CONFIG[series]['site_base']}/Teams-and-Drivers?seasonid={season_id}")
        roster_lookup = self.build_roster_lookup(teams_payload["Teams"])
        fia_refs = self.fetch_fia_event_refs(series, year)
        fia_ref_by_round = {ref["round"]: ref for ref in fia_refs}

        calendar_races = calendar["Races"]
        event_payloads = []
        driver_numbers: dict[str, int] = {}
        driver_team_history: dict[str, set[str]] = defaultdict(set)
        previous_lineup: dict[str, list[str]] = {}
        season_summaries: dict[str, DriverSeasonSummary] = defaultdict(DriverSeasonSummary)

        for race in calendar_races:
            site_event = self.fetch_site_event(series, race["RaceId"])
            event = self.export_event(
                series=series,
                race=race,
                fia_ref=fia_ref_by_round.get(race["RoundNumber"]),
                site_event=site_event,
                roster_lookup=roster_lookup,
            )
            event["lineupChanges"] = self.diff_lineups(previous_lineup, event["lineup"])
            previous_lineup = event["lineup"]
            for session_key in ("sprint", "feature"):
                for row in event["sessions"].get(session_key, {}).get("results", []):
                    if not isinstance(row.get("driverNumber"), int):
                        continue
                    driver_numbers[row["driverName"]] = row["driverNumber"]
                    if row.get("teamName"):
                        driver_team_history[row["driverName"]].add(row["teamName"])
            self.update_season_summary_from_qualifying(event["sessions"].get("qualifying", {}).get("results", []), season_summaries)
            self.update_season_summary_from_race(event["sessions"].get("sprint", {}).get("results", []), season_summaries)
            self.update_season_summary_from_race(event["sessions"].get("feature", {}).get("results", []), season_summaries)
            event_payloads.append(event)

        driver_profiles = self.build_driver_profiles(season_summaries, event_payloads)

        return {
            "year": year,
            "rules": {
                "poleBonusPoints": POLE_BONUS_POINTS[series],
            },
            "sources": {
                "calendar": f"{SERIES_CONFIG[series]['site_base']}/Calendar?seasonid={season_id}",
                "teamsAndDrivers": f"{SERIES_CONFIG[series]['site_base']}/Teams-and-Drivers?seasonid={season_id}",
                "fiaSeasonArchive": SERIES_CONFIG[series]["fia_base"].format(year=year),
            },
            "driverNumbers": dict(sorted(driver_numbers.items(), key=lambda item: item[1])),
            "driverTeamHistory": {
                name: sorted(team_names)
                for name, team_names in sorted(driver_team_history.items(), key=lambda item: item[0])
            },
            "driverProfiles": dict(sorted(driver_profiles.items())),
            "events": event_payloads,
        }

    def export_event(
        self,
        *,
        series: str,
        race: dict[str, Any],
        fia_ref: dict[str, Any] | None,
        site_event: dict[str, Any] | None,
        roster_lookup: dict[int, dict[str, Any]],
    ) -> dict[str, Any]:
        site_sessions = self.extract_site_sessions(site_event or {})
        name_lookup = self.build_event_name_lookup(site_sessions, roster_lookup)

        sessions = {}
        if site_sessions.get("practice"):
            sessions["practice"] = {
                "sourceUrl": (site_event or {}).get("sourceUrl"),
                "tableType": "practice",
                "results": site_sessions["practice"],
            }

        qualifying_rows = self.apply_qualifying_points(site_sessions.get("qualifying", []), series)
        if qualifying_rows:
            sessions["qualifying"] = {
                "sourceUrl": (site_event or {}).get("sourceUrl"),
                "tableType": "qualifying",
                "results": qualifying_rows,
            }

        sprint_rows = self.apply_race_points(site_sessions.get("sprint", []), (10, 8, 6, 5, 4, 3, 2, 1))
        if sprint_rows:
            sessions["sprint"] = {
                "sourceUrl": (site_event or {}).get("sourceUrl"),
                "tableType": "sprint",
                "results": sprint_rows,
            }

        feature_rows = self.apply_race_points(site_sessions.get("feature", []), (25, 18, 15, 12, 10, 8, 6, 4, 2, 1))
        if feature_rows:
            sessions["feature"] = {
                "sourceUrl": (site_event or {}).get("sourceUrl"),
                "tableType": "feature",
                "results": feature_rows,
            }

        if not site_event and fia_ref:
            fallback_sessions = self.build_fia_fallback_sessions(series, fia_ref, name_lookup)
            sessions = {**fallback_sessions, **sessions}

        lineup_source = (
            sessions.get("feature", {}).get("results")
            or sessions.get("sprint", {}).get("results")
            or sessions.get("practice", {}).get("results")
            or []
        )
        lineup = self.build_lineup_map(lineup_source)
        circuit_short_name = normalize_name(race.get("CircuitShortName", ""))

        return {
            "round": race["RoundNumber"],
            "eventName": race.get("CircuitShortName") or race.get("CountryName") or (fia_ref["slug"].replace("-", " ").title() if fia_ref else f"Round {race['RoundNumber']}"),
            "eventDate": race["RaceEndDate"],
            "slug": fia_ref["slug"] if fia_ref else slugify(race.get("CircuitShortName") or race.get("CountryName")),
            "f1Slug": F1_SLUG_BY_CIRCUIT.get(circuit_short_name),
            "sources": {
                "siteResults": (site_event or {}).get("sourceUrl"),
                "fiaFeatureClassification": fia_ref.get("featureUrl") if fia_ref else None,
            },
            "sessions": sessions,
            "lineup": lineup,
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

        return self.estimate_driver_profile(driver_name, snapshot, summary)

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

    def fetch_site_event(self, series: str, race_id: int) -> dict[str, Any] | None:
        url = f"{SERIES_CONFIG[series]['site_base']}/Results?raceid={race_id}"
        html = self.fetch_text(url, allow_missing=True)
        if not html:
            return None
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
        if not match:
            return None
        payload = json.loads(match.group(1))
        page_props = payload.get("props", {}).get("pageProps", {})
        page_data = page_props.get("pageData")
        if not isinstance(page_data, dict):
            return None
        page_data["sourceUrl"] = url
        return page_data

    def fetch_fia_event_refs(self, series: str, year: int) -> list[dict[str, Any]]:
        html = self.fetch_text(SERIES_CONFIG[series]["fia_base"].format(year=year))
        soup = BeautifulSoup(html, "lxml")
        refs: list[dict[str, Any]] = []
        seen = set()
        suffix = SERIES_CONFIG[series]["feature_suffix"]
        for anchor in soup.find_all("a", href=True):
            href = anchor["href"]
            if not href.endswith(suffix):
                continue
            if href in seen:
                continue
            seen.add(href)
            slug = href.removesuffix(suffix).rstrip("/").split("/")[-1]
            refs.append({
                "round": len(refs) + 1,
                "slug": slug,
                "featureUrl": f"https://www.fia.com{href}",
            })
        return refs

    def build_fia_fallback_sessions(self, series: str, fia_ref: dict[str, Any], name_lookup: dict[int, dict[str, Any]]) -> dict[str, Any]:
        qualifying = self.fetch_fia_classification(
            fia_ref["featureUrl"].replace(SERIES_CONFIG[series]["feature_suffix"], SERIES_CONFIG[series]["qualifying_suffix"]),
            name_lookup,
        )
        sprint = self.fetch_fia_classification(
            fia_ref["featureUrl"].replace(SERIES_CONFIG[series]["feature_suffix"], SERIES_CONFIG[series]["sprint_suffix"]),
            name_lookup,
        )
        feature = self.fetch_fia_classification(fia_ref["featureUrl"], name_lookup)
        if qualifying:
            qualifying["tableType"] = "qualifying"
            qualifying["results"] = self.apply_qualifying_points(qualifying["results"], series)
        if sprint:
            sprint["tableType"] = "sprint"
        if feature:
            feature["tableType"] = "feature"
        return {
            key: value
            for key, value in {
                "qualifying": qualifying,
                "sprint": sprint,
                "feature": feature,
            }.items()
            if value
        }

    def fetch_fia_classification(self, url: str, name_lookup: dict[int, dict[str, Any]]) -> dict[str, Any] | None:
        html = self.fetch_text(url, allow_missing=True)
        if not html or "<table" not in html:
            return None
        tables = pd.read_html(io.StringIO(html))
        if not tables:
            return None
        table = self.normalize_fia_table(tables[0])
        if table.empty:
            return None
        return {
            "sourceUrl": url,
            "tableType": "classification",
            "results": self.convert_fia_rows(table, name_lookup),
        }

    def normalize_fia_table(self, table: pd.DataFrame) -> pd.DataFrame:
        first_row = [self.normalize_whitespace(str(value)) for value in table.iloc[0].tolist()]
        if first_row[:4] == ["Pos", "Nr", "Driver", "Points"] or first_row[:4] == ["Pos", "Nr", "Driver", "Team"]:
            normalized = table.iloc[1:].copy()
            normalized.columns = first_row
            return normalized.reset_index(drop=True)
        return table

    def convert_fia_rows(self, table: pd.DataFrame, name_lookup: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
        rows = []
        columns = {column: self.normalize_whitespace(str(column)) for column in table.columns}
        for raw_row in table.to_dict(orient="records"):
            number = self.parse_int(raw_row.get("Nr") or raw_row.get("No."))
            official = name_lookup.get(number, {})
            driver_name = official.get("driverName") or self.expand_abbreviated_driver(raw_row.get("Driver"))
            driver_code = official.get("driverCode")
            team_name = official.get("teamName") or self.normalize_driver_team(raw_row.get("Team"))
            row = {
                "position": self.parse_position(raw_row.get("Pos")),
                "driverNumber": number,
                "driverName": driver_name,
                "driverCode": driver_code,
                "teamName": team_name,
            }
            for original_name, normalized_name in columns.items():
                if normalized_name in {"Pos", "Nr", "No.", "Driver", "Team"}:
                    continue
                value = raw_row.get(original_name)
                key = self.column_key(normalized_name)
                row[key] = self.parse_cell_value(value)
            if "time" in row:
                row["time_or_retired"] = row["time"]
                row["time_or_gap"] = row["time"]
            elif "best_lap" in row:
                row["time_or_gap"] = row["best_lap"]
            rows.append(row)
        return rows

    def extract_site_sessions(self, page_data: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
        mapped = {}
        for session in page_data.get("SessionResults", []):
            session_name = normalize_name(session.get("SessionName", ""))
            session_key = None
            if "practice" in session_name:
                session_key = "practice"
            elif "qualifying" in session_name:
                session_key = "qualifying"
            elif "sprint" in session_name:
                session_key = "sprint"
            elif "feature" in session_name:
                session_key = "feature"
            if not session_key:
                continue
            rows = []
            for result in session.get("Results", []) or []:
                driver_name = f"{result.get('DriverForename', '').strip()} {result.get('DriverSurname', '').strip()}".strip()
                rows.append(
                    {
                        "position": result.get("FinishPosition") or result.get("DisplayFinishPosition"),
                        "driverNumber": result.get("CarNumber"),
                        "driverName": driver_name,
                        "driverCode": result.get("TLA"),
                        "teamName": self.normalize_driver_team(result.get("TeamName")),
                        "laps": result.get("LapsCompleted"),
                        "time_or_gap": result.get("TimeOrFinishReason") or result.get("Best"),
                        "time_or_retired": result.get("TimeOrFinishReason"),
                        "best": result.get("Best"),
                        "best_lap": result.get("BestLap"),
                        "status": result.get("ResultStatus"),
                    }
                )
            if rows:
                mapped[session_key] = rows
        return mapped

    def build_roster_lookup(self, teams: list[dict[str, Any]]) -> dict[int, dict[str, Any]]:
        lookup = {}
        for team in teams:
            for driver in team.get("Drivers", []):
                lookup[driver["CarNumber"]] = {
                    "driverName": driver["FullName"],
                    "driverCode": driver.get("TLA"),
                    "teamName": team.get("TeamFullName"),
                }
        return lookup

    def build_event_name_lookup(
        self,
        site_sessions: dict[str, list[dict[str, Any]]],
        roster_lookup: dict[int, dict[str, Any]],
    ) -> dict[int, dict[str, Any]]:
        lookup = dict(roster_lookup)
        for session_rows in site_sessions.values():
            for row in session_rows:
                if not isinstance(row.get("driverNumber"), int):
                    continue
                lookup[row["driverNumber"]] = {
                    "driverName": row["driverName"],
                    "driverCode": row.get("driverCode"),
                    "teamName": row.get("teamName"),
                }
        return lookup

    def build_lineup_map(self, rows: list[dict[str, Any]]) -> dict[str, list[str]]:
        by_team: dict[str, list[str]] = defaultdict(list)
        for row in rows:
            if row.get("driverName") and row.get("teamName") and row["driverName"] not in by_team[row["teamName"]]:
                by_team[row["teamName"]].append(row["driverName"])
        return {team: drivers for team, drivers in sorted(by_team.items(), key=lambda item: item[0])}

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

    def determine_benchmark_mix(self, driver_name: str, summary: DriverSeasonSummary) -> dict[str, float]:
        normalized_name = self.normalize_driver_name(driver_name)
        if normalized_name in ESTIMATION_OVERRIDES:
            return ESTIMATION_OVERRIDES[normalized_name]
        if summary.wins > 0 or summary.points >= 120:
            return {"verstappen": 0.35, "leclerc": 0.3, "hamilton": 0.15, "sainz": 0.2}
        if summary.podiums >= 2 or summary.points >= 50:
            return {"leclerc": 0.3, "sainz": 0.3, "albon": 0.2, "stroll": 0.2}
        if summary.points >= 10:
            return {"albon": 0.4, "sainz": 0.25, "stroll": 0.2, "latifi": 0.15}
        if summary.starts <= 4:
            return {"stroll": 0.35, "latifi": 0.3, "albon": 0.2, "mazepin": 0.15}
        return {"stroll": 0.3, "latifi": 0.3, "mazepin": 0.2, "albon": 0.2}

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

    def load_staff_lookup(self) -> tuple[dict[str, Any], dict[str, Any], dict[str, int]]:
        country_lookup: dict[str, int] = {}
        for row in self.db.execute("SELECT CountryID, Name FROM Countries").fetchall():
            country_name = self.normalize_country_name(row["Name"])
            if country_name:
                country_lookup[country_name] = row["CountryID"]

        stat_name_lookup = {
            row["Value"]: row["ReadableName"]
            for row in self.db.execute(
                "SELECT Value, Name AS ReadableName FROM Staff_Enum_PerformanceStatTypes"
            ).fetchall()
        }
        rows = self.db.execute(
            """
            SELECT
              sb.StaffID, sb.FirstName, sb.LastName, sb.CountryID, sb.DOB_ISO,
              sd.DriverCode, sd.LastKnownDriverNumber, sd.AssignedCarNumber,
              sd.Improvability, sd.Aggression, sd.WantsChampionDriverNumber,
              sd.HasSuperLicense, sd.HasWonF2, sd.HasWonF3, sd.HasRacedEnoughToJoinF1,
              sd.PerformanceEvaluationDay, sd.Marketability, sd.TargetMarketability,
              sd.MarketabilityProgress, sd.FeederSeriesAssignedCarNumber,
              sg.StaffType, sg.RetirementAge, sg.Retired, sg.PermaTraitSpawnBoost,
              sg.BestTeamFormula, sg.BestF1PosInTeamSinceGameStart, sg.DevelopmentPlan,
              sg.ExpectedRankForTeam, sg.AchievementScore, sg.ExpectedQualityScore, sg.ExpectedTimeScore,
              c.Name AS CountryName
            FROM Staff_BasicData sb
            JOIN Staff_DriverData sd ON sd.StaffID = sb.StaffID
            LEFT JOIN Staff_GameData sg ON sg.StaffID = sb.StaffID
            LEFT JOIN Countries c ON c.CountryID = sb.CountryID
            """
        ).fetchall()
        performance_by_staff: dict[int, list[sqlite3.Row]] = defaultdict(list)
        for row in self.db.execute("SELECT StaffID, StatID, Val, Max FROM Staff_PerformanceStats").fetchall():
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

            payload = {
                "staffId": row["StaffID"],
                "displayName": display_name,
                "countryName": country_name,
                "driverCodeAlpha": driver_code_alpha,
                "driverNumber": driver_number,
                "basicData": {
                    "FirstName": first_name,
                    "LastName": last_name,
                    "CountryID": row["CountryID"],
                    "DOB_ISO": dob_iso,
                    "IsGeneratedStaff": 0,
                },
                "driverData": {
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
                },
                "gameData": {
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
                },
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

    def expand_abbreviated_driver(self, value: Any) -> str:
        text = self.normalize_whitespace(str(value))
        match = re.match(r"([A-Z])\.\s+(.+?)\s+[A-Z]{3}$", text)
        if match:
            return f"{match.group(1)}. {match.group(2)}"
        return re.sub(r"\s+[A-Z]{3}$", "", text).strip()

    def normalize_driver_team(self, value: Any) -> str:
        text = self.normalize_whitespace(str(value or ""))
        return text.replace("Hitech Grand Prix", "Hitech Pulse-Eight") if text == "Hitech Grand Prix" else text

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
        replacements = {
            "British": "UnitedKingdom",
            "Thai": "Thailand",
            "Dutch": "Netherlands",
            "Monegasque": "Monaco",
            "Argentine": "Argentina",
            "New Zealander": "NewZealand",
            "American": "UnitedStates",
            "Irish": "Ireland",
            "Brazilian": "Brazil",
            "Australian": "Australia",
            "French": "France",
            "German": "Germany",
            "Mexican": "Mexico",
            "Italian": "Italy",
            "Japanese": "Japan",
            "Chinese": "China",
            "Spanish": "Spain",
            "Finnish": "Finland",
            "Danish": "Denmark",
            "Polish": "Poland",
            "Israeli": "Israel",
            "Canadian": "Canada",
            "Swedish": "Sweden",
            "Estonian": "Estonia",
        }
        for source, target in replacements.items():
            text = text.replace(source, target)
        return re.sub(r"[^A-Za-z0-9]+", "", text) or None

    def is_valid_iso_date(self, value: Any) -> bool:
        return isinstance(value, str) and bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", value))

    def split_driver_name(self, driver_name: str) -> dict[str, str]:
        parts = driver_name.split()
        if len(parts) == 1:
            return {"firstName": parts[0], "lastName": "Driver"}
        return {"firstName": " ".join(parts[:-1]), "lastName": parts[-1]}

    def parse_position(self, value: Any) -> int | str | None:
        text = self.normalize_whitespace(str(value))
        if text.isdigit():
            return int(text)
        return text or None

    def parse_int(self, value: Any) -> int | None:
        text = self.normalize_whitespace(str(value))
        return int(text) if text.isdigit() else None

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

    def parse_cell_value(self, value: Any) -> Any:
        if pd.isna(value):
            return None
        if isinstance(value, (int, float)):
            if isinstance(value, float) and value.is_integer():
                return int(value)
            return value
        text = self.normalize_whitespace(str(value))
        integer = self.parse_int(text)
        return integer if integer is not None and text == str(integer) else text

    def column_key(self, value: str) -> str:
        key = value.lower()
        key = key.replace(" / ", "_or_")
        key = key.replace("/", "_")
        key = key.replace(".", "")
        key = re.sub(r"[^a-z0-9]+", "_", key)
        return key.strip("_")

    def fetch_next_data(self, url: str) -> dict[str, Any]:
        html = self.fetch_text(url)
        match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html)
        if not match:
            raise RuntimeError(f"No __NEXT_DATA__ payload found at {url}")
        payload = json.loads(match.group(1))
        page_data = payload.get("props", {}).get("pageProps", {}).get("pageData")
        if not isinstance(page_data, dict):
            raise RuntimeError(f"No pageData payload found at {url}")
        return page_data

    def fetch_text(self, url: str, allow_missing: bool = False) -> str:
        if url in self.page_cache:
            return self.page_cache[url]
        response = self.session.get(url, timeout=30)
        if allow_missing and response.status_code == 404:
            self.page_cache[url] = ""
            return ""
        response.raise_for_status()
        self.page_cache[url] = response.text
        time.sleep(REQUEST_DELAY_SECONDS)
        return response.text

    def normalize_whitespace(self, text: str) -> str:
        return re.sub(r"\s+", " ", text.replace("\xa0", " ")).strip()

    def apply_qualifying_points(self, rows: list[dict[str, Any]], series: str) -> list[dict[str, Any]]:
        adjusted = [dict(row) for row in rows]
        for row in adjusted:
            row["points"] = POLE_BONUS_POINTS[series] if row.get("position") == 1 else 0
        return adjusted

    def apply_race_points(self, rows: list[dict[str, Any]], points_table: tuple[int, ...]) -> list[dict[str, Any]]:
        adjusted = [dict(row) for row in rows]
        best_lap_index = self.find_fastest_lap_index(adjusted)
        for index, row in enumerate(adjusted):
            position = row.get("position")
            base_points = points_table[position - 1] if isinstance(position, int) and 1 <= position <= len(points_table) else 0
            fastest_lap_point = 1 if index == best_lap_index else 0
            row["points"] = base_points + fastest_lap_point
        return adjusted

    def find_fastest_lap_index(self, rows: list[dict[str, Any]]) -> int | None:
        best_index = None
        best_time = None
        for index, row in enumerate(rows):
            position = row.get("position")
            if not isinstance(position, int) or position > 10:
                continue
            parsed = parse_lap_time(row.get("best") or row.get("time_or_gap"))
            if parsed is None:
                continue
            if best_time is None or parsed < best_time:
                best_time = parsed
                best_index = index
        return best_index


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", f"{value or ''}".lower()).strip()


def slugify(value: str) -> str:
    return normalize_name(value).replace(" ", "-")


def parse_lap_time(value: Any) -> float | None:
    text = f"{value or ''}".strip()
    if not text or text in {"-", "DNS", "DNF", "DSQ", "NC"}:
        return None
    match = re.fullmatch(r"(?:(\d+):)?(\d{1,2})\.(\d{3})", text)
    if not match:
        return None
    minutes = int(match.group(1) or 0)
    seconds = int(match.group(2))
    milliseconds = int(match.group(3))
    return minutes * 60 + seconds + milliseconds / 1000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export bundled real-world Formula 2 and Formula 3 datasets.")
    parser.add_argument("--from-year", type=int, required=True)
    parser.add_argument("--to-year", type=int, required=True)
    parser.add_argument("--output-root", type=Path, required=True)
    parser.add_argument("--mirror-root", type=Path)
    parser.add_argument("--db", type=Path, default=Path("save2024.db"))
    parser.add_argument("--cache-dir", type=Path, default=Path(".cache"))
    parser.add_argument("--series", choices=["f2", "f3", "all"], default="all")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    exporter = RealWorldFeederExporter(
        from_year=args.from_year,
        to_year=args.to_year,
        output_root=args.output_root,
        cache_dir=args.cache_dir,
        series_list=["f2", "f3"] if args.series == "all" else [args.series],
        db_path=args.db,
        mirror_root=args.mirror_root,
    )
    exporter.run()
    print(f"[export] wrote feeder datasets under {args.output_root}")


if __name__ == "__main__":
    main()
