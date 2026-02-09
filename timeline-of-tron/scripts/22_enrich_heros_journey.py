#!/usr/bin/env python3
"""
Script 22: Enrich heros_journey table with computed columns
"""

import sqlite3

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

def enrich_heros_journey():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all stages
    cursor.execute("SELECT stage, year_start, year_end FROM heros_journey ORDER BY year_start")
    stages = cursor.fetchall()
    
    print(f"Enriching {len(stages)} hero's journey stages...\n")
    
    for stage_name, year_start, year_end in stages:
        print(f"  Stage: {stage_name} ({year_start}-{year_end})")
        
        # 1. milestone_count
        cursor.execute(
            "SELECT COUNT(*) FROM milestones WHERE year BETWEEN ? AND ?",
            (year_start, year_end)
        )
        milestone_count = cursor.fetchone()[0]
        
        # 2. people_active_count
        cursor.execute(
            "SELECT SUM(active_people) FROM temporal_network WHERE year BETWEEN ? AND ?",
            (year_start, year_end)
        )
        result = cursor.fetchone()
        people_active_count = result[0] if result[0] is not None else 0
        
        # 3. career_milestones (comma-separated titles)
        cursor.execute(
            "SELECT GROUP_CONCAT(title, ', ') FROM career WHERE year BETWEEN ? AND ?",
            (year_start, year_end)
        )
        result = cursor.fetchone()
        career_milestones = result[0] if result[0] else ""
        
        # 4. era_name (overlapping eras)
        cursor.execute(
            "SELECT GROUP_CONCAT(era_name) FROM (SELECT DISTINCT era_name FROM eras "
            "WHERE start_year <= ? AND end_year >= ?)",
            (year_end, year_start)
        )
        result = cursor.fetchone()
        era_name = result[0] if result[0] else ""
        
        # 5. dominant_topic (highest avg weight in range, join with topics)
        cursor.execute(
            "SELECT t.topic_name FROM topic_evolution te "
            "JOIN topics t ON te.topic_id = t.id "
            "WHERE te.year BETWEEN ? AND ? GROUP BY te.topic_id ORDER BY AVG(te.weight) DESC LIMIT 1",
            (year_start, year_end)
        )
        result = cursor.fetchone()
        dominant_topic = result[0] if result else ""
        
        # 6. intensity_score (average intensity in range)
        cursor.execute(
            "SELECT AVG(total_intensity) FROM year_intensity_breakdown WHERE year BETWEEN ? AND ?",
            (year_start, year_end)
        )
        result = cursor.fetchone()
        intensity_score = result[0] if result[0] is not None else 0.0
        
        # 7. quote_count
        cursor.execute(
            "SELECT COUNT(*) FROM quotes WHERE year BETWEEN ? AND ?",
            (year_start, year_end)
        )
        quote_count = cursor.fetchone()[0]
        
        # Update the stage
        cursor.execute(
            """UPDATE heros_journey SET 
               milestone_count = ?, people_active_count = ?, career_milestones = ?,
               era_name = ?, dominant_topic = ?, intensity_score = ?, quote_count = ?
               WHERE stage = ?""",
            (milestone_count, people_active_count, career_milestones,
             era_name, dominant_topic, intensity_score, quote_count, stage_name)
        )
        
        print(f"    • Milestones: {milestone_count} | Active people: {people_active_count}")
        print(f"    • Dominant topic: {dominant_topic} | Intensity: {intensity_score:.2f}")
        print(f"    • Quotes: {quote_count} | Era: {era_name}\n")
    
    conn.commit()
    print(f"✓ Successfully enriched heros_journey with computed columns")
    conn.close()

if __name__ == "__main__":
    enrich_heros_journey()
