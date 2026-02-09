#!/usr/bin/env python3
"""
Script 26: Enrich writing_evolution table with topic analysis
Adds dominant_topic, topic_diversity, emotional_range, quote_density, thematic_coherence.
"""

import sqlite3
import math

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

def calculate_entropy(weights):
    """Calculate Shannon entropy of topic weights (higher = more diverse)"""
    if not weights:
        return 0.0
    
    total = sum(weights)
    if total == 0:
        return 0.0
    
    entropy = 0.0
    for w in weights:
        if w > 0:
            p = w / total
            entropy -= p * math.log2(p)
    
    return entropy

def enrich_writing():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Add columns if they don't exist
    new_columns = {
        'dominant_topic': 'TEXT',
        'topic_diversity': 'REAL',
        'emotional_range': 'REAL',
        'quote_density': 'REAL',
        'thematic_coherence': 'REAL'
    }
    
    for col_name, col_type in new_columns.items():
        try:
            cursor.execute(f"ALTER TABLE writing_evolution ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists")
            else:
                raise
    
    # Get all writing evolution entries
    cursor.execute("SELECT year FROM writing_evolution ORDER BY year")
    entries = cursor.fetchall()
    
    print(f"\nEnriching {len(entries)} writing_evolution entries...\n")
    
    for (year,) in entries:
        # 1. dominant_topic (highest-weight topic that year, join with topics)
        cursor.execute(
            "SELECT t.topic_name FROM topic_evolution te "
            "JOIN topics t ON te.topic_id = t.id "
            "WHERE te.year = ? ORDER BY te.weight DESC LIMIT 1",
            (year,)
        )
        result = cursor.fetchone()
        dominant_topic = result[0] if result else ""
        
        # 2. topic_diversity (entropy of topic weights)
        cursor.execute(
            "SELECT weight FROM topic_evolution WHERE year = ?",
            (year,)
        )
        weights = [row[0] for row in cursor.fetchall()]
        topic_diversity = calculate_entropy(weights) if weights else 0.0
        
        # 3. emotional_range (max - min sentiment for milestones that year)
        cursor.execute(
            "SELECT vader_compound FROM milestones WHERE year = ? AND vader_compound IS NOT NULL",
            (year,)
        )
        sentiments = [row[0] for row in cursor.fetchall()]
        
        if sentiments:
            emotional_range = max(sentiments) - min(sentiments)
        else:
            emotional_range = 0.0
        
        # 4. quote_density (quotes_count / milestone_count)
        cursor.execute("SELECT COUNT(*) FROM milestones WHERE year = ?", (year,))
        milestone_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM quotes WHERE year = ?", (year,))
        quote_count = cursor.fetchone()[0]
        
        quote_density = quote_count / milestone_count if milestone_count > 0 else 0.0
        
        # 5. thematic_coherence (cosine similarity with adjacent years)
        cursor.execute(
            "SELECT topic_id, weight FROM topic_evolution WHERE year = ? ORDER BY topic_id",
            (year,)
        )
        current_topics = dict(cursor.fetchall())
        
        coherence_scores = []
        
        # Compare with previous year
        cursor.execute(
            "SELECT topic_id, weight FROM topic_evolution WHERE year = ? ORDER BY topic_id",
            (year - 1,)
        )
        prev_topics = dict(cursor.fetchall())
        
        if prev_topics and current_topics:
            all_topic_ids = set(current_topics.keys()) | set(prev_topics.keys())
            
            dot_product = 0.0
            current_mag = 0.0
            prev_mag = 0.0
            
            for tid in all_topic_ids:
                c = current_topics.get(tid, 0)
                p = prev_topics.get(tid, 0)
                dot_product += c * p
                current_mag += c * c
                prev_mag += p * p
            
            if current_mag > 0 and prev_mag > 0:
                cosine_sim = dot_product / (math.sqrt(current_mag) * math.sqrt(prev_mag))
                coherence_scores.append(cosine_sim)
        
        # Compare with next year
        cursor.execute(
            "SELECT topic_id, weight FROM topic_evolution WHERE year = ? ORDER BY topic_id",
            (year + 1,)
        )
        next_topics = dict(cursor.fetchall())
        
        if next_topics and current_topics:
            all_topic_ids = set(current_topics.keys()) | set(next_topics.keys())
            
            dot_product = 0.0
            current_mag = 0.0
            next_mag = 0.0
            
            for tid in all_topic_ids:
                c = current_topics.get(tid, 0)
                n = next_topics.get(tid, 0)
                dot_product += c * n
                current_mag += c * c
                next_mag += n * n
            
            if current_mag > 0 and next_mag > 0:
                cosine_sim = dot_product / (math.sqrt(current_mag) * math.sqrt(next_mag))
                coherence_scores.append(cosine_sim)
        
        # Average the coherence scores
        thematic_coherence = sum(coherence_scores) / len(coherence_scores) if coherence_scores else 0.5
        
        # Update the entry
        cursor.execute(
            """UPDATE writing_evolution SET 
               dominant_topic = ?, topic_diversity = ?, emotional_range = ?,
               quote_density = ?, thematic_coherence = ?
               WHERE year = ?""",
            (dominant_topic, topic_diversity, emotional_range, quote_density, thematic_coherence, year)
        )
        
        print(f"  Year {year}:")
        print(f"    • Dominant topic: {dominant_topic}")
        print(f"    • Topic diversity: {topic_diversity:.3f} | Emotional range: {emotional_range:.3f}")
        print(f"    • Quote density: {quote_density:.3f} | Thematic coherence: {thematic_coherence:.3f}\n")
    
    conn.commit()
    
    print(f"✓ Successfully enriched {len(entries)} writing_evolution entries with topic analysis")
    conn.close()

if __name__ == "__main__":
    enrich_writing()
