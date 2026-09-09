#!/usr/bin/env python3
"""Fail-closed LinkedIn analytics XLSX parser using only Python stdlib."""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
REL_NS = {"p": "http://schemas.openxmlformats.org/package/2006/relationships"}
REQUIRED_SHEETS = {"DISCOVERY", "ENGAGEMENT", "FOLLOWERS"}


def _shared_strings(archive: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    values: list[str] = []
    for item in root.findall("m:si", NS):
        values.append("".join(node.text or "" for node in item.iterfind(".//m:t", NS)))
    return values


def _sheet_targets(archive: zipfile.ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels.findall("p:Relationship", REL_NS)}
    result: dict[str, str] = {}
    for sheet in workbook.findall("m:sheets/m:sheet", NS):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib[f"{{{NS['r']}}}id"]
        target = targets[rel_id].lstrip("/")
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        result[name] = target
    return result


def _cell_value(cell: ET.Element, shared: list[str]) -> Any:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iterfind(".//m:t", NS))
    value = cell.findtext("m:v", default="", namespaces=NS)
    if cell_type == "s":
        return shared[int(value)] if value else ""
    if cell_type == "b":
        return value == "1"
    if not value:
        return ""
    try:
        number = float(value)
        return int(number) if number.is_integer() else number
    except ValueError:
        return value


def _sheet_rows(archive: zipfile.ZipFile, target: str, shared: list[str]) -> list[list[Any]]:
    root = ET.fromstring(archive.read(target))
    rows: list[list[Any]] = []
    for row in root.findall(".//m:sheetData/m:row", NS):
        indexed: dict[int, Any] = {}
        for cell in row.findall("m:c", NS):
            ref = cell.attrib.get("r", "A1")
            letters = re.match(r"[A-Z]+", ref)
            if not letters:
                continue
            index = 0
            for char in letters.group(0):
                index = index * 26 + ord(char) - 64
            indexed[index - 1] = _cell_value(cell, shared)
        width = max(indexed, default=-1) + 1
        rows.append([indexed.get(i, "") for i in range(width)])
    return rows


def _normalize_label(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value).strip().lower()).strip()


def _number(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)) and float(value).is_integer() and value >= 0:
        return int(value)
    text = str(value).replace(",", "").strip()
    if re.fullmatch(r"\d+", text):
        return int(text)
    return None


def _find_metric(rows: list[list[Any]], aliases: set[str], prefix_aliases: set[str] | None = None) -> int | None:
    prefixes = prefix_aliases or set()
    for row_index, row in enumerate(rows):
        for col_index, value in enumerate(row):
            label = _normalize_label(value)
            if label not in aliases and not any(label.startswith(f"{prefix} ") for prefix in prefixes):
                continue
            candidates = row[col_index + 1 :]
            if row_index + 1 < len(rows) and col_index < len(rows[row_index + 1]):
                candidates.append(rows[row_index + 1][col_index])
            for candidate in candidates:
                parsed = _number(candidate)
                if parsed is not None:
                    return parsed
    return None


def _sum_metric_column(rows: list[list[Any]], aliases: set[str]) -> int | None:
    for row_index, row in enumerate(rows):
        for col_index, value in enumerate(row):
            if _normalize_label(value) not in aliases:
                continue
            values: list[int] = []
            for following in rows[row_index + 1 :]:
                if col_index >= len(following):
                    continue
                parsed = _number(following[col_index])
                if parsed is not None:
                    values.append(parsed)
            if len(values) >= 2:
                return sum(values)
    return None


def parse_workbook(path: Path) -> dict[str, Any]:
    if path.suffix.lower() != ".xlsx":
        raise ValueError("Source file must use the .xlsx extension.")
    if not path.is_file() or path.stat().st_size == 0:
        raise ValueError("Source workbook is missing or empty.")

    with zipfile.ZipFile(path) as archive:
        shared = _shared_strings(archive)
        targets = _sheet_targets(archive)
        missing = sorted(REQUIRED_SHEETS.difference(targets))
        if missing:
            raise ValueError(f"Workbook is missing required sheets: {', '.join(missing)}")
        sheets = {name: _sheet_rows(archive, target, shared) for name, target in targets.items()}

    impressions = _find_metric(sheets["DISCOVERY"], {"impressions"})
    reached = _find_metric(sheets["DISCOVERY"], {"members reached", "member reached"})
    followers = _find_metric(
        sheets["FOLLOWERS"],
        {"total followers", "followers"},
        {"total followers on"},
    )
    engagements = _sum_metric_column(sheets["ENGAGEMENT"], {"engagements"})
    if engagements is None:
        engagements = _find_metric(sheets["ENGAGEMENT"], {"engagements", "total engagements"})
    if engagements is None:
        parts = [
            _find_metric(sheets["ENGAGEMENT"], {"reactions"}),
            _find_metric(sheets["ENGAGEMENT"], {"comments"}),
            _find_metric(sheets["ENGAGEMENT"], {"reposts", "shares"}),
        ]
        if all(value is not None for value in parts):
            engagements = sum(value or 0 for value in parts)

    metrics = {"impressions": impressions, "membersReached": reached, "engagements": engagements, "followers": followers}
    missing_metrics = [name for name, value in metrics.items() if value is None]
    if missing_metrics:
        raise ValueError(f"Workbook is missing required metric values: {', '.join(missing_metrics)}")

    dates = re.findall(r"20\d{2}-\d{2}-\d{2}", path.name)
    period = {"start": dates[0], "end": dates[1]} if len(dates) >= 2 else None
    return {"sourceFilename": path.name, "period": period, "metrics": metrics, "sheetNames": list(sheets)}


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: xlsx_parser.py <linkedin-analytics.xlsx>", file=sys.stderr)
        return 2
    try:
        print(json.dumps(parse_workbook(Path(sys.argv[1])), separators=(",", ":")))
        return 0
    except Exception as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
