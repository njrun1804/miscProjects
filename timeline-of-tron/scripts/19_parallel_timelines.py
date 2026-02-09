#!/usr/bin/env python3
"""
Script 19: Build parallel timelines table
- Tracks 6 life domains: career, health, relationships, travel, ecd, writing
- For each year, compute event count, key event, sentiment, intensity
"""

import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_table(conn):
    """Create parallel_timelines table"""
    cursor = conn.cursor()
    
    cursor.execute('DROP TABLE IF EXISTS parallel_timelines')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS parallel_timelines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL,
          domain TEXT NOT NULL,
          event_count INTEGER DEFAULT 0,
          key_event TEXT,
          event_sentiment REAL,
          intensity REAL DEFAULT 0.0
        )
    ''')
    
    conn.commit()
    print("✓ Created parallel_timelines table")

def get_all_years(conn):
    """Get all distinct years from major tables"""
    cursor = conn.cursor()
    
    years = set()
    
    cursor.execute('SELECT DISTINCT year FROM career WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    cursor.execute('SELECT DISTINCT year FROM medical_history WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    cursor.execute('SELECT DISTINCT year FROM temporal_network WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    cursor.execute('SELECT DISTINCT year FROM travel WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    cursor.execute('SELECT DISTINCT year FROM ecd_events_v2 WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    cursor.execute('SELECT DISTINCT year FROM writing_evolution WHERE year IS NOT NULL')
    years.update(r['year'] for r in cursor.fetchall())
    
    return sorted(years)

def get_career_domain(conn, year):
    """Career domain: job changes, promotions"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COUNT(*) as count, 
               GROUP_CONCAT(title, '; ') as events
        FROM career
        WHERE year = ?
    ''', (year,))
    
    row = cursor.fetchone()
    event_count = row['count'] or 0
    key_event = (row['events'] or "")[:100] if row['events'] else None
    
    cursor.execute('''
        SELECT SUM(CASE 
            WHEN title LIKE '%promot%' THEN 1
            WHEN title LIKE '%award%' THEN 1
            WHEN title LIKE '%layoff%' THEN -1
            WHEN title LIKE '%resign%' THEN -0.5
            ELSE 0
        END) as sentiment_score
        FROM career
        WHERE year = ?
    ''', (year,))
    
    sentiment = cursor.fetchone()['sentiment_score'] or 0
    sentiment = min(1.0, max(-1.0, sentiment))
    
    intensity = min(10.0, event_count * 2)
    
    return {
        'event_count': event_count,
        'key_event': key_event,
        'sentiment': sentiment,
        'intensity': intensity
    }

def get_health_domain(conn, year):
    """Health domain: medical events, recoveries"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COUNT(*) as count,
               GROUP_CONCAT(event, '; ') as events
        FROM medical_history
        WHERE year = ?
    ''', (year,))
    
    row = cursor.fetchone()
    event_count = row['count'] or 0
    key_event = (row['events'] or "")[:100] if row['events'] else None
    
    cursor.execute('''
        SELECT AVG(COALESCE(vader_compound, 0)) as avg_sent
        FROM medical_history
        WHERE year = ?
    ''', (year,))
    
    sentiment = cursor.fetchone()['avg_sent'] or 0
    intensity = min(10.0, event_count * 3)
    
    return {
        'event_count': event_count,
        'key_event': key_event,
        'sentiment': sentiment,
        'intensity': intensity
    }

def get_relationships_domain(conn, year):
    """Relationships domain: active people from temporal_network"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT active_people, new_people, top_person
        FROM temporal_network
        WHERE year = ?
    ''', (year,))
    
    row = cursor.fetchone()
    if row:
        event_count = (row['active_people'] or 0) + (row['new_people'] or 0)
        key_event = f"{row['active_people']} active + {row['new_people']} new people" if row['active_people'] else None
        if row['top_person']:
            key_event = f"{key_event} (led by {row['top_person']})" if key_event else f"Led by {row['top_person']}"
    else:
        event_count = 0
        key_event = None
    
    if event_count > 20:
        sentiment = 0.5
    elif event_count > 10:
        sentiment = 0.3
    elif event_count > 0:
        sentiment = 0.0
    else:
        sentiment = -0.3
    
    intensity = min(10.0, event_count / 3)
    
    return {
        'event_count': event_count,
        'key_event': key_event,
        'sentiment': sentiment,
        'intensity': intensity
    }

def get_travel_domain(conn, year):
    """Travel domain: trips, destinations"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COUNT(*) as trip_count,
               COUNT(DISTINCT destination) as dest_count
        FROM travel
        WHERE year = ?
    ''', (year,))
    
    row = cursor.fetchone()
    event_count = row['trip_count'] or 0
    dest_count = row['dest_count'] or 0
    
    key_event = f"{event_count} trips to {dest_count} locations" if event_count > 0 else None
    
    sentiment = min(1.0, event_count * 0.2)
    intensity = min(10.0, (event_count + dest_count) * 0.5)
    
    return {
        'event_count': event_count,
        'key_event': key_event,
        'sentiment': sentiment,
        'intensity': intensity
    }

def get_ecd_domain(conn, year):
    """ECD domain: matches, events, posts"""
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) as count FROM ecd_events_v2 WHERE year = ?', (year,))
    events_count = cursor.fetchone()['count'] or 0
    
    cursor.execute('SELECT COUNT(*) as count FROM ecd_match_results WHERE year = ?', (year,))
    matches_count = cursor.fetchone()['count'] or 0
    
    try:
        cursor.execute('SELECT COUNT(*) as count FROM ecd_posts WHERE year = ?', (year,))
        posts_count = cursor.fetchone()['count'] or 0
    except:
        posts_count = 0
    
    event_count = events_count + matches_count + posts_count
    key_event = f"{matches_count} matches, {events_count} events" if matches_count > 0 or events_count > 0 else None
    
    sentiment = 0.1
    intensity = min(10.0, (matches_count + events_count) * 0.5)
    
    return {
        'event_count': event_count,
        'key_event': key_event,
        'sentiment': sentiment,
        'intensity': intensity
    }

def get_writing_domain(conn, year):
    """Writing domain: word count, complexity"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT total_words, vocabulary_richness, avg_grade_level
        FROM writing_evolution
        WHERE year = ?
    ''', (year,))
    
    row = cursor.fetchone()
    if row:
        total_words = row['total_words'] or 0
        vocabulary = row['vocabulary_richness'] or 0
        grade = row['avg_grade_level'] or 0
        event_count = 1 if total_words > 0 else 0
    else:
        total_words = 0
        vocabulary = 0
        grade = 0
        event_count = 0
    
    key_event = f"{total_words} words written" if total_words > 0 else None
    
    sentiment = min(0.5, vocabulary * 0.1) if vocabulary else 0
    intensity = min(10.0, (total_words / 5000) + (grade * 0.5))
    
    return {
        'event_count': event_count,
        'key_event': key_event,
        'sentiment': sentiment,
        'intensity': intensity
    }

def main():
    conn = get_db()
    
    print("=" * 60)
    print("SCRIPT 19: PARALLEL TIMELINES")
    print("=" * 60)
    
    create_table(conn)
    
    years = get_all_years(conn)
    print(f"Found {len(years)} years: {min(years)}-{max(years)}")
    
    domains = {
        'career': get_career_domain,
        'health': get_health_domain,
        'relationships': get_relationships_domain,
        'travel': get_travel_domain,
        'ecd': get_ecd_domain,
        'writing': get_writing_domain
    }
    
    cursor = conn.cursor()
    records_inserted = 0
    
    for year in years:
        for domain_name, getter_func in domains.items():
            data = getter_func(conn, year)
            
            if data['event_count'] > 0 or data['key_event']:
                cursor.execute('''
                    INSERT INTO parallel_timelines 
                    (year, domain, event_count, key_event, event_sentiment, intensity)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    year,
                    domain_name,
                    data['event_count'],
                    data['key_event'],
                    data['sentiment'],
                    data['intensity']
                ))
                records_inserted += 1
    
    conn.commit()
    
    print(f"\n✓ Inserted {records_inserted} parallel timeline records")
    
    cursor.execute('SELECT domain, COUNT(*) as count FROM parallel_timelines GROUP BY domain')
    print("\nRecords by domain:")
    for row in cursor.fetchall():
        print(f"  {row['domain']}: {row['count']}")
    
    conn.close()
    print("\n✓ Script 19 complete\n")

if __name__ == '__main__':
    main()
