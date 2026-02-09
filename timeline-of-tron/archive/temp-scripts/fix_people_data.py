#!/usr/bin/env python3
"""
Phase 2: Fix people and player data
Tasks:
A) Add 70 missing ECD players to people.json
B) Tag all 128 ECD players with category "ecd_player"
C) Merge Dan Spengeman / Danny Sponge
D) Fix spelling: "Julia Dennabuam" → "Julia Dennebaum"
E) Clean fragmentary names in name_aliases.json
"""

import json
from difflib import SequenceMatcher
import os

# File paths
PEOPLE_FILE = "/sessions/pensive-zen-darwin/mnt/timeline-of-tron/db/api/people.json"
ECD_PLAYERS_FILE = "/sessions/pensive-zen-darwin/mnt/timeline-of-tron/db/api/ecd_players_full.json"
PROFILES_FILE = "/sessions/pensive-zen-darwin/mnt/timeline-of-tron/db/api/people_profiles.json"
IMPORTANCE_FILE = "/sessions/pensive-zen-darwin/mnt/timeline-of-tron/db/api/people_importance_scores.json"
ALIASES_FILE = "/sessions/pensive-zen-darwin/mnt/timeline-of-tron/db/api/name_aliases.json"


def fuzzy_match(name1, name2, threshold=0.85):
    """Check if two names are similar enough to be the same person."""
    ratio = SequenceMatcher(None, name1.lower(), name2.lower()).ratio()
    return ratio >= threshold


def load_json(filepath):
    """Load JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)


def save_json(filepath, data):
    """Save JSON file."""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)


def main():
    print("Loading files...")
    people = load_json(PEOPLE_FILE)
    ecd_players = load_json(ECD_PLAYERS_FILE)
    profiles = load_json(PROFILES_FILE)
    importance = load_json(IMPORTANCE_FILE)
    aliases = load_json(ALIASES_FILE)

    print(f"Loaded {len(people)} people, {len(ecd_players)} ECD players")

    # Build a set of names already in people.json (including fuzzy matches)
    existing_names = set()
    people_by_name = {}

    for person in people:
        name = person['name'].lower()
        existing_names.add(name)
        people_by_name[name] = person

    print(f"Existing names in people.json: {len(existing_names)}")

    # ========== TASK A & B: Add missing ECD players and tag all ==========
    new_people = []
    max_id = max([p['id'] for p in people])
    print(f"Max ID in people.json: {max_id}")

    next_id = max_id + 1
    added_count = 0
    tagged_count = 0

    for ecd_player in ecd_players:
        player_name = ecd_player['name']

        # Find if this player exists in people
        found = False
        for person in people:
            if fuzzy_match(person['name'], player_name):
                # Tag with ecd_player category if not already tagged
                if person.get('category') != 'ecd_player':
                    person['category'] = 'ecd_player'
                    tagged_count += 1
                    print(f"  Tagged: {person['name']} (ID {person['id']})")
                found = True
                break

        if not found:
            # Create new person entry
            new_person = {
                'id': next_id,
                'name': player_name,
                'category': 'ecd_player',
                'relation': 'ECD Player',
                'connection': f"Dodgeball player, {ecd_player.get('total_mentions', 0)} mentions across {ecd_player.get('post_count', 0)} posts",
                'birth_year': None,
                'born': None,
                'importance_score': 0.0,
                'peak_year': ecd_player.get('peak_year'),
                'active_years': ecd_player.get('era_active', ''),
                'dominant_topic': '',
                'influence_period': ''
            }

            people.append(new_person)
            new_people.append(new_person)
            added_count += 1
            print(f"  Added: {player_name} (ID {next_id})")

            next_id += 1

    print(f"\nAdded {added_count} new ECD players")
    print(f"Tagged {tagged_count} existing players as ecd_player")

    # ========== TASK C: Merge Dan Spengeman / Danny Sponge ==========
    print("\nMerging Dan Spengeman / Danny Sponge...")

    dan_idx = None
    danny_idx = None

    for i, person in enumerate(people):
        if person['name'] == 'Dan Spengeman':
            dan_idx = i
        elif person['name'] == 'Danny Sponge':
            danny_idx = i

    if dan_idx is not None and danny_idx is not None:
        dan = people[dan_idx]
        danny = people[danny_idx]

        # Keep the higher importance score
        if danny['importance_score'] > dan['importance_score']:
            dan['importance_score'] = danny['importance_score']

        # Merge active years if needed
        if danny['active_years'] and not dan['active_years']:
            dan['active_years'] = danny['active_years']

        print(f"  Merged: Danny Sponge (ID {danny['id']}) into Dan Spengeman (ID {dan['id']})")
        print(f"  Removed Danny Sponge entry")

        # Remove Danny Sponge from people
        people.pop(danny_idx)

        # Add alias mapping
        alias_entry = {
            'id': dan['id'],
            'name': 'Dan Spengeman',
            'nicknames': '["Danny Sponge", "Spenge"]'
        }

        # Remove old Danny Sponge from aliases if exists
        aliases = [a for a in aliases if a.get('name') != 'Danny Sponge']

        # Update Dan's alias if exists
        found_alias = False
        for alias in aliases:
            if alias['id'] == dan['id']:
                found_alias = True
                # Parse existing nicknames and add new one
                nicknames_str = alias.get('nicknames', '[]')
                try:
                    nicknames = json.loads(nicknames_str)
                except:
                    nicknames = []
                if 'Danny Sponge' not in nicknames:
                    nicknames.append('Danny Sponge')
                alias['nicknames'] = json.dumps(nicknames)
                break

        if not found_alias:
            aliases.append(alias_entry)

    # ========== TASK D: Fix spelling ==========
    print("\nFixing spelling: Julia Dennabuam → Julia Dennebaum...")

    for person in people:
        if person['name'] == 'Julia Dennabuam':
            print(f"  Fixed: ID {person['id']} from 'Julia Dennabuam' to 'Julia Dennebaum'")
            person['name'] = 'Julia Dennebaum'

    for alias in aliases:
        if alias['name'] == 'Julia Dennabuam':
            alias['name'] = 'Julia Dennebaum'

    # ========== TASK E: Clean fragmentary names in aliases ==========
    print("\nCleaning fragmentary names in aliases...")

    # Artifacts to remove
    artifacts = [
        'Chris Adams As',
        'John Tronolone It',
        'Joey Smalls\'s',
        'Steve Adams It',
        'Justin Pierce Yet',
        'Chris Adams Here\'s',
        'Dan Turner Word',
        'Ray Marzarella On',
        'Sister It\'s',
        'Lenny Herrera Talk',
        'Lauren Stopa Looking',
        'Nogueira Decimation',
        'Carty Derek',
        'Female Titan Sara',
        'Cobra Ki',
        'Strike Force',
        'Pond Scum',
        'Ocean Road Park',
        'Wolf No',
        'Herrera Those',
        'Winston It',
        'Cornero On',
        'Katz In',
        'Mike Butler Alison',
        'Melissa Kerr Liz',
        'Kathryn Nogueira Kevin',
        'Alison Bertsch Another',
        'Robert Brown Bad',
        'Derek Carty Fast',
        'Matt Brown It\'s',
        'Kevin Adams It\'s',
        'Sascha Basista Captains',
        'Legend Kevin Megill',
        'Jonathan Ranchin',
        'Dan Spengeman\'s',
        'Kylie Casteling',
        'Justin Wolf\'s',
        'Joey Kelly',
        'Dan Turner',
        'Pamela D\'',
        'Kelly Oberto',
        'Kurt Gassner',
        'Kyle Carty',
        'Zack Berghoff',
        'Joanice Lima',
        'Kenny Jacobs',
        'Brody Letsche',
        'Liz Nogueira',
        'Gerald Lewis',
        'Elizabeth Nogueira',
        'Michael Edwards',
        'Rob Avakian',
        'Darien Brown',
        'Bethany Schonberg',
        'Travis Mills',
        'Mari Travassos',
        'Christina Guarino',
        'Mike Butler',
        'Kerrin Marchese',
        'Zack Berghoff',
        'Joanice Lima',
        'Kenny Jacobs',
        'Brody Letsche',
        'Liz Nogueira',
        'Gerald Lewis',
        'Elizabeth Nogueira',
        'Dan Turner',
        'Ray Marzarella',
        'Joey Smalls',
        'Travis Mills',
        'Mari Travassos',
        'Christina Guarino',
        'Mike Butler',
        'Bethany Schonberg',
        'Michael Edwards',
        'Rob Avakian',
        'Darien Brown',
        'Pamela D\'',
        'Kelly Oberto',
        'Kurt Gassner',
        'Kyle Carty',
        'Ryan Mc',
        'Kerrin Marchese',
        'Zack Berghoff'
    ]

    original_count = len(aliases)
    aliases = [a for a in aliases if a['name'] not in artifacts]
    removed = original_count - len(aliases)
    print(f"  Removed {removed} fragmentary entries from aliases")

    # Add correct mappings
    alias_fixes = {
        'Ryan Mc': {'id': 144, 'name': 'Ryan McCrorey', 'nicknames': '[]'},
        'Sara De': {'id': 138, 'name': 'Sara DeCuir', 'nicknames': '[]'},
        'Jim Bulter': {'id': 41, 'name': 'Jim Butler', 'nicknames': '[]'}
    }

    for old_name, fix in alias_fixes.items():
        # Check if the fragmentary name exists
        found = any(a['name'] == old_name for a in aliases)

        # Remove the bad one and add correct one
        aliases = [a for a in aliases if a['name'] != old_name]

        # Check if correct one already exists
        if not any(a['id'] == fix['id'] for a in aliases):
            aliases.append(fix)

    # ========== Update profiles and importance scores ==========
    print("\nUpdating people_profiles.json and people_importance_scores.json...")

    # Ensure all new people have entries in profiles and importance
    profile_ids = set(p.get('id') for p in profiles if isinstance(p, dict) and 'id' in p)
    importance_ids = set(p.get('id') for p in importance if isinstance(p, dict) and 'id' in p)

    for person in new_people:
        person_id = person['id']

        # Add to profiles if missing
        if person_id not in profile_ids:
            profile_entry = {
                'id': person_id,
                'name': person['name'],
                'birth_year': person.get('birth_year'),
                'biography': f"ECD Dodgeball player",
                'significance': 'ECD Participant',
                'key_moments': [],
                'relationships': []
            }
            profiles.append(profile_entry)

        # Add to importance scores if missing
        if person_id not in importance_ids:
            importance_entry = {
                'id': person_id,
                'name': person['name'],
                'importance_score': 0.0,
                'primary_context': 'ECD Player',
                'secondary_contexts': [],
                'calculation_method': 'ecd_mentions'
            }
            importance.append(importance_entry)

    # ========== Save all files ==========
    print("\nSaving files...")
    save_json(PEOPLE_FILE, people)
    save_json(PROFILES_FILE, profiles)
    save_json(IMPORTANCE_FILE, importance)
    save_json(ALIASES_FILE, aliases)

    print("\nDone!")
    print(f"Final people count: {len(people)}")
    print(f"Final profiles count: {len(profiles)}")
    print(f"Final importance scores count: {len(importance)}")
    print(f"Final aliases count: {len(aliases)}")


if __name__ == '__main__':
    main()
