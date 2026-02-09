import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=" * 60)
print("SCRIPT 05: DEDUP PEOPLE")
print("=" * 60)

# Find duplicate people
cursor.execute("""
    SELECT name, COUNT(*) as cnt FROM people 
    GROUP BY name HAVING cnt > 1
""")
duplicates = cursor.fetchall()

print(f"Found {len(duplicates)} duplicate names")

merged_count = 0

for name, count in duplicates:
    cursor.execute("SELECT id FROM people WHERE name = ? ORDER BY id", (name,))
    ids = [row[0] for row in cursor.fetchall()]
    
    keep_id = ids[0]
    delete_ids = ids[1:]
    
    # Update all references to deleted IDs
    fk_tables = [
        'people_highlights',
        'relationship_graph',
        'co_occurrences'
    ]
    
    for fk_table in fk_tables:
        # Check if table exists
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (fk_table,))
        if cursor.fetchone():
            # Check for person_id column
            cursor.execute(f"PRAGMA table_info({fk_table})")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'person_id' in columns:
                for del_id in delete_ids:
                    cursor.execute(f"""
                        UPDATE {fk_table} SET person_id = ? WHERE person_id = ?
                    """, (keep_id, del_id))
    
    # Delete duplicate records
    for del_id in delete_ids:
        cursor.execute("DELETE FROM people WHERE id = ?", (del_id,))
    
    merged_count += len(delete_ids)
    print(f"  Merged '{name}': kept id={keep_id}, deleted {len(delete_ids)} duplicates")

conn.commit()
conn.close()

print(f"Total duplicate records merged: {merged_count}")
print("=" * 60)
