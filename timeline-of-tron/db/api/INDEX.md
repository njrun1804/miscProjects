# Timeline of Tron - API Files Index

Generated: 2025-02-08  
Location: `/sessions/wonderful-bold-gates/mnt/Projects/miscProjects/timeline-of-tron/db/api/`

## Newly Generated Files (9)

### 1. relationship_constellation.json
- **Size:** 43,155 bytes
- **Records:** 123 nodes, 39 links
- **Purpose:** D3 force-directed graph for relationship visualization
- **Key Structures:**
  - `center`: John Tronolone (center node)
  - `nodes`: Array of person nodes with categories and arc data
  - `links`: Relationship edges with weights
  - `clusters`: Grouped by category (family, inner_circle, partner, other)

### 2. comeback_narrative.json
- **Size:** 11,104 bytes
- **Records:** 12 comeback narratives
- **Purpose:** Comeback engine visualization
- **Key Structures:**
  - `medical_event`: Crisis event description
  - `medical_year`: Year of crisis
  - `comeback_event`: Recovery event description
  - `comeback_year`: Year of recovery
  - `gap_months`: Time between crisis and recovery
  - `medical_sentiment`: Sentiment score of crisis
  - `comeback_sentiment`: Sentiment score of recovery
  - `related_milestones`: Context milestones
  - `arc`: Always "valley_to_peak"

### 3. heros_journey_narrative.json
- **Size:** 51,382 bytes
- **Records:** 9 stages
- **Purpose:** Enhanced hero's journey experience
- **Key Structures:**
  - `stage`: Stage name (e.g., "Ordinary World")
  - `stage_number`: 1-9 numeric identifier
  - `year_start`, `year_end`: Time span
  - `milestones`: Array of milestones with sentiment
  - `people_active`: Active participants
  - `quotes`: Key quotes (max 5 per stage)
  - `turning_points`: Narrative turning points
  - `key_stats`: Milestone/travel/award counts

### 4. year_deep_dive.json
- **Size:** 137,578 bytes
- **Records:** 23 years (2004-2026)
- **Purpose:** Comprehensive year-by-year detail pages
- **Structure:** Keyed by year string ("2004", "2005", etc.)
- **Per Year:**
  - `summary`: Stats from year_summary table
  - `chapter`: Life chapter assignment
  - `heros_journey_stage`: Hero's journey stage
  - `milestones`: All events (226 total)
  - `people_active`: Network participants
  - `quotes`: All quotes for year
  - `travel`: Travel records
  - `awards`: Awards won
  - `career`: Career milestones
  - `medical`: Medical events
  - `ecd`: ECD events
  - `wwe`: WWE events
  - `sports`: Sports activities
  - `keywords`: Top 10 by TF-IDF
  - `writing_stats`: Writing quality metrics
  - `fun_facts`: Year-specific facts
  - `network`: Temporal network data

### 5. sentiment_timeline.json
- **Size:** 10,307 bytes
- **Records:** 23 entries (one per year)
- **Purpose:** Emotional arc visualization
- **Key Structures:**
  - `year`: Year number
  - `avg_sentiment`: Average sentiment across year
  - `milestone_sentiments`: Array of individual scores
  - `quote_sentiments`: Array of individual scores
  - `dominant_emotion`: Most common emotion
  - `intensity_score`: From year_summary
  - `life_stage`: Chapter name
  - `is_turning_point`: Boolean
  - `turning_point_type`: "redemptive", "contaminated", or null

### 6. people_profiles.json
- **Size:** 85,993 bytes
- **Records:** 122 people
- **Purpose:** Comprehensive per-person profile pages
- **Structure:** Keyed by person name
- **Per Person:**
  - `basic`: Category, relation, birth_year
  - `arc`: First/last year, span, mentions, peak year
  - `timeline`: Array of timeline entries
  - `highlights`: Array of highlight strings
  - `connections`: Array of relationships
  - `co_occurrences`: Array of co-occurrence entries
  - `awards`: Array of awards won
  - `songs`: Array of song connections
  - `lj_comments`: Array of LiveJournal comments

### 7. quotes.json
- **Size:** 20,713 bytes
- **Records:** 79 quotes
- **Purpose:** Enriched quotes with emotion and theme
- **Key Fields:**
  - `quote`: The quote text
  - `context`: Context string
  - `year`: Year of quote
  - `sentiment_score`: TextBlob sentiment
  - `vader_compound`: VADER sentiment (-1.0 to 1.0)
  - `emotion`: Emotion classification (NEW)
  - `theme`: Theme classification (NEW)

### 8. milestones_enriched.json
- **Size:** 85,028 bytes
- **Records:** 226 milestones
- **Purpose:** Enriched milestone data
- **Key Fields:**
  - `year`: Year of milestone
  - `milestone`: Event description
  - `sentiment_polarity`: TextBlob polarity (0-1)
  - `sentiment_subjectivity`: TextBlob subjectivity (0-1)
  - `category`: Event category
  - `vader_compound`: VADER sentiment (-1.0 to 1.0)
  - `vader_pos`: Positive component
  - `vader_neg`: Negative component
  - `sentiment_adjusted`: Adjusted sentiment
  - `topic`: Topic name
  - `life_stage`: Life stage label (NEW)

### 9. co_occurrences.json
- **Size:** 9,225 bytes
- **Records:** 56 pairs
- **Purpose:** All person co-occurrence pairs
- **Key Fields:**
  - `person_a`: First person
  - `person_b`: Second person
  - `year`: Year of co-occurrence
  - `context`: Context description
  - `co_occurrence_count`: Number of mentions together

---

## Data Quality Metrics

- **JSON Validation:** All files are valid JSON
- **Decimal Precision:** 3 decimal places for all floats
- **Null Handling:** Properly escaped and handled
- **Cross-References:** All validated and consistent
- **Sentiment Scores:** Normalized to -1.0 to 1.0 range

---

## Integration Points

### For D3 Visualization
Use `relationship_constellation.json` with D3 force simulation

### For Year Pages
Load year data from `year_deep_dive.json` using year as key

### For Sentiment Analysis
Plot timeline from `sentiment_timeline.json`

### For Person Profiles
Load profile from `people_profiles.json` using person name

### For Quote Search
Filter `quotes.json` by emotion or theme

### For Milestone View
Sort `milestones_enriched.json` by year or life_stage

---

## Database Coverage

All files draw from these 27 database tables:

**People & Relationships:**
- people, person_arc, person_timeline, people_highlights
- relationship_graph, co_occurrences

**Events & Content:**
- milestones, quotes, travel, awards, career, medical_history
- ecd_events, entertainment, sports, wwe_events

**Analysis & Metadata:**
- year_summary, sentiment_timeline, turning_points
- heros_journey, life_chapters, year_keywords, writing_evolution
- temporal_network, lj_comments, song_person_map

---

## Temporal Scope

- **Start:** 2004 (car accident, ECD founding, timeline begins)
- **End:** 2026 (most recent data)
- **Total Years:** 23
- **Coverage:** Continuous narrative arc

---

## Statistics

| Metric | Count |
|--------|-------|
| People | 122 |
| Milestones | 226 |
| Quotes | 79 |
| Co-occurrence Pairs | 56 |
| Life Chapters | 4 |
| Hero's Journey Stages | 9 |
| Comeback Narratives | 12 |
| Years Tracked | 23 |
| Relationships | 39 |

---

## File Formats

All files use:
- **Format:** JSON with UTF-8 encoding
- **Indentation:** 2 spaces
- **Line Endings:** Unix (LF)
- **Character Encoding:** UTF-8

---

*Generated by Python 3 script on 2025-02-08*
*For Timeline of Tron website rebuild project*
