#!/usr/bin/env python3
"""
Script 20: Analyze turning points in detail
"""

import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_table(conn):
    """Create turning_point_analysis table"""
    cursor = conn.cursor()
    
    cursor.execute('DROP TABLE IF EXISTS turning_point_analysis')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS turning_point_analysis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          turning_point_year INTEGER NOT NULL,
          event TEXT,
          type TEXT,
          domain TEXT,
          before_sentiment REAL,
          after_sentiment REAL,
          sentiment_shift REAL,
          before_people_count INTEGER,
          after_people_count INTEGER,
          before_key_topic TEXT,
          after_key_topic TEXT,
          shock_magnitude REAL,
          recovery_months INTEGER,
          narrative_summary TEXT
        )
    ''')
    
    conn.commit()
    print("✓ Created turning_point_analysis table")

def get_turning_points(conn):
    """Get all turning points"""
    cursor = conn.cursor()
    cursor.execute('''
        SELECT year, event, type, domain FROM turning_points 
        WHERE year IS NOT NULL
        ORDER BY year
    ''')
    return cursor.fetchall()

def get_sentiment_range(conn, year, window=2):
    """Get average sentiment 2 years before and after"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT AVG(COALESCE(vader_compound, 0)) as avg_sentiment
        FROM milestones
        WHERE year >= ? AND year <= ?
    ''', (year - window, year))
    
    before = cursor.fetchone()['avg_sentiment'] or 0
    
    cursor.execute('''
        SELECT AVG(COALESCE(vader_compound, 0)) as avg_sentiment
        FROM milestones
        WHERE year >= ? AND year <= ?
    ''', (year + 1, year + 1 + window))
    
    after = cursor.fetchone()['avg_sentiment'] or 0
    
    return before, after

def get_people_count_range(conn, year, window=2):
    """Get number of people before and after"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT COALESCE(AVG(active_people), 0) as avg_active
        FROM temporal_network
        WHERE year >= ? AND year <= ?
    ''', (year - window, year))
    
    before = int(cursor.fetchone()['avg_active'] or 0)
    
    cursor.execute('''
        SELECT COALESCE(AVG(active_people), 0) as avg_active
        FROM temporal_network
        WHERE year >= ? AND year <= ?
    ''', (year + 1, year + 1 + window))
    
    after = int(cursor.fetchone()['avg_active'] or 0)
    
    return before, after

def get_dominant_topic(conn, year, window=2):
    """Get most common topic before and after"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT t.topic_name FROM topic_evolution te
        JOIN topics t ON te.topic_id = t.id
        WHERE te.year >= ? AND te.year <= ?
        ORDER BY te.weight DESC
        LIMIT 1
    ''', (year - window, year))
    
    before = cursor.fetchone()
    before_topic = before['topic_name'] if before else "General"
    
    cursor.execute('''
        SELECT t.topic_name FROM topic_evolution te
        JOIN topics t ON te.topic_id = t.id
        WHERE te.year >= ? AND te.year <= ?
        ORDER BY te.weight DESC
        LIMIT 1
    ''', (year + 1, year + 1 + window))
    
    after = cursor.fetchone()
    after_topic = after['topic_name'] if after else "General"
    
    return before_topic, after_topic

def get_recovery_time(conn, year, tp_event):
    """Estimate recovery months"""
    cursor = conn.cursor()
    
    if 'medical' in tp_event.lower() or 'injury' in tp_event.lower():
        cursor.execute('''
            SELECT gap_months FROM medical_comeback_pairs
            WHERE injury_year = ?
            LIMIT 1
        ''', (year,))
        
        row = cursor.fetchone()
        if row and row['gap_months']:
            return row['gap_months']
    
    if 'injury' in tp_event.lower():
        return 6
    elif 'loss' in tp_event.lower():
        return 12
    elif 'illness' in tp_event.lower():
        return 9
    elif 'transition' in tp_event.lower():
        return 3
    else:
        return 6

def compute_shock_magnitude(sent_before, sent_after, people_before, people_after):
    """Compute shock magnitude"""
    sent_diff = abs(sent_after - sent_before)
    
    people_change = 0
    if people_before > 0:
        people_change = abs(people_after - people_before) / people_before
    
    shock = sent_diff + people_change
    return min(10.0, shock)

def generate_narrative(tp_event, sent_before, sent_after, topic_before, topic_after):
    """Generate narrative"""
    if sent_after > sent_before:
        direction = "positive"
    elif sent_after < sent_before:
        direction = "negative"
    else:
        direction = "neutral"
    
    narrative = f"{tp_event}: shift from {topic_before} to {topic_after}, {direction} sentiment trajectory."
    
    return narrative[:200]

def main():
    conn = get_db()
    
    print("=" * 60)
    print("SCRIPT 20: TURNING POINT ANALYSIS")
    print("=" * 60)
    
    create_table(conn)
    
    turning_points = get_turning_points(conn)
    print(f"Found {len(turning_points)} turning points")
    
    cursor = conn.cursor()
    inserted = 0
    
    for tp in turning_points:
        year = tp['year']
        event = tp['event'] or "Unknown event"
        tp_type = tp['type'] or "Unclassified"
        domain = tp['domain'] or "General"
        
        sent_before, sent_after = get_sentiment_range(conn, year)
        sentiment_shift = sent_after - sent_before
        
        people_before, people_after = get_people_count_range(conn, year)
        
        topic_before, topic_after = get_dominant_topic(conn, year)
        
        shock_magnitude = compute_shock_magnitude(sent_before, sent_after, people_before, people_after)
        recovery_months = get_recovery_time(conn, year, event)
        narrative = generate_narrative(event, sent_before, sent_after, topic_before, topic_after)
        
        cursor.execute('''
            INSERT INTO turning_point_analysis
            (turning_point_year, event, type, domain, before_sentiment, after_sentiment,
             sentiment_shift, before_people_count, after_people_count, before_key_topic,
             after_key_topic, shock_magnitude, recovery_months, narrative_summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            year, event, tp_type, domain, sent_before, sent_after, sentiment_shift,
            people_before, people_after, topic_before, topic_after, shock_magnitude,
            recovery_months, narrative
        ))
        inserted += 1
    
    conn.commit()
    
    print(f"\n✓ Inserted {inserted} turning point analyses")
    
    if inserted > 0:
        print("\nSample turning point analyses:")
        cursor.execute('''
            SELECT turning_point_year, event, shock_magnitude, recovery_months
            FROM turning_point_analysis
            LIMIT 3
        ''')
        for row in cursor.fetchall():
            print(f"  {row['turning_point_year']}: {row['event']}")
            print(f"    Shock: {row['shock_magnitude']:.2f}, Recovery: {row['recovery_months']} months")
    
    conn.close()
    print("\n✓ Script 20 complete\n")

if __name__ == '__main__':
    main()
