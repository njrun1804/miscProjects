#!/usr/bin/env python3
"""
Script 21: Decompose yearly intensity into 6 life domains
- Normalize each to 0-10 scale
- Identify dominant and secondary domains per year
"""

import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_table(conn):
    """Create year_intensity_breakdown table"""
    cursor = conn.cursor()
    
    cursor.execute('DROP TABLE IF EXISTS year_intensity_breakdown')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS year_intensity_breakdown (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL UNIQUE,
          career_intensity REAL DEFAULT 0.0,
          travel_intensity REAL DEFAULT 0.0,
          health_intensity REAL DEFAULT 0.0,
          social_intensity REAL DEFAULT 0.0,
          ecd_intensity REAL DEFAULT 0.0,
          creative_intensity REAL DEFAULT 0.0,
          total_intensity REAL DEFAULT 0.0,
          dominant_domain TEXT,
          secondary_domain TEXT
        )
    ''')
    
    conn.commit()
    print("✓ Created year_intensity_breakdown table")

def get_all_years(conn):
    """Get all years from year_summary"""
    cursor = conn.cursor()
    cursor.execute('SELECT DISTINCT year FROM year_summary WHERE year IS NOT NULL ORDER BY year')
    return [row['year'] for row in cursor.fetchall()]

def compute_career_intensity(conn, year):
    """Career intensity: count milestones + awards"""
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) as count FROM career WHERE year = ?', (year,))
    career_count = cursor.fetchone()['count'] or 0
    
    cursor.execute('''
        SELECT COUNT(*) as count FROM milestones 
        WHERE year = ? AND category = 'award'
    ''', (year,))
    
    award_count = cursor.fetchone()['count'] or 0
    
    total = career_count + award_count
    intensity = min(10.0, (total / 5) * 10)
    
    return intensity

def compute_travel_intensity(conn, year):
    """Travel intensity: trips + countries visited"""
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) as count FROM travel WHERE year = ?', (year,))
    trip_count = cursor.fetchone()['count'] or 0
    
    cursor.execute('''
        SELECT COUNT(DISTINCT destination) as count FROM travel WHERE year = ?
    ''', (year,))
    
    country_count = cursor.fetchone()['count'] or 0
    
    intensity = min(10.0, (trip_count / 10) * 10 + (country_count / 5) * 2)
    
    return intensity

def compute_health_intensity(conn, year):
    """Health intensity: medical events"""
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) as count FROM medical_history WHERE year = ?', (year,))
    medical_count = cursor.fetchone()['count'] or 0
    
    cursor.execute('''
        SELECT COUNT(*) as count FROM medical_history 
        WHERE year = ? AND recovery_note IS NOT NULL
    ''', (year,))
    
    recovery_count = cursor.fetchone()['count'] or 0
    
    total = medical_count * 2 + recovery_count
    intensity = min(10.0, (total / 5) * 10)
    
    return intensity

def compute_social_intensity(conn, year):
    """Social intensity: active people"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT active_people, new_people FROM temporal_network WHERE year = ?
    ''', (year,))
    
    row = cursor.fetchone()
    if row:
        active_count = row['active_people'] or 0
    else:
        active_count = 0
    
    intensity = min(10.0, (active_count / 50) * 10)
    
    return intensity

def compute_ecd_intensity(conn, year):
    """ECD intensity: matches + events + posts"""
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) as count FROM ecd_match_results WHERE year = ?', (year,))
    match_count = cursor.fetchone()['count'] or 0
    
    cursor.execute('SELECT COUNT(*) as count FROM ecd_events_v2 WHERE year = ?', (year,))
    event_count = cursor.fetchone()['count'] or 0
    
    try:
        cursor.execute('SELECT COUNT(*) as count FROM ecd_posts WHERE year = ?', (year,))
        post_count = cursor.fetchone()['count'] or 0
    except:
        post_count = 0
    
    total = match_count + event_count + post_count
    intensity = min(10.0, (total / 100) * 10)
    
    return intensity

def compute_creative_intensity(conn, year):
    """Creative intensity: word count"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT total_words FROM writing_evolution WHERE year = ?
    ''', (year,))
    
    row = cursor.fetchone()
    if row:
        word_count = row['total_words'] or 0
    else:
        word_count = 0
    
    cursor.execute('''
        SELECT COUNT(*) as count FROM quotes WHERE year = ?
    ''', (year,))
    
    quote_count = cursor.fetchone()['count'] or 0
    
    intensity = min(10.0, (word_count / 50000) * 10 + (quote_count * 0.5))
    
    return intensity

def main():
    conn = get_db()
    
    print("=" * 60)
    print("SCRIPT 21: INTENSITY BREAKDOWN BY DOMAIN")
    print("=" * 60)
    
    create_table(conn)
    
    years = get_all_years(conn)
    print(f"Found {len(years)} years in year_summary")
    
    cursor = conn.cursor()
    inserted = 0
    
    for year in years:
        career = compute_career_intensity(conn, year)
        travel = compute_travel_intensity(conn, year)
        health = compute_health_intensity(conn, year)
        social = compute_social_intensity(conn, year)
        ecd = compute_ecd_intensity(conn, year)
        creative = compute_creative_intensity(conn, year)
        
        total = career + travel + health + social + ecd + creative
        
        domain_scores = {
            'career': career,
            'travel': travel,
            'health': health,
            'social': social,
            'ecd': ecd,
            'creative': creative
        }
        
        sorted_domains = sorted(domain_scores.items(), key=lambda x: x[1], reverse=True)
        dominant = sorted_domains[0][0] if sorted_domains[0][1] > 0 else None
        secondary = sorted_domains[1][0] if len(sorted_domains) > 1 and sorted_domains[1][1] > 0 else None
        
        cursor.execute('''
            INSERT INTO year_intensity_breakdown
            (year, career_intensity, travel_intensity, health_intensity, 
             social_intensity, ecd_intensity, creative_intensity, 
             total_intensity, dominant_domain, secondary_domain)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            year, career, travel, health, social, ecd, creative,
            total, dominant, secondary
        ))
        inserted += 1
    
    conn.commit()
    
    print(f"\n✓ Inserted {inserted} year intensity records")
    
    cursor.execute('''
        SELECT 
            AVG(career_intensity) as career_avg,
            AVG(travel_intensity) as travel_avg,
            AVG(health_intensity) as health_avg,
            AVG(social_intensity) as social_avg,
            AVG(ecd_intensity) as ecd_avg,
            AVG(creative_intensity) as creative_avg
        FROM year_intensity_breakdown
    ''')
    
    row = cursor.fetchone()
    print("\nIntensity summary by domain:")
    print(f"  Career:    {row['career_avg']:.2f}")
    print(f"  Travel:    {row['travel_avg']:.2f}")
    print(f"  Health:    {row['health_avg']:.2f}")
    print(f"  Social:    {row['social_avg']:.2f}")
    print(f"  ECD:       {row['ecd_avg']:.2f}")
    print(f"  Creative:  {row['creative_avg']:.2f}")
    
    print("\nMost intense years:")
    cursor.execute('''
        SELECT year, dominant_domain, total_intensity FROM year_intensity_breakdown
        ORDER BY total_intensity DESC
        LIMIT 5
    ''')
    
    for row in cursor.fetchall():
        print(f"  {row['year']}: {row['dominant_domain']} (intensity {row['total_intensity']:.2f})")
    
    conn.close()
    print("\n✓ Script 21 complete\n")

if __name__ == '__main__':
    main()
