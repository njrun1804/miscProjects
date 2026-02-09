#!/usr/bin/env python3
"""
Script 12: Topic-Person Timeline
Creates topic_person_timeline by cross-referencing topic weights with person mentions.
"""
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS topic_person_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER REFERENCES topics(id),
        topic_name TEXT,
        person_name TEXT,
        person_id INTEGER,
        year INTEGER,
        topic_weight REAL,
        person_mentions INTEGER DEFAULT 0,
        co_strength REAL DEFAULT 0.0
    )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM topic_person_timeline')
    
    co_activations = 0
    
    try:
        # Get topic names first
        cursor.execute('SELECT id, topic_name FROM topics')
        topic_names = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Get topic evolution data (topic weights per year)
        cursor.execute('''
        SELECT topic_id, year, weight
        FROM topic_evolution
        WHERE weight > 0.05
        ''')
        topic_years = cursor.fetchall()
        
        # For each topic-year combination, find person mentions
        for topic_id, year, weight in topic_years:
            topic_name = topic_names.get(topic_id, f'topic_{topic_id}')
            person_mentions = {}
            
            # Check person_arc if it exists and person's active years include this year
            try:
                cursor.execute('''
                SELECT person, first_year, last_year, total_mentions
                FROM person_arc
                WHERE first_year <= ? AND last_year >= ?
                ''', (year, year))
                for person_name, first_y, last_y, mentions in cursor.fetchall():
                    if person_name and mentions > 0:
                        person_mentions[person_name] = (None, mentions)
            except sqlite3.OperationalError:
                pass
            
            # Check milestones for mentions of people in this year
            try:
                cursor.execute('SELECT id, name FROM people')
                for person_id, person_name in cursor.fetchall():
                    if person_name and person_name not in person_mentions:
                        # Check if they have milestones in that year with this topic
                        cursor.execute('''
                        SELECT COUNT(*) FROM milestones
                        WHERE year = ? AND topic_id = ? AND milestone LIKE ?
                        ''', (year, topic_id, f'%{person_name}%'))
                        count = cursor.fetchone()[0]
                        if count > 0:
                            person_mentions[person_name] = (person_id, count)
            except sqlite3.OperationalError:
                pass
            
            # Insert rows for each person-topic-year combination
            for person_name, (person_id, mentions) in person_mentions.items():
                cursor.execute('''
                INSERT INTO topic_person_timeline
                (topic_id, topic_name, person_name, person_id, year, topic_weight, person_mentions, co_strength)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (topic_id, topic_name, person_name, person_id, year, weight, mentions, weight * 0.5))
                co_activations += 1
    
    except sqlite3.OperationalError as e:
        print(f"  Warning: Could not access topic_evolution or related tables: {e}")
    
    conn.commit()
    
    # Print summary
    cursor.execute('SELECT COUNT(*) FROM topic_person_timeline')
    total_rows = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT topic_id) FROM topic_person_timeline')
    unique_topics = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT person_name) FROM topic_person_timeline')
    unique_people = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT year) FROM topic_person_timeline')
    unique_years = cursor.fetchone()[0]
    
    print(f"\n[12_topic_person.py] Summary:")
    print(f"  Total co-activations found: {total_rows}")
    print(f"  Unique topics: {unique_topics}")
    print(f"  Unique people: {unique_people}")
    print(f"  Unique years: {unique_years}")
    
    conn.close()

if __name__ == '__main__':
    main()
