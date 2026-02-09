#!/usr/bin/env python3
"""
Script 15: Quote Attribution
Creates quote_attribution by matching person names in quote context and text.
"""
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def main():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS quote_attribution (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_id INTEGER REFERENCES quotes(id),
        person_name TEXT,
        person_id INTEGER,
        attribution_method TEXT,
        confidence REAL DEFAULT 0.5
    )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM quote_attribution')
    
    attributions_found = 0
    
    try:
        # Get all people names
        all_people = {}
        cursor.execute('SELECT id, name FROM people')
        for pid, pname in cursor.fetchall():
            if pname:
                all_people[pname] = pid
        
        # Get all quotes
        cursor.execute('SELECT id, quote, context FROM quotes')
        quotes = cursor.fetchall()
        
        for quote_id, quote_text, context in quotes:
            if not quote_text:
                continue
            
            matched = set()
            
            # Check context first (higher confidence)
            if context:
                context_lower = context.lower()
                for person_name, person_id in all_people.items():
                    if person_name.lower() in context_lower and person_name not in matched:
                        cursor.execute('''
                        INSERT INTO quote_attribution
                        (quote_id, person_name, person_id, attribution_method, confidence)
                        VALUES (?, ?, ?, ?, ?)
                        ''', (quote_id, person_name, person_id, 'context', 0.9))
                        matched.add(person_name)
                        attributions_found += 1
            
            # Check quote text (lower confidence)
            quote_lower = quote_text.lower()
            for person_name, person_id in all_people.items():
                if person_name.lower() in quote_lower and person_name not in matched:
                    cursor.execute('''
                    INSERT INTO quote_attribution
                    (quote_id, person_name, person_id, attribution_method, confidence)
                    VALUES (?, ?, ?, ?, ?)
                    ''', (quote_id, person_name, person_id, 'text', 0.7))
                    matched.add(person_name)
                    attributions_found += 1
    
    except sqlite3.OperationalError as e:
        print(f"  Warning: Could not access quotes or people tables: {e}")
    
    conn.commit()
    
    # Print summary
    cursor.execute('SELECT COUNT(*) FROM quote_attribution')
    total_attr = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT quote_id) FROM quote_attribution')
    quotes_attr = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(DISTINCT person_name) FROM quote_attribution')
    people_attr = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM quote_attribution WHERE attribution_method = "context"')
    context_attr = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM quote_attribution WHERE attribution_method = "text"')
    text_attr = cursor.fetchone()[0]
    
    print(f"\n[15_quote_attribution.py] Summary:")
    print(f"  Total attributions found: {total_attr}")
    print(f"  Quotes with attributions: {quotes_attr}")
    print(f"  Unique people attributed: {people_attr}")
    print(f"  Context-based attributions: {context_attr}")
    print(f"  Text-based attributions: {text_attr}")
    
    conn.close()

if __name__ == '__main__':
    main()
