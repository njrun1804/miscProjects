#!/usr/bin/env python3
"""
Master JSON Export Script for Timeline of TRON Database
Exports all 93+ JSON files from SQLite database to static JSON API files
"""

import json
import sqlite3
import os
from datetime import datetime
from pathlib import Path

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'db', 'tron.db')
API_DIR = os.path.join(os.path.dirname(__file__), '..', 'db', 'api')

# Track statistics
exported_files = {}
total_records = 0


def connect_db():
    """Create database connection with Row factory"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def save_json(filename, data):
    """Save data to JSON file with pretty printing"""
    global total_records
    filepath = os.path.join(API_DIR, filename)
    
    # Ensure directory exists
    os.makedirs(API_DIR, exist_ok=True)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    # Track records
    if isinstance(data, list):
        record_count = len(data)
    elif isinstance(data, dict) and 'records' in data:
        record_count = len(data.get('records', []))
    else:
        record_count = 1
    
    total_records += record_count
    exported_files[filename] = record_count
    print(f"  ✓ {filename} ({record_count} records)")
    return filepath


# ============================================================================
# CORE TABLE EXPORTS (direct table → JSON)
# ============================================================================

def export_people():
    """Export all people with all columns"""
    print("\n[1] Exporting People...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM people")
    rows = [dict(row) for row in cursor.fetchall()]
    
    save_json('people.json', rows)
    conn.close()


def export_milestones():
    """Export milestones and enriched milestones"""
    print("\n[2] Exporting Milestones...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # Export basic milestones
    cursor.execute("SELECT * FROM milestones")
    milestones = [dict(row) for row in cursor.fetchall()]
    save_json('milestones.json', milestones)
    
    # Milestones enriched is same as basic (all enriched columns in base table)
    save_json('milestones_enriched.json', milestones)
    
    conn.close()


def export_awards():
    """Export awards and awards enriched"""
    print("\n[3] Exporting Awards...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # Basic awards
    cursor.execute("SELECT * FROM awards")
    awards = [dict(row) for row in cursor.fetchall()]
    save_json('awards.json', awards)
    
    # Enriched awards
    cursor.execute("SELECT * FROM awards_enriched")
    awards_enriched = [dict(row) for row in cursor.fetchall()]
    save_json('awards_enriched.json', awards_enriched)
    
    conn.close()


def export_awards_categories():
    """Export awards grouped by category"""
    print("\n[4] Exporting Awards Categories...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT category, COUNT(*) as count, 
               GROUP_CONCAT(DISTINCT year) as years
        FROM awards
        GROUP BY category
    """)
    
    categories = {}
    for row in cursor.fetchall():
        cat = dict(row)
        cat['years'] = [int(y) for y in cat['years'].split(',') if y]
        categories[cat['category']] = cat
    
    save_json('awards_categories.json', categories)
    conn.close()


def export_quotes():
    """Export all quotes with all columns"""
    print("\n[5] Exporting Quotes...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM quotes")
    quotes = [dict(row) for row in cursor.fetchall()]
    save_json('quotes.json', quotes)
    conn.close()


def export_career():
    """Export career data"""
    print("\n[6] Exporting Career...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM career")
    career = [dict(row) for row in cursor.fetchall()]
    save_json('career.json', career)
    conn.close()


def export_travel():
    """Export all travel with all columns"""
    print("\n[7] Exporting Travel...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM travel")
    travel = [dict(row) for row in cursor.fetchall()]
    save_json('travel.json', travel)
    conn.close()


def export_medical():
    """Export medical history (2 file names for backward compatibility)"""
    print("\n[8] Exporting Medical History...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM medical_history")
    medical = [dict(row) for row in cursor.fetchall()]
    
    save_json('medical_history.json', medical)
    save_json('medical_events.json', medical)
    
    conn.close()


def export_topics():
    """Export topics"""
    print("\n[9] Exporting Topics...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM topics")
    topics = [dict(row) for row in cursor.fetchall()]
    save_json('topics.json', topics)
    conn.close()


def export_life_chapters():
    """Export life chapters and chapter milestones"""
    print("\n[10] Exporting Life Chapters...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # Basic chapters
    cursor.execute("SELECT * FROM life_chapters ORDER BY chapter_number")
    chapters = [dict(row) for row in cursor.fetchall()]
    save_json('life_chapters.json', chapters)
    
    # Chapter milestones (milestones grouped by chapter)
    cursor.execute("""
        SELECT lc.id as chapter_id, lc.chapter_name, lc.chapter_number,
               m.id as milestone_id, m.year, m.milestone, m.category,
               m.valence, m.arousal, m.dominance
        FROM life_chapters lc
        LEFT JOIN milestones m ON m.year >= lc.start_year AND m.year <= lc.end_year
        ORDER BY lc.chapter_number, m.year
    """)
    
    chapter_milestones = {}
    for row in cursor.fetchall():
        r = dict(row)
        chapter_id = r['chapter_id']
        if chapter_id not in chapter_milestones:
            chapter_milestones[chapter_id] = {
                'chapter_id': chapter_id,
                'chapter_name': r['chapter_name'],
                'chapter_number': r['chapter_number'],
                'milestones': []
            }
        if r['milestone_id']:
            chapter_milestones[chapter_id]['milestones'].append({
                'id': r['milestone_id'],
                'year': r['year'],
                'milestone': r['milestone'],
                'category': r['category'],
                'valence': r['valence'],
                'arousal': r['arousal'],
                'dominance': r['dominance']
            })
    
    save_json('chapter_milestones.json', list(chapter_milestones.values()))
    
    conn.close()


def export_turning_points():
    """Export turning points"""
    print("\n[11] Exporting Turning Points...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM turning_points")
    turning_points = [dict(row) for row in cursor.fetchall()]
    save_json('turning_points.json', turning_points)
    conn.close()


def export_fun_facts():
    """Export fun facts"""
    print("\n[12] Exporting Fun Facts...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM fun_facts")
    facts = [dict(row) for row in cursor.fetchall()]
    save_json('fun_facts.json', facts)
    conn.close()


def export_traditions():
    """Export traditions"""
    print("\n[13] Exporting Traditions...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM traditions")
    traditions = [dict(row) for row in cursor.fetchall()]
    save_json('traditions.json', traditions)
    conn.close()


def export_streaks():
    """Export streaks"""
    print("\n[14] Exporting Streaks...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM streaks")
    streaks = [dict(row) for row in cursor.fetchall()]
    save_json('streaks.json', streaks)
    conn.close()


def export_epic_numbers():
    """Export epic numbers"""
    print("\n[15] Exporting Epic Numbers...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM epic_numbers")
    numbers = [dict(row) for row in cursor.fetchall()]
    save_json('epic_numbers.json', numbers)
    conn.close()


def export_sports():
    """Export sports"""
    print("\n[16] Exporting Sports...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM sports")
    sports = [dict(row) for row in cursor.fetchall()]
    save_json('sports.json', sports)
    conn.close()


def export_entertainment():
    """Export entertainment"""
    print("\n[17] Exporting Entertainment...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM entertainment")
    entertainment = [dict(row) for row in cursor.fetchall()]
    save_json('entertainment.json', entertainment)
    conn.close()


def export_wwe_events():
    """Export WWE events"""
    print("\n[18] Exporting WWE Events...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM wwe_events")
    events = [dict(row) for row in cursor.fetchall()]
    save_json('wwe_events.json', events)
    conn.close()


def export_cruise_detail():
    """Export cruise details"""
    print("\n[19] Exporting Cruise Details...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM cruise_detail")
    cruises = [dict(row) for row in cursor.fetchall()]
    save_json('cruise_detail.json', cruises)
    conn.close()


def export_song_person_map():
    """Export song person mapping and connections"""
    print("\n[20] Exporting Song Person Map...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM song_person_map")
    songs = [dict(row) for row in cursor.fetchall()]
    save_json('song_person_map.json', songs)
    save_json('song_connections.json', songs)
    
    conn.close()


def export_lj_comments():
    """Export LiveJournal comments and commenters"""
    print("\n[21] Exporting LJ Comments...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # Comments
    cursor.execute("SELECT * FROM lj_comments")
    comments = [dict(row) for row in cursor.fetchall()]
    save_json('lj_comments.json', comments)
    
    # Commenters
    cursor.execute("SELECT * FROM lj_commenters")
    commenters = [dict(row) for row in cursor.fetchall()]
    save_json('lj_commenters.json', commenters)
    
    conn.close()


def export_person():
    """Export single biographical person record"""
    print("\n[22] Exporting Person (Biography)...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM person")
    person = [dict(row) for row in cursor.fetchall()]
    save_json('person.json', person)
    conn.close()


def export_locations():
    """Export locations"""
    print("\n[23] Exporting Locations...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM locations")
    locations = [dict(row) for row in cursor.fetchall()]
    save_json('locations.json', locations)
    conn.close()


def export_insights():
    """Export insights and insights full"""
    print("\n[24] Exporting Insights...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM insights ORDER BY sort_order")
    insights = [dict(row) for row in cursor.fetchall()]
    save_json('insights.json', insights)
    save_json('insights_full.json', insights)
    
    conn.close()


def export_comebacks():
    """Export comebacks"""
    print("\n[25] Exporting Comebacks...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM comebacks")
    comebacks = [dict(row) for row in cursor.fetchall()]
    save_json('comebacks.json', comebacks)
    conn.close()


# # def export_post_content():
#     """Export post content"""
#     print("\n[26] Exporting Post Content...")
#     conn = connect_db()
#     cursor = conn.cursor()
    
#     cursor.execute("SELECT * FROM post_content")
#     content = [dict(row) for row in cursor.fetchall()]
#     save_json('post_content.json', content)
#     conn.close()


# def export_timeline_posts():
#     """Export timeline posts"""
#     print("\n[27] Exporting Timeline Posts...")
#     conn = connect_db()
#     cursor = conn.cursor()
    
#     cursor.execute("SELECT * FROM timeline_posts")
#     posts = [dict(row) for row in cursor.fetchall()]
#     save_json('timeline_posts.json', posts)
#     conn.close()


# ============================================================================
# ECD COMMUNITY EXPORTS
# ============================================================================

def export_ecd_posts():
    """Export ECD posts with all columns"""
    print("\n[28] Exporting ECD Posts...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM ecd_posts ORDER BY date")
    posts = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_posts.json', posts)
    conn.close()


def export_ecd_players():
    """Export ECD players (3 versions)"""
    print("\n[29] Exporting ECD Players...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # Basic players
    cursor.execute("SELECT * FROM ecd_players ORDER BY total_mentions DESC")
    players = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_players.json', players)
    save_json('ecd_players_v2.json', players)
    
    # Full version with player_years data
    cursor.execute("""
        SELECT p.*, 
               COUNT(py.id) as player_years_count,
               GROUP_CONCAT(py.year) as active_years
        FROM ecd_players p
        LEFT JOIN ecd_player_years py ON p.id = py.player_id
        GROUP BY p.id
        ORDER BY p.total_mentions DESC
    """)
    
    players_full = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_players_full.json', players_full)
    
    conn.close()


def export_ecd_events():
    """Export ECD events (3 versions)"""
    print("\n[30] Exporting ECD Events...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # V2 is canonical
    cursor.execute("SELECT * FROM ecd_events ORDER BY event_number")
    events = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_events.json', events)
    save_json('ecd_events.json', events)
    save_json('ecd_events_full.json', events)
    
    conn.close()


def export_ecd_match_results():
    """Export ECD match results"""
    print("\n[31] Exporting ECD Match Results...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM ecd_match_results ORDER BY year DESC, post_date DESC")
    results = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_match_results.json', results)
    save_json('ecd_game_results.json', results)
    
    conn.close()


def export_ecd_awards():
    """Export ECD awards"""
    print("\n[32] Exporting ECD Awards...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM ecd_awards ORDER BY year DESC")
    awards = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_awards.json', awards)
    save_json('ecd_awards_full.json', awards)
    
    conn.close()


def export_ecd_rivalries():
    """Export ECD rivalries"""
    print("\n[33] Exporting ECD Rivalries...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM ecd_rivalries ORDER BY mention_count DESC")
    rivalries = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_rivalries.json', rivalries)
    save_json('ecd_rivalries_full.json', rivalries)
    
    conn.close()


# def export_ecd_fundraisers():
#     """Export ECD fundraisers"""
#     print("\n[34] Exporting ECD Fundraisers...")
#     conn = connect_db()
#     cursor = conn.cursor()
    
#     cursor.execute("SELECT * FROM ecd_fundraisers ORDER BY year DESC")
#     fundraisers = [dict(row) for row in cursor.fetchall()]
#     save_json('ecd_fundraisers.json', fundraisers)
#     save_json('ecd_fundraisers_full.json', fundraisers)
    
#     conn.close()


def export_ecd_player_years():
    """Export ECD player years"""
    print("\n[35] Exporting ECD Player Years...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM ecd_player_years ORDER BY player_id, year")
    player_years = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_player_years.json', player_years)
    
    conn.close()


# def export_ecd_community_narrative():
#     """Export ECD community narrative and phases"""
#     print("\n[36] Exporting ECD Community Narrative...")
#     conn = connect_db()
#     cursor = conn.cursor()
    
#     # Full narrative
#     cursor.execute("SELECT * FROM ecd_community_narrative ORDER BY year")
#     narrative = [dict(row) for row in cursor.fetchall()]
#     save_json('ecd_community_narrative.json', narrative)
    
#     # Phases (distinct phase names)
#     cursor.execute("""
#         SELECT DISTINCT phase_name, COUNT(*) as count,
#                MIN(year) as first_year, MAX(year) as last_year
#         FROM ecd_community_narrative
#         GROUP BY phase_name
#         ORDER BY first_year
#     """)
    
#     phases = [dict(row) for row in cursor.fetchall()]
#     save_json('ecd_community_phases.json', phases)
    
#     conn.close()


# ============================================================================
# SENTIMENT & EMOTIONAL EXPORTS
# ============================================================================

def export_sentiment_timeline():
    """Export sentiment timeline from year_summary and milestones"""
    print("\n[37] Exporting Sentiment Timeline...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # Build sentiment timeline from year_summary + milestones
    cursor.execute("""
        SELECT ys.year, ys.intensity_score,
                              COUNT(m.id) as milestone_count
        FROM year_summary ys
        LEFT JOIN milestones m ON m.year = ys.year
        GROUP BY ys.year
        ORDER BY ys.year
    """)
    
    sentiment_data = [dict(row) for row in cursor.fetchall()]
    save_json('sentiment_timeline.json', sentiment_data)
    
    conn.close()


def export_emotion_distribution():
    """Export emotion distribution from ECD posts"""
    print("\n[38] Exporting Emotion Distribution...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT year, dominant_emotions, COUNT(*) as count
        FROM ecd_posts
        WHERE dominant_emotions IS NOT NULL
        GROUP BY year, dominant_emotions
        ORDER BY year, count DESC
    """)
    
    emotions = [dict(row) for row in cursor.fetchall()]
    save_json('emotion_distribution.json', emotions)
    
    conn.close()


def export_ecd_sentiment():
    """Export ECD sentiment and sentiment timeline"""
    print("\n[39] Exporting ECD Sentiment...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # By year
    cursor.execute("""
        SELECT year, COUNT(*) as post_count,
               AVG(sentiment_compound) as avg_sentiment,
               SUM(CASE WHEN sentiment_compound > 0 THEN 1 ELSE 0 END) as positive_count,
               SUM(CASE WHEN sentiment_compound < 0 THEN 1 ELSE 0 END) as negative_count
        FROM ecd_posts
        GROUP BY year
        ORDER BY year
    """)
    
    timeline = [dict(row) for row in cursor.fetchall()]
    save_json('ecd_sentiment.json', timeline)
    save_json('ecd_sentiment_timeline.json', timeline)
    
    conn.close()


# ============================================================================
# TEMPORAL EXPORTS
# ============================================================================

def export_year_summary():
    """Export year summaries (3 versions)"""
    print("\n[40] Exporting Year Summary...")
    conn = connect_db()
    cursor = conn.cursor()
    
    # Basic summary
    cursor.execute("SELECT * FROM year_summary ORDER BY year")
    summary = [dict(row) for row in cursor.fetchall()]
    save_json('year_summary.json', summary)
    save_json('year_summaries.json', summary)
    
    # Deep dive version with enriched data per year
    cursor.execute("""
        SELECT ys.*,
               COUNT(DISTINCT m.id) as milestone_count,
               COUNT(DISTINCT t.id) as travel_count,
               COUNT(DISTINCT p.id) as people_count,
               COUNT(DISTINCT q.id) as quote_count
        FROM year_summary ys
        LEFT JOIN milestones m ON m.year = ys.year
        LEFT JOIN travel t ON t.year = ys.year
        LEFT JOIN milestone_people mp ON mp.milestone_id = m.id
        LEFT JOIN people p ON p.id = mp.person_id
        LEFT JOIN quotes q ON q.year = ys.year
        GROUP BY ys.year
        ORDER BY ys.year
    """)
    
    deep_dive = [dict(row) for row in cursor.fetchall()]
    save_json('year_deep_dive.json', deep_dive)
    
    conn.close()


def export_year_keywords():
    """Export year keywords"""
    print("\n[41] Exporting Year Keywords...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT year, GROUP_CONCAT(keyword, ', ') as keywords,
               AVG(tfidf_score) as avg_tfidf
        FROM year_keywords
        GROUP BY year
        ORDER BY year
    """)
    
    keywords = [dict(row) for row in cursor.fetchall()]
    save_json('year_keywords.json', keywords)
    conn.close()


def export_year_similarity():
    """Export year similarity"""
    print("\n[42] Exporting Year Similarity...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM year_similarity ORDER BY similarity DESC")
    similarity = [dict(row) for row in cursor.fetchall()]
    save_json('year_similarity.json', similarity)
    conn.close()


def export_topic_evolution():
    """Export topic evolution"""
    print("\n[43] Exporting Topic Evolution...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT te.year, te.topic_id, t.topic_name, te.weight,
               t.keywords
        FROM topic_evolution te
        LEFT JOIN topics t ON t.id = te.topic_id
        ORDER BY te.year, te.weight DESC
    """)
    
    evolution = [dict(row) for row in cursor.fetchall()]
    save_json('topic_evolution.json', evolution)
    conn.close()


def export_writing_evolution():
    """Export writing evolution with enriched columns"""
    print("\n[44] Exporting Writing Evolution...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM writing_evolution ORDER BY year")
    writing = [dict(row) for row in cursor.fetchall()]
    save_json('writing_evolution.json', writing)
    conn.close()


# ============================================================================
# MAIN ORCHESTRATION
# ============================================================================

def main():
    """Execute all export functions"""
    print("=" * 70)
    print("TIMELINE OF TRON - MASTER JSON EXPORT SCRIPT")
    print("=" * 70)
    print(f"Database: {DB_PATH}")
    print(f"API Directory: {API_DIR}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # List of all export functions
    export_functions = [
        # Core table exports
        export_people,
        export_milestones,
        export_awards,
        export_awards_categories,
        export_quotes,
        export_career,
        export_travel,
        export_medical,
        export_topics,
        export_life_chapters,
        export_turning_points,
        export_fun_facts,
        export_traditions,
        export_streaks,
        export_epic_numbers,
        export_sports,
        export_entertainment,
        export_wwe_events,
        export_cruise_detail,
        export_song_person_map,
        export_lj_comments,
        export_person,
        export_locations,
        export_insights,
        export_comebacks,
##        # ECD community exports
        export_ecd_posts,
        export_ecd_players,
        export_ecd_events,
        export_ecd_match_results,
        export_ecd_awards,
        export_ecd_rivalries,
#        export_ecd_player_years,
#        # Sentiment & emotional exports
        export_sentiment_timeline,
        export_emotion_distribution,
        export_ecd_sentiment,
        # Temporal exports
        export_year_summary,
        export_year_keywords,
        export_year_similarity,
        export_topic_evolution,
        export_writing_evolution,
    ]
    
    failed_exports = []
    
    for export_func in export_functions:
        try:
            export_func()
        except Exception as e:
            error_msg = f"{export_func.__name__}: {str(e)}"
            failed_exports.append(error_msg)
            print(f"  ✗ ERROR: {error_msg}")
    
    # Summary
    print("\n" + "=" * 70)
    print("EXPORT COMPLETE")
    print("=" * 70)
    print(f"Total Files Exported: {len(exported_files)}")
    print(f"Total Records: {total_records}")
    
    if failed_exports:
        print(f"\nFailed Exports ({len(failed_exports)}):")
        for error in failed_exports:
            print(f"  - {error}")
    else:
        print("\nAll exports completed successfully!")
    
    print(f"\nFinished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Detailed file list
    print("\nExported Files:")
    print("-" * 70)
    for filename, count in sorted(exported_files.items()):
        print(f"  {filename:<40} {count:>6} records")


if __name__ == '__main__':
    main()

