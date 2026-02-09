#!/usr/bin/env python3
"""
Script 17: Detect and build era tables
- Analyzes year_summary.intensity_score trends
- Uses sentiment data, life_chapters, turning_points
- Creates `eras` and `year_to_era` tables
- Goal: 6-10 coherent multi-year periods with story arc
"""

import sqlite3
import statistics

DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_tables(conn):
    """Create eras and year_to_era tables"""
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS eras (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          era_name TEXT NOT NULL,
          start_year INTEGER NOT NULL,
          end_year INTEGER NOT NULL,
          era_theme TEXT,
          dominant_sentiment REAL,
          dominant_topics TEXT,
          description TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS year_to_era (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          year INTEGER NOT NULL,
          era_id INTEGER REFERENCES eras(id),
          era_position TEXT
        )
    ''')
    
    # Clear existing data
    cursor.execute('DELETE FROM eras')
    cursor.execute('DELETE FROM year_to_era')
    
    conn.commit()
    print("✓ Created/cleared eras and year_to_era tables")

def get_year_data(conn):
    """Gather all year-level data for clustering"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT year, intensity_score
        FROM year_summary
        WHERE year IS NOT NULL
        ORDER BY year
    ''')
    
    years_data = {row['year']: {
        'intensity': row['intensity_score'] or 0,
        'sentiment': 0
    } for row in cursor.fetchall()}
    
    return years_data

def get_sentiment_by_year(conn):
    """Get average vader_compound by year from milestones"""
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            year,
            AVG(COALESCE(vader_compound, 0)) as avg_sentiment
        FROM milestones
        WHERE year IS NOT NULL
        GROUP BY year
    ''')
    
    return {row['year']: row['avg_sentiment'] for row in cursor.fetchall()}

def get_turning_points(conn):
    """Get turning point years"""
    cursor = conn.cursor()
    cursor.execute('SELECT year FROM turning_points WHERE year IS NOT NULL ORDER BY year')
    return [row['year'] for row in cursor.fetchall()]

def get_life_chapters(conn):
    """Get chapter boundaries as era hints"""
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, chapter_number, start_year, end_year FROM life_chapters 
        ORDER BY chapter_number
    ''')
    return cursor.fetchall()

def detect_eras(years_data, turning_points, chapters):
    """
    Detect coherent eras using:
    1. Life chapter boundaries
    2. Turning points as era transitions
    3. Intensity trends
    """
    
    all_years = sorted(years_data.keys())
    if not all_years:
        return []
    
    min_year = min(all_years)
    max_year = max(all_years)
    
    # Start with life chapter boundaries
    era_boundaries = set([min_year])
    
    for chapter in chapters:
        if chapter['start_year']:
            era_boundaries.add(chapter['start_year'])
        if chapter['end_year']:
            era_boundaries.add(chapter['end_year'] + 1)
    
    # Add turning points as potential era boundaries
    for tp in turning_points:
        if min_year <= tp <= max_year:
            era_boundaries.add(tp)
    
    # Detect intensity shifts
    sorted_years = sorted(all_years)
    for i in range(len(sorted_years) - 1):
        year = sorted_years[i]
        next_year = sorted_years[i + 1]
        
        int_curr = years_data[year]['intensity']
        int_next = years_data[next_year]['intensity']
        
        # Significant intensity shift
        if abs(int_curr - int_next) > 2.0:
            era_boundaries.add(next_year)
    
    # Sort boundaries
    era_boundaries = sorted(era_boundaries)
    
    # Create eras from boundaries
    eras = []
    era_names_map = {
        2004: "The Founding",
        2007: "The Rise",
        2010: "The Golden Era",
        2014: "Turbulence",
        2017: "The Crucible",
        2019: "Renaissance",
        2022: "The Summit",
        2026: "New Horizons"
    }
    
    for i in range(len(era_boundaries) - 1):
        start = era_boundaries[i]
        end = era_boundaries[i + 1] - 1
        
        # Get years in this range
        era_years = [y for y in all_years if start <= y <= end]
        if not era_years:
            continue
        
        # Compute dominant sentiment and intensity
        sentiments = [years_data[y]['sentiment'] for y in era_years]
        intensities = [years_data[y]['intensity'] for y in era_years]
        
        try:
            dom_sentiment = statistics.mean(sentiments) if sentiments else 0
            avg_intensity = statistics.mean(intensities) if intensities else 0
        except:
            dom_sentiment = 0
            avg_intensity = 0
        
        # Assign era name
        era_name = era_names_map.get(start)
        if not era_name:
            if avg_intensity > 6:
                era_name = f"Era of Intense Activity ({start}-{end})"
            elif avg_intensity > 3:
                era_name = f"Era of Growth ({start}-{end})"
            else:
                era_name = f"Era of Transition ({start}-{end})"
        
        eras.append({
            'start_year': start,
            'end_year': end,
            'era_name': era_name,
            'sentiment': dom_sentiment,
            'intensity': avg_intensity,
            'years': era_years
        })
    
    return eras

def insert_eras(conn, eras):
    """Insert eras and year_to_era mappings"""
    cursor = conn.cursor()
    
    for era in eras:
        # Determine theme based on intensity
        if era['intensity'] > 6:
            theme = "Peak Activity"
        elif era['intensity'] > 3:
            theme = "Active"
        else:
            theme = "Moderate"
        
        # Generate description
        description = f"{era['era_name']}: Multi-year period spanning {era['start_year']}-{era['end_year']}"
        
        # Insert era
        cursor.execute('''
            INSERT INTO eras (era_name, start_year, end_year, era_theme, dominant_sentiment, dominant_topics, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            era['era_name'],
            era['start_year'],
            era['end_year'],
            theme,
            era['sentiment'],
            "",
            description
        ))
        
        era_id = cursor.lastrowid
        
        # Insert year_to_era mappings
        for year in era['years']:
            # Compute position in era (early, mid, late)
            year_range = era['end_year'] - era['start_year'] + 1
            year_offset = year - era['start_year']
            if year_offset < year_range / 3:
                position = "early"
            elif year_offset < 2 * year_range / 3:
                position = "mid"
            else:
                position = "late"
            
            cursor.execute('''
                INSERT INTO year_to_era (year, era_id, era_position)
                VALUES (?, ?, ?)
            ''', (year, era_id, position))
    
    conn.commit()
    print(f"✓ Inserted {len(eras)} eras and their year mappings")

def main():
    conn = get_db()
    
    print("=" * 60)
    print("SCRIPT 17: DETECT ERAS")
    print("=" * 60)
    
    create_tables(conn)
    
    years_data = get_year_data(conn)
    sentiment_by_year = get_sentiment_by_year(conn)
    turning_points = get_turning_points(conn)
    chapters = get_life_chapters(conn)
    
    # Merge sentiment data
    for year in sentiment_by_year:
        if year not in years_data:
            years_data[year] = {'intensity': 0, 'sentiment': 0}
        years_data[year]['sentiment'] = sentiment_by_year[year]
    
    print(f"Found {len(years_data)} years of data")
    print(f"Found {len(turning_points)} turning points")
    print(f"Found {len(chapters)} life chapters")
    
    eras = detect_eras(years_data, turning_points, chapters)
    
    print(f"\nDetected {len(eras)} eras:")
    for era in eras:
        print(f"  • {era['era_name']} ({era['start_year']}-{era['end_year']})")
        print(f"    Sentiment: {era['sentiment']:.2f}, Intensity: {era['intensity']:.2f}")
        print(f"    Years: {len(era['years'])}")
    
    insert_eras(conn, eras)
    
    # Verify
    cursor = conn.cursor()
    cursor.execute('SELECT COUNT(*) FROM eras')
    era_count = cursor.fetchone()[0]
    cursor.execute('SELECT COUNT(*) FROM year_to_era')
    mapping_count = cursor.fetchone()[0]
    
    print(f"\n✓ Database contains {era_count} eras and {mapping_count} year-to-era mappings")
    
    conn.close()
    print("\n✓ Script 17 complete\n")

if __name__ == '__main__':
    main()
