import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=" * 60)
print("SCRIPT 07: CONSOLIDATE EVENTS")
print("=" * 60)

# Check ecd_events
cursor.execute("SELECT COUNT(*) FROM ecd_events")
old_events_count = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM ecd_events_v2")
new_events_count = cursor.fetchone()[0]

print(f"ecd_events: {old_events_count} rows")
print(f"ecd_events_v2: {new_events_count} rows")

# Check if ecd_events has sentiment data
cursor.execute("""
    SELECT COUNT(*) FROM ecd_events 
    WHERE vader_compound IS NOT NULL OR vader_pos IS NOT NULL 
       OR vader_neg IS NOT NULL OR participants IS NOT NULL OR raised IS NOT NULL
""")
old_events_with_data = cursor.fetchone()[0]

if old_events_with_data > 0:
    print(f"Found {old_events_with_data} rows in ecd_events with sentiment/metadata data")
    
    # First add columns to ecd_events_v2 if they don't exist
    cursor.execute("PRAGMA table_info(ecd_events_v2)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'vader_compound' not in columns:
        cursor.execute("ALTER TABLE ecd_events_v2 ADD COLUMN vader_compound REAL")
    if 'vader_pos' not in columns:
        cursor.execute("ALTER TABLE ecd_events_v2 ADD COLUMN vader_pos REAL")
    if 'vader_neg' not in columns:
        cursor.execute("ALTER TABLE ecd_events_v2 ADD COLUMN vader_neg REAL")
    if 'participants' not in columns:
        cursor.execute("ALTER TABLE ecd_events_v2 ADD COLUMN participants INTEGER")
    if 'raised' not in columns:
        cursor.execute("ALTER TABLE ecd_events_v2 ADD COLUMN raised REAL")
    
    # Migrate data by event_number
    migrated = 0
    cursor.execute("""
        SELECT event_number, vader_compound, vader_pos, vader_neg, participants, raised 
        FROM ecd_events
    """)
    for event_num, compound, pos, neg, participants, raised in cursor.fetchall():
        if event_num:
            # Check if this event_number exists in v2
            cursor.execute("SELECT id FROM ecd_events_v2 WHERE event_number = ?", (event_num,))
            v2_row = cursor.fetchone()
            
            if v2_row:
                # Update v2 with data from old version
                cursor.execute("""
                    UPDATE ecd_events_v2 
                    SET vader_compound = COALESCE(vader_compound, ?),
                        vader_pos = COALESCE(vader_pos, ?),
                        vader_neg = COALESCE(vader_neg, ?),
                        participants = COALESCE(participants, ?),
                        raised = COALESCE(raised, ?)
                    WHERE event_number = ?
                """, (compound, pos, neg, participants, raised, event_num))
                migrated += 1
    
    print(f"Migrated data from {migrated} events")
    print(f"Added sentiment columns to ecd_events_v2")
else:
    print("No sentiment/metadata data found in ecd_events")

# Rename ecd_events to ecd_events_legacy
try:
    cursor.execute("ALTER TABLE ecd_events RENAME TO ecd_events_legacy")
    print("Renamed ecd_events to ecd_events_legacy")
except:
    print("Could not rename ecd_events (may already be done)")

conn.commit()
conn.close()

print("=" * 60)
