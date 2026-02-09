#!/usr/bin/env python3
"""
Script 18: Build ECD Community Narrative table
- Computes per-year community metrics from ECD data
- Detects growth phases (Founding, Growth, Golden Age, Maturity, Transformation)
- Creates detailed narrative descriptions
"""

import sqlite3
from collections import defaultdict

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_table(conn):
    """Create ecd_community_narrative table"""
    cursor = conn.cursor()
    
    cursor.execute('DROP TABLE IF EXISTS ecd_community_narrative')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ecd_community_narrative (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL,
          phase_name TEXT,
          active_players INTEGER DEFAULT 0,
          events_count INTEGER DEFAULT 0,
          matches_count INTEGER DEFAULT 0,
          posts_count INTEGER DEFAULT 0,
          new_players INTEGER DEFAULT 0,
          returning_players INTEGER DEFAULT 0,
          retention_rate REAL,
          growth_rate REAL,
          narrative_description TEXT
        )
    ''')
    
    conn.commit()
    print("✓ Created ecd_community_narrative table")

def get_years_range(conn):
    """Get min and max years from ECD tables"""
    cursor = conn.cursor()
    
    years = set()
    
    cursor.execute('SELECT DISTINCT year FROM ecd_player_years WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    cursor.execute('SELECT DISTINCT year FROM ecd_events_v2 WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    cursor.execute('SELECT DISTINCT year FROM ecd_match_results WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    try:
        cursor.execute('SELECT DISTINCT year FROM ecd_posts WHERE year IS NOT NULL')
        years.update(r['year'] for r in cursor.fetchall())
    except:
        pass
    
    return sorted(years)

def get_all_players_by_year(conn):
    """Get all players who appeared by each year (for retention calc)"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT DISTINCT player_name, year FROM ecd_player_years 
        WHERE year IS NOT NULL AND player_name IS NOT NULL
        ORDER BY year
    ''')
    
    players_by_year = defaultdict(set)
    for row in cursor.fetchall():
        players_by_year[row['year']].add(row['player_name'])
    
    return players_by_year

def compute_year_metrics(conn, year, players_by_year):
    """Compute metrics for a given year"""
    cursor = conn.cursor()
    
    # Active players (distinct player names that year)
    active_players = len(players_by_year.get(year, set()))
    
    # New players: players in this year but not in any previous year
    prev_years_players = set()
    for y in range(2004, year):
        prev_years_players.update(players_by_year.get(y, set()))
    
    current_players = players_by_year.get(year, set())
    new_players = len(current_players - prev_years_players)
    
    # Events count
    cursor.execute('SELECT COUNT(*) as count FROM ecd_events_v2 WHERE year = ?', (year,))
    events_count = cursor.fetchone()['count'] or 0
    
    # Matches count
    cursor.execute('SELECT COUNT(*) as count FROM ecd_match_results WHERE year = ?', (year,))
    matches_count = cursor.fetchone()['count'] or 0
    
    # Posts count
    try:
        cursor.execute('SELECT COUNT(*) as count FROM ecd_posts WHERE year = ?', (year,))
        posts_count = cursor.fetchone()['count'] or 0
    except:
        posts_count = 0
    
    # Previous year active players
    prev_year = year - 1
    prev_active = len(players_by_year.get(prev_year, set()))
    
    # Returning players (active in both prev and current year)
    prev_players = players_by_year.get(prev_year, set())
    returning_players = len(current_players & prev_players)
    
    # Retention rate
    retention_rate = (returning_players / prev_active * 100) if prev_active > 0 else 0
    
    # Growth rate
    growth_rate = ((active_players - prev_active) / prev_active * 100) if prev_active > 0 else 0
    
    return {
        'year': year,
        'active_players': active_players,
        'events_count': events_count,
        'matches_count': matches_count,
        'posts_count': posts_count,
        'new_players': new_players,
        'returning_players': returning_players,
        'retention_rate': retention_rate,
        'growth_rate': growth_rate,
        'prev_active': prev_active
    }

def detect_phase(years_metrics):
    """Detect growth phases based on metrics"""
    if not years_metrics:
        return {}
    
    phase_map = {}
    
    for i, year_data in enumerate(years_metrics):
        year = year_data['year']
        active = year_data['active_players']
        growth = year_data['growth_rate']
        retention = year_data['retention_rate']
        
        if i == 0:
            phase = "Founding"
        elif growth > 50:
            phase = "Explosive Growth"
        elif growth > 20:
            phase = "Growth"
        elif growth > 0 and retention > 70:
            phase = "Golden Age"
        elif growth > 0 and retention > 50:
            phase = "Mature Growth"
        elif growth <= 0 and retention > 70:
            phase = "Maturity"
        elif growth <= 0 and retention > 50:
            phase = "Stable"
        elif retention < 50:
            phase = "Transformation"
        else:
            phase = "Transition"
        
        phase_map[year] = phase
    
    return phase_map

def generate_narrative(year_data, phase):
    """Generate one-sentence narrative for a year"""
    active = year_data['active_players']
    new = year_data['new_players']
    growth = year_data['growth_rate']
    retention = year_data['retention_rate']
    matches = year_data['matches_count']
    
    parts = []
    
    if active > 0:
        parts.append(f"{active} active players")
    
    if new > 0:
        parts.append(f"{new} new player{'s' if new != 1 else ''}")
    
    if growth > 0:
        parts.append(f"+{growth:.0f}% growth")
    elif growth < 0:
        parts.append(f"{growth:.0f}% decline")
    
    if retention > 80:
        parts.append("strong retention")
    elif retention > 50:
        parts.append("moderate retention")
    elif retention < 50 and retention > 0:
        parts.append("turnover")
    
    if matches > 0:
        parts.append(f"{matches} matches")
    
    if parts:
        narrative = f"Year {year_data['year']}: {', '.join(parts)}."
    else:
        narrative = f"Year {year_data['year']}: quiet year."
    
    return narrative

def main():
    conn = get_db()
    
    print("=" * 60)
    print("SCRIPT 18: ECD COMMUNITY NARRATIVE")
    print("=" * 60)
    
    create_table(conn)
    
    # Get all players by year first
    players_by_year = get_all_players_by_year(conn)
    print(f"Loaded player history across {len(players_by_year)} years")
    
    years = get_years_range(conn)
    print(f"Found {len(years)} years of ECD data: {min(years)}-{max(years)}")
    
    # Compute metrics for each year
    years_metrics = []
    for year in years:
        metrics = compute_year_metrics(conn, year, players_by_year)
        years_metrics.append(metrics)
    
    # Detect phases
    phase_map = detect_phase(years_metrics)
    
    # Insert data
    cursor = conn.cursor()
    for year_data in years_metrics:
        year = year_data['year']
        phase = phase_map.get(year, "Unknown")
        narrative = generate_narrative(year_data, phase)
        
        cursor.execute('''
            INSERT INTO ecd_community_narrative 
            (year, phase_name, active_players, events_count, matches_count, posts_count,
             new_players, returning_players, retention_rate, growth_rate, narrative_description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            year,
            phase,
            year_data['active_players'],
            year_data['events_count'],
            year_data['matches_count'],
            year_data['posts_count'],
            year_data['new_players'],
            year_data['returning_players'],
            year_data['retention_rate'],
            year_data['growth_rate'],
            narrative
        ))
    
    conn.commit()
    
    print(f"\n✓ Inserted {len(years_metrics)} year records")
    print("\nSample year data:")
    for year_data in years_metrics[:5]:
        if year_data['active_players'] > 0:
            year = year_data['year']
            print(f"  {year}: {year_data['active_players']} active, "
                  f"{year_data['new_players']} new, "
                  f"growth: {year_data['growth_rate']:.1f}%")
    
    conn.close()
    print("\n✓ Script 18 complete\n")

if __name__ == '__main__':
    main()
