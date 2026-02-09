#!/usr/bin/env python3
"""
One-time data enrichment script for the Constellation page.

Fixes two problems:
1. Graph has no hub-and-spoke links (person→John) — nodes float disconnected
2. Most people have empty profiles — need to generate timeline events from
   person_timelines.json, awards, co-occurrences, and sports data

Run once, then delete this script.
"""

import json
import os

DB_API = os.path.join(os.path.dirname(__file__), 'db', 'api')

def load(name):
    with open(os.path.join(DB_API, name), 'r') as f:
        return json.load(f)

def save(name, data):
    with open(os.path.join(DB_API, name), 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved {name}")


# ── 1. Enrich relationship_constellation.json with hub links ──────────

def enrich_constellation_graph():
    print("\n=== Enriching constellation graph with hub links ===")
    constellation = load('relationship_constellation.json')
    graph = load('relationship_graph.json')

    nodes = constellation['nodes']
    links = constellation.get('links', [])

    # Build name→id map
    name_to_id = {}
    for n in nodes:
        name_to_id[n['name']] = n['id']

    # Track existing links to avoid duplicates
    existing = set()
    for l in links:
        key = tuple(sorted([l['source'], l['target']]))
        existing.add(key)

    added = 0
    # Add hub links from relationship_graph.json
    for entry in graph:
        person_name = entry['person_name']
        connected_to = entry['connected_to']

        # We want person→John hub links
        if connected_to != 'John Tronolone':
            continue
        # Skip self-links
        if person_name == 'John Tronolone':
            continue

        person_id = name_to_id.get(person_name)
        if not person_id:
            continue

        key = tuple(sorted([person_id, 'john']))
        if key in existing:
            continue

        existing.add(key)
        links.append({
            'source': person_id,
            'target': 'john',
            'weight': entry.get('weight', 1),
            'first_year': entry.get('first_year'),
            'relationship_type': entry.get('relationship_type', 'other'),
            'hub_link': True
        })
        added += 1

    constellation['links'] = links
    save('relationship_constellation.json', constellation)
    print(f"  Added {added} hub links (person→John)")
    print(f"  Total links now: {len(links)}")


# ── 2. Enrich people_profiles.json with timeline events ──────────────

def enrich_people_profiles():
    print("\n=== Enriching people profiles with timeline events ===")
    profiles = load('people_profiles.json')
    person_timelines = load('person_timelines.json')
    awards = load('awards_enriched.json')
    co_occurrences = load('co_occurrences.json')
    sports = load('sports.json')

    stats = {'timelines_merged': 0, 'awards_added': 0, 'co_added': 0, 'sports_added': 0}

    # ── 2a. Merge person_timelines.json events ──────────────────────
    # person_timelines has events keyed by person_name, but names may differ
    # slightly from people_profiles keys. Build flexible name matching.

    # Normalize name for matching
    def normalize(name):
        return name.lower().strip()

    profile_names = {normalize(k): k for k in profiles}

    # Group person_timelines by normalized person_name
    timeline_events_by_person = {}
    for evt in person_timelines:
        pname = evt.get('person_name', '')
        if not pname:
            continue
        nname = normalize(pname)
        if nname not in timeline_events_by_person:
            timeline_events_by_person[nname] = []
        timeline_events_by_person[nname].append(evt)

    # Also try partial matches (e.g., "Diana" → "Diana DiBuccio")
    name_aliases = {
        'diana': 'Diana DiBuccio',
        'valerie': 'Valerie Winston (ValPal)',
        'kevin & leah': 'Kevin & Leah (KMJ & LN)',
        'rl (letsche)': 'RL (Letsche)',
        'grammy nancy': 'Grammy Nancy',
        'mike \'sputz\' krott': 'Mike Krott',
        'mike krott': 'Mike Krott',
        'rob phillips (robert)': 'Robert Phillips',
        'danny sponge': 'Dan Spengeman',
        'ryan letsche (ryguy)': 'Ryan Letsche',
    }

    for nname, events in timeline_events_by_person.items():
        # Try exact match first
        profile_key = profile_names.get(nname)

        # Try alias match
        if not profile_key:
            alias = name_aliases.get(nname)
            if alias and alias in profiles:
                profile_key = alias

        # Try prefix match (e.g., "Diana" matches "Diana DiBuccio")
        if not profile_key:
            for pk_norm, pk_orig in profile_names.items():
                if pk_norm.startswith(nname) or nname.startswith(pk_norm):
                    profile_key = pk_orig
                    break

        if not profile_key or profile_key not in profiles:
            continue

        profile = profiles[profile_key]
        existing_events = profile.get('timeline', [])

        # Deduplicate by (year, event_description substring)
        existing_descs = set()
        for e in existing_events:
            desc = (e.get('event', '') or e.get('text', '') or '').lower()[:40]
            existing_descs.add((e.get('year'), desc))

        for evt in events:
            desc = evt.get('event_description', '')
            year = evt.get('year')
            check_key = (year, desc.lower()[:40])
            if check_key in existing_descs:
                continue
            existing_descs.add(check_key)

            existing_events.append({
                'year': year,
                'event': desc,
                'type': evt.get('event_type', 'social')
            })
            stats['timelines_merged'] += 1

        # Sort by year
        existing_events.sort(key=lambda e: e.get('year') or 0)
        profile['timeline'] = existing_events

    # ── 2b. Generate timeline events from awards ────────────────────
    # Awards like "Comedian of the Year" have winner names that match people

    # Build a map of person names in profiles for matching award winners
    profile_name_set = set(profiles.keys())

    for award in awards:
        winner = award.get('winner', '')
        year = award.get('year')
        category = award.get('category', '')
        if not winner or not year:
            continue

        # Check if winner name matches a profile (exact or partial)
        matched_names = []
        for name in profile_name_set:
            # Exact match
            if name.lower() == winner.lower():
                matched_names.append(name)
            # Winner contains the profile name
            elif name.lower() in winner.lower():
                matched_names.append(name)
            # Profile name contains the winner
            elif winner.lower() in name.lower() and len(winner) > 3:
                matched_names.append(name)

        # Also check comma-separated winners (e.g., "Valerie Winston, Diana DiBuccio")
        if ',' in winner:
            for part in winner.split(','):
                part = part.strip()
                for name in profile_name_set:
                    if name.lower() == part.lower() or name.lower() in part.lower() or (part.lower() in name.lower() and len(part) > 3):
                        if name not in matched_names:
                            matched_names.append(name)

        for name in matched_names:
            profile = profiles[name]
            existing_events = profile.get('timeline', [])

            cat_label = category.replace('_', ' ').title()
            event_text = f"{cat_label}: {winner}" if winner != name else f"{cat_label} winner"

            # Check for duplicates
            existing_descs = set()
            for e in existing_events:
                desc = (e.get('event', '') or '').lower()[:40]
                existing_descs.add((e.get('year'), desc))

            check_key = (year, event_text.lower()[:40])
            if check_key in existing_descs:
                continue

            existing_events.append({
                'year': year,
                'event': event_text,
                'type': 'award'
            })
            stats['awards_added'] += 1

            existing_events.sort(key=lambda e: e.get('year') or 0)
            profile['timeline'] = existing_events

    # ── 2c. Generate timeline events from co-occurrences with context ─
    for co in co_occurrences:
        context = co.get('context', '').strip()
        if not context:
            continue
        year = co.get('year')
        person_a = co.get('person_a', '')
        person_b = co.get('person_b', '')

        for person_name in [person_a, person_b]:
            if person_name not in profiles:
                continue

            profile = profiles[person_name]
            existing_events = profile.get('timeline', [])

            # Don't add if context is just a number
            if context.isdigit():
                continue

            # Check for duplicates
            existing_descs = set()
            for e in existing_events:
                desc = (e.get('event', '') or '').lower()[:40]
                existing_descs.add((e.get('year'), desc))

            check_key = (year, context.lower()[:40])
            if check_key in existing_descs:
                continue

            other = person_b if person_name == person_a else person_a
            existing_events.append({
                'year': year,
                'event': context,
                'type': 'shared_moment',
                'with': other
            })
            stats['co_added'] += 1

            existing_events.sort(key=lambda e: e.get('year') or 0)
            profile['timeline'] = existing_events

    # ── 2d. Generate timeline events from sports (named opponents) ──
    sport_events = []
    for s in sports:
        note = s.get('note', '') or s.get('stat_value', '') or ''
        sport = s.get('sport', '')
        year = s.get('year')
        if not note or not year:
            continue

        # Check if note mentions any profile names
        for name in profile_name_set:
            if len(name) < 4:
                continue
            if name.lower() in note.lower():
                profile = profiles[name]
                existing_events = profile.get('timeline', [])

                event_text = f"{sport}: {note}"

                existing_descs = set()
                for e in existing_events:
                    desc = (e.get('event', '') or '').lower()[:40]
                    existing_descs.add((e.get('year'), desc))

                check_key = (year, event_text.lower()[:40])
                if check_key in existing_descs:
                    continue

                existing_events.append({
                    'year': year,
                    'event': event_text,
                    'type': 'sports'
                })
                stats['sports_added'] += 1

                existing_events.sort(key=lambda e: e.get('year') or 0)
                profile['timeline'] = existing_events

    # ── 2e. Update has_timeline flags in constellation ──────────────
    constellation = load('relationship_constellation.json')
    for node in constellation['nodes']:
        name = node['name']
        if name in profiles:
            timeline = profiles[name].get('timeline', [])
            node['has_timeline'] = len(timeline) > 0
    save('relationship_constellation.json', constellation)

    save('people_profiles.json', profiles)
    print(f"  Timeline events merged from person_timelines: {stats['timelines_merged']}")
    print(f"  Timeline events from awards: {stats['awards_added']}")
    print(f"  Timeline events from co-occurrences: {stats['co_added']}")
    print(f"  Timeline events from sports: {stats['sports_added']}")

    # Summary: count how many people now have timeline events
    with_timeline = sum(1 for p in profiles.values() if p.get('timeline'))
    total = len(profiles)
    print(f"  People with timeline events: {with_timeline}/{total}")


# ── 3. Report ─────────────────────────────────────────────────────

def report():
    print("\n=== Final Report ===")
    constellation = load('relationship_constellation.json')
    profiles = load('people_profiles.json')

    nodes = constellation['nodes']
    links = constellation['links']
    hub_links = [l for l in links if l.get('hub_link')]
    peer_links = [l for l in links if not l.get('hub_link')]

    print(f"  Nodes: {len(nodes)} + 1 center")
    print(f"  Total links: {len(links)}")
    print(f"    Hub links (person→John): {len(hub_links)}")
    print(f"    Peer links: {len(peer_links)}")

    rich_count = 0
    for name, profile in profiles.items():
        tl = len(profile.get('timeline', []))
        hl = len(profile.get('highlights', []))
        aw = len(profile.get('awards', []))
        if tl + hl + aw > 0:
            rich_count += 1

    print(f"  People with content (timeline/highlights/awards): {rich_count}/{len(profiles)}")

    # Show top 10 richest profiles
    scored = []
    for name, profile in profiles.items():
        tl = len(profile.get('timeline', []))
        hl = len(profile.get('highlights', []))
        aw = len(profile.get('awards', []))
        co = len(profile.get('co_occurrences', []))
        total = tl + hl + aw + co
        scored.append((name, total, tl, hl, aw))
    scored.sort(key=lambda x: -x[1])
    print("\n  Top 15 richest profiles:")
    for name, total, tl, hl, aw in scored[:15]:
        print(f"    {name}: {total} total ({tl} timeline, {hl} highlights, {aw} awards)")


if __name__ == '__main__':
    enrich_constellation_graph()
    enrich_people_profiles()
    report()
    print("\nDone! You can delete this script now.")
