import sqlite3

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=" * 60)
print("SCRIPT 06: FIX SENTIMENT")
print("=" * 60)

# Check what columns exist in milestones
cursor.execute("PRAGMA table_info(milestones)")
columns = [col[1] for col in cursor.fetchall()]

# Add sentiment_manually_corrected column if not exists
if 'sentiment_manually_corrected' not in columns:
    cursor.execute("""
        ALTER TABLE milestones 
        ADD COLUMN sentiment_manually_corrected BOOLEAN DEFAULT 0
    """)
    print("Added sentiment_manually_corrected column to milestones")

mri_fixed = 0
game_fixed = 0

# Fix 2011 MRI injury milestone (should be negative)
cursor.execute("""
    SELECT id, vader_compound FROM milestones 
    WHERE year = 2011 AND milestone LIKE '%MRI%'
""")
mri_records = cursor.fetchall()

for mid, compound in mri_records:
    if compound and compound > 0:
        cursor.execute("""
            UPDATE milestones 
            SET vader_compound = ?, sentiment_manually_corrected = 1 
            WHERE id = ?
        """, (compound * -1, mid))
        mri_fixed += 1
        print(f"  Fixed 2011 MRI milestone id={mid}: flipped compound from {compound} to {compound * -1}")

# Fix 2019 game milestone (should be positive)
cursor.execute("""
    SELECT id, vader_compound FROM milestones 
    WHERE year = 2019 AND milestone LIKE '%game%'
""")
game_records = cursor.fetchall()

for mid, compound in game_records:
    if compound and compound < 0:
        cursor.execute("""
            UPDATE milestones 
            SET vader_compound = ?, sentiment_manually_corrected = 1 
            WHERE id = ?
        """, (compound * -1, mid))
        game_fixed += 1
        print(f"  Fixed 2019 game milestone id={mid}: flipped compound from {compound} to {compound * -1}")

conn.commit()
conn.close()

print(f"Fixed {mri_fixed} MRI sentiment issues")
print(f"Fixed {game_fixed} game sentiment issues")
print("=" * 60)
