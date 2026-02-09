#!/usr/bin/env python3
"""
Search script to find missing dodgeball event numbers in raw ECD posts.
Searches for event numbers, Roman numerals, and special event names.
"""

import json
import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Missing event numbers to search for
MISSING_EVENTS = {4, 5, 6, 11, 12, 16, 111, 112, 152, 172, 173, 175, 176, 178, 179,
                  180, 181, 182, 183, 186, 187, 188, 189, 190, 191, 193, 194, 196, 197, 198}

# Events potentially beyond 200
HIGH_EVENTS = set(range(201, 221))  # 201-220

# Special event names to search for
SPECIAL_EVENTS = [
    "Pro Bowl", "Anniversary", "Indoor", "Women's", "All-Star",
    "Championship", "Final", "Playoff", "Tournament", "Special"
]

def convert_to_roman(num: int) -> str:
    """Convert a number to Roman numeral."""
    val = [
        1000, 900, 500, 400,
        100, 90, 50, 40,
        10, 9, 5, 4,
        1
    ]
    syms = [
        "M", "CM", "D", "CD",
        "C", "XC", "L", "XL",
        "X", "IX", "V", "IV",
        "I"
    ]
    roman_num = ''
    i = 0
    while num > 0:
        for _ in range(num // val[i]):
            roman_num += syms[i]
            num -= val[i]
        i += 1
    return roman_num

def create_search_patterns(event_num: int) -> List[re.Pattern]:
    """Create regex patterns for different ways an event number might be mentioned."""
    patterns = []
    roman = convert_to_roman(event_num)

    # Pattern variations
    pattern_strings = [
        rf"dodgeball\s+#{event_num}",  # Dodgeball #172
        rf"dodgeball\s+{event_num}",   # Dodgeball 172
        rf"#{event_num}\b",             # #172
        rf"\bdodgeball\s+{roman}",      # Dodgeball CLXXII
        rf"event\s+#{event_num}",       # Event #172
        rf"event\s+{event_num}",        # Event 172
    ]

    for pattern_str in pattern_strings:
        patterns.append(re.compile(pattern_str, re.IGNORECASE))

    return patterns

def extract_context(text: str, match_start: int, match_end: int, context_chars: int = 100) -> str:
    """Extract surrounding context from matched text."""
    start = max(0, match_start - context_chars)
    end = min(len(text), match_end + context_chars)

    snippet = text[start:end]
    # Add ellipsis if we didn't get the full text
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."

    return snippet.replace('\n', ' ').replace('\r', ' ')

def search_file(filepath: str) -> List[Dict]:
    """Search a single JSON file for dodgeball events."""
    results = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        return results

    # Handle if data is a list (shouldn't be, but be safe)
    if isinstance(data, list):
        if len(data) == 0:
            return results
        data = data[0]

    post_id = Path(filepath).stem
    title = data.get('title', '') if isinstance(data, dict) else ''
    body_text = data.get('body_text', '') if isinstance(data, dict) else ''

    # Combine title and body for searching
    full_text = f"{title} {body_text}"

    # Search for missing event numbers
    for event_num in sorted(MISSING_EVENTS):
        patterns = create_search_patterns(event_num)

        for pattern in patterns:
            for match in pattern.finditer(full_text):
                snippet = extract_context(full_text, match.start(), match.end())
                results.append({
                    'post_id': post_id,
                    'title': title,
                    'event_num': event_num,
                    'match_text': match.group(),
                    'snippet': snippet,
                    'type': 'missing_event'
                })

    # Search for high event numbers (>200)
    for event_num in sorted(HIGH_EVENTS):
        # Simple pattern for numbers > 200
        pattern = re.compile(rf"\b{event_num}\b", re.IGNORECASE)

        for match in pattern.finditer(full_text):
            snippet = extract_context(full_text, match.start(), match.end())
            results.append({
                'post_id': post_id,
                'title': title,
                'event_num': event_num,
                'match_text': match.group(),
                'snippet': snippet,
                'type': 'high_event'
            })

    # Search for special event names
    for special_name in SPECIAL_EVENTS:
        pattern = re.compile(rf"\b{special_name}\b", re.IGNORECASE)

        for match in pattern.finditer(full_text):
            snippet = extract_context(full_text, match.start(), match.end())
            results.append({
                'post_id': post_id,
                'title': title,
                'event_num': None,
                'match_text': match.group(),
                'snippet': snippet,
                'type': f'special_{special_name.lower()}'
            })

    return results

def main():
    """Main function to search all files."""
    directory = '/sessions/adoring-beautiful-gates/mnt/timeline-of-tron/db/raw_ecd_posts'

    print("=" * 100)
    print("DODGEBALL EVENT NUMBER SEARCH")
    print("=" * 100)
    print(f"\nSearching {directory}")
    print(f"Looking for: {sorted(MISSING_EVENTS)}")
    print(f"Also searching for events: {sorted(HIGH_EVENTS)}")
    print(f"And special event names: {SPECIAL_EVENTS}\n")

    all_results = []
    file_count = 0

    # Get all JSON files
    json_files = sorted(Path(directory).glob('*.json'))
    total_files = len(json_files)

    print(f"Processing {total_files} files...\n")

    for idx, filepath in enumerate(json_files, 1):
        if idx % 100 == 0:
            print(f"  Processed {idx}/{total_files} files...")

        results = search_file(str(filepath))
        all_results.extend(results)
        file_count += 1

    print(f"\nCompleted processing {file_count} files.\n")
    print("=" * 100)

    if not all_results:
        print("\nNO MATCHES FOUND")
        return

    # Group results by type
    missing_event_results = [r for r in all_results if r['type'] == 'missing_event']
    high_event_results = [r for r in all_results if r['type'] == 'high_event']
    special_event_results = [r for r in all_results if r['type'].startswith('special_')]

    # Print missing events
    if missing_event_results:
        print(f"\nFOUND {len(missing_event_results)} MATCHES FOR MISSING EVENT NUMBERS:")
        print("-" * 100)

        # Group by event number
        by_event = {}
        for result in missing_event_results:
            event_num = result['event_num']
            if event_num not in by_event:
                by_event[event_num] = []
            by_event[event_num].append(result)

        for event_num in sorted(by_event.keys()):
            matches = by_event[event_num]
            print(f"\nEvent #{event_num}: {len(matches)} match(es)")
            for result in matches[:5]:  # Show up to 5 matches per event
                print(f"  Post ID: {result['post_id']}")
                print(f"  Title: {result['title'][:80]}")
                print(f"  Match: {result['match_text']}")
                print(f"  Context: {result['snippet'][:120]}")
                print()

            if len(matches) > 5:
                print(f"  ... and {len(matches) - 5} more matches")
    else:
        print("\nNO MATCHES FOUND FOR MISSING EVENT NUMBERS")

    # Print high events
    if high_event_results:
        print("\n" + "=" * 100)
        print(f"\nFOUND {len(high_event_results)} MATCHES FOR EVENTS > 200:")
        print("-" * 100)

        # Group by event number
        by_event = {}
        for result in high_event_results:
            event_num = result['event_num']
            if event_num not in by_event:
                by_event[event_num] = []
            by_event[event_num].append(result)

        for event_num in sorted(by_event.keys()):
            matches = by_event[event_num]
            print(f"\nEvent #{event_num}: {len(matches)} match(es)")
            for result in matches[:5]:  # Show up to 5 matches per event
                print(f"  Post ID: {result['post_id']}")
                print(f"  Title: {result['title'][:80]}")
                print(f"  Match: {result['match_text']}")
                print(f"  Context: {result['snippet'][:120]}")
                print()

            if len(matches) > 5:
                print(f"  ... and {len(matches) - 5} more matches")
    else:
        print("\nNO MATCHES FOUND FOR EVENTS > 200")

    # Print special events
    if special_event_results:
        print("\n" + "=" * 100)
        print(f"\nFOUND {len(special_event_results)} MATCHES FOR SPECIAL EVENT NAMES:")
        print("-" * 100)

        # Group by special name
        by_special = {}
        for result in special_event_results:
            special_type = result['type'].replace('special_', '').upper()
            if special_type not in by_special:
                by_special[special_type] = []
            by_special[special_type].append(result)

        for special_name in sorted(by_special.keys()):
            matches = by_special[special_name]
            print(f"\n{special_name}: {len(matches)} match(es)")
            for result in matches[:3]:  # Show up to 3 matches per special name
                print(f"  Post ID: {result['post_id']}")
                print(f"  Title: {result['title'][:80]}")
                print(f"  Context: {result['snippet'][:120]}")
                print()

            if len(matches) > 3:
                print(f"  ... and {len(matches) - 3} more matches")
    else:
        print("\nNO MATCHES FOUND FOR SPECIAL EVENT NAMES")

    # Summary
    print("\n" + "=" * 100)
    print("SUMMARY:")
    print(f"  Missing event numbers found: {len(missing_event_results)}")
    print(f"  High event numbers (>200) found: {len(high_event_results)}")
    print(f"  Special event names found: {len(special_event_results)}")
    print(f"  Total matches: {len(all_results)}")
    print("=" * 100)

if __name__ == '__main__':
    main()
