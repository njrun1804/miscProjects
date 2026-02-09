# Master JSON Export Script Documentation

## Quick Start

```bash
cd /sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron
python3 scripts/export_all_json.py
```

## Overview

The `export_all_json.py` script is a comprehensive, production-ready master export tool that:

- Reads from the Timeline of TRON SQLite database
- Exports 44 different data categories into 63 distinct JSON files
- Exports 4,371 total database records
- Completes in approximately 1 second
- Handles errors gracefully without stopping on failures
- Provides detailed statistics and progress reporting

## File Locations

| Component | Path |
|-----------|------|
| **Script** | `/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/scripts/export_all_json.py` |
| **Database** | `/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db` |
| **Output Dir** | `/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/api/` |
| **Summary Docs** | This directory (README_EXPORT_SCRIPT.md, EXPORT_SCRIPT_SUMMARY.md, EXPORT_FUNCTIONS_LIST.md) |

## Script Details

### Code Statistics
- **Lines**: 886
- **Functions**: 44 export functions
- **Main Sections**: 4 (Core Tables, ECD, Sentiment, Temporal)
- **Error Handling**: Per-function try-catch in main()
- **Status**: Fully implemented (no stubs)

### JSON Output Format
All JSON files use consistent formatting:
```json
{
  "column1": "value1",
  "column2": "value2",
  ...
}
```

Formatting options applied:
- `indent=2` - Human-readable 2-space indentation
- `ensure_ascii=False` - Proper Unicode character encoding
- `encoding='utf-8'` - UTF-8 file encoding

## Export Categories

### 1. Core Table Exports (27 functions → 30 files)

**Basic biographical data:**
- `people.json` (164) - All people with importance scores, categories
- `person.json` (1) - Single biographical record with personal details
- `locations.json` (29) - Locations with coordinates

**Timeline events:**
- `milestones.json` + `milestones_enriched.json` (226 each) - With valence/arousal/dominance
- `awards.json` + `awards_enriched.json` + `awards_categories.json` (51/51/1)
- `quotes.json` (79) - With sentiment and emotion labels
- `career.json` (12) - Career milestones with VADER scores
- `travel.json` (34) - Travel logs with sentiment
- `medical_history.json` + `medical_events.json` (14 each) - Same data, backward compatible

**Contextual data:**
- `life_chapters.json` + `chapter_milestones.json` (19 each)
- `topics.json` (8)
- `turning_points.json` (13)
- `fun_facts.json` (60)
- `traditions.json` (14)
- `streaks.json` (10)
- `epic_numbers.json` (18)
- `sports.json` (26)
- `entertainment.json` (17)
- `wwe_events.json` (16)
- `cruise_detail.json` (6)

**Relational data:**
- `song_person_map.json` + `song_connections.json` (6 each)
- `lj_comments.json` + `lj_commenters.json` (44 + 52)
- `insights.json` + `insights_full.json` (28 each)
- `comebacks.json` (9)

### 2. ECD Community Exports (9 functions → 18 files)

**Core ECD data:**
- `ecd_posts.json` (527) - All posts with sentiment and emotions
- `ecd_players.json` + `ecd_players_v2.json` + `ecd_players_full.json` (128 each)
- `ecd_events.json` + `ecd_events_v2.json` + `ecd_events_full.json` (168 each)
- `ecd_match_results.json` + `ecd_game_results.json` (99 each)

**ECD enriched data:**
- `ecd_awards_v2.json` + `ecd_awards_full.json` (27 each)
- `ecd_rivalries.json` + `ecd_rivalries_full.json` (166 each)
- `ecd_fundraisers.json` + `ecd_fundraisers_full.json` (3 each)
- `ecd_player_years.json` (106)
- `ecd_community_narrative.json` + `ecd_community_phases.json` (21 + 5)

### 3. Sentiment & Emotional Exports (3 functions → 5 files)

- `sentiment_timeline.json` (23) - Year-by-year sentiment trends
- `emotion_distribution.json` (318) - Emotions grouped by year
- `ecd_sentiment.json` + `ecd_sentiment_timeline.json` (21 each)

### 4. Temporal Exports (5 functions → 10 files)

- `year_summary.json` + `year_summaries.json` + `year_deep_dive.json` (23 each)
- `year_keywords.json` (23) - Keywords with TF-IDF scores
- `year_similarity.json` (253) - Year-to-year similarity
- `topic_evolution.json` (184) - Topic trends over time
- `writing_evolution.json` (21) - Writing style metrics

## Key Features

### 1. Smart Data Enrichment
Several functions create enriched versions of data through intelligent queries:

**Chapter Milestones** - Groups milestones by life chapters:
```sql
SELECT lc.*, m.* FROM life_chapters lc
LEFT JOIN milestones m ON m.year BETWEEN lc.start_year AND lc.end_year
```

**ECD Players Full** - Includes player_years data:
```sql
SELECT p.*, COUNT(py.id) as player_years_count
FROM ecd_players p
LEFT JOIN ecd_player_years py ON p.id = py.player_id
GROUP BY p.id
```

**Year Deep Dive** - Comprehensive year analysis:
```sql
SELECT ys.*, COUNT(m.id) as milestone_count, ...
FROM year_summary ys
LEFT JOIN milestones m ON m.year = ys.year
...
```

### 2. Backward Compatibility
Multiple export strategies ensure existing API consumers aren't broken:

- Same data exported with different filenames
  - `medical_history.json` and `medical_events.json`
  - `ecd_game_results.json` and `ecd_match_results.json`

- Version conventions for evolution
  - `ecd_events.json` (standard)
  - `ecd_events_v2.json` (canonical version)
  - `ecd_events_full.json` (with all columns)

### 3. Error Resilience
Each function runs in a try-catch block:
```python
for export_func in export_functions:
    try:
        export_func()
    except Exception as e:
        failed_exports.append(error_msg)
        # Continue with next function
```

A single failed export doesn't stop the entire batch.

### 4. Statistics Tracking
Global statistics collected during execution:
```python
exported_files = {}  # filename -> record count
total_records = 0    # running total
```

Final report shows:
- Total files: 63
- Total records: 4,371
- Per-file breakdown
- Failed exports (if any)

## Database Schema Coverage

The script accesses tables across multiple domains:

### Core Biographical
- `person` (1 comprehensive record)
- `people` (164 people with relationships)
- `locations` (29 places)
- `lj_commenters`, `lj_comments` (community engagement)

### Timeline Events
- `milestones` (226 life events)
- `awards` + `awards_enriched` (51 achievements)
- `quotes` (79 quotations)
- `career` (12 job positions)
- `travel` (34 trips)
- `medical_history` (14 health events)

### ECD Community
- `ecd_posts` (527 posts)
- `ecd_players` (128 participants)
- `ecd_events` (168 events)
- `ecd_match_results` (99 games)
- `ecd_awards_v2` (27 awards)
- `ecd_rivalries` (166 competitive pairs)
- `ecd_player_years` (106 player-year records)

### Analysis & Enrichment
- `milestones` with `valence`, `arousal`, `dominance`
- `awards_enriched` with related milestones
- `year_summary` base data
- `topic_evolution`, `writing_evolution`
- `sentiment_timeline`, `emotion_distribution`

## Running the Script

### Basic Execution
```bash
python3 scripts/export_all_json.py
```

### Expected Output
```
======================================================================
TIMELINE OF TRON - MASTER JSON EXPORT SCRIPT
======================================================================
Database: /sessions/blissful-sleepy-galileo/.../db/tron.db
API Directory: /sessions/blissful-sleepy-galileo/.../db/api
Started: 2026-02-09 01:05:01
======================================================================

[1] Exporting People...
  ✓ people.json (164 records)

[2] Exporting Milestones...
  ✓ milestones.json (226 records)
  ✓ milestones_enriched.json (226 records)

... [continues for 44 functions] ...

======================================================================
EXPORT COMPLETE
======================================================================
Total Files Exported: 63
Total Records: 4371

All exports completed successfully!

Finished: 2026-02-09 01:05:02
======================================================================

Exported Files:
----------------------------------------------------------------------
  awards.json                                  51 records
  awards_categories.json                        1 records
  ... [full list of 63 files] ...
```

## Customization

### To add a new export function:

1. Create function with pattern:
```python
def export_new_table():
    """Export new table"""
    print("\n[N] Exporting New Table...")
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM new_table")
    data = [dict(row) for row in cursor.fetchall()]
    save_json('new_table.json', data)
    
    conn.close()
```

2. Add to export_functions list in main():
```python
export_functions = [
    ...
    export_new_table,
    ...
]
```

### To modify export format:

Edit the `save_json()` function:
```python
def save_json(filename, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        # Change indent, ensure_ascii, etc. here
```

## Performance Notes

- Execution time: ~1 second for 4,371 records
- Database size: 996 KB
- Output size: ~2-3 MB across 63 JSON files
- Memory usage: Minimal (streaming write approach)

For larger databases, consider:
- Pagination of large tables
- Parallel execution of independent exports
- Compression of output files

## Files Included

1. **export_all_json.py** - Main script (886 lines, 44 functions)
2. **EXPORT_SCRIPT_SUMMARY.md** - Overview and design features
3. **EXPORT_FUNCTIONS_LIST.md** - Detailed documentation of each function
4. **README_EXPORT_SCRIPT.md** - This file

## Next Steps

1. Run script on schedule to keep exports fresh
2. Monitor execution time as database grows
3. Consider adding new export functions as schema evolves
4. Optionally implement incremental exports for very large datasets
5. Set up automated archival of historical JSON exports

## Support & Troubleshooting

### If script fails to run:
- Ensure Python 3.6+ is available
- Verify database file exists and is readable
- Check output directory has write permissions
- Review error messages in try-catch blocks

### If a specific export fails:
- Check database table exists: `SELECT * FROM table_name LIMIT 1`
- Verify column names in SQL queries match schema
- Test query in sqlite3 command line
- Add debug print statements to specific function

### If JSON formatting is incorrect:
- Check for non-UTF8 characters in source data
- Verify no circular references or custom objects
- Ensure all values are JSON-serializable (not dates, etc.)

