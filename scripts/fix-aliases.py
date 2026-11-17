#!/usr/bin/env python3
"""
fix-aliases.py  (canonical location: scripts/fix-aliases.py)

Bulk-updates import aliases across the codebase when the src/ layer
convention is adopted. Dry-run by default — pass --write to apply changes.

Usage:
  python scripts/fix-aliases.py           # preview changes
  python scripts/fix-aliases.py --write   # apply changes

What it does:
  Rewrites legacy bare-path imports to the new @/ alias convention:
    from '../hooks/X'     → '@/hooks/X'
    from '../utils/X'     → '@/utils/X'
    from '../constants/X' → '@/constants/X'
    from '../types/X'     → '@/types/X'
    from '../services/X'  → '@/services/X'

Safe to run multiple times (idempotent).
Does NOT touch screens/, components/, or worker/ — those use their own
relative-path conventions and are not being migrated yet.

Note: The root fix-aliases.py copy is kept for backwards compat.
This scripts/ copy is the canonical one going forward.
"""

import os
import re
import sys
from pathlib import Path

WRITE_MODE = '--write' in sys.argv

# Directories to scan
SCAN_DIRS = ['src', 'app']

# Alias rewrite rules: (pattern, replacement)
RULES = [
    (r"from '(\.{1,2}/)+hooks/([^']+)'",     lambda m: f"from '@/hooks/{m.group(2)}'"),
    (r"from '(\.{1,2}/)+utils/([^']+)'",     lambda m: f"from '@/utils/{m.group(2)}'"),
    (r"from '(\.{1,2}/)+constants/([^']+)'", lambda m: f"from '@/constants/{m.group(2)}'"),
    (r"from '(\.{1,2}/)+types/([^']+)'",     lambda m: f"from '@/types/{m.group(2)}'"),
    (r"from '(\.{1,2}/)+services/([^']+)'",  lambda m: f"from '@/services/{m.group(2)}'"),
]

changed = []

for scan_dir in SCAN_DIRS:
    for root, _, files in os.walk(scan_dir):
        for fname in files:
            if not fname.endswith(('.ts', '.tsx')):
                continue
            path = Path(root) / fname
            original = path.read_text(encoding='utf-8')
            updated = original
            for pattern, repl in RULES:
                updated = re.sub(pattern, repl, updated)
            if updated != original:
                changed.append(str(path))
                if WRITE_MODE:
                    path.write_text(updated, encoding='utf-8')

if changed:
    action = 'Updated' if WRITE_MODE else 'Would update'
    print(f"{action} {len(changed)} file(s):")
    for f in changed:
        print(f"  {f}")
else:
    print('No files need updating.')

if not WRITE_MODE and changed:
    print("\nRun with --write to apply changes.")
