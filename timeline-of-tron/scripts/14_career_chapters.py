#!/usr/bin/env python3
"""
Script 14: Career-Chapter Mapping
Creates career_chapter_map by matching career years to life chapters.
"""
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS career_chapter_map (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        career_id INTEGER REFERENCES career(id),
        chapter_id INTEGER REFERENCES life_chapters(id),
        career_year INTEGER,
        chapter_name TEXT,
        career_title TEXT
    )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM career_chapter_map')
    
    mappings_found = 0
    
    try:
        # Get all career entries
        cursor.execute('SELECT id, year, title FROM career WHERE year IS NOT NULL')
        careers = cursor.fetchall()
        
        # Get all chapters
        cursor.execute('SELECT id, chapter_name, start_year, end_year FROM life_chapters')
        chapters = cursor.fetchall()
        
        for career_id, career_year, career_title in careers:
            for chapter_id, chapter_name, start_year, end_year in chapters:
                # Check if career year falls within chapter bounds
                if start_year and end_year and start_year <= career_year <= end_year:
                    cursor.execute('''
                    INSERT INTO career_chapter_map
                    (career_id, chapter_id, career_year, chapter_name, career_title)
                    VALUES (?, ?, ?, ?, ?)
                    ''', (career_id, chapter_id, career_year, chapter_name, career_title))
                    mappings_found += 1
    
    except sqlite3.OperationalError as e:
        print(f"  Warning: Could not access career or life_chapters tables: {e}")
    
    conn.commit()
    
    # Print summary
    cursor.execute('SELECT COUNT(*) FROM career_chapter_map')
    total_mappings = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT career_id) FROM career_chapter_map')
    careers_mapped = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT chapter_id) FROM career_chapter_map')
    chapters_mapped = cursor.fetchone()[0]
    
    print(f"\n[14_career_chapters.py] Summary:")
    print(f"  Total career-chapter mappings: {total_mappings}")
    print(f"  Unique careers mapped: {careers_mapped}")
    print(f"  Unique chapters used: {chapters_mapped}")
    
    conn.close()

if __name__ == '__main__':
    main()
