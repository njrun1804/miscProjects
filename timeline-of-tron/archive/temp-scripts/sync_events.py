#!/usr/bin/env python3
"""
Data synchronization script to resolve the split truth problem.
Syncs all 5 event files to use the canonical ecd_events_v2.json (222 events).
"""

import json
from pathlib import Path

BASE_PATH = Path('/sessions/pensive-zen-darwin/mnt/timeline-of-tron/db/api')

def load_json(filepath):
    """Load JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def save_json(filepath, data):
    """Save JSON file with proper formatting."""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"✓ Updated {filepath.name} with {len(data) if isinstance(data, list) else len(data.get('events', []))} events")

# Load the canonical V2 data
print("Loading canonical ecd_events_v2.json...")
v2_events = load_json(BASE_PATH / 'ecd_events_v2.json')
print(f"Canonical source has {len(v2_events)} events\n")

# Files to sync (same schema as ecd_events_v2.json - simple array)
simple_schema_files = [
    'ecd_events.json',
    'ecd_events_full.json',
    'ecd_timeline.json'
]

print("=== SYNCING FILES WITH SIMPLE SCHEMA (array of events) ===\n")
for filename in simple_schema_files:
    filepath = BASE_PATH / filename
    old_data = load_json(filepath)
    print(f"Updating {filename}: {len(old_data)} → {len(v2_events)} events")
    save_json(filepath, v2_events)

# Special case: ecd_main_events.json has a different structure
# It contains match results, not event summaries
# We need to check if it should be populated differently or left as-is
print("\n=== SPECIAL CASE: ecd_main_events.json ===")
print("This file contains match results (winner/loser format), not events")
print("Current structure: 4 records with match data")
main_events = load_json(BASE_PATH / 'ecd_main_events.json')
print(f"Keeping ecd_main_events.json as-is ({len(main_events)} match records)\n")

# Update ecd_stats_dashboard.json
print("=== UPDATING ecd_stats_dashboard.json ===")
stats_file = BASE_PATH / 'ecd_stats_dashboard.json'
stats_data = load_json(stats_file)
print(f"Old event_count: {stats_data['event_count']}")
stats_data['event_count'] = len(v2_events)
print(f"New event_count: {stats_data['event_count']}")
save_json(stats_file, stats_data)

# Verify parse_stats_v2.json
print("\n=== VERIFYING parse_stats_v2.json ===")
parse_stats_file = Path('/sessions/pensive-zen-darwin/mnt/timeline-of-tron/parse_stats_v2.json')
parse_stats = load_json(parse_stats_file)
print(f"Current total_events in parse_stats_v2.json: {parse_stats['total_events']}")
if parse_stats['total_events'] != len(v2_events):
    print(f"Updating to {len(v2_events)}...")
    parse_stats['total_events'] = len(v2_events)
    save_json(parse_stats_file, parse_stats)
else:
    print(f"✓ Already correct at {len(v2_events)} events")

print("\n=== FINAL VERIFICATION ===")
# Verify all counts are now synchronized
files_to_verify = [
    ('ecd_events.json', BASE_PATH / 'ecd_events.json'),
    ('ecd_events_full.json', BASE_PATH / 'ecd_events_full.json'),
    ('ecd_timeline.json', BASE_PATH / 'ecd_timeline.json'),
    ('ecd_events_v2.json', BASE_PATH / 'ecd_events_v2.json'),
    ('ecd_stats_dashboard.json', BASE_PATH / 'ecd_stats_dashboard.json'),
]

for name, filepath in files_to_verify:
    data = load_json(filepath)
    if isinstance(data, list):
        count = len(data)
    elif isinstance(data, dict) and 'event_count' in data:
        count = data['event_count']
    else:
        count = 'N/A'
    print(f"{name:30s} : {count} events" if count != 'N/A' else f"{name:30s} : {count}")

print("\n✓ Synchronization complete!")
