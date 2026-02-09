#!/usr/bin/env python3
"""
Detailed search report for missing dodgeball events.
Generates a comprehensive CSV file with all findings.
"""

import json
import re
import csv
from pathlib import Path
from typing import Dict, List

MISSING_EVENTS = {4, 5, 6, 11, 12, 16, 111, 112, 152, 172, 173, 175, 176, 178, 179,
                  180, 181, 182, 183, 186, 187, 188, 189, 190, 191, 193, 194, 196, 197, 198}
HIGH_EVENTS = set(range(201, 221))

def convert_to_roman(num: int) -> str:
    """Convert a number to Roman numeral."""
    val = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1]
    syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"]
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
    pattern_strings = [
        rf"dodgeball\s+#{event_num}",
        rf"dodgeball\s+{event_num}",
        rf"#{event_num}\b",
        rf"\bdodgeball\s+{roman}",
        rf"event\s+#{event_num}",
        rf"event\s+{event_num}",
    ]
    for pattern_str in pattern_strings:
        patterns.append(re.compile(pattern_str, re.IGNORECASE))
    return patterns

def extract_context(text: str, match_start: int, match_end: int, context_chars: int = 150) -> str:
    """Extract surrounding context from matched text."""
    start = max(0, match_start - context_chars)
    end = min(len(text), match_end + context_chars)
    snippet = text[start:end].replace('\n', ' ').replace('\r', ' ')
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    return snippet

def search_file(filepath: str) -> List[Dict]:
    """Search a single JSON file for dodgeball events."""
    results = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return results

    if isinstance(data, list):
        if len(data) == 0:
            return results
        data = data[0]

    post_id = Path(filepath).stem
    title = data.get('title', '') if isinstance(data, dict) else ''
    body_text = data.get('body_text', '') if isinstance(data, dict) else ''
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

    # Search for high event numbers
    for event_num in sorted(HIGH_EVENTS):
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

    return results

def main():
    directory = os.path.join(os.path.dirname(__file__), '..', 'db')
    json_files = sorted(Path(directory).glob('*.json'))

    all_results = []
    for filepath in json_files:
        results = search_file(str(filepath))
        all_results.extend(results)

    # Write to CSV
    output_file = '/sessions/adoring-beautiful-gates/mnt/timeline-of-tron/dodgeball_search_detailed.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['post_id', 'title', 'event_num', 'match_text', 'snippet', 'type'])
        writer.writeheader()
        
        for result in sorted(all_results, key=lambda x: (x['event_num'] or 0, x['post_id'])):
            writer.writerow(result)

    print(f"Detailed results written to: {output_file}")
    
    # Count by event
    by_event = {}
    for result in all_results:
        if result['type'] == 'missing_event':
            event_num = result['event_num']
            if event_num not in by_event:
                by_event[event_num] = 0
            by_event[event_num] += 1
    
    print("\nMissing events found (event -> count):")
    for event_num in sorted(by_event.keys()):
        print(f"  Event #{event_num}: {by_event[event_num]} mentions")

if __name__ == '__main__':
    main()
