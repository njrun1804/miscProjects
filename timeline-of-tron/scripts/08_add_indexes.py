import sqlite3

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=" * 60)
print("SCRIPT 08: ADD INDEXES")
print("=" * 60)

# List of indexes to create: (table_name, column_name)
indexes = [
    ('ecd_posts', 'year'),
    ('ecd_posts', 'id'),
    ('ecd_match_results', 'year'),
    ('ecd_match_results', 'post_id'),
    ('ecd_match_results', 'event_number'),
    ('ecd_players', 'name'),
    ('ecd_events_v2', 'event_number'),
    ('ecd_events_v2', 'year'),
    ('people', 'name'),
    ('people', 'id'),
    ('milestones', 'year'),
    ('milestones', 'topic_id'),
    ('year_summary', 'year'),
    ('people_highlights', 'person_id'),
]

created_count = 0

for table_name, col_name in indexes:
    # Check if table exists
    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    if not cursor.fetchone():
        print(f"  Skipped {table_name}.{col_name} (table not found)")
        continue
    
    # Check if column exists
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    if col_name not in columns:
        print(f"  Skipped {table_name}.{col_name} (column not found)")
        continue
    
    # Create index if not exists
    index_name = f"idx_{table_name}_{col_name}"
    cursor.execute(f"""
        CREATE INDEX IF NOT EXISTS {index_name} ON {table_name}({col_name})
    """)
    
    # Check if it was actually created
    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='index' AND name=?", (index_name,))
    if cursor.fetchone():
        print(f"  Created index: {index_name}")
        created_count += 1
    else:
        print(f"  Index already exists: {index_name}")

conn.commit()
conn.close()

print(f"\nTotal new indexes created: {created_count}")
print("=" * 60)
