#!/usr/bin/env python3
"""
Fix impossible dates in ECD events files.

Phase 5: Fix the 10 events with impossible pre-2000 dates and date/year mismatches.
The year field is more reliable (from event numbering), so set date to null
when the date field is unreliable.
"""

import json
from pathlib import Path

# List of all event files to fix
EVENT_FILES = [
    'db/api/ecd_events_v2.json',
    'db/api/ecd_events.json',
    'db/api/ecd_events_full.json',
    'db/api/ecd_timeline.json',
    'db/raw_ecd_posts/parsed_events_v2.json'
]

def extract_year_from_date(date_str):
    """Extract year from various date string formats."""
    if not date_str:
        return None

    try:
        if isinstance(date_str, str):
            # Handle YYYY-MM-DD format or just YYYY
            year_str = date_str.split('-')[0]
            return int(year_str)
    except (ValueError, AttributeError, IndexError):
        pass

    return None

def fix_dates_in_file(filepath):
    """Fix date issues in a single event file."""
    print(f"\n{'='*70}")
    print(f"Processing: {filepath}")
    print('='*70)

    with open(filepath, 'r') as f:
        data = json.load(f)

    changes_log = []

    # Handle both list and dict structures
    if isinstance(data, list):
        events = data
        is_list = True
    elif isinstance(data, dict):
        # For dict structure, convert to list of (key, value) pairs
        events = [(key, value) for key, value in data.items()]
        is_list = False
    else:
        print(f"Unknown data structure: {type(data)}")
        return changes_log

    for item in events:
        if is_list:
            event = item
            event_id = event.get('event_number', 'unknown')
        else:
            key, event = item
            event_id = key

        if not isinstance(event, dict):
            continue

        date_field = event.get('date')
        year_field = event.get('year')

        # Issue 1: Pre-2004 dates
        if date_field:
            year_from_date = extract_year_from_date(date_field)

            if year_from_date and year_from_date < 2004:
                change = {
                    'event_id': event_id,
                    'event_name': event.get('event_name') or event.get('name'),
                    'old_date': date_field,
                    'old_year': year_field,
                    'issue': f'Pre-2004 date ({year_from_date})',
                    'action': 'Set date to null'
                }
                event['date'] = None
                changes_log.append(change)
                print(f"\n[PRE-2004] Event {event_id}")
                print(f"  Old date: {date_field} (year {year_from_date})")
                print(f"  Kept year field: {year_field}")
                print(f"  Action: Cleared date field")

            # Issue 2: Date/year mismatch > 1 year
            elif year_field:
                try:
                    year_int = int(year_field) if isinstance(year_field, str) else year_field
                    diff = abs(year_from_date - year_int) if year_from_date else 0

                    if diff > 1:
                        change = {
                            'event_id': event_id,
                            'event_name': event.get('event_name') or event.get('name'),
                            'old_date': date_field,
                            'old_year': year_field,
                            'issue': f'Date/year mismatch > 1 year (diff: {year_from_date - year_int})',
                            'action': 'Set date to null'
                        }
                        event['date'] = None
                        changes_log.append(change)
                        print(f"\n[MISMATCH] Event {event_id}")
                        print(f"  Old date: {date_field} (year {year_from_date})")
                        print(f"  Year field: {year_int}")
                        print(f"  Difference: {year_from_date - year_int} years")
                        print(f"  Action: Cleared date field")
                except (ValueError, TypeError):
                    pass

    # Write the fixed events back to file
    with open(filepath, 'w') as f:
        if is_list:
            json.dump(data, f, indent=2)
        else:
            # Reconstruct dict from modified events
            json.dump({key: value for key, value in events}, f, indent=2)

    print(f"\n{'-'*70}")
    print(f"Total changes made: {len(changes_log)}")
    print(f"File saved: {filepath}")
    print('-'*70)

    return changes_log

def main():
    """Fix date issues across all event files."""
    print("\n" + "="*70)
    print("PHASE 5: Fixing Impossible Pre-2004 Dates in ECD Events")
    print("="*70)

    total_changes = 0
    all_changes = []

    for event_file in EVENT_FILES:
        filepath = Path(event_file)

        if not filepath.exists():
            print(f"\nWarning: File not found: {filepath}")
            continue

        changes = fix_dates_in_file(str(filepath))
        all_changes.extend(changes)
        total_changes += len(changes)

    # Summary report
    print("\n" + "="*70)
    print("SUMMARY REPORT")
    print("="*70)
    print(f"\nTotal files processed: {len(EVENT_FILES)}")
    print(f"Total changes made: {total_changes}")

    if all_changes:
        print("\nChanges by issue type:")
        pre2004_count = sum(1 for c in all_changes if 'Pre-2004' in c['issue'])
        mismatch_count = sum(1 for c in all_changes if 'mismatch' in c['issue'].lower())

        print(f"  - Pre-2004 dates fixed: {pre2004_count}")
        print(f"  - Date/year mismatches fixed: {mismatch_count}")

    print("\n" + "="*70)
    print("Verification: Checking for remaining issues...")
    print("="*70)

    # Verify no pre-2004 dates remain
    for event_file in EVENT_FILES:
        filepath = Path(event_file)

        if not filepath.exists():
            continue

        with open(filepath, 'r') as f:
            events = json.load(f)

        bad_dates = []
        for i, event in enumerate(events):
            date_field = event.get('date')
            if date_field:
                year_from_date = extract_year_from_date(date_field)
                if year_from_date and year_from_date < 2004:
                    bad_dates.append((i, date_field, year_from_date))

        if bad_dates:
            print(f"\nERROR in {filepath}: Still has pre-2004 dates!")
            for idx, date, year in bad_dates:
                print(f"  Event {idx}: {date} (year {year})")
        else:
            print(f"\n✓ {filepath}: No pre-2004 dates found")

    print("\n" + "="*70)
    print("Phase 5 complete!")
    print("="*70 + "\n")

if __name__ == '__main__':
    main()
