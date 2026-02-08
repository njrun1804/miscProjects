# Timeline of Tron - Generated JSON API Files

## Overview

This directory contains 15 newly generated JSON API files extracted from the Tron Timeline database. These files represent aggregated, analyzed, and structured data ready for API consumption, visualization, and further analysis.

**Generation Date:** February 8, 2026  
**Source Database:** tron.db  
**Total Files:** 15  
**Total Size:** 212 KB  
**Format:** JSON with 2-space indentation

## Quick File Reference

| # | File | Size | Records | Purpose |
|---|------|------|---------|---------|
| 1 | medical_events.json | 4.6 KB | 15+ | Medical history with sentiment analysis |
| 2 | song_connections.json | 2.2 KB | 10+ | Music-to-person mapping |
| 3 | awards_categories.json | 8.2 KB | 13 cat | Awards grouped by category |
| 4 | location_frequency.json | 5.6 KB | 20+ | Travel destinations with stats |
| 5 | emotion_distribution.json | 1.6 KB | 3 views | Emotional prevalence by period |
| 6 | theme_cloud.json | 13.1 KB | 10+ | Thematic tags from quotes |
| 7 | life_stage_mapping.json | 1.9 KB | 12 | Hero's journey stages |
| 8 | sentiment_by_milestone_type.json | 5.1 KB | 10+ | Sentiment by event category |
| 9 | co_occurrence_strength.json | 16.6 KB | 50+ | Relationship intensity metrics |
| 10 | yearly_sentiment_trend.json | 4.8 KB | 23 | Annual emotional progression |
| 11 | people_by_arc_type.json | 4.5 KB | 50+ | Character categorization |
| 12 | comeback_phases.json | 2.8 KB | 6+ | Medical valleys and peaks |
| 13 | turning_point_impact.json | 33.1 KB | 15+ | Major life events analysis |
| 14 | chapter_milestones.json | 35.8 KB | 12 | Life chapters with milestones |
| 15 | writing_themes_by_year.json | 36.9 KB | 23 | Creative evolution analysis |

## File Descriptions

### 1. medical_events.json
Complete medical history with sentiment analysis.
- **Schema:** Array of event objects
- **Key Fields:** year, event, category, severity, recovery_note, vader_compound, vader_pos, vader_neg
- **Use Case:** Health timeline visualization, sentiment tracking during medical events
- **Sample Query:** All medical history events ordered by year

### 2. song_connections.json
Mapping of songs and artists to people mentioned in the timeline.
- **Schema:** Array of connection objects
- **Key Fields:** song, artist, person, story, year_of_connection
- **Use Case:** Music trivia, theme song identification, person-music correlation
- **Sample Query:** All song-person relationships

### 3. awards_categories.json
Awards organized by category with winners list.
- **Schema:** Object containing categories array
- **Key Fields:** category, count, years[], winners[{winner, year, note}]
- **Use Case:** Achievement tracking, awards history, winner statistics
- **Sample Query:** Awards grouped by category with full winner details

### 4. location_frequency.json
Travel destinations analyzed for frequency and sentiment.
- **Schema:** Array of location objects
- **Key Fields:** destination, visit_count, years[], avg_sentiment, latitude, longitude
- **Use Case:** Travel map visualization, destination preference analysis, location sentiment
- **Sample Query:** Travel grouped by destination with coordinates and sentiment

### 5. emotion_distribution.json
Emotional prevalence across different time periods.
- **Schema:** Object with overall, by_life_stage, and by_decade sections
- **Key Fields:** emotion counts organized in three dimensions
- **Use Case:** Emotional climate analysis, period comparisons, decade trends
- **Sample Query:** Emotion counts from quotes grouped by multiple dimensions

### 6. theme_cloud.json
Thematic tags extracted from quotes with examples.
- **Schema:** Object containing themes array with nested quotes
- **Key Fields:** theme, count, quotes[{quote, year, emotion}]
- **Use Case:** Word cloud generation, thematic analysis, quote sampling
- **Sample Query:** Quotes grouped by theme with full text samples

### 7. life_stage_mapping.json
Hero's journey stages aligned with timeline and metrics.
- **Schema:** Array of life stage objects
- **Key Fields:** stage, stage_number, year_start, year_end, milestone_count, people_count, quote_count, avg_sentiment
- **Use Case:** Narrative structure visualization, story progression tracking
- **Sample Query:** Hero's journey stages with aggregated metrics

### 8. sentiment_by_milestone_type.json
Sentiment patterns categorized by event type.
- **Schema:** Array of category sentiment objects
- **Key Fields:** category, count, avg_sentiment, max_sentiment, min_sentiment, example_positive, example_negative
- **Use Case:** Event sentiment analysis, category comparison, emotional polarity mapping
- **Sample Query:** Milestones grouped by category with sentiment statistics

### 9. co_occurrence_strength.json
Relationship intensity metrics between people.
- **Schema:** Array of relationship pair objects
- **Key Fields:** person_a, person_b, strength, years_together, shared_contexts[], first_year, last_year
- **Use Case:** Relationship network visualization, co-occurrence analysis, connection strength
- **Sample Query:** Co-occurrences ordered by strength with context details

### 10. yearly_sentiment_trend.json
Year-by-year emotional progression.
- **Schema:** Array of annual sentiment objects
- **Key Fields:** year, avg_sentiment, sentiment_change_from_prev, direction, milestone_count, dominant_emotion, intensity_score
- **Use Case:** Sentiment trend visualization, emotional arc tracking, year comparison
- **Sample Query:** Milestones grouped by year with trend analysis

### 11. people_by_arc_type.json
People categorized by narrative presence/span.
- **Schema:** Object containing four arrays: lifers, seasonal, recurring, cameos
- **Key Fields:** name, span, first_year, last_year
- **Categorization:**
  - Lifers: span >= 10 years
  - Seasonal: span 5-9 years
  - Recurring: span 2-4 years
  - Cameos: span 1 year
- **Use Case:** Character classification, narrative role analysis, presence mapping
- **Sample Query:** People categorized by presence span

### 12. comeback_phases.json
Medical challenges with valley-to-peak phase mapping.
- **Schema:** Array of phase objects
- **Key Fields:** phase, year, event, sentiment, gap_to_next_phase_months
- **Use Case:** Recovery journey visualization, medical timeline mapping
- **Sample Query:** Medical comeback pairs expanded into sequential phases

### 13. turning_point_impact.json
Major life events with before/after consequence analysis.
- **Schema:** Array of turning point objects
- **Key Fields:** year, event, type, domain, from_state, to_state, milestones_before[], milestones_after[], sentiment_before, sentiment_after, people_involved[]
- **Use Case:** Critical moment analysis, cause-and-effect mapping, impact assessment
- **Sample Query:** Turning points with surrounding milestone context

### 14. chapter_milestones.json
Life chapters with complete milestone enumeration.
- **Schema:** Array of chapter objects with nested milestones
- **Key Fields:** chapter_number, chapter_name, start_year, end_year, theme, milestones[{year, milestone, sentiment}], milestone_count, avg_sentiment
- **Use Case:** Chapter-based navigation, milestone inventory, chapter sentiment profiling
- **Sample Query:** Life chapters joined with milestones by year range

### 15. writing_themes_by_year.json
Creative evolution with linguistic and topic analysis.
- **Schema:** Array of annual writing analysis objects
- **Key Fields:** year, top_keywords[{keyword, tfidf}], topic_weights[{topic, weight}], writing_stats{grade_level, word_count, vocab_richness}
- **Use Case:** Writing style evolution, topic detection, linguistic analysis
- **Sample Query:** Year keywords, topic evolution, and writing metrics joined by year

## Data Schema Notes

### Common Field Types

**Sentiment Scores:**
- `vader_compound`: Range -1.0 to 1.0 (VADER sentiment analysis)
- `avg_sentiment`, `sentiment_polarity`: Sentiment averages
- `sentiment_change_from_prev`: Year-over-year change

**Temporal Fields:**
- `year`: Integer year (2004-2026)
- `years[]`: Array of year integers
- `first_year`, `last_year`: Year range boundaries

**Relationship Fields:**
- `strength`: Co-occurrence count (integer)
- `span`: Duration in years (integer)
- `years_together`: Number of shared years (integer)

**Statistical Fields:**
- `count`: Integer counts
- `avg_sentiment`, `max_sentiment`, `min_sentiment`: Computed statistics
- `intensity_score`: Absolute sentiment magnitude

## API Usage Examples

### Fetch Yearly Sentiment Trend
```json
GET /api/yearly_sentiment_trend.json
Response: Array of yearly sentiment objects
```

### Get All Awards
```json
GET /api/awards_categories.json
Response: Categorized awards with winners
```

### Relationship Network
```json
GET /api/co_occurrence_strength.json
Response: Person pair relationships with strength metrics
```

## Data Quality

All files have been validated for:
- Valid JSON syntax
- Proper 2-space indentation
- Consistent null handling
- Numeric precision (3-4 decimal places)
- No circular references
- Cross-table consistency

## Database Source

All data originates from the Tron timeline database with queries executed on:
- **Database:** SQLite3
- **Tables Queried:** 30+
- **Total Records Processed:** 1000+
- **Relationship Joins:** 20+

## Update Frequency

These files were generated on **February 8, 2026** from the current database state. To regenerate:

1. Run the Python generation script (generate_json_apis_fixed.py)
2. Update timestamps in this README
3. Commit changes to version control

## File Structure

```
/db/api/
├── medical_events.json
├── song_connections.json
├── awards_categories.json
├── location_frequency.json
├── emotion_distribution.json
├── theme_cloud.json
├── life_stage_mapping.json
├── sentiment_by_milestone_type.json
├── co_occurrence_strength.json
├── yearly_sentiment_trend.json
├── people_by_arc_type.json
├── comeback_phases.json
├── turning_point_impact.json
├── chapter_milestones.json
├── writing_themes_by_year.json
├── README_API_FILES.md (this file)
└── GENERATED_API_FILES.md (detailed manifest)
```

## Support & Documentation

For detailed information:
- See `GENERATED_API_FILES.md` for complete file manifest
- See generation script for query details
- See database schema for table structure

---

**Generated:** 2026-02-08  
**Status:** Production Ready  
**Version:** 1.0
