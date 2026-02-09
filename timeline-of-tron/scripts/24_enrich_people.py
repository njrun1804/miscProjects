#!/usr/bin/env python3
"""
Script 24: Enrich people table with computed importance/activity data
"""

import sqlite3

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

def enrich_people():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Add columns if they don't exist
    new_columns = {
        'importance_score': 'REAL',
        'peak_year': 'INTEGER',
        'active_years': 'TEXT',
        'dominant_topic': 'TEXT',
        'influence_period': 'TEXT'
    }
    
    for col_name, col_type in new_columns.items():
        try:
            cursor.execute(f"ALTER TABLE people ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists")
            else:
                raise
    
    # Get all people
    cursor.execute("SELECT id, name FROM people ORDER BY id")
    people = cursor.fetchall()
    
    print(f"\nEnriching {len(people)} people with importance metrics...\n")
    
    person_importance = []
    
    for person_id, person_name in people:
        # 1. milestone_mentions (from milestone_people)
        cursor.execute(
            "SELECT COUNT(*) FROM milestone_people WHERE person_id = ?",
            (person_id,)
        )
        milestone_mentions = cursor.fetchone()[0]
        
        # 2. quote_mentions (from quote_attribution)
        cursor.execute(
            "SELECT COUNT(*) FROM quote_attribution WHERE person_id = ?",
            (person_id,)
        )
        quote_mentions = cursor.fetchone()[0]
        
        # 3. co_occurrence_count (from co_occurrences by person name)
        cursor.execute(
            "SELECT SUM(co_occurrence_count) FROM co_occurrences WHERE person_a = ? OR person_b = ?",
            (person_name, person_name)
        )
        result = cursor.fetchone()
        co_occurrence_count = result[0] if result[0] is not None else 0
        
        # 4. relationship_weight (from relationship_graph by person name)
        cursor.execute(
            "SELECT SUM(weight) FROM relationship_graph WHERE person_name = ? OR connected_to = ?",
            (person_name, person_name)
        )
        result = cursor.fetchone()
        relationship_weight = result[0] if result[0] is not None else 0
        
        # 5. peak_year and years_active (from person_arc using person name)
        cursor.execute(
            "SELECT peak_year, first_year, last_year, span FROM person_arc WHERE person = ?",
            (person_name,)
        )
        arc_result = cursor.fetchone()
        if arc_result:
            peak_year, first_year, last_year, span = arc_result
            active_years = f"{first_year}-{last_year}" if first_year and last_year else ""
            years_active = span if span is not None else 0
        else:
            peak_year = None
            active_years = ""
            years_active = 0
        
        # Compute importance_score
        importance_score = (milestone_mentions * 3) + (quote_mentions * 2) + \
                          co_occurrence_count + relationship_weight + years_active
        
        # 6. dominant_topic (from topic_person_timeline by person_name)
        cursor.execute(
            "SELECT topic_name FROM topic_person_timeline WHERE person_name = ? "
            "GROUP BY topic_name ORDER BY MAX(co_strength) DESC LIMIT 1",
            (person_name,)
        )
        topic_result = cursor.fetchone()
        dominant_topic = topic_result[0] if topic_result else ""
        
        # 7. influence_period (eras where person was most active)
        if active_years and first_year and last_year:
            cursor.execute(
                "SELECT GROUP_CONCAT(era_name) FROM (SELECT DISTINCT era_name FROM eras "
                "WHERE start_year <= ? AND end_year >= ?)",
                (last_year, first_year)
            )
            result = cursor.fetchone()
            influence_period = result[0] if result[0] else ""
        else:
            influence_period = ""
        
        # Update person
        cursor.execute(
            """UPDATE people SET importance_score = ?, peak_year = ?, 
               active_years = ?, dominant_topic = ?, influence_period = ?
               WHERE id = ?""",
            (importance_score, peak_year, active_years, dominant_topic, influence_period, person_id)
        )
        
        person_importance.append((person_name, importance_score, active_years, dominant_topic))
    
    conn.commit()
    
    # Sort by importance and show top 20
    person_importance.sort(key=lambda x: x[1], reverse=True)
    
    print("Top 20 People by Importance Score:")
    print("=" * 90)
    for i, (name, score, years, topic) in enumerate(person_importance[:20], 1):
        print(f"{i:2d}. {name:30s} | Score: {score:7.1f} | Years: {years:15s} | Topic: {topic}")
    
    print(f"\n✓ Successfully enriched {len(people)} people with importance metrics")
    conn.close()

if __name__ == "__main__":
    enrich_people()
