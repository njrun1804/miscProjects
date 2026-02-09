import sqlite3

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=" * 60)
print("SCRIPT 03: LINK EVENTS")
print("=" * 60)

# Link ecd_match_results to events
match_results_linked = 0
match_results_post_date_filled = 0

# Get all match results with NULL event_number
cursor.execute("""
    SELECT id, post_id, year FROM ecd_match_results 
    WHERE event_number IS NULL AND post_id IS NOT NULL
""")
match_results = cursor.fetchall()

print(f"Found {len(match_results)} match_results with NULL event_number")

for mr_id, post_id, year in match_results:
    # Get post_date from ecd_posts
    cursor.execute("""
        SELECT date FROM ecd_posts WHERE id = ?
    """, (post_id,))
    post_row = cursor.fetchone()
    
    if post_row and post_row[0]:
        post_date = post_row[0]
        # Update post_date in match_results
        cursor.execute("""
            UPDATE ecd_match_results SET post_date = ? WHERE id = ?
        """, (post_date, mr_id))
        match_results_post_date_filled += 1
    
    # Find matching event by year and post_ids containing this post_id
    if year:
        cursor.execute("""
            SELECT event_number FROM ecd_events_v2 
            WHERE year = ? AND post_ids LIKE ?
        """, (year, f'%{post_id}%'))
        event_row = cursor.fetchone()
        
        if event_row:
            cursor.execute("""
                UPDATE ecd_match_results SET event_number = ? WHERE id = ?
            """, (event_row[0], mr_id))
            match_results_linked += 1

# Link ecd_awards_v2 to events
awards_linked = 0

cursor.execute("""
    SELECT id, post_id, year FROM ecd_awards_v2 
    WHERE event_number IS NULL AND post_id IS NOT NULL
""")
awards = cursor.fetchall()

print(f"Found {len(awards)} awards with NULL event_number")

for award_id, post_id, year in awards:
    if year:
        cursor.execute("""
            SELECT event_number FROM ecd_events_v2 
            WHERE year = ? AND post_ids LIKE ?
        """, (year, f'%{post_id}%'))
        event_row = cursor.fetchone()
        
        if event_row:
            cursor.execute("""
                UPDATE ecd_awards_v2 SET event_number = ? WHERE id = ?
            """, (event_row[0], award_id))
            awards_linked += 1

conn.commit()
conn.close()

print(f"Linked {match_results_linked} match_results to events")
print(f"Filled post_date for {match_results_post_date_filled} match_results")
print(f"Linked {awards_linked} awards to events")
print("=" * 60)
