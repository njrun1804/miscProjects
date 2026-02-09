#!/usr/bin/env python3
"""
Script 23: Calibrate multi-dimensional sentiment for milestones
Adds valence, arousal, dominance and recalibrates sentiment_adjusted.
"""

import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')

# Keyword sets for sentiment dimensions
AROUSAL_KEYWORDS_HIGH = [
    "incredible", "amazing", "devastating", "crisis", "emergency", 
    "explosion", "breakthrough", "triumph", "shocking", "first", 
    "record", "championship", "catastrophic", "revolutionary", "sudden"
]

AROUSAL_KEYWORDS_LOW = [
    "continued", "steady", "usual", "maintained", "another", 
    "regular", "ongoing", "routine", "gradual", "normal"
]

DOMINANCE_KEYWORDS_HIGH = [
    "achieved", "won", "conquered", "created", "launched", 
    "promoted", "earned", "completed", "built", "founded",
    "established", "developed", "designed", "secured", "succeeded"
]

DOMINANCE_KEYWORDS_LOW = [
    "lost", "failed", "broken", "hurt", "injured", 
    "denied", "rejected", "fired", "defeated", "destroyed",
    "collapsed", "withdrew", "abandoned", "cancelled"
]

def count_keywords(text, keywords):
    """Count how many keywords appear in text (case-insensitive)"""
    if not text:
        return 0
    text_lower = text.lower()
    count = 0
    for keyword in keywords:
        if keyword in text_lower:
            count += text_lower.count(keyword)
    return count

def compute_sentiment_dimensions(text, vader_compound):
    """Compute valence, arousal, dominance from text and existing sentiment score."""
    
    if not text:
        return vader_compound or 0.0, 0.5, 0.5
    
    # Valence: use vader_compound if available
    valence = vader_compound if vader_compound is not None else 0.0
    
    # Arousal: score based on keyword presence
    high_arousal = count_keywords(text, AROUSAL_KEYWORDS_HIGH)
    low_arousal = count_keywords(text, AROUSAL_KEYWORDS_LOW)
    
    arousal_diff = high_arousal - low_arousal
    arousal = max(0.0, min(1.0, 0.5 + (arousal_diff * 0.1)))
    
    # Dominance: score based on empowerment vs helplessness
    high_dominance = count_keywords(text, DOMINANCE_KEYWORDS_HIGH)
    low_dominance = count_keywords(text, DOMINANCE_KEYWORDS_LOW)
    
    dominance_diff = high_dominance - low_dominance
    dominance = max(0.0, min(1.0, 0.5 + (dominance_diff * 0.1)))
    
    return valence, arousal, dominance

def enrich_sentiment():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Add columns if they don't exist
    new_columns = {
        'valence': 'REAL',
        'arousal': 'REAL',
        'dominance': 'REAL'
    }
    
    for col_name, col_type in new_columns.items():
        try:
            cursor.execute(f"ALTER TABLE milestones ADD COLUMN {col_name} {col_type}")
            print(f"Added column: {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists")
            else:
                raise
    
    # Get all milestones
    cursor.execute("SELECT id, milestone, vader_compound FROM milestones ORDER BY id")
    milestones = cursor.fetchall()
    
    print(f"\nCalibrating sentiment for {len(milestones)} milestones...\n")
    
    valence_scores = []
    arousal_scores = []
    dominance_scores = []
    
    for milestone_id, title, vader_compound in milestones:
        text = title or ""
        
        valence, arousal, dominance = compute_sentiment_dimensions(text, vader_compound)
        
        valence_scores.append(valence)
        arousal_scores.append(arousal)
        dominance_scores.append(dominance)
        
        # Compute sentiment_adjusted as average of three dimensions
        sentiment_adjusted = (valence + arousal + dominance) / 3.0
        
        # Update milestone
        cursor.execute(
            """UPDATE milestones SET valence = ?, arousal = ?, dominance = ?, 
               sentiment_adjusted = ? WHERE id = ?""",
            (valence, arousal, dominance, sentiment_adjusted, milestone_id)
        )
    
    conn.commit()
    
    # Print distribution statistics
    if valence_scores:
        print("Valence Distribution (positive/negative, -1 to 1):")
        print(f"  Mean: {sum(valence_scores) / len(valence_scores):.3f}")
        print(f"  Range: {min(valence_scores):.3f} to {max(valence_scores):.3f}")
        
        print("\nArousal Distribution (calm/exciting, 0 to 1):")
        print(f"  Mean: {sum(arousal_scores) / len(arousal_scores):.3f}")
        print(f"  Range: {min(arousal_scores):.3f} to {max(arousal_scores):.3f}")
        
        print("\nDominance Distribution (helpless/empowered, 0 to 1):")
        print(f"  Mean: {sum(dominance_scores) / len(dominance_scores):.3f}")
        print(f"  Range: {min(dominance_scores):.3f} to {max(dominance_scores):.3f}")
    
    print(f"\n✓ Successfully calibrated multi-dimensional sentiment for {len(milestones)} milestones")
    conn.close()

if __name__ == "__main__":
    enrich_sentiment()
