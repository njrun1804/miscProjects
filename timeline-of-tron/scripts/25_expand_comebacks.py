#!/usr/bin/env python3
"""
Script 25: Expand comeback patterns in the database
Mines for new comeback patterns and creates expanded_comebacks table.
"""

import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def expand_comebacks():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create expanded_comebacks table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expanded_comebacks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comeback_type TEXT NOT NULL,
            crisis_year INTEGER,
            crisis_event TEXT,
            crisis_sentiment REAL,
            recovery_year INTEGER,
            recovery_event TEXT,
            recovery_sentiment REAL,
            gap_months INTEGER,
            intensity_shift REAL,
            source_table TEXT,
            narrative TEXT
        )
    """)
    
    # Clear existing data to avoid duplicates
    cursor.execute("DELETE FROM expanded_comebacks")
    
    comebacks = []
    
    print("Mining for comeback patterns...\n")
    
    # Pattern 1: Career setbacks → promotions
    print("1. Career setbacks → promotions")
    cursor.execute("""
        SELECT m1.id, m1.year, m1.milestone, m1.vader_compound, 
               m2.id, m2.year, m2.milestone, m2.vader_compound
        FROM milestones m1
        JOIN milestones m2 ON m1.year < m2.year AND (m2.year - m1.year) <= 3
        WHERE m1.vader_compound < -0.1 AND m2.vader_compound > 0.1
        ORDER BY m1.year, m2.year
    """)
    career_setbacks = cursor.fetchall()
    
    for crisis_id, crisis_y, crisis_t, crisis_sent, recovery_id, recovery_y, recovery_t, recovery_sent in career_setbacks:
        gap = (recovery_y - crisis_y) * 12
        intensity_shift = (recovery_sent - crisis_sent) if crisis_sent and recovery_sent else 0
        narrative = f"After {(crisis_t or '')[:40]}, {(recovery_t or '')[:40]} marked a turnaround"
        
        comebacks.append({
            'type': 'career_setback',
            'crisis_year': crisis_y,
            'crisis_event': (crisis_t or '')[:100],
            'crisis_sentiment': crisis_sent,
            'recovery_year': recovery_y,
            'recovery_event': (recovery_t or '')[:100],
            'recovery_sentiment': recovery_sent,
            'gap_months': gap,
            'intensity_shift': intensity_shift,
            'source': 'milestones',
            'narrative': narrative
        })
    
    print(f"   Found {len(career_setbacks)} career comeback patterns")
    
    # Pattern 2: Health crisis → travel
    print("2. Health crisis → travel recovery")
    cursor.execute("""
        SELECT id, medical_year, medical_event, 
               travel_year, travel_destination
        FROM travel_medical_correlations
        WHERE travel_year IS NOT NULL
    """)
    health_travel = cursor.fetchall()
    
    for tmc_id, crisis_y, crisis_t, recovery_y, recovery_t in health_travel:
        if recovery_y and crisis_y:
            gap = (recovery_y - crisis_y) * 12
            narrative = f"Recovery from {(crisis_t or 'medical event')[:40]} enabled {(recovery_t or 'recovery travel')[:40]}"
            
            comebacks.append({
                'type': 'health_travel',
                'crisis_year': crisis_y,
                'crisis_event': (crisis_t or "Medical event")[:100],
                'crisis_sentiment': -0.5,
                'recovery_year': recovery_y,
                'recovery_event': (recovery_t or "Recovery travel")[:100],
                'recovery_sentiment': 0.5,
                'gap_months': gap,
                'intensity_shift': 1.0,
                'source': 'travel_medical',
                'narrative': narrative
            })
    
    print(f"   Found {len(health_travel)} health → travel patterns")
    
    # Pattern 3: Relationship losses → new connections
    print("3. Relationship losses → new connections")
    cursor.execute("""
        SELECT tn1.year as loss_year, tn1.lost_people,
               tn2.year as new_year, tn2.new_people
        FROM temporal_network tn1
        JOIN temporal_network tn2 ON tn2.year = tn1.year + 1
        WHERE tn1.lost_people > 0 AND tn2.new_people > 0
        ORDER BY tn1.year
    """)
    relationships = cursor.fetchall()
    
    for loss_y, lost_count, new_y, new_count in relationships:
        gap = 12
        intensity_shift = float(new_count - lost_count) / max(lost_count, 1)
        narrative = f"After losing {lost_count} connections, {new_count} new relationships formed"
        
        comebacks.append({
            'type': 'relationship_reset',
            'crisis_year': loss_y,
            'crisis_event': f"Lost {lost_count} relationships",
            'crisis_sentiment': -0.3,
            'recovery_year': new_y,
            'recovery_event': f"Gained {new_count} connections",
            'recovery_sentiment': 0.4,
            'gap_months': gap,
            'intensity_shift': intensity_shift,
            'source': 'temporal_network',
            'narrative': narrative
        })
    
    print(f"   Found {len(relationships)} relationship patterns")
    
    # Pattern 4: Turning points → recovery
    print("4. Turning points → recovery")
    cursor.execute("""
        SELECT id, turning_point_year, event, shock_magnitude
        FROM turning_point_analysis
        WHERE shock_magnitude > 0.3
        ORDER BY turning_point_year
    """)
    turning_points = cursor.fetchall()
    
    for tp_id, tp_year, tp_desc, shock_mag in turning_points:
        cursor.execute("""
            SELECT AVG(vader_compound) FROM milestones
            WHERE year BETWEEN ? AND ? AND vader_compound IS NOT NULL
        """, (tp_year, tp_year + 2))
        
        recovery_sent = cursor.fetchone()[0] or 0.0
        if recovery_sent > 0.1:
            gap = 12
            intensity_shift = recovery_sent + shock_mag
            narrative = f"Turning point: {(tp_desc or 'Major event')[:50]}... led to recovery"
            
            comebacks.append({
                'type': 'turning_point',
                'crisis_year': tp_year,
                'crisis_event': (tp_desc or "Major turning point")[:100],
                'crisis_sentiment': -shock_mag,
                'recovery_year': tp_year + 1,
                'recovery_event': "Recovery period",
                'recovery_sentiment': recovery_sent,
                'gap_months': gap,
                'intensity_shift': intensity_shift,
                'source': 'turning_point_analysis',
                'narrative': narrative
            })
    
    print(f"   Found {len(turning_points)} turning point patterns")
    
    # Pattern 5: Sentiment valleys → peaks (skip if sentiment_shift is all NULL)
    print("5. Sentiment valleys → peaks")
    cursor.execute("""
        SELECT yt1.year_from, yt1.sentiment_shift, yt2.year_to, yt2.sentiment_shift
        FROM year_transitions yt1
        JOIN year_transitions yt2 ON yt2.year_from = yt1.year_to
        WHERE yt1.sentiment_shift IS NOT NULL AND yt2.sentiment_shift IS NOT NULL
        AND yt1.sentiment_shift < -0.2 AND yt2.sentiment_shift > 0.2
        ORDER BY yt1.year_from
    """)
    sentiment_shifts = cursor.fetchall()
    
    for valley_y, valley_shift, peak_y, peak_shift in sentiment_shifts:
        gap = 12
        intensity_shift = peak_shift - valley_shift
        narrative = f"After sentiment dip, strong recovery in following year"
        
        comebacks.append({
            'type': 'sentiment_recovery',
            'crisis_year': valley_y,
            'crisis_event': "Low sentiment period",
            'crisis_sentiment': valley_shift,
            'recovery_year': peak_y,
            'recovery_event': "High sentiment period",
            'recovery_sentiment': peak_shift,
            'gap_months': gap,
            'intensity_shift': intensity_shift,
            'source': 'year_transitions',
            'narrative': narrative
        })
    
    print(f"   Found {len(sentiment_shifts)} sentiment recovery patterns")
    
    # Pattern 6: Keep existing medical_comeback_pairs
    print("6. Medical comeback pairs (existing)")
    cursor.execute("""
        SELECT id, medical_year, medical_event, comeback_year, comeback_event
        FROM medical_comeback_pairs
    """)
    medical = cursor.fetchall()
    
    for med_id, crisis_y, crisis_desc, recovery_y, recovery_desc in medical:
        gap_calc = (recovery_y - crisis_y) * 12 if recovery_y and crisis_y else 0
        narrative = f"Medical: {(crisis_desc or '')[:40]} → {(recovery_desc or '')[:40]}"
        
        comebacks.append({
            'type': 'medical',
            'crisis_year': crisis_y,
            'crisis_event': (crisis_desc or "Medical crisis")[:100],
            'crisis_sentiment': -0.6,
            'recovery_year': recovery_y,
            'recovery_event': (recovery_desc or "Recovery")[:100],
            'recovery_sentiment': 0.4,
            'gap_months': gap_calc,
            'intensity_shift': 1.0,
            'source': 'medical_comeback_pairs',
            'narrative': narrative
        })
    
    print(f"   Found {len(medical)} medical comeback pairs")
    
    # Insert all comebacks
    print(f"\nInserting {len(comebacks)} total comeback narratives...")
    
    for comeback in comebacks:
        cursor.execute("""
            INSERT INTO expanded_comebacks 
            (comeback_type, crisis_year, crisis_event, crisis_sentiment,
             recovery_year, recovery_event, recovery_sentiment, gap_months, 
             intensity_shift, source_table, narrative)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            comeback['type'],
            comeback['crisis_year'],
            comeback['crisis_event'],
            comeback['crisis_sentiment'],
            comeback['recovery_year'],
            comeback['recovery_event'],
            comeback['recovery_sentiment'],
            comeback['gap_months'],
            comeback['intensity_shift'],
            comeback['source'],
            comeback['narrative']
        ))
    
    conn.commit()
    
    # Print summary
    print("\n" + "=" * 100)
    print("COMEBACK NARRATIVES SUMMARY")
    print("=" * 100)
    
    for i, comeback in enumerate(comebacks[:30], 1):
        print(f"\n{i}. [{comeback['type'].upper()}]")
        print(f"   Crisis: {comeback['crisis_year']} - {comeback['crisis_event']}")
        print(f"   Recovery: {comeback['recovery_year']} - {comeback['recovery_event']}")
        print(f"   Gap: {comeback['gap_months']} months | Shift: {comeback['intensity_shift']:.2f}")
    
    if len(comebacks) > 30:
        print(f"\n... and {len(comebacks) - 30} more narratives")
    
    print(f"\n✓ Successfully created expanded_comebacks table with {len(comebacks)} narratives")
    print(f"  - Breakdown by type:")
    
    type_counts = {}
    for comeback in comebacks:
        t = comeback['type']
        type_counts[t] = type_counts.get(t, 0) + 1
    
    for comeback_type, count in sorted(type_counts.items()):
        print(f"    • {comeback_type}: {count}")
    
    conn.close()

if __name__ == "__main__":
    expand_comebacks()
