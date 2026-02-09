#!/usr/bin/env python3
"""
Script 09: Player-Year Matrix
Creates ecd_player_years table with match statistics per player per year.
"""
import sqlite3
from collections import defaultdict

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ecd_player_years (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        player_id INTEGER,
        year INTEGER NOT NULL,
        matches_count INTEGER DEFAULT 0,
        wins_in_year INTEGER DEFAULT 0,
        losses_in_year INTEGER DEFAULT 0,
        win_rate REAL,
        awards_count INTEGER DEFAULT 0,
        had_rivalry BOOLEAN DEFAULT 0
    )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM ecd_player_years')
    
    data_by_player_year = defaultdict(lambda: {
        'matches': 0, 'wins': 0, 'losses': 0, 'awards': 0, 'has_rivalry': False
    })
    
    # Get all unique players and years from match results
    cursor.execute('SELECT DISTINCT winner FROM ecd_match_results WHERE winner IS NOT NULL UNION SELECT DISTINCT loser FROM ecd_match_results WHERE loser IS NOT NULL ORDER BY 1')
    all_players = [row[0] for row in cursor.fetchall()]
    
    # Get match statistics for each player-year
    for player in all_players:
        if not player:
            continue
        
        # Wins as winner
        cursor.execute('''
        SELECT year, COUNT(*) as wins
        FROM ecd_match_results
        WHERE winner = ?
        GROUP BY year
        ''', (player,))
        
        for year, wins in cursor.fetchall():
            if year is not None:
                key = (player, None, year)
                data_by_player_year[key]['wins'] += wins
                data_by_player_year[key]['matches'] += wins
        
        # Losses as loser
        cursor.execute('''
        SELECT year, COUNT(*) as losses
        FROM ecd_match_results
        WHERE loser = ?
        GROUP BY year
        ''', (player,))
        
        for year, losses in cursor.fetchall():
            if year is not None:
                key = (player, None, year)
                data_by_player_year[key]['losses'] += losses
                data_by_player_year[key]['matches'] += losses
    
    # Get awards data
    try:
        cursor.execute('SELECT player_name, player_id, year FROM ecd_awards_v2 WHERE player_name IS NOT NULL')
        for player_name, player_id, year in cursor.fetchall():
            if year is not None:
                key = (player_name, player_id, year)
                data_by_player_year[key]['awards'] += 1
    except sqlite3.OperationalError:
        pass
    
    # Check for rivalries
    try:
        cursor.execute('SELECT player1, player1_id, player2, player2_id FROM ecd_rivalries')
        rival_pairs = set(cursor.fetchall())
        
        for (p1, p1_id, p2, p2_id) in rival_pairs:
            for year in range(1982, 2025):
                key1 = (p1, p1_id, year)
                key2 = (p2, p2_id, year)
                if key1 in data_by_player_year:
                    data_by_player_year[key1]['has_rivalry'] = True
                if key2 in data_by_player_year:
                    data_by_player_year[key2]['has_rivalry'] = True
    except sqlite3.OperationalError:
        pass
    
    # Insert into table
    for (player_name, player_id, year), stats in sorted(data_by_player_year.items(), key=lambda x: (x[0][0], x[0][2] if x[0][2] else 0)):
        matches = stats['matches']
        wins = stats['wins']
        losses = stats['losses']
        win_rate = wins / matches if matches > 0 else None
        
        cursor.execute('''
        INSERT INTO ecd_player_years
        (player_name, player_id, year, matches_count, wins_in_year, losses_in_year, win_rate, awards_count, had_rivalry)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (player_name, player_id, year, matches, wins, losses, win_rate, stats['awards'], 
              1 if stats['has_rivalry'] else 0))
    
    conn.commit()
    
    # Print summary
    cursor.execute('SELECT COUNT(*) FROM ecd_player_years')
    total_rows = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT player_name) FROM ecd_player_years')
    total_players = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT year) FROM ecd_player_years')
    total_years = cursor.fetchone()[0]
    cursor.execute('SELECT AVG(win_rate) FROM ecd_player_years WHERE win_rate IS NOT NULL')
    avg_win_rate = cursor.fetchone()[0]
    cursor.execute('SELECT SUM(had_rivalry) FROM ecd_player_years')
    rivalry_count = cursor.fetchone()[0]
    
    print(f"\n[09_player_year_matrix.py] Summary:")
    print(f"  Total player-year combinations: {total_rows}")
    print(f"  Total unique players: {total_players}")
    print(f"  Total unique years: {total_years}")
    print(f"  Average win rate: {avg_win_rate:.3f}" if avg_win_rate else "  Average win rate: N/A")
    print(f"  Player-years with rivalry: {rivalry_count}")
    
    conn.close()

if __name__ == '__main__':
    main()
