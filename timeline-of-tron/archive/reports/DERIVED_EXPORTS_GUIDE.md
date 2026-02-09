# TIMELINE OF TRON: DERIVED EXPORTS GUIDE

## Quick Summary

**SECOND EXPORT SCRIPT** creates 47 derived/composite JSON endpoints from the Timeline of Tron database.

**Location**: `/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/scripts/export_derived_json.py`

**Execution**: `python3 export_derived_json.py`

**Results**: 47 JSON files, 8,763 total records, 4.5MB, 100% success rate

---

## EXPORT REFERENCE

### GROUP 1: HERO'S JOURNEY & NARRATIVE (4 exports)

#### 1. `heros_journey_narrative.json` ⭐ RICHEST ENDPOINT
- **Records**: 9 (one per stage)
- **Size**: 212.8KB
- **Structure**: Array of stages, each with:
  - `stage` - Basic stage info (year_start, year_end, description, sentiment, etc.)
  - `milestones` - All milestones in year range
  - `quotes` - All quotes in year range
  - `turning_points` - All turning points in year range
  - `people` - Distinct people active in range
  - `career_milestones` - Career events in range
  - `eras` - Overlapping eras
  - `topic_evolution` - Topic weights over time
- **Use case**: Complete narrative for each life stage
- **Sample data**:
  ```json
  {
    "stage": {...},
    "milestones": [{id, year, milestone, sentiment...}],
    "quotes": [{...}],
    "turning_points": [{...}],
    "people": [{id, name, category, importance_score...}],
    "career_milestones": [{...}],
    "eras": [{...}],
    "topic_evolution": [{year, topic_id, weight}]
  }
  ```

#### 2. `heros_journey.json`
- **Records**: 9
- **Size**: Small
- **Structure**: Simple array of stage objects with basic info
- **Use case**: Quick navigation between hero's journey stages

#### 3. `comeback_narrative.json`
- **Records**: 213
- **Size**: 126.2KB
- **Structure**: Array of comebacks with crisis→recovery arcs
- **Fields**: id, comeback_type, crisis_year/event/sentiment, recovery_year/event/sentiment, gap_months, intensity_shift, narrative
- **Use case**: Analyze how crises were overcome over time

#### 4. `comeback_phases.json`
- **Records**: 1 (object with type keys)
- **Size**: Small
- **Structure**: Comebacks grouped by `comeback_type`
- **Use case**: Filter comebacks by category (health, career, relationship, etc.)

---

### GROUP 2: ERA EXPORTS (1 export)

#### 5. `eras.json`
- **Records**: 23
- **Size**: Small
- **Fields**: id, era_name, start_year, end_year, era_theme, dominant_sentiment, dominant_topics, description
- **Use case**: Understand distinct historical periods

---

### GROUP 3: DERIVED TABLE EXPORTS (11 exports)

#### 7. `year_transitions.json`
- **Records**: 22
- **Fields**: year_from, year_to, sentiment_shift, intensity_shift, is_chapter_boundary, is_turning_point, people_entering/leaving, milestone_count_from/to
- **Use case**: Analyze year-to-year changes
- **Sample**: `{ year_from: 2004, year_to: 2005, sentiment_shift: 0.15, intensity_shift: -2.3, ... }`

#### 8. `parallel_timelines.json`
- **Records**: 104
- **Fields**: year, domain (career/travel/health/social/ecd/creative), event_count, key_event, event_sentiment, intensity
- **Use case**: See what was happening in each life domain by year
- **Sample**:
  ```json
  {
    "year": 2007,
    "domain": "ecd",
    "event_count": 10,
    "key_event": "DODGEBALL 100 record attendance",
    "event_sentiment": 0.75,
    "intensity": 9.2
  }
  ```

#### 9. `turning_points_detailed.json`
- **Records**: 13
- **Size**: Medium
- **Fields**: turning_point_year, event, type, domain, before_sentiment, after_sentiment, sentiment_shift, before/after_people_count, before/after_key_topic, shock_magnitude, recovery_months, narrative_summary
- **Use case**: Understand major life inflection points with detailed before/after analysis
- **Sample**: Car accident (2004): sentiment shift +0.47, people involved increased from 1→3, recovery took 6 months

#### 10. `year_intensity_breakdown.json` + `intensity_heatmap.json`
- **Records**: 23 + heatmap structure
- **Domains**: career_intensity, travel_intensity, health_intensity, social_intensity, ecd_intensity, creative_intensity
- **Use case**: 
  - CSV-like format for analysis: `year_intensity_breakdown.json`
  - Heatmap structure for visualization: `intensity_heatmap.json`
    ```json
    {
      "years": [2004, 2005, ...],
      "domains": ["career_intensity", "travel_intensity", ...],
      "values": [[2.0, 0.0, 6.0, ...], [...], ...]
    }
    ```

#### 11. `milestone_people.json`
- **Records**: 226
- **Fields**: All milestone fields + people_names (array)
- **Use case**: See who was involved in each milestone
- **Sample**: `{ milestone: "Monmouth graduation", people_names: ["Ma", "Dad", "Michael"] }`

#### 12. `travel_medical_correlations.json`
- **Records**: 66
- **Fields**: medical_id, medical_event, medical_year, travel_id, travel_destination, travel_year, correlation_type, months_between
- **Use case**: Find temporal relationships between travel and health events
- **Sample**: Medical event in Jun, travel in Aug → correlation_type: "post_medical_travel"

#### 13. `topic_person_timeline.json` ⭐ LARGEST
- **Records**: 1,232 (!)
- **Size**: 304.4KB
- **Fields**: topic_id, topic_name, person_name, person_id, year, topic_weight, person_mentions, co_strength
- **Use case**: Track which people dominated which topics each year
- **Sample**: John + Topic 5 (ECD) in 2007: 45 mentions, weight 0.89

#### 14. `ecd_rivalry_timeline.json`
- **Records**: 47
- **Fields**: player1, player2, year, matches_count, player1_wins, player2_wins, rivalry_intensity
- **Use case**: Track rivalry evolution by year
- **Sample**: John vs. Diana (2007): 12 matches, John 7 wins, rivalry_intensity 0.92

#### 15. `career_chapter_map.json`
- **Records**: 11
- **Fields**: career_id, chapter_id, career_year, chapter_name, career_title
- **Use case**: Map career positions to story chapters

#### 16. `quote_attribution.json`
- **Records**: 86
- **Fields**: All quote fields + person_name, person_id, attribution_method, confidence
- **Use case**: Trace quotes back to who said them
- **Sample**: Quote + John (confidence 0.95, method: "direct_quote")

#### 17. `expanded_comebacks.json`
- **Records**: 213
- **Fields**: id, comeback_type, crisis_year/event/sentiment, recovery_year/event/sentiment, gap_months, intensity_shift, source_table, narrative
- **Use case**: Detailed comeback database for analysis

---

### GROUP 4: PEOPLE/RELATIONSHIP EXPORTS (10 exports)

#### 18. `people_profiles.json` ⭐ RICH PROFILES
- **Records**: 164
- **Size**: 122.1KB
- **Structure**: Array of person objects, each with:
  - `person` - Full person record
  - `highlights` - Notable moments involving this person
  - `timeline_events` - Chronological events for this person
  - `co_occurrences` - People they co-appear with
- **Use case**: Get everything about one person
- **Sample**:
  ```json
  {
    "person": {id: 1, name: "Ma", importance_score: 257, ...},
    "highlights": [{highlight: "Mother's care during recovery", ...}],
    "timeline_events": [{year: 2005, event_type: "wwe", ...}, ...],
    "co_occurrences": [{person_a: "Ma", person_b: "Dad", count: 15}, ...]
  }
  ```

#### 19. `relationship_constellation.json`
- **Records**: 1
- **Structure**: `{ nodes: [...], links: [...] }`
- **Nodes**: id, name, category, first_year, importance_score
- **Links**: source, target, weight, relationship_type, years_span
- **Use case**: D3/force-directed graph visualization
- **Format**: Perfect for `d3.forceSimulation()`

#### 20. `relationship_graph.json` & `relationship_graph_full.json`
- **Records**: 74 each (same data)
- **Fields**: person_name, connected_to, relationship_type, weight, first_year, last_year, years_span
- **Use case**: Network edge list for graph analysis

#### 21. `co_occurrences.json` & `co_occurrence_strength.json`
- **Records**: 56 each
- **Difference**:
  - `co_occurrences.json`: Full data (person_a, person_b, year, context, co_occurrence_count)
  - `co_occurrence_strength.json`: Simplified (person_a, person_b, strength, year)
- **Use case**: Find who appears together most often

#### 22. `person_arc.json`
- **Records**: 40
- **Fields**: person, first_year, last_year, span, total_mentions, peak_year, peak_mentions
- **Use case**: Understand each person's arc (length, prominence)
- **Analysis**: Used to categorize people as "sustained" (20+ years), "seasonal" (5 years), "regular"

#### 23. `person_timelines.json`
- **Records**: 80
- **Fields**: id, person_name, year, event_description, event_type, category (from people table)
- **Use case**: Chronological events for each person
- **Sample**: "Michael married Maggie (Jun 29)" in year 2010

#### 24. `temporal_network.json`
- **Records**: 21
- **Fields**: year, active_people, new_people, lost_people, network_density, top_person, top_person_mentions
- **Use case**: Network evolution metrics by year

#### 25. `ner_entities.json` ⭐ LARGEST PEOPLE EXPORT
- **Records**: 436
- **Fields**: source_table, source_id, entity_text, entity_label (PERSON, ORG, etc.), year
- **Use case**: Named entity recognition results
- **Sample**: entity_text="Monmouth University", entity_label="ORG"

#### 26. `people_highlights.json`
- **Records**: 46
- **Fields**: person_id, highlight, vader_compound/pos/neg, category
- **Use case**: Notable moments for each person
- **Sample**: "John led DODGEBALL 100 to record attendance"

#### 27. `people_importance_scores.json`
- **Records**: 164
- **Fields**: id, name, category, importance_score, birth_year, peak_year
- **Use case**: Ranked list of most important people
- **Sorted**: importance_score DESC

---

### GROUP 5: COMPOSITE ECD ROOM-LEVEL EXPORTS (8 exports)

#### 28. `ecd_stats_dashboard.json` ⭐ DASHBOARD READY
- **Records**: 1 (composite object)
- **Fields**:
  - `player_count` - 128 total players
  - `event_count` - 168 events
  - `fundraiser_total` - $1,847 raised
  - `top_players` - Top 20 by mentions
  - `top_rivalries` - Top rivalries array
  - `attendance_trends` - Yearly attendance stats
- **Use case**: Dashboard endpoint for ECD statistics
- **Sample**:
  ```json
  {
    "player_count": 128,
    "event_count": 168,
    "fundraiser_total": 1847.0,
    "top_players": [{name: "John", total_mentions: 1362, ...}, ...],
    "top_rivalries": [{player1, player2, matches_count, ...}, ...],
    "attendance_trends": [{year: 2005, event_count: 10, avg_attendance: 32}, ...]
  }
  ```

#### 29. `ecd_highlights.json`
- **Records**: 100
- **Criteria**: High sentiment (compound > 0.5)
- **Fields**: id, title, year, era, post_type, sentiment_label
- **Use case**: Notable ECD moments

#### 30. `ecd_timeline.json`
- **Records**: 168
- **Fields**: All ecd_events_v2 fields
- **Use case**: Complete chronological ECD history

#### 31. `ecd_theme_distribution.json`
- **Records**: 1
- **Structure**: Object with theme keys → post arrays
- **Use case**: Posts grouped by dominant_themes
- **Sample**:
  ```json
  {
    "competition": [{post objects}],
    "humor": [{post objects}],
    "rivalry": [{post objects}],
    ...
  }
  ```

#### 32. `ecd_attendance_trends.json`
- **Records**: 8 (one per year with data)
- **Fields**: year, events, avg_attendance, peak_attendance
- **Use case**: Attendance analytics

#### 33. `ecd_era_summary.json`
- **Records**: 4
- **Fields**: era, event_count, avg_attendance, start_year, end_year
- **Use case**: Period summaries

#### 34. `ecd_player_network.json` ⭐ D3-READY
- **Records**: 1
- **Structure**:
  ```json
  {
    "nodes": [{id, name}, ...],
    "links": [{source, target, weight}, ...]
  }
  ```
- **Use case**: Force-directed graph of player network
- **Perfect for**: `d3.json("ecd_player_network.json")`

#### 35. `ecd_emotion_distribution.json`
- **Records**: 118
- **Fields**: emotion, count, avg_sentiment
- **Use case**: Emotional tone distribution

---

### GROUP 6: ADDITIONAL/MISC EXPORTS (10 exports)

#### 36. `sentiment_by_milestone_type.json`
- **Records**: 16
- **Fields**: category, count, avg_sentiment
- **Use case**: Sentiment analysis by milestone type
- **Sample**: "health" category: 23 milestones, avg_sentiment -0.15

#### 37. `turning_point_impact.json`
- **Records**: 13
- **Same as**: `turning_points_detailed.json` (reference copy)

#### 38. `life_stage_mapping.json`
- **Records**: 1
- **Structure**: `{ "2004": "Ordinary World", "2005": "Ordinary World", ... }`
- **Use case**: Quick year→life_stage lookup

#### 39. `name_aliases.json`
- **Records**: 128
- **Fields**: id, name, nicknames
- **Use case**: Alternative names for ECD players
- **Sample**: "John" → ["KJohn", "The Creation", "Tronolone"]

#### 40. `location_frequency.json`
- **Records**: 29
- **Fields**: destination, frequency
- **Use case**: Travel destination popularity
- **Sorted**: frequency DESC
- **Sample**: "Italy" visited 5 times, "England" 4 times

#### 41. `travel_sentiment_by_location.json`
- **Records**: 29
- **Fields**: destination, count, avg_sentiment
- **Use case**: Sentiment by travel location
- **Analysis**: Which destinations were most/least enjoyable

#### 42. `people_by_arc_type.json`
- **Records**: 1
- **Structure**: Grouped by arc type (sustained/seasonal/regular)
  ```json
  {
    "regular": [{person, span, peak_year, ...}, ...],
    "seasonal": [{...}],
    "sustained": [{...}]
  }
  ```
- **Use case**: Understanding people patterns

#### 43. `theme_cloud.json`
- **Records**: 100
- **Fields**: keyword, frequency (TF-IDF score)
- **Use case**: Word cloud data
- **Sample**: ["john", "tron", "dodgeball", "ecd", ...] sorted by frequency

#### 44. `writing_themes_by_year.json`
- **Records**: 1
- **Structure**: `{ "2004": [{theme, tfidf_score}, ...], "2005": [...], ... }`
- **Use case**: Top themes each year
- **Sample**: Year 2007: "dodgeball" (0.89), "ecd" (0.76), "rivalry" (0.68)

#### 45. `yearly_sentiment_trend.json`
- **Records**: 23
- **Fields**: year, count, avg_sentiment
- **Use case**: Sentiment trend over time
- **Analysis**: Aggregate from milestones + quotes + travel

---

### GROUP 7: METADATA EXPORTS (3 exports)

#### 46. `api_index.json`
- **Records**: 120 (all JSON files)
- **Fields**: filename, size_bytes, record_count
- **Use case**: Discover all available endpoints
- **Sample**:
  ```json
  [
    {filename: "heros_journey.json", size_bytes: 3245, record_count: 9},
    {filename: "people_profiles.json", size_bytes: 125000, record_count: 164},
    ...
  ]
  ```

#### 47. `schema_info.json`
- **Records**: 1
- **Structure**: `{ table_name: { columns: [...], row_count: N }, ... }`
- **Use case**: Understand database structure
- **Sample**: `{ "milestones": { "columns": [{name, type}, ...], "row_count": 226 } }`

#### 48. `data_quality_report.json`
- **Records**: 1
- **Structure**: `{ "generated_at": timestamp, "tables": { ... } }`
- **Table metrics**: Per column: null_count, null_percentage
- **Use case**: Data quality assessment
- **Sample**: "milestones.year: 0 nulls (0%), milestones.milestone: 0 nulls (0%)"

---

## HOW TO USE THESE EXPORTS

### For Frontend/Visualization
- Use `intensity_heatmap.json` for heatmap charts
- Use `ecd_player_network.json` for force-directed graphs
- Use `relationship_constellation.json` for network diagrams
- Use `parallel_timelines.json` for timeline comparisons
- Use `yearly_sentiment_trend.json` for trend charts

### For Analysis/Data Science
- Start with `heros_journey_narrative.json` for complete stage context
- Use `people_profiles.json` for person-centric analysis
- Use `turning_points_detailed.json` for before/after studies
- Use `topic_person_timeline.json` for LDA/topic modeling
- Use `travel_medical_correlations.json` for correlation analysis

### For Content Creation
- Use `heros_journey.json` for story structure
- Use `comeback_narrative.json` for resilience stories
- Use `people_highlights.json` for notable moments
- Use `ecd_timeline.json` for ECD history

### For System Documentation
- Use `schema_info.json` to understand database
- Use `api_index.json` to see all endpoints
- Use `data_quality_report.json` to understand data issues

---

## PERFORMANCE & SIZE

| Metric | Value |
|--------|-------|
| Total Derived Exports | 47 |
| Total Records | 8,763 |
| Total Size | 4.5MB |
| Largest File | topic_person_timeline.json (304KB, 1,232 records) |
| Smallest File | Multiple metadata/summary files (1-2KB) |
| JSON Format | Pretty-printed (indent=2, UTF-8) |

---

## TECHNICAL NOTES

### Database Connection
```python
DB_PATH = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/tron.db'
API_DIR = '/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/api'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row  # Enable dict-like access
```

### JSON Export Function
```python
def save_json(filename, data, label=""):
    filepath = os.path.join(API_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    count = len(data) if isinstance(data, list) else 1
    print(f"  >> {filename} ({count} records)")
```

### Export Categories
```python
# Main export categories
exports = [
    ("Hero's Journey Narrative", export_heros_journey_narrative),
    ("People Profiles", export_people_profiles),
    ("ECD Stats Dashboard", export_ecd_stats_dashboard),
    # ... 44 more ...
]
```

---

## RUNNING THE SCRIPT

```bash
cd /sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/scripts
python3 export_derived_json.py
```

**Output**: 47 status lines + summary
**Time**: ~10-30 seconds
**Result**: All files in `/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/api/`

---

## FILE LOCATIONS

All exports available at:
```
/sessions/blissful-sleepy-galileo/mnt/Projects/miscProjects/timeline-of-tron/db/api/
```

Specific high-value files:
- `heros_journey_narrative.json` - Complete narrative
- `people_profiles.json` - Person-centric data
- `ecd_stats_dashboard.json` - Dashboard metrics
- `topic_person_timeline.json` - Largest dataset
- `intensity_heatmap.json` - Visualization-ready
- `ecd_player_network.json` - Graph-ready

---

## INTEGRATION NOTES

These exports are designed to work together:
- Start with `api_index.json` to discover endpoints
- Use `schema_info.json` to understand relationships
- Pick specific exports based on your use case
- Combine exports for richer analysis

Example: Person-centric dashboard
1. Get person from `people_importance_scores.json`
2. Load full profile from `people_profiles.json`
3. Get relationship network from `relationship_constellation.json`
4. View timeline from `person_timelines.json`

