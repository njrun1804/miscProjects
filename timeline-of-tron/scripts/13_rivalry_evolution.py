#!/usr/bin/env python3
"""
Script 13: Rivalry Evolution
Creates ecd_rivalry_timeline by tracking rivalry matches per year.
"""
import sqlite3

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ecd_rivalry_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1 TEXT NOT NULL,
        player2 TEXT NOT NULL,
        year INTEGER NOT NULL,
        matches_count INTEGER DEFAULT 0,
        player1_wins INTEGER DEFAULT 0,
        player2_wins INTEGER DEFAULT 0,
        rivalry_intensity REAL DEFAULT 0.0
    )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM ecd_rivalry_timeline')
    
    stats_count = 0
    
    try:
        # Get all rivalries
        cursor.execute('''
        SELECT id, player1, player2 FROM ecd_rivalries
        ''')
        rivalries = cursor.fetchall()
        
        first_years = {}
        last_years = {}
        
        for rid, p1, p2 in rivalries:
            # Find matches between these two players by year
            cursor.execute('''
            SELECT year, COUNT(*) as matches,
                   SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as p1_wins
            FROM ecd_match_results
            WHERE (winner = ? AND loser = ?) OR (winner = ? AND loser = ?)
            GROUP BY year
            ''', (p1, p1, p2, p2, p1))
            
            match_history = cursor.fetchall()
            
            if match_history:
                first_year = min(row[0] for row in match_history if row[0] is not None)
                last_year = max(row[0] for row in match_history if row[0] is not None)
                first_years[(p1, p2)] = first_year
                last_years[(p1, p2)] = last_year
            
            for year, matches, p1_wins in match_history:
                if year is None:
                    continue
                p1_wins = p1_wins or 0
                p2_wins = matches - p1_wins
                intensity = (matches / 10.0) * 0.8 + 0.2  # Normalized
                
                cursor.execute('''
                INSERT INTO ecd_rivalry_timeline
                (player1, player2, year, matches_count, player1_wins, player2_wins, rivalry_intensity)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (p1, p2, year, matches, p1_wins, p2_wins, min(intensity, 1.0)))
                stats_count += 1
        
        # Update ecd_rivalries with first/last years
        for (p1, p2), first_year in first_years.items():
            last_year = last_years.get((p1, p2))
            cursor.execute('''
            UPDATE ecd_rivalries
            SET first_year = ?, last_year = ?
            WHERE player1 = ? AND player2 = ?
            ''', (first_year, last_year, p1, p2))
    
    except sqlite3.OperationalError as e:
        print(f"  Warning: Could not access ecd_rivalries: {e}")
    
    conn.commit()
    
    # Print summary
    cursor.execute('SELECT COUNT(*) FROM ecd_rivalry_timeline')
    total_rows = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT player1 || "_" || player2) FROM ecd_rivalry_timeline')
    unique_rivalries = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT year) FROM ecd_rivalry_timeline')
    unique_years = cursor.fetchone()[0]
    try:
        cursor.execute('SELECT AVG(rivalry_intensity) FROM ecd_rivalry_timeline')
        avg_intensity = cursor.fetchone()[0]
    except:
        avg_intensity = 0.0
    
    print(f"\n[13_rivalry_evolution.py] Summary:")
    print(f"  Total rivalry-year statistics: {total_rows}")
    print(f"  Unique rivalries tracked: {unique_rivalries}")
    print(f"  Years with rivalry data: {unique_years}")
    print(f"  Average rivalry intensity: {avg_intensity:.3f}" if avg_intensity else "  Average rivalry intensity: N/A")
    
    conn.close()

if __name__ == '__main__':
    main()
