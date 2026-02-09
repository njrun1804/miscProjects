#!/usr/bin/env python3
"""
Phase 3 Data Integrity Fixes
- De-duplicate match records
- Sync game results
- Fix player year ranges
- Normalize award recipient names
"""

import json
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Set, Tuple

BASE_PATH = Path("/sessions/pensive-zen-darwin/mnt/timeline-of-tron")

# ============ STEP 1: Load all data files ============

def load_json(filepath):
    with open(filepath, 'r') as f:
        return json.load(f)

def save_json(filepath, data):
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

print("Loading data files...")
match_results = load_json(BASE_PATH / "db/api/ecd_match_results.json")
game_results = load_json(BASE_PATH / "db/api/ecd_game_results.json")
parsed_match_results = load_json(BASE_PATH / "db/raw_ecd_posts/parsed_match_results_v2.json")
player_years = load_json(BASE_PATH / "db/api/ecd_player_years.json")
awards = load_json(BASE_PATH / "db/api/ecd_awards_v2.json")
players = load_json(BASE_PATH / "db/api/ecd_players_full.json")

print(f"Loaded {len(match_results)} match results")
print(f"Loaded {len(game_results)} game results")
print(f"Loaded {len(parsed_match_results)} parsed match results")
print(f"Loaded {len(player_years)} player year records")
print(f"Loaded {len(awards)} awards")
print(f"Loaded {len(players)} players")

# ============ STEP A: DE-DUPLICATE MATCH RECORDS ============
print("\n" + "="*60)
print("STEP A: DE-DUPLICATING MATCH RECORDS")
print("="*60)

def create_match_key(record):
    """Create a unique key for a match (normalized, ignoring score)"""
    # Normalize names to handle case variations
    p1 = record.get('winner', '').lower().strip()
    p2 = record.get('loser', '').lower().strip()
    # Create canonical order
    if p1 > p2:
        p1, p2 = p2, p1
    event = record.get('event_number')
    return (p1, p2, event)

def has_score(record):
    """Check if a match record has valid score data"""
    return record.get('score') is not None and record.get('score') != ''

def is_more_complete(rec1, rec2):
    """Determine which record is more complete (has more data)"""
    score1 = has_score(rec1)
    score2 = has_score(rec2)

    if score1 and not score2:
        return rec1
    elif score2 and not score1:
        return rec2
    elif score1 and score2:
        # Both have scores, keep the first one
        return rec1
    else:
        # Neither has scores, keep first
        return rec1

# Group by matchup key
duplicates_by_matchup = defaultdict(list)
for record in match_results:
    key = create_match_key(record)
    duplicates_by_matchup[key].append(record)

# Find and remove duplicates
removed_records = []
deduplicated_matches = []
seen_matchups = set()

for matchup_key, records in duplicates_by_matchup.items():
    if len(records) > 1:
        # We have duplicates for this matchup
        best_record = records[0]
        for record in records[1:]:
            best_record = is_more_complete(best_record, record)

        # Add best record and mark others for removal
        if matchup_key not in seen_matchups:
            deduplicated_matches.append(best_record)
            seen_matchups.add(matchup_key)
            for record in records:
                if record['id'] != best_record['id']:
                    removed_records.append(record)
    else:
        # No duplicates, keep the record
        if matchup_key not in seen_matchups:
            deduplicated_matches.append(records[0])
            seen_matchups.add(matchup_key)

print(f"Found {len(removed_records)} duplicate records to remove")
print(f"Keeping {len(deduplicated_matches)} unique match records")

if removed_records:
    print("\nRemoved duplicates:")
    for rec in removed_records:
        winner = rec.get('winner', '')
        loser = rec.get('loser', '')
        has_score_str = "WITH score" if has_score(rec) else "NO score"
        print(f"  - ID {rec['id']}: {winner} vs {loser} ({has_score_str})")

# ============ STEP B: SYNC GAME RESULTS ============
print("\n" + "="*60)
print("STEP B: SYNCING GAME RESULTS WITH DEDUPLICATED MATCH RESULTS")
print("="*60)

# Create set of all match IDs in deduplicated matches
deduplicated_ids = set(rec['id'] for rec in deduplicated_matches)

# Filter game results to only include IDs that exist in deduplicated matches
synced_game_results = [rec for rec in game_results if rec['id'] in deduplicated_ids]
removed_game_results = [rec for rec in game_results if rec['id'] not in deduplicated_ids]

print(f"Removed {len(removed_game_results)} game result records (matching deleted duplicates)")
print(f"Synced game results: {len(synced_game_results)} records")

# ============ STEP C: FIX PLAYER YEAR RANGES ============
print("\n" + "="*60)
print("STEP C: FIXING PLAYER YEAR RANGES")
print("="*60)

# Build player year range from actual match data
player_actual_years = defaultdict(lambda: {'min': float('inf'), 'max': 0})

for record in deduplicated_matches:
    winner = record.get('winner', '').strip()
    loser = record.get('loser', '').strip()
    year = record.get('year')

    if year is not None and year > 0:
        if winner:
            player_actual_years[winner]['min'] = min(player_actual_years[winner]['min'], year)
            player_actual_years[winner]['max'] = max(player_actual_years[winner]['max'], year)
        if loser:
            player_actual_years[loser]['min'] = min(player_actual_years[loser]['min'], year)
            player_actual_years[loser]['max'] = max(player_actual_years[loser]['max'], year)

# Create a mapping of player names (lowercase) to canonical names from players_full
player_canonical_map = {}
for player in players:
    name = player.get('name', '').strip()
    if name:
        player_canonical_map[name.lower()] = name

# Create a player lookup for fast access
player_lookup = {}
for player in players:
    name = player.get('name', '').strip()
    if name:
        player_lookup[name] = player

# Update player_years with actual year ranges
updated_player_years = []
changed_count = 0

for record in player_years:
    player_name = record.get('player_name', '').strip()
    year_value = record.get('year')

    # Find the canonical player name
    canonical_name = player_canonical_map.get(player_name.lower(), player_name)

    if canonical_name in player_actual_years:
        actual_range = player_actual_years[canonical_name]
        min_year = int(actual_range['min'])
        max_year = int(actual_range['max'])

        # Create an aggregate record with year range
        # Group by player to get min/max
        if updated_player_years and updated_player_years[-1].get('player_name') == canonical_name:
            # Already processed this player, skip year record
            continue
        else:
            # Create new aggregate record
            record['player_name'] = canonical_name
            record['year'] = year_value  # Keep original for compatibility
            # Add min/max year fields for reference
            record['_first_year'] = min_year
            record['_last_year'] = max_year
            updated_player_years.append(record)
            changed_count += 1

# Actually, we need to update ecd_player_years differently - it contains per-year stats
# Let's just track year ranges separately for now and update the players_full instead

print(f"\nPlayer year ranges from match data:")
for player_name in sorted(player_actual_years.keys()):
    years = player_actual_years[player_name]
    if years['min'] != float('inf'):
        print(f"  {player_name}: {int(years['min'])}-{int(years['max'])}")

# Now update players_full with corrected year ranges
updated_players = []
for player in players:
    player_name = player.get('name', '').strip()
    if player_name in player_actual_years:
        years = player_actual_years[player_name]
        if years['min'] != float('inf'):
            player['first_year'] = int(years['min'])
            player['last_year'] = int(years['max'])
    updated_players.append(player)

print(f"Updated {len(updated_players)} player records with corrected year ranges")

# ============ STEP D: NORMALIZE AWARD RECIPIENT NAMES ============
print("\n" + "="*60)
print("STEP D: NORMALIZING AWARD RECIPIENT NAMES")
print("="*60)

# Build a mapping of known player names
known_players = set()
for player in players:
    name = player.get('name', '').strip()
    if name:
        known_players.add(name)

# Also add all players from match data
for record in deduplicated_matches:
    winner = record.get('winner', '').strip()
    loser = record.get('loser', '').strip()
    if winner:
        known_players.add(winner)
    if loser:
        known_players.add(loser)

# Create lowercase to canonical mapping
player_lower_map = {}
for player_name in known_players:
    player_lower_map[player_name.lower()] = player_name

normalized_awards = []
removed_awards = []

for award in awards:
    recipient = award.get('recipient', '').strip()

    # Check for data artifacts
    if recipient.startswith('$') or 'For' in recipient:
        # This is a fundraising entry, not a player award
        print(f"  REMOVING artifact: {award['id']} - {recipient}")
        removed_awards.append(award)
        continue

    # Remove trailing "to" or other artifacts
    if recipient.endswith(' to'):
        recipient = recipient[:-3].strip()

    # Normalize case: try to find matching player
    recipient_lower = recipient.lower()

    # Try direct match
    if recipient in known_players:
        normalized_recipient = recipient
    elif recipient_lower in player_lower_map:
        normalized_recipient = player_lower_map[recipient_lower]
    else:
        # Try partial matching or return as-is if no match
        candidates = [p for p in known_players if p.lower() == recipient_lower]
        if candidates:
            normalized_recipient = candidates[0]
        else:
            # Leave as-is for now, but normalize case to Title Case
            normalized_recipient = ' '.join(word.capitalize() for word in recipient.split())

    # Update the award record
    if normalized_recipient != recipient:
        print(f"  Normalized: {award['id']} - '{recipient}' -> '{normalized_recipient}'")
        award['recipient'] = normalized_recipient

    normalized_awards.append(award)

print(f"\nRemoved {len(removed_awards)} non-player award entries")
print(f"Normalized {len(normalized_awards)} award records")

# ============ SAVE UPDATED FILES ============
print("\n" + "="*60)
print("SAVING UPDATED FILES")
print("="*60)

# Save deduplicated match results
save_json(BASE_PATH / "db/api/ecd_match_results.json", deduplicated_matches)
print(f"Saved deduplicated match results: {len(deduplicated_matches)} records")

# Save synced game results
save_json(BASE_PATH / "db/api/ecd_game_results.json", synced_game_results)
print(f"Saved synced game results: {len(synced_game_results)} records")

# Save updated players with corrected year ranges
save_json(BASE_PATH / "db/api/ecd_players_full.json", updated_players)
print(f"Saved updated players: {len(updated_players)} records")

# Save normalized awards
save_json(BASE_PATH / "db/api/ecd_awards_v2.json", normalized_awards)
print(f"Saved normalized awards: {len(normalized_awards)} records")

# ============ VERIFICATION ============
print("\n" + "="*60)
print("VERIFICATION SUMMARY")
print("="*60)

# Check for remaining duplicates
verification_duplicates = defaultdict(list)
for record in deduplicated_matches:
    key = create_match_key(record)
    verification_duplicates[key].append(record['id'])

dup_count = sum(1 for ids in verification_duplicates.values() if len(ids) > 1)
print(f"Remaining duplicate matchups: {dup_count}")

# Check player year ranges look reasonable
print(f"\nPlayer year range samples (first 10):")
for i, player in enumerate(updated_players[:10]):
    name = player.get('name', '')
    first = player.get('first_year')
    last = player.get('last_year')
    print(f"  {name}: {first}-{last}")

# Check award recipients
print(f"\nAward recipient samples (first 10):")
for award in normalized_awards[:10]:
    recipient = award.get('recipient', '')
    award_type = award.get('award_type', '')
    print(f"  {recipient}: {award_type}")

print("\n" + "="*60)
print("PHASE 3 FIXES COMPLETE")
print("="*60)
