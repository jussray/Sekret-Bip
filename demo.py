#!/usr/bin/env python3
"""Run Se'kret Bip's existing browser journeys, not a simulated demo.

Usage:
    python3 demo.py                 # local teen/parent/sign-in Playwright journeys
    python3 demo.py production      # read-only public production browser journeys
    python3 demo.py readiness       # full deployment/code demo-readiness gate

Local browser tests use Playwright's controlled webServer config (including its
isolated Supabase environment). Production tests do not create accounts, send
messages, or access private user data. Neither mode by itself certifies the
full email-verification, parent consent, or production release gate.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent

JOURNEYS = {
    "local": (
        "test:e2e",
        "e2e/smoke.spec.ts",
        "e2e/auth-security-handoff.spec.ts",
    ),
    "production": (
        "test:e2e:production",
        "e2e/production-audience-journeys.spec.ts",
        "e2e/production-public-front-door.spec.ts",
    ),
}


def run(mode: str) -> int:
    if mode == "readiness":
        script = ROOT / "scripts" / "demo-check.sh"
        if not script.is_file() or not shutil.which("bash"):
            print("BLOCKED: bash and scripts/demo-check.sh are required for readiness.")
            return 2
        command = ["bash", str(script)]
    else:
        if mode not in JOURNEYS:
            raise ValueError(f"Unknown mode: {mode}")
        script_name, *specs = JOURNEYS[mode]
        missing = [name for name in specs if not (ROOT / name).is_file()]
        if missing:
            print(f"BLOCKED: missing real Playwright journeys: {', '.join(missing)}")
            return 2
        if not shutil.which("npm") or not (ROOT / "node_modules/.bin/playwright").exists():
            print("BLOCKED: npm dependencies/Playwright are missing. Run npm ci first.")
            return 2
        command = ["npm", "run", script_name, "--", *specs, "--reporter=line", "--workers=1"]

    print(f"Se'kret Bip {mode}: invoking existing repository verification.", flush=True)
    print("COMMAND:", " ".join(command), flush=True)
    try:
        result = subprocess.run(command, cwd=ROOT, check=False)
    except OSError as exc:
        print(f"BLOCKED: could not launch verification: {exc}")
        return 2
    if result.returncode:
        print(f"NOT VERIFIED: {mode} exited with status {result.returncode}.")
    else:
        print(f"PASS: {mode} runner completed. Review Playwright evidence and remaining release gates.")
    return result.returncode


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("local", "production", "readiness"), nargs="?", default="local")
    args = parser.parse_args(argv)
    return run(args.mode)


if __name__ == "__main__":
    raise SystemExit(main())
