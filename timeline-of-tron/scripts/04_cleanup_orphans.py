import sqlite3
import json
from datetime import datetime

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=" * 60)
print("SCRIPT 04: CLEANUP ORPHANS")
print("=" * 60)

# Create backup table if not exists
cursor.execute("""
    CREATE TABLE IF NOT EXISTS _deleted_records_backup (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_table TEXT,
        source_id INTEGER,
        data TEXT,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

archived_count = 0

# Process timeline_posts
cursor.execute("""
    SELECT id, post_id FROM timeline_posts 
    WHERE post_id IS NOT NULL
""")
timeline_posts_rows = cursor.fetchall()

orphaned_timeline = 0
for tp_id, post_id in timeline_posts_rows:
    cursor.execute("SELECT id FROM ecd_posts WHERE id = ?", (post_id,))
    if not cursor.fetchone():
        # Orphaned record
        cursor.execute("SELECT * FROM timeline_posts WHERE id = ?", (tp_id,))
        row = cursor.fetchone()
        cursor.execute("""
            INSERT INTO _deleted_records_backup (source_table, source_id, data)
            VALUES (?, ?, ?)
        """, ('timeline_posts', tp_id, json.dumps(str(row))))
        cursor.execute("DELETE FROM timeline_posts WHERE id = ?", (tp_id,))
        orphaned_timeline += 1

archived_count += orphaned_timeline

# Process post_content
cursor.execute("""
    SELECT id, post_id FROM post_content 
    WHERE post_id IS NOT NULL
""")
post_content_rows = cursor.fetchall()

orphaned_post_content = 0
for pc_id, post_id in post_content_rows:
    cursor.execute("SELECT id FROM ecd_posts WHERE id = ?", (post_id,))
    if not cursor.fetchone():
        cursor.execute("SELECT * FROM post_content WHERE id = ?", (pc_id,))
        row = cursor.fetchone()
        cursor.execute("""
            INSERT INTO _deleted_records_backup (source_table, source_id, data)
            VALUES (?, ?, ?)
        """, ('post_content', pc_id, json.dumps(str(row))))
        cursor.execute("DELETE FROM post_content WHERE id = ?", (pc_id,))
        orphaned_post_content += 1

archived_count += orphaned_post_content

# Process ner_entities
cursor.execute("""
    SELECT id, source_table, source_id FROM ner_entities 
    WHERE source_table IS NOT NULL AND source_id IS NOT NULL
""")
ner_rows = cursor.fetchall()

orphaned_ner = 0
for ne_id, src_table, src_id in ner_rows:
    cursor.execute(f"SELECT id FROM {src_table} WHERE id = ?", (src_id,))
    if not cursor.fetchone():
        cursor.execute("SELECT * FROM ner_entities WHERE id = ?", (ne_id,))
        row = cursor.fetchone()
        cursor.execute("""
            INSERT INTO _deleted_records_backup (source_table, source_id, data)
            VALUES (?, ?, ?)
        """, ('ner_entities', ne_id, json.dumps(str(row))))
        cursor.execute("DELETE FROM ner_entities WHERE id = ?", (ne_id,))
        orphaned_ner += 1

archived_count += orphaned_ner

conn.commit()
conn.close()

print(f"Archived {orphaned_timeline} orphaned timeline_posts")
print(f"Archived {orphaned_post_content} orphaned post_content")
print(f"Archived {orphaned_ner} orphaned ner_entities")
print(f"Total records archived: {archived_count}")
print("=" * 60)
