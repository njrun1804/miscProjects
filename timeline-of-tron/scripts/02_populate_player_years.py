import sqlite3
from collections import defaultdict

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=" * 60)
print("SCRIPT 02: POPULATE PLAYER YEARS")
print("=" * 60)

# Get all players with NULL years
cursor.execute("""
    SELECT id, name FROM ecd_players 
    WHERE first_year IS NULL AND last_year IS NULL AND peak_year IS NULL AND era_active IS NULL
""")
players_to_update = cursor.fetchall()

print(f"Found {len(players_to_update)} players with NULL year data")

updated_count = 0
wins_updated = 0
losses_updated = 0

for player_id, player_name in players_to_update:
    # Find all years this player appears in match results
    cursor.execute("""
        SELECT DISTINCT year FROM ecd_match_results 
        WHERE (winner = ? OR loser = ?)
        ORDER BY year
    """, (player_name, player_name))
    years = [row[0] for row in cursor.fetchall() if row[0]]
    
    if not years:
        continue
    
    first_year = min(years)
    last_year = max(years)
    
    # Find peak year (year with most appearances)
    year_counts = defaultdict(int)
    cursor.execute("""
        SELECT year FROM ecd_match_results 
        WHERE (winner = ? OR loser = ?)
    """, (player_name, player_name))
    for (year,) in cursor.fetchall():
        if year:
            year_counts[year] += 1
    
    if year_counts:
        peak_year = max(year_counts.keys(), key=lambda y: (year_counts[y], -y))
    else:
        peak_year = first_year
    
    era_active = f"{first_year}-{last_year}"
    
    # Count wins and losses
    cursor.execute("SELECT COUNT(*) FROM ecd_match_results WHERE winner = ?", (player_name,))
    wins = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM ecd_match_results WHERE loser = ?", (player_name,))
    losses = cursor.fetchone()[0]
    
    # Get current stored values
    cursor.execute("""
        SELECT wins, losses FROM ecd_players WHERE id = ?
    """, (player_id,))
    current_row = cursor.fetchone()
    current_wins = current_row[0] if current_row[0] else 0
    current_losses = current_row[1] if current_row[1] else 0
    
    # Update player
    cursor.execute("""
        UPDATE ecd_players 
        SET first_year = ?, last_year = ?, peak_year = ?, era_active = ?, wins = ?, losses = ?
        WHERE id = ?
    """, (first_year, last_year, peak_year, era_active, wins, losses, player_id))
    
    updated_count += 1
    if wins != current_wins:
        wins_updated += 1
    if losses != current_losses:
        losses_updated += 1

conn.commit()
conn.close()

print(f"Updated {updated_count} players")
print(f"Recalculated wins for {wins_updated} players")
print(f"Recalculated losses for {losses_updated} players")
print("=" * 60)
