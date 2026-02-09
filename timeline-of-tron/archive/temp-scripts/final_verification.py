#!/usr/bin/env python3
"""
Final verification that all date fixes have been applied correctly.
"""

import json
from pathlib import Path

EVENT_FILES = [
    'db/api/ecd_events_v2.json',
    'db/api/ecd_events.json',
    'db/api/ecd_events_full.json',
    'db/api/ecd_timeline.json',
    'db/raw_ecd_posts/parsed_events_v2.json'
]

def extract_year_from_date(date_str):
    """Extract year from date string."""
    if not date_str:
        return None
    try:
        if isinstance(date_str, str):
            year_str = date_str.split('-')[0]
            return int(year_str)
    except (ValueError, AttributeError, IndexError):
        pass
    return None

def verify_file(filepath):
    """Verify a single event file."""
    print(f"\n{'='*70}")
    print(f"Verifying: {filepath}")
    print('='*70)

    with open(filepath, 'r') as f:
        data = json.load(f)

    # Handle both list and dict structures
    if isinstance(data, list):
        events = [(i, event) for i, event in enumerate(data)]
        is_list = True
    elif isinstance(data, dict):
        events = list(data.items())
        is_list = False
    else:
        print(f"Unknown data structure: {type(data)}")
        return None

    issues = {
        'pre_2004': [],
        'date_year_mismatch': [],
        'details': []
    }

    for event_id, event in events:
        if not isinstance(event, dict):
            continue

        date_field = event.get('date')
        year_field = event.get('year')

        if date_field:
            year_from_date = extract_year_from_date(date_field)

            # Check for pre-2004 dates
            if year_from_date and year_from_date < 2004:
                issues['pre_2004'].append({
                    'event_id': event_id,
                    'date': date_field,
                    'year': year_field
                })
                issues['details'].append(
                    f"PRE-2004: Event {event_id} has date {date_field} (year {year_from_date})"
                )

            # Check for date/year mismatches > 1 year
            if year_field:
                try:
                    year_int = int(year_field) if isinstance(year_field, str) else year_field
                    diff = abs(year_from_date - year_int) if year_from_date else 0

                    if diff > 1:
                        issues['date_year_mismatch'].append({
                            'event_id': event_id,
                            'date': date_field,
                            'year': year_field,
                            'diff': year_from_date - year_int
                        })
                        issues['details'].append(
                            f"MISMATCH: Event {event_id} date {date_field} ({year_from_date}) "
                            f"vs year {year_int} (diff: {year_from_date - year_int})"
                        )
                except (ValueError, TypeError):
                    pass

    # Report
    if not issues['pre_2004'] and not issues['date_year_mismatch']:
        print("\n✓ NO ISSUES FOUND")
        print("  - No pre-2004 dates")
        print("  - No date/year mismatches > 1 year")
        return True
    else:
        print("\n✗ ISSUES FOUND:")
        if issues['pre_2004']:
            print(f"\n  Pre-2004 dates ({len(issues['pre_2004'])} total):")
            for issue in issues['pre_2004'][:5]:
                print(f"    - Event {issue['event_id']}: {issue['date']}")
            if len(issues['pre_2004']) > 5:
                print(f"    ... and {len(issues['pre_2004']) - 5} more")

        if issues['date_year_mismatch']:
            print(f"\n  Date/year mismatches ({len(issues['date_year_mismatch'])} total):")
            for issue in issues['date_year_mismatch'][:5]:
                print(f"    - Event {issue['event_id']}: date {issue['date']} "
                      f"vs year {issue['year']} (diff: {issue['diff']})")
            if len(issues['date_year_mismatch']) > 5:
                print(f"    ... and {len(issues['date_year_mismatch']) - 5} more")

        return False

def main():
    """Verify all event files."""
    print("\n" + "="*70)
    print("FINAL VERIFICATION: Phase 5 - Date Fixes")
    print("="*70)

    all_good = True
    results = {}

    for event_file in EVENT_FILES:
        filepath = Path(event_file)

        if not filepath.exists():
            print(f"\nWarning: File not found: {filepath}")
            continue

        is_valid = verify_file(str(filepath))
        results[event_file] = is_valid
        if not is_valid:
            all_good = False

    # Summary
    print("\n" + "="*70)
    print("VERIFICATION SUMMARY")
    print("="*70)

    for filepath, is_valid in results.items():
        status = "✓ PASS" if is_valid else "✗ FAIL"
        print(f"{status}: {filepath}")

    print("\n" + "="*70)
    if all_good:
        print("RESULT: All files verified successfully!")
        print("Phase 5 complete - no impossible dates remain.")
    else:
        print("RESULT: Some files have issues that need attention.")
    print("="*70 + "\n")

    return all_good

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
