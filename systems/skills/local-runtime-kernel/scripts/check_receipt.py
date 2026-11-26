#!/usr/bin/env python3
"""Validate local receipt structure. Exit 0 does not authenticate cited evidence."""
import json
import sys
from pathlib import Path

STATUSES = {"UNKNOWN", "CANDIDATE", "PROVEN"}
ROLES = ["REQUESTED", "AUTHORIZED", "EXECUTED", "OBSERVED", "VERIFIED", "DECIDED"]
STATES = {"VERIFIED", "FAILED", "UNKNOWN", "RECONCILING", "BLOCKED"}
PHASES = ["DECLARE", "PERMIT", "ATTEMPT", "RECORD", "PROVE", "DECIDE"]


def references(value):
    """Receipt references must be nonempty arrays of nonblank strings."""
    return isinstance(value, list) and bool(value) and all(
        isinstance(item, str) and bool(item.strip()) for item in value
    )


def check(r):
    """Validate declared receipt structure; referenced proof remains unverified."""
    errs = []
    if not isinstance(r, dict):
        return ["receipt must be a JSON object"]

    slots = r.get("slots", {})
    if not isinstance(slots, dict):
        errs.append("slots must be an object")
        slots = {}
    for name, slot in slots.items():
        if not isinstance(slot, dict):
            errs.append(f"{name}: slot must be an object")
            continue
        st = slot.get("status", "UNKNOWN")
        if not isinstance(st, str) or st not in STATUSES:
            errs.append(f"{name}: bad status {st}")
        elif st == "PROVEN" and not references(slot.get("evidence")):
            errs.append(f"{name}: PROVEN requires nonempty evidence-reference array")
    why = slots.get("WHY", {})
    if isinstance(why, dict) and why.get("status") == "PROVEN":
        if why.get("causal") is not True:
            errs.append("WHY: PROVEN requires causal=true boolean, not correlation or intent")

    who = r.get("who", {})
    if not isinstance(who, dict):
        errs.append("who must be an object")
        who = {}
    for role in ROLES:
        w = who.get(role, {"status": "UNKNOWN"})
        if not isinstance(w, dict):
            errs.append(f"WHO.{role}: binding must be an object")
            continue
        st = w.get("status", "UNKNOWN")
        if not isinstance(st, str) or st not in STATUSES:
            errs.append(f"WHO.{role}: bad status {st}")
        elif st == "PROVEN":
            if not isinstance(w.get("actor"), str) or not w["actor"].strip():
                errs.append(f"WHO.{role}: PROVEN without nonblank actor")
            for k in ("identity", "action", "authority"):
                if not references(w.get(k)):
                    errs.append(f"WHO.{role}: PROVEN missing {k} evidence-reference array")

    phase = r.get("phase", "DECLARE")
    if not isinstance(phase, str) or phase not in PHASES:
        errs.append(f"bad phase {phase}")
    elif PHASES.index(phase) >= PHASES.index("PERMIT"):
        pa = r.get("prospective_authority", {})
        if not isinstance(pa, dict) or pa.get("status") != "PROVEN" or not references(pa.get("evidence")):
            errs.append("phase>=PERMIT without PROVEN prospective authority evidence -> BLOCKED")

    state = r.get("state", "UNKNOWN")
    if not isinstance(state, str) or state not in STATES:
        errs.append(f"bad state {state}")
    elif state == "VERIFIED":
        if phase not in ("PROVE", "DECIDE"):
            errs.append("VERIFIED requires PROVE or DECIDE phase")
        must = r.get("must")
        if not isinstance(must, list) or not must or not all(isinstance(m, str) and m for m in must):
            errs.append("VERIFIED requires nonempty Must slot-name array")
            must = []
        required = ("WHAT", "WHERE", "WHEN")
        for key in required:
            if key not in must:
                errs.append(f"VERIFIED missing mandatory Must slot {key}")
        for name in must:
            slot = slots.get(name)
            if not isinstance(slot, dict) or slot.get("status") != "PROVEN":
                errs.append(f"VERIFIED but Must slot {name} not PROVEN")

        executed = who.get("EXECUTED", {})
        verified = who.get("VERIFIED", {})
        if not isinstance(executed, dict) or executed.get("status") != "PROVEN" or not isinstance(executed.get("actor"), str) or not executed["actor"].strip():
            errs.append("VERIFIED but WHO.EXECUTED not PROVEN")
        if not isinstance(verified, dict) or verified.get("status") != "PROVEN" or not isinstance(verified.get("actor"), str) or not verified["actor"].strip():
            errs.append("VERIFIED but WHO.VERIFIED not PROVEN")
        if (isinstance(executed, dict) and isinstance(verified, dict)
                and isinstance(executed.get("actor"), str)
                and isinstance(verified.get("actor"), str)
                and executed["actor"].strip()
                and executed["actor"].strip().casefold() == verified["actor"].strip().casefold()):
            errs.append("self-certification: executor == sole verifier")
    return errs

def main():
    if len(sys.argv) != 2:
        print("usage: check_receipt.py receipt.json")
        sys.exit(2)
    if sys.argv[1] != "receipt.json":
        print("BLOCKED: expected local receipt.json")
        sys.exit(2)
    receipt_path = Path("receipt.json")
    with receipt_path.open(encoding="utf-8") as f:
        errs = check(json.load(f))
    if errs:
        print("VIOLATIONS:")
        for e in errs:
            print(" -", e)
        sys.exit(1)
    print("SCHEMA_OK: receipt structure only; cited evidence and authority remain unverified")


if __name__ == "__main__":
    main()
