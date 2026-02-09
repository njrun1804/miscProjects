#!/usr/bin/env python3
"""
SECOND EXPORT SCRIPT: Derived/Composite JSON Exports
Handles joins across multiple tables, complex aggregations, narrative building.
"""

import sqlite3
import json
import os
from collections import defaultdict
from datetime import datetime

DB_PATH = os.environ.get('TRON_DB_PATH', os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db'))
API_DIR = os.environ.get('TRON_API_DIR', os.path.join(os.path.dirname(__file__), '..', 'db', 'api'))

def get_connection():
    """Get database connection with Row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def save_json(filename, data, label=""):
    """Save JSON with pretty printing."""
    filepath = os.path.join(API_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    count = len(data) if isinstance(data, list) else 1
    print(f"  >> {filename} ({count} records)")

# ============================================================================
# HERO'S JOURNEY & NARRATIVE EXPORTS (1-4)
# ============================================================================

def export_heros_journey_narrative():
    """Richest endpoint with stages, milestones, quotes, people, career, eras."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Get all hero's journey stages
    cur.execute("SELECT * FROM heros_journey ORDER BY year_start")
    stages = [dict(row) for row in cur.fetchall()]
    
    result = []
    for stage in stages:
        stage_year_start = stage['year_start']
        stage_year_end = stage['year_end']
        
        # Get milestones in this year range
        cur.execute("""
            SELECT * FROM milestones 
            WHERE year BETWEEN ? AND ?
            ORDER BY year
        """, (stage_year_start, stage_year_end))
        milestones = [dict(row) for row in cur.fetchall()]
        
        # Get quotes from this stage
        cur.execute("""
            SELECT * FROM quotes 
            WHERE year BETWEEN ? AND ?
            ORDER BY year
        """, (stage_year_start, stage_year_end))
        quotes = [dict(row) for row in cur.fetchall()]
        
        # Get turning points
        cur.execute("""
            SELECT * FROM turning_points 
            WHERE year BETWEEN ? AND ?
            ORDER BY year
        """, (stage_year_start, stage_year_end))
        turning_points = [dict(row) for row in cur.fetchall()]
        
        # Get people active in this stage
        cur.execute("""
            SELECT DISTINCT p.* FROM people p
            JOIN person_timeline pt ON p.name = pt.person_name
            WHERE pt.year BETWEEN ? AND ?
            ORDER BY p.importance_score DESC
        """, (stage_year_start, stage_year_end))
        people = [dict(row) for row in cur.fetchall()]
        
        # Get career milestones
        cur.execute("""
            SELECT * FROM career 
            WHERE year BETWEEN ? AND ?
            ORDER BY year
        """, (stage_year_start, stage_year_end))
        career = [dict(row) for row in cur.fetchall()]
        
        # Get era info
        cur.execute("""
            SELECT * FROM eras 
            WHERE start_year <= ? AND end_year >= ?
        """, (stage_year_end, stage_year_start))
        eras = [dict(row) for row in cur.fetchall()]
        
        # Get topic evolution
        cur.execute("""
            SELECT * FROM topic_evolution 
            WHERE year BETWEEN ? AND ?
            ORDER BY year
        """, (stage_year_start, stage_year_end))
        topics = [dict(row) for row in cur.fetchall()]
        
        result.append({
            "stage": dict(stage),
            "milestones": milestones,
            "quotes": quotes,
            "turning_points": turning_points,
            "people": people,
            "career_milestones": career,
            "eras": eras,
            "topic_evolution": topics
        })
    
    conn.close()
    save_json('heros_journey_narrative.json', result)

def export_heros_journey():
    """Simpler version: just stages with basic info."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM heros_journey ORDER BY year_start")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('heros_journey.json', data)

def export_comeback_narrative():
    """Comeback arcs with crisis→recovery structure."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Get comebacks
    cur.execute("SELECT * FROM expanded_comebacks ORDER BY crisis_year")
    comebacks = [dict(row) for row in cur.fetchall()]
    
    result = []
    for comeback in comebacks:
        comeback_id = comeback['id']
        
        # Get paired medical info if available
        cur.execute("""
            SELECT * FROM medical_comeback_pairs 
            WHERE id = ?
        """, (comeback_id,))
        medical = [dict(row) for row in cur.fetchall()]
        
        result.append({
            "comeback": comeback,
            "medical_context": medical
        })
    
    conn.close()
    save_json('comeback_narrative.json', result)

def export_comeback_phases():
    """Group comebacks by type."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM expanded_comebacks ORDER BY comeback_type, crisis_year")
    comebacks = [dict(row) for row in cur.fetchall()]
    
    # Group by type
    grouped = defaultdict(list)
    for c in comebacks:
        grouped[c['comeback_type']].append(c)
    
    result = {k: v for k, v in sorted(grouped.items())}
    
    conn.close()
    save_json('comeback_phases.json', result)

# ============================================================================
# ERA EXPORTS (5)
# ============================================================================

def export_eras():
    """All eras with themes and descriptions."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM eras ORDER BY start_year")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('eras.json', data)

# ============================================================================
# DERIVED TABLE EXPORTS (7-17)
# ============================================================================

def export_year_transitions():
    """Year transitions from derived table."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM year_transitions ORDER BY year_from")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('year_transitions.json', data)

def export_parallel_timelines():
    """Parallel timelines from derived table."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM parallel_timelines ORDER BY year")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('parallel_timelines.json', data)

def export_turning_point_analysis():
    """Detailed turning points with before/after."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM turning_point_analysis ORDER BY turning_point_year")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('turning_points_detailed.json', data)

def export_year_intensity_breakdown():
    """Year intensity with separate heatmap structure."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM year_intensity_breakdown ORDER BY year")
    rows = [dict(row) for row in cur.fetchall()]
    
    # Save main file
    save_json('year_intensity_breakdown.json', rows)
    
    # Create heatmap structure - extract domain names from column names
    domains = ['career_intensity', 'travel_intensity', 'health_intensity', 
               'social_intensity', 'ecd_intensity', 'creative_intensity']
    years = sorted(set(r['year'] for r in rows))
    
    # Build value matrix
    intensity_map = {}
    for row in rows:
        for domain in domains:
            intensity_map[(row['year'], domain)] = row.get(domain, 0)
    
    values = [
        [intensity_map.get((year, domain), 0) for domain in domains]
        for year in years
    ]
    
    heatmap = {
        "years": years,
        "domains": domains,
        "values": values
    }
    
    save_json('intensity_heatmap.json', heatmap)
    
    conn.close()

def export_milestone_people():
    """Milestones with people involved."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT m.*, GROUP_CONCAT(mp.person_name, '|') as people_names
        FROM milestones m
        LEFT JOIN milestone_people mp ON m.id = mp.milestone_id
        GROUP BY m.id
        ORDER BY m.year
    """)
    rows = cur.fetchall()
    data = []
    for row in rows:
        item = dict(row)
        if item.get('people_names'):
            item['people_names'] = item['people_names'].split('|')
        else:
            item['people_names'] = []
        data.append(item)
    
    conn.close()
    save_json('milestone_people.json', data)

def export_travel_medical_correlations():
    """Correlations between travel and medical events."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM travel_medical_correlations")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('travel_medical_correlations.json', data)

def export_topic_person_timeline():
    """Topics by person over time."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT * FROM topic_person_timeline
        ORDER BY year, person_name
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('topic_person_timeline.json', data)

def export_ecd_rivalry_timeline():
    """ECD rivalries over time."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM ecd_rivalry_timeline ORDER BY year")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('ecd_rivalry_timeline.json', data)

def export_career_chapter_map():
    """Career chapters with detailed mapping."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT * FROM career_chapter_map ORDER BY career_year
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('career_chapter_map.json', data)

def export_quote_attribution():
    """Quotes with attribution details."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT q.*, qa.person_name, qa.person_id, qa.attribution_method, qa.confidence
        FROM quotes q
        LEFT JOIN quote_attribution qa ON q.id = qa.quote_id
        ORDER BY q.year
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('quote_attribution.json', data)

def export_expanded_comebacks():
    """All expanded comebacks."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM expanded_comebacks ORDER BY crisis_year")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('expanded_comebacks.json', data)

# ============================================================================
# PEOPLE/RELATIONSHIP EXPORTS (18-27)
# ============================================================================

def export_people_profiles():
    """Rich people profiles with context."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM people ORDER BY importance_score DESC")
    people = [dict(row) for row in cur.fetchall()]
    
    result = []
    for person in people:
        person_id = person['id']
        person_name = person['name']
        
        # Get highlights
        cur.execute("SELECT * FROM people_highlights WHERE person_id = ?", (person_id,))
        highlights = [dict(row) for row in cur.fetchall()]
        
        # Get timeline events
        cur.execute("SELECT * FROM person_timeline WHERE person_name = ? ORDER BY year", (person_name,))
        timeline = [dict(row) for row in cur.fetchall()]
        
        # Get co-occurrences
        cur.execute("""
            SELECT co.* FROM co_occurrences co
            WHERE co.person_a = ? OR co.person_b = ?
        """, (person_name, person_name))
        co_occurs = [dict(row) for row in cur.fetchall()]
        
        profile = {
            "person": person,
            "highlights": highlights,
            "timeline_events": timeline,
            "co_occurrences": co_occurs
        }
        result.append(profile)
    
    conn.close()
    save_json('people_profiles.json', result)

def export_relationship_constellation():
    """Relationship graph as constellation."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Get all people as nodes
    cur.execute("""
        SELECT id, name, category, 
               0 as first_year,
               importance_score
        FROM people
        ORDER BY importance_score DESC
    """)
    nodes = []
    for row in cur.fetchall():
        nodes.append({
            "id": row['id'],
            "name": row['name'],
            "category": row['category'],
            "first_year": row['first_year'],
            "importance_score": row['importance_score']
        })
    
    # Get relationship graph as links
    cur.execute("SELECT * FROM relationship_graph")
    links = []
    for row in cur.fetchall():
        links.append({
            "source": row['person_name'],
            "target": row['connected_to'],
            "weight": row['weight'],
            "relationship_type": row['relationship_type'],
            "years_span": row['years_span']
        })
    
    constellation = {
        "nodes": nodes,
        "links": links
    }
    
    conn.close()
    save_json('relationship_constellation.json', constellation)

def export_relationship_graph():
    """Main and full versions of relationship graph."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM relationship_graph")
    data = [dict(row) for row in cur.fetchall()]
    
    save_json('relationship_graph.json', data)
    save_json('relationship_graph_full.json', data)
    
    conn.close()

def export_co_occurrences():
    """Co-occurrence data in two formats."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM co_occurrences ORDER BY co_occurrence_count DESC")
    data = [dict(row) for row in cur.fetchall()]
    
    save_json('co_occurrences.json', data)
    
    # Create strength variant (simplified)
    strength_data = [
        {
            "person_a": d['person_a'],
            "person_b": d['person_b'],
            "strength": d.get('co_occurrence_count', 0),
            "year": d.get('year')
        }
        for d in data
    ]
    save_json('co_occurrence_strength.json', strength_data)
    
    conn.close()

def export_person_arc():
    """Person arc patterns."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM person_arc ORDER BY person")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('person_arc.json', data)

def export_person_timelines():
    """All person timeline events."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT pt.*, p.category
        FROM person_timeline pt
        LEFT JOIN people p ON pt.person_name = p.name
        ORDER BY pt.year, pt.person_name
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('person_timelines.json', data)

def export_temporal_network():
    """Temporal network data."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM temporal_network ORDER BY year")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('temporal_network.json', data)

def export_ner_entities():
    """Named entity recognition entities."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM ner_entities ORDER BY entity_label, entity_text")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('ner_entities.json', data)

def export_people_highlights():
    """People highlights from table."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT ph.*, p.category
        FROM people_highlights ph
        JOIN people p ON ph.person_id = p.id
        ORDER BY p.importance_score DESC
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('people_highlights.json', data)

def export_people_importance():
    """Ranked importance scores."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, name, category, importance_score,
               peak_year
        FROM people
        ORDER BY importance_score DESC
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('people_importance_scores.json', data)

# ============================================================================
# COMPOSITE ROOM-LEVEL EXPORTS (28-35)
# ============================================================================

def export_ecd_stats_dashboard():
    """ECD composite dashboard."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Player count
    cur.execute("SELECT COUNT(*) as count FROM ecd_players")
    player_count = cur.fetchone()['count']
    
    # Event count
    cur.execute("SELECT COUNT(*) as count FROM ecd_events")
    event_count = cur.fetchone()['count']
    
    # Top players
    cur.execute("""
        SELECT * FROM ecd_players
        ORDER BY total_mentions DESC
        LIMIT 20
    """)
    top_players = [dict(row) for row in cur.fetchall()]
    
    # Top rivalries
    cur.execute("""
        SELECT * FROM ecd_rivalry_timeline
        ORDER BY year DESC
        LIMIT 50
    """)
    top_rivalries = [dict(row) for row in cur.fetchall()]
    
    # Fundraiser total (table dropped — was 100% empty)
    fundraiser_total = 0

    # Attendance trends — count ALL events per year, not just those with attendance
    cur.execute("""
        SELECT year, COUNT(*) as event_count,
               AVG(CASE WHEN attendance IS NOT NULL THEN attendance END) as avg_attendance
        FROM ecd_events
        WHERE year IS NOT NULL
        GROUP BY year
        ORDER BY year
    """)
    attendance = [dict(row) for row in cur.fetchall()]
    
    dashboard = {
        "player_count": player_count,
        "event_count": event_count,
        "fundraiser_total": fundraiser_total,
        "top_players": top_players,
        "top_rivalries": top_rivalries,
        "attendance_trends": attendance
    }
    
    conn.close()
    save_json('ecd_stats_dashboard.json', dashboard)

def export_ecd_highlights():
    """ECD notable moments - from posts with high sentiment."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, title, year, era, post_type
        FROM ecd_posts
        WHERE sentiment_compound > 0.5
        ORDER BY year DESC
        LIMIT 100
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('ecd_highlights.json', data)

def export_ecd_timeline():
    """ECD chronological events."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT * FROM ecd_events
        ORDER BY year, date
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('ecd_timeline.json', data)

def export_ecd_theme_distribution():
    """ECD themes grouped."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM ecd_posts ORDER BY year")
    posts = [dict(row) for row in cur.fetchall()]
    
    # Group by dominant_themes
    themes = defaultdict(list)
    for post in posts:
        theme_str = post.get('dominant_themes', 'unknown')
        if theme_str:
            for theme in theme_str.split('|'):
                themes[theme.strip()].append(post)
        else:
            themes['unknown'].append(post)
    
    result = {k: v for k, v in sorted(themes.items())}
    
    conn.close()
    save_json('ecd_theme_distribution.json', result)

def export_ecd_attendance_trends():
    """ECD attendance over time — counts ALL events per year, not just those with attendance data."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT year, COUNT(*) as events,
               AVG(CASE WHEN attendance IS NOT NULL THEN attendance END) as avg_attendance,
               MAX(attendance) as peak_attendance
        FROM ecd_events
        WHERE year IS NOT NULL
        GROUP BY year
        ORDER BY year
    """)
    data = [dict(row) for row in cur.fetchall()]

    conn.close()
    save_json('ecd_attendance_trends.json', data)

def export_ecd_era_summary():
    """ECD era summaries."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT era, COUNT(*) as event_count, AVG(attendance) as avg_attendance,
               MIN(year) as start_year, MAX(year) as end_year
        FROM ecd_events
        WHERE era IS NOT NULL
        GROUP BY era
        ORDER BY start_year
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('ecd_era_summary.json', data)

def export_ecd_player_network():
    """ECD player network D3-ready."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Nodes from players
    cur.execute("""
        SELECT id, name FROM ecd_players
        ORDER BY total_mentions DESC
    """)
    nodes = [
        {
            "id": row['id'],
            "name": row['name']
        }
        for row in cur.fetchall()
    ]
    
    # Links from rivalries
    cur.execute("""
        SELECT player1, player2, mention_count as weight
        FROM ecd_rivalries
        ORDER BY mention_count DESC
    """)
    links = [
        {
            "source": row['player1'],
            "target": row['player2'],
            "weight": row['weight']
        }
        for row in cur.fetchall()
    ]
    
    network = {
        "nodes": nodes,
        "links": links
    }
    
    conn.close()
    save_json('ecd_player_network.json', network)

def export_ecd_emotion_distribution():
    """ECD emotion sentiment."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT dominant_emotions as emotion, COUNT(*) as count, 
               AVG(sentiment_compound) as avg_sentiment
        FROM ecd_posts
        WHERE dominant_emotions IS NOT NULL
        GROUP BY dominant_emotions
        ORDER BY count DESC
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('ecd_emotion_distribution.json', data)

# ============================================================================
# ADDITIONAL/MISC EXPORTS (36-45)
# ============================================================================

def export_sentiment_by_milestone_type():
    """Average sentiment per milestone category."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT category, COUNT(*) as count
        FROM milestones
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('sentiment_by_milestone_type.json', data)

def export_turning_point_impact():
    """Turning point impact analysis."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM turning_point_analysis ORDER BY turning_point_year")
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('turning_point_impact.json', data)

def export_life_stage_mapping():
    """Year to life stage mapping."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT year, life_stage
        FROM milestones
        WHERE life_stage IS NOT NULL
        GROUP BY year
        ORDER BY year
    """)
    rows = cur.fetchall()
    data = {row['year']: row['life_stage'] for row in rows}
    
    conn.close()
    save_json('life_stage_mapping.json', data)

def export_name_aliases():
    """Name aliases from ECD players."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, name, nicknames
        FROM ecd_players
        WHERE nicknames IS NOT NULL
        ORDER BY name
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('name_aliases.json', data)

def export_location_frequency():
    """Travel destination frequency."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT destination, COUNT(*) as frequency
        FROM travel
        GROUP BY destination
        ORDER BY frequency DESC
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('location_frequency.json', data)

def export_travel_sentiment_by_location():
    """Travel sentiment by destination."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT destination, COUNT(*) as count
        FROM travel
        GROUP BY destination
        ORDER BY count DESC
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('travel_sentiment_by_location.json', data)

def export_people_by_arc_type():
    """People grouped by arc pattern."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT person, first_year, last_year, span, peak_year
        FROM person_arc
        ORDER BY span DESC
    """)
    rows = [dict(row) for row in cur.fetchall()]
    
    # Group by span (arc type)
    grouped = defaultdict(list)
    for row in rows:
        arc_type = "sustained" if row['span'] > 20 else "seasonal" if row['span'] < 5 else "regular"
        grouped[arc_type].append(row)
    
    result = {k: v for k, v in sorted(grouped.items())}
    
    conn.close()
    save_json('people_by_arc_type.json', result)

def export_theme_cloud():
    """Word cloud data from keywords."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT keyword, tfidf_score as frequency
        FROM year_keywords
        WHERE keyword IS NOT NULL
        ORDER BY tfidf_score DESC
        LIMIT 100
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('theme_cloud.json', data)

def export_writing_themes_by_year():
    """Writing themes by year."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT year, keyword as theme, tfidf_score
        FROM year_keywords
        WHERE keyword IS NOT NULL
        ORDER BY year, tfidf_score DESC
    """)
    rows = [dict(row) for row in cur.fetchall()]
    
    # Group by year
    grouped = defaultdict(list)
    for row in rows:
        grouped[row['year']].append(row)
    
    result = {str(k): v for k, v in sorted(grouped.items())}
    
    conn.close()
    save_json('writing_themes_by_year.json', result)

def export_yearly_sentiment_trend():
    """Sentiment trend over years."""
    conn = get_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT year, COUNT(*) as count
        FROM (
            SELECT year, vader_compound FROM milestones
            UNION ALL
            SELECT year, vader_compound FROM quotes
            UNION ALL
            SELECT year, vader_compound FROM travel
        )
        WHERE vader_compound IS NOT NULL
        GROUP BY year
        ORDER BY year
    """)
    data = [dict(row) for row in cur.fetchall()]
    
    conn.close()
    save_json('yearly_sentiment_trend.json', data)

# ============================================================================
# METADATA EXPORTS (46-48)
# ============================================================================

def export_api_index():
    """Index of all JSON files."""
    conn = get_connection()
    cur = conn.cursor()
    
    files = []
    if os.path.exists(API_DIR):
        for filename in sorted(os.listdir(API_DIR)):
            filepath = os.path.join(API_DIR, filename)
            if filename.endswith('.json'):
                size = os.path.getsize(filepath)
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    count = len(data) if isinstance(data, list) else 1
                files.append({
                    "filename": filename,
                    "size_bytes": size,
                    "record_count": count
                })
    
    conn.close()
    save_json('api_index.json', files)

def export_schema_info():
    """Database schema information."""
    conn = get_connection()
    cur = conn.cursor()
    
    # Get all tables
    cur.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
    """)
    tables = [row['name'] for row in cur.fetchall()]
    
    schema = {}
    for table in tables:
        # Get columns
        cur.execute(f"PRAGMA table_info({table})")
        columns = [dict(row) for row in cur.fetchall()]
        
        # Get row count
        cur.execute(f"SELECT COUNT(*) as count FROM {table}")
        count = cur.fetchone()['count']
        
        schema[table] = {
            "columns": columns,
            "row_count": count
        }
    
    conn.close()
    save_json('schema_info.json', schema)

def export_data_quality_report():
    """Data quality metrics."""
    conn = get_connection()
    cur = conn.cursor()
    
    report = {
        "generated_at": datetime.now().isoformat(),
        "tables": {}
    }
    
    # Analyze each table
    cur.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
    """)
    tables = [row['name'] for row in cur.fetchall()]
    
    for table in tables:
        cur.execute(f"PRAGMA table_info({table})")
        columns = {row['name']: row['type'] for row in cur.fetchall()}
        
        table_report = {}
        for col_name in columns:
            cur.execute(f"""
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN {col_name} IS NULL THEN 1 ELSE 0 END) as null_count
                FROM {table}
            """)
            result = cur.fetchone()
            total = result['total']
            nulls = result['null_count'] or 0
            
            if total > 0:
                null_pct = (nulls / total) * 100
            else:
                null_pct = 0
            
            table_report[col_name] = {
                "type": columns[col_name],
                "null_count": nulls,
                "null_percentage": round(null_pct, 2)
            }
        
        report["tables"][table] = table_report
    
    conn.close()
    save_json('data_quality_report.json', report)

# ============================================================================
# MAIN
# ============================================================================

def main():
    """Run all exports."""
    print("=" * 70)
    print("SECOND EXPORT: DERIVED/COMPOSITE JSON EXPORTS")
    print("=" * 70)
    
    # Ensure API directory exists
    os.makedirs(API_DIR, exist_ok=True)
    
    exports = [
        # Hero's Journey & Narrative (1-4)
        ("Hero's Journey Narrative", export_heros_journey_narrative),
        ("Hero's Journey", export_heros_journey),
        ("Comeback Narrative", export_comeback_narrative),
        ("Comeback Phases", export_comeback_phases),
        
        # Era (5)
        ("Eras", export_eras),
        
        # Derived Tables (7-17)
        ("Year Transitions", export_year_transitions),
        ("Parallel Timelines", export_parallel_timelines),
        ("Turning Point Analysis", export_turning_point_analysis),
        ("Year Intensity Breakdown", export_year_intensity_breakdown),
        ("Milestone People", export_milestone_people),
        ("Travel Medical Correlations", export_travel_medical_correlations),
        ("Topic Person Timeline", export_topic_person_timeline),
        ("ECD Rivalry Timeline", export_ecd_rivalry_timeline),
        ("Career Chapter Map", export_career_chapter_map),
        ("Quote Attribution", export_quote_attribution),
        ("Expanded Comebacks", export_expanded_comebacks),
        
        # People/Relationships (18-27)
        ("People Profiles", export_people_profiles),
        ("Relationship Constellation", export_relationship_constellation),
        ("Relationship Graph", export_relationship_graph),
        ("Co-Occurrences", export_co_occurrences),
        ("Person Arc", export_person_arc),
        ("Person Timelines", export_person_timelines),
        ("Temporal Network", export_temporal_network),
        ("NER Entities", export_ner_entities),
        ("People Highlights", export_people_highlights),
        ("People Importance", export_people_importance),
        
        # ECD Room Level (28-35)
        ("ECD Stats Dashboard", export_ecd_stats_dashboard),
        ("ECD Highlights", export_ecd_highlights),
        ("ECD Timeline", export_ecd_timeline),
        ("ECD Theme Distribution", export_ecd_theme_distribution),
        ("ECD Attendance Trends", export_ecd_attendance_trends),
        ("ECD Era Summary", export_ecd_era_summary),
        ("ECD Player Network", export_ecd_player_network),
        ("ECD Emotion Distribution", export_ecd_emotion_distribution),
        
        # Misc (36-45)
        ("Sentiment by Milestone Type", export_sentiment_by_milestone_type),
        ("Turning Point Impact", export_turning_point_impact),
        ("Life Stage Mapping", export_life_stage_mapping),
        ("Name Aliases", export_name_aliases),
        ("Location Frequency", export_location_frequency),
        ("Travel Sentiment by Location", export_travel_sentiment_by_location),
        ("People by Arc Type", export_people_by_arc_type),
        ("Theme Cloud", export_theme_cloud),
        ("Writing Themes by Year", export_writing_themes_by_year),
        ("Yearly Sentiment Trend", export_yearly_sentiment_trend),
        
        # Metadata (46-48)
        ("API Index", export_api_index),
        ("Schema Info", export_schema_info),
        ("Data Quality Report", export_data_quality_report),
    ]
    
    success = 0
    failed = 0
    
    for label, export_func in exports:
        try:
            print(f"\n[{label}]")
            export_func()
            success += 1
        except Exception as e:
            print(f"  ERROR: {e}")
            failed += 1
    
    print("\n" + "=" * 70)
    print(f"SUMMARY: {success} succeeded, {failed} failed")
    print("=" * 70)

if __name__ == '__main__':
    main()
