#!/usr/bin/env python3
"""
Script 16: Year Transitions
Creates year_transitions by analyzing changes between consecutive years.
"""
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS year_transitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year_from INTEGER NOT NULL,
        year_to INTEGER NOT NULL,
        sentiment_shift REAL,
        intensity_shift REAL,
        is_chapter_boundary BOOLEAN DEFAULT 0,
        is_turning_point BOOLEAN DEFAULT 0,
        people_entering INTEGER DEFAULT 0,
        people_leaving INTEGER DEFAULT 0,
        milestone_count_from INTEGER DEFAULT 0,
        milestone_count_to INTEGER DEFAULT 0
    )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM year_transitions')
    
    transitions_found = 0
    
    try:
        # Get all years from year_summary if available
        cursor.execute('SELECT DISTINCT year FROM year_summary ORDER BY year')
        years = [row[0] for row in cursor.fetchall()]
        
        if not years:
            # Fallback: get years from milestones
            cursor.execute('SELECT DISTINCT year FROM milestones ORDER BY year')
            years = [row[0] for row in cursor.fetchall()]
        
        if years:
            years.sort()
            
            # Get chapter boundaries
            chapter_boundaries = set()
            try:
                cursor.execute('SELECT DISTINCT start_year, end_year FROM life_chapters')
                for start, end in cursor.fetchall():
                    chapter_boundaries.add(start)
                    chapter_boundaries.add(end)
            except sqlite3.OperationalError:
                pass
            
            # Get turning points
            turning_points = set()
            try:
                cursor.execute('SELECT DISTINCT year FROM turning_points')
                turning_points = set(row[0] for row in cursor.fetchall())
            except sqlite3.OperationalError:
                pass
            
            # Process consecutive year pairs
            for i in range(len(years) - 1):
                year_from = years[i]
                year_to = years[i + 1]
                
                # Get milestone counts
                cursor.execute('SELECT COUNT(*) FROM milestones WHERE year = ?', (year_from,))
                mile_from = cursor.fetchone()[0]
                cursor.execute('SELECT COUNT(*) FROM milestones WHERE year = ?', (year_to,))
                mile_to = cursor.fetchone()[0]
                
                # Check for chapter boundary
                is_boundary = 1 if (year_from in chapter_boundaries or year_to in chapter_boundaries) else 0
                
                # Check for turning point
                is_turning = 1 if (year_from in turning_points or year_to in turning_points) else 0
                
                # Get sentiment shift if available
                sentiment_shift = None
                try:
                    cursor.execute('SELECT sentiment FROM sentiment_timeline WHERE year = ?', (year_from,))
                    sent_from = cursor.fetchone()
                    cursor.execute('SELECT sentiment FROM sentiment_timeline WHERE year = ?', (year_to,))
                    sent_to = cursor.fetchone()
                    
                    if sent_from and sent_to:
                        sentiment_shift = sent_to[0] - sent_from[0]
                except sqlite3.OperationalError:
                    pass
                
                # Get people entering/leaving (from temporal_network if available)
                people_entering = 0
                people_leaving = 0
                try:
                    cursor.execute('''
                    SELECT COUNT(DISTINCT person_id) FROM temporal_network
                    WHERE year = ? AND action = 'enter'
                    ''', (year_to,))
                    people_entering = cursor.fetchone()[0]
                    
                    cursor.execute('''
                    SELECT COUNT(DISTINCT person_id) FROM temporal_network
                    WHERE year = ? AND action = 'leave'
                    ''', (year_from,))
                    people_leaving = cursor.fetchone()[0]
                except sqlite3.OperationalError:
                    pass
                
                # Intensity shift based on milestone count change
                intensity_shift = (mile_to - mile_from) / max(mile_from, 1) if mile_from > 0 else 0
                
                cursor.execute('''
                INSERT INTO year_transitions
                (year_from, year_to, sentiment_shift, intensity_shift, is_chapter_boundary,
                 is_turning_point, people_entering, people_leaving, milestone_count_from, milestone_count_to)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (year_from, year_to, sentiment_shift, intensity_shift, is_boundary, is_turning,
                      people_entering, people_leaving, mile_from, mile_to))
                transitions_found += 1
    
    except sqlite3.OperationalError as e:
        print(f"  Warning: Could not access year_summary or related tables: {e}")
    
    conn.commit()
    
    # Print summary
    cursor.execute('SELECT COUNT(*) FROM year_transitions')
    total_trans = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM year_transitions WHERE is_chapter_boundary = 1')
    boundary_count = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM year_transitions WHERE is_turning_point = 1')
    turning_count = cursor.fetchone()[0]
    try:
        cursor.execute('SELECT AVG(sentiment_shift) FROM year_transitions WHERE sentiment_shift IS NOT NULL')
        avg_sentiment = cursor.fetchone()[0]
    except:
        avg_sentiment = None
    
    print(f"\n[16_year_transitions.py] Summary:")
    print(f"  Total year transitions: {total_trans}")
    print(f"  Chapter boundaries crossed: {boundary_count}")
    print(f"  Turning points involved: {turning_count}")
    print(f"  Average sentiment shift: {avg_sentiment:.3f}" if avg_sentiment else "  Average sentiment shift: N/A")
    
    conn.close()

if __name__ == '__main__':
    main()
