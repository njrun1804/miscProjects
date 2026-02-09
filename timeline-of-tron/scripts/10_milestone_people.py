#!/usr/bin/env python3
"""
Script 10: Milestone People Links
Creates milestone_people table by extracting person mentions from milestone text.
"""
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS milestone_people (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        milestone_id INTEGER REFERENCES milestones(id),
        person_name TEXT NOT NULL,
        person_id INTEGER,
        mention_type TEXT,
        confidence REAL DEFAULT 1.0
    )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM milestone_people')
    
    # Get all people names from both tables
    all_people = {}
    cursor.execute('SELECT id, name FROM people')
    for pid, pname in cursor.fetchall():
        if pname:
            all_people[pname.lower()] = (pid, 'people')
    
    try:
        cursor.execute('SELECT id, name FROM ecd_players WHERE name IS NOT NULL')
        for pid, pname in cursor.fetchall():
            if pname:
                all_people[pname.lower()] = (pid, 'ecd_players')
    except sqlite3.OperationalError:
        pass
    
    # Get all milestones
    cursor.execute('SELECT id, milestone FROM milestones WHERE milestone IS NOT NULL')
    milestones = cursor.fetchall()
    
    links_found = 0
    
    for milestone_id, milestone_text in milestones:
        if not milestone_text:
            continue
        
        text_lower = milestone_text.lower()
        matched_names = set()
        
        for person_name_lower, (person_id, table_name) in all_people.items():
            # Exact match (case-insensitive) - high confidence
            if person_name_lower in text_lower:
                # Avoid duplicates if same person in multiple tables
                if person_name_lower not in matched_names:
                    matched_names.add(person_name_lower)
                    cursor.execute('''
                    INSERT INTO milestone_people
                    (milestone_id, person_name, person_id, mention_type, confidence)
                    VALUES (?, ?, ?, ?, ?)
                    ''', (milestone_id, person_name_lower, person_id, 'exact_match', 1.0))
                    links_found += 1
    
    conn.commit()
    
    # Print summary
    cursor.execute('SELECT COUNT(*) FROM milestone_people')
    total_links = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT milestone_id) FROM milestone_people')
    milestones_linked = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT person_name) FROM milestone_people')
    people_linked = cursor.fetchone()[0]
    
    print(f"\n[10_milestone_people.py] Summary:")
    print(f"  Total person-milestone links created: {total_links}")
    print(f"  Milestones with at least one person: {milestones_linked}")
    print(f"  Unique people mentioned: {people_linked}")
    
    conn.close()

if __name__ == '__main__':
    main()
