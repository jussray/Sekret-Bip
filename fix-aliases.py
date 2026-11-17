#!/usr/bin/env python3
"""
Drop this file in your project root (same level as package.json)
Run: python3 fix-aliases.py
It ONLY changes alias import lines. Nothing else is touched.
"""
import os, glob

# Every alias -> relative path mapping needed
FIXES = [
    ("from '@constants/theme'",           "from '../constants/theme'"),
    ("from '@constants/bip_voice'",        "from '../constants/bip_voice'"),
    ("from '@utils/storage'",              "from '../utils/storage'"),
    ("from '@utils/moodEngine'",           "from '../utils/moodEngine'"),
    ("from '@hooks/useSekretState'",       "from '../hooks/useSekretState'"),
    ("from '@components/BottomNav'",       "from '../components/BottomNav'"),
    ("from '@components/BackgroundLayer'", "from '../components/BackgroundLayer'"),
    ("from '@screens/",                    "from '../screens/"),
    ("from '@types/",                      "from '../types/"),
]

# hooks/ files use same ../  prefix (they're one level deep too)
HOOK_FIXES = [
    ("from '@utils/storage'",        "from '../utils/storage'"),
    ("from '@constants/theme'",      "from '../constants/theme'"),
    ("from '@constants/bip_voice'",  "from '../constants/bip_voice'"),
]

def fix_file(path, fixes):
    try:
        content = open(path, 'r', encoding='utf-8').read()
        updated = content
        for old, new in fixes:
            updated = updated.replace(old, new)
        if updated != content:
            open(path, 'w', encoding='utf-8').write(updated)
            print(f'  FIXED: {path}')
        else:
            print(f'  clean: {path}')
    except Exception as e:
        print(f'  ERROR: {path} — {e}')

print('\n=== Fixing app/ files ===')
for path in sorted(glob.glob('app/*.tsx') + glob.glob('app/*.ts')):
    fix_file(path, FIXES)

print('\n=== Fixing hooks/ files ===')
for path in sorted(glob.glob('hooks/*.ts') + glob.glob('hooks/*.tsx')):
    fix_file(path, HOOK_FIXES)

print('\n=== Verifying no aliases remain ===')
all_files = (
    glob.glob('app/*.tsx') + glob.glob('app/*.ts') +
    glob.glob('hooks/*.ts') + glob.glob('hooks/*.tsx')
)
found = False
for path in all_files:
    content = open(path, 'r', encoding='utf-8').read()
    for alias in ["'@constants/", "'@components/", "'@hooks/", "'@utils/", "'@screens/", "'@types/"]:
        if alias in content:
            print(f'  STILL HAS ALIAS: {path} contains {alias}')
            found = True

if not found:
    print('  ALL CLEAN — no alias imports remain')

print('\nDone. Now run: npx expo start --clear')
