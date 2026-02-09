#!/usr/bin/env python3
"""
Script 11: Travel-Medical Correlations
Creates travel_medical_correlations table by finding temporal proximity.
"""
import sqlite3

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS travel_medical_correlations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medical_id INTEGER REFERENCES medical_history(id),
        medical_event TEXT,
        medical_year INTEGER,
        travel_id INTEGER REFERENCES travel(id),
        travel_destination TEXT,
        travel_year INTEGER,
        correlation_type TEXT,
        months_between INTEGER
    )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM travel_medical_correlations')
    
    correlations_found = 0
    
    try:
        # Get medical events
        cursor.execute('SELECT id, event, year FROM medical_history')
        medical_events = cursor.fetchall()
        
        # Get travel events
        cursor.execute('SELECT id, destination, year FROM travel')
        travel_events = cursor.fetchall()
        
        for med_id, med_event, med_year in medical_events:
            for trav_id, trav_dest, trav_year in travel_events:
                year_diff = abs(med_year - trav_year)
                months_between = year_diff * 12
                
                # Within 18 months
                if months_between <= 18:
                    if trav_year < med_year:
                        corr_type = 'pre_event'
                    else:
                        corr_type = 'post_recovery'
                    
                    cursor.execute('''
                    INSERT INTO travel_medical_correlations
                    (medical_id, medical_event, medical_year, travel_id, travel_destination,
                     travel_year, correlation_type, months_between)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (med_id, med_event, med_year, trav_id, trav_dest, trav_year, corr_type, months_between))
                    correlations_found += 1
    
    except sqlite3.OperationalError as e:
        print(f"  Warning: Could not access travel or medical_history tables: {e}")
    
    conn.commit()
    
    # Print summary
    cursor.execute('SELECT COUNT(*) FROM travel_medical_correlations')
    total_corr = cursor.fetchone()[0]
    try:
        cursor.execute('SELECT COUNT(DISTINCT medical_id) FROM travel_medical_correlations')
        medical_involved = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(DISTINCT travel_id) FROM travel_medical_correlations')
        travel_involved = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM travel_medical_correlations WHERE correlation_type = "pre_event"')
        pre_count = cursor.fetchone()[0]
        cursor.execute('SELECT COUNT(*) FROM travel_medical_correlations WHERE correlation_type = "post_recovery"')
        post_count = cursor.fetchone()[0]
    except:
        medical_involved = 0
        travel_involved = 0
        pre_count = 0
        post_count = 0
    
    print(f"\n[11_travel_medical.py] Summary:")
    print(f"  Total correlations found: {total_corr}")
    print(f"  Medical events involved: {medical_involved}")
    print(f"  Travel events involved: {travel_involved}")
    print(f"  Pre-event correlations: {pre_count}")
    print(f"  Post-recovery correlations: {post_count}")
    
    conn.close()

if __name__ == '__main__':
    main()
