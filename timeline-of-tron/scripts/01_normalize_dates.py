import sqlite3
from datetime import datetime
import re

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

def parse_date(value):
    """Try to parse various date formats and return YYYY-MM-DD or None"""
    if not value or value.upper() == 'NULL':
        return None
    
    value = str(value).strip()
    
    # Already in YYYY-MM-DD format
    if re.match(r'^\d{4}-\d{2}-\d{2}$', value):
        return value
    
    # YYYY/MM/DD format
    if re.match(r'^\d{4}/\d{2}/\d{2}$', value):
        return value.replace('/', '-')
    
    # "Month DD, YYYY" format
    month_pattern = r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$'
    match = re.match(month_pattern, value)
    if match:
        month_str, day, year = match.groups()
        months = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
        }
        return f"{year}-{months[month_str]}-{int(day):02d}"
    
    # "Month YYYY" format
    month_year_pattern = r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$'
    match = re.match(month_year_pattern, value)
    if match:
        month_str, year = match.groups()
        months = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
        }
        return f"{year}-{months[month_str]}-01"
    
    return None

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get all tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()

print("=" * 60)
print("SCRIPT 01: NORMALIZE DATES")
print("=" * 60)

total_normalized = 0

for (table_name,) in tables:
    # Get all columns
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    
    for col_info in columns:
        col_name = col_info[1]
        col_type = col_info[2]
        
        # Check if column looks like it contains dates
        if any(x in col_name.lower() for x in ['date', 'year', 'time', 'created', 'updated']):
            if col_type in ['TEXT', 'VARCHAR']:
                # Fetch all values
                cursor.execute(f"SELECT rowid, {col_name} FROM {table_name} WHERE {col_name} IS NOT NULL")
                rows = cursor.fetchall()
                
                normalized_count = 0
                for rowid, value in rows:
                    parsed = parse_date(value)
                    if parsed and parsed != value:
                        cursor.execute(f"UPDATE {table_name} SET {col_name} = ? WHERE rowid = ?", (parsed, rowid))
                        normalized_count += 1
                
                if normalized_count > 0:
                    print(f"  {table_name}.{col_name}: {normalized_count} values normalized")
                    total_normalized += normalized_count

conn.commit()
conn.close()

print(f"\nTotal values normalized: {total_normalized}")
print("=" * 60)
