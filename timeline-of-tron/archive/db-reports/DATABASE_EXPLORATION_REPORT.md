# tron.db — Data Exploration Report

*Generated: February 9, 2026*

---

## Overview

The database is a **personal timeline** tracking the life story of one individual across **51 tables** and roughly **4,000 total rows**. It spans from approximately 1997 to 2026, with the densest coverage from 2004–2025. The data combines hand-curated life events with scraped content from an East Coast Dodgeball (ECD) community blog, enriched with NLP-derived features (VADER sentiment, TF-IDF keywords, NER entities, topic modeling).

---

## Schema Architecture

The tables fall into six logical domains:

### 1. Core Life Timeline
| Table | Rows | Grain | Purpose |
|-------|------|-------|---------|
| `person` | 1 | The subject | Biographical profile (birthday, school, GPA, home) |
| `milestones` | 226 | One milestone per event | Life events categorized by topic, sentiment-scored |
| `year_summary` | 23 | One row per year | Aggregate counts of events, travel, people per year |
| `life_chapters` | 19 | One chapter period | Named life phases with start/end years and themes |
| `heros_journey` | 9 | Journey stage | Joseph Campbell narrative arc mapping |
| `turning_points` | 13 | One turning point | Major life direction changes with before/after states |
| `career` | 12 | One career event | Jobs and promotions with sentiment |

### 2. People & Relationships
| Table | Rows | Grain | Purpose |
|-------|------|-------|---------|
| `people` | 165 | One person | Names with category (inner circle, ECD player, etc.) |
| `people_highlights` | 46 | One highlight | Notable moments per person |
| `person_arc` | 40 | One person | When each person appeared/peaked in the timeline |
| `person_timeline` | 80 | Person + year + event | Events tied to specific people |
| `relationship_graph` | 74 | One edge | Network graph with weights and time spans |
| `co_occurrences` | 56 | Person pair + year | People mentioned together in the same context |
| `temporal_network` | 21 | One year | Network-level metrics (density, churn) per year |

### 3. East Coast Dodgeball (ECD)
| Table | Rows | Grain | Purpose |
|-------|------|-------|---------|
| `ecd_posts` | 527 | One blog post | Scraped posts with sentiment, themes, emotions |
| `ecd_events_v2` | 168 | One event | Events with attendance, match counts, eras |
| `ecd_players` | 128 | One player | Player stats: wins, losses, mentions, HOF status |
| `ecd_match_results` | 99 | One match | Winner/loser with scores |
| `ecd_rivalries` | 166 | Player pair | Rivalry mention counts and contexts |
| `ecd_awards_v2` | 27 | One award | Awards given at ECD events |
| `ecd_fundraisers` | 3 | One fundraiser | Charity fundraiser events |
| `ecd_events` | 19 | One event | Earlier, smaller version of events (likely superseded) |

### 4. NLP & Text Analysis
| Table | Rows | Grain | Purpose |
|-------|------|-------|---------|
| `ner_entities` | 438 | One extracted entity | Named entities (PERSON, ORG, DATE) from milestones/facts |
| `topics` | 8 | One topic | LDA topic model labels and keywords |
| `topic_evolution` | 184 | Topic + year | How topic weights change year to year |
| `year_keywords` | 211 | Keyword + year | TF-IDF keywords per year |
| `year_similarity` | 253 | Year pair | Cosine similarity between years |
| `writing_evolution` | 21 | One year | Reading level, word count, vocabulary metrics |
| `quotes` | 79 | One quote | Extracted quotes with sentiment and emotion labels |

### 5. Experiences & Interests
| Table | Rows | Grain | Purpose |
|-------|------|-------|---------|
| `travel` | 34 | One trip | Destinations with duration, photos, lat/long |
| `cruise_detail` | 6 | One cruise | Ship names, destinations, ratings |
| `entertainment` | 17 | One show/event | Entertainment milestones |
| `wwe_events` | 16 | One WWE event | Wrestling fandom timeline |
| `sports` | 26 | One sports stat | Various sports statistics |
| `traditions` | 14 | One tradition | Recurring personal traditions |
| `fun_facts` | 60 | One fact | Trivia and interesting facts |
| `epic_numbers` | 18 | One stat | Notable numeric facts |
| `song_person_map` | 6 | One song-person link | Songs associated with specific people |

### 6. Health & Comebacks
| Table | Rows | Grain | Purpose |
|-------|------|-------|---------|
| `medical_history` | 14 | One medical event | Health events with severity |
| `medical_comeback_pairs` | 8 | One pair | Linking a medical setback to its comeback |
| `comebacks` | 9 | One comeback | Challenge and resolution narratives |
| `streaks` | 10 | One streak | Active or completed life streaks |

### Supporting Tables
| Table | Rows | Purpose |
|-------|------|---------|
| `awards` / `awards_enriched` | 51 | Awards (enriched adds sentiment) |
| `lj_commenters` / `lj_comments` | 52 / 44 | LiveJournal community data |
| `locations` | 29 | Named places with lat/long |
| `post_content` | 9 | Deep-read summaries of key posts |
| `timeline_posts` | 30 | Blog posts that cover timeline years |
| `insights` | 28 | Derived analytical insights |

---

## Data Quality Assessment

### Completeness

Most tables are well-populated for their core columns. The main issues are in optional/enrichment fields:

**Fully empty columns (100% null):**
- `ecd_players.first_year`, `last_year`, `peak_year`, `era_active` — all 128 rows null
- `ecd_match_results.event_number` — all 99 rows null
- `ecd_match_results.post_date` — all 99 rows null
- `ecd_awards_v2.event_number` — all 27 rows null
- `ecd_rivalries.first_year`, `last_year` — all 166 rows null

**Heavily sparse columns (>50% null):**
- `people.birth_year` — 98.8% null (only 2 of 165 have values)
- `ecd_posts.date` — 69% null (364/527 missing)
- `ecd_events_v2.attendance` — 67% null (113/168 missing)
- `ecd_match_results.score` — 55% null

**Well-populated core tables:** `milestones`, `quotes`, `year_summary`, `person`, `career`, `life_chapters`, `travel` — all at or near 100% completeness on key columns.

### Consistency

**Date formats are mixed** across the database:
- `YYYY-MM-DD` in some tables (ecd_posts partially)
- `YYYY/MM/DD` in others
- Human-readable text like "August 4, 2006" in ecd_events_v2.date
- This makes cross-table date joins unreliable without normalization

**One duplicate person:** "Juan Londono (Muffin Man)" appears twice in the `people` table.

**Sentiment values** are consistently within [-1, 1] across all tables — no outliers.

**Year values** are all within the expected 1997–2026 range — no anomalies.

### Referential Integrity

**Intact relationships:**
- `people_highlights.person_id` → `people.id` ✓
- `ecd_match_results.post_id` → `ecd_posts.id` ✓
- `topic_evolution.topic_id` → `topics.id` ✓

**Broken relationships:**
- `timeline_posts.post_id` — 30 orphaned records (IDs don't exist in `ecd_posts`)
- `post_content.post_id` — 9 orphaned records
- `ner_entities.source_id` — many point to non-existent source rows

**Cannot verify** (linking columns are 100% null):
- `ecd_match_results.event_number` → `ecd_events_v2`
- `ecd_awards_v2.event_number` → `ecd_events_v2`

### Redundancy

Three pairs of tables appear overlapping:

1. **`awards` vs `awards_enriched`** — Same 51 rows; enriched adds `related_milestones` and `award_sentiment`. Intentional enrichment layer.
2. **`ecd_events` (19 rows) vs `ecd_events_v2` (168 rows)** — v2 is a major expansion with different schema. The v1 table appears superseded.
3. **`person` (1 row) vs `people` (165 rows)** — Complementary: `person` is a single-row profile of the subject; `people` is everyone else in their life.

---

## Key Patterns & Insights

### Temporal Coverage
The year range 2004–2025 has the densest data. The `year_summary` table tracks 23 years and shows `intensity_score` peaking in certain years. The ECD community data is heaviest in 2005–2010 (founding era), tapering into 2011–2017.

### Sentiment Landscape
Across 527 ECD posts, the mean sentiment compound is **0.58** (median 0.92) — overwhelmingly positive content. Quotes show a wider emotional range (mean 0.22, min -0.6). The dominant emotion label on posts is **neutral (47%)** followed by **joy (28%)**.

### Social Network
165 people are tracked. The relationship graph has 74 edges with weights 1–12. "Ma" appears in 49 relationship entries — the most connected person. The `temporal_network` table shows how the active social circle grows and shrinks each year.

### ECD Community
128 players are tracked, but the distribution is extremely skewed: the mean mention count is 86 but the median is just 3. Most players (94 of 128) have zero wins recorded. The top player by mentions has 2,498. Rivalry data captures 166 player-pair relationships.

### Writing Evolution
The `writing_evolution` table tracks reading level, word count, and vocabulary richness year-over-year — a fascinating meta-analysis of how the subject's blog writing changed over two decades.

---

## Relationship Map

The database uses **year** as the primary join key across most tables. Other key linkages:

```
person (1) ──── biographical anchor
  │
  ├── milestones (226) ── via year ──┐
  ├── career (12) ── via year ───────┤
  ├── travel (34) ── via year ───────┤
  ├── medical_history (14) ── via year
  │                                  │
  ├── year_summary (23) ◄────────────┘ aggregates all per-year
  ├── year_keywords (211) ── via year
  ├── year_similarity (253) ── year pairs
  │
  ├── people (165) ── via people.id
  │     ├── people_highlights (46) ── via person_id → people.id
  │     ├── person_arc (40) ── via person name
  │     ├── person_timeline (80) ── via person_name
  │     ├── relationship_graph (74) ── via person_name
  │     └── co_occurrences (56) ── via person_a/person_b
  │
  ├── ecd_posts (527) ── via ecd_posts.id
  │     ├── ecd_match_results (99) ── via post_id → ecd_posts.id
  │     ├── ecd_awards_v2 (27) ── via post_id
  │     └── ecd_fundraisers (3) ── via post_id
  │
  ├── ecd_events_v2 (168) ── via event_number (broken links)
  ├── ecd_players (128) ── via name (join to match_results.winner/loser)
  ├── ecd_rivalries (166) ── via player1/player2 names
  │
  ├── topics (8) ── via topics.id
  │     └── topic_evolution (184) ── via topic_id → topics.id
  │
  └── milestones.topic_id → topics.id
```

---

## Recommendations

1. **Fill in empty ECD columns** — `ecd_players.first_year/last_year/peak_year` and `ecd_match_results.event_number` could be computed from existing match/post data.
2. **Normalize date formats** — standardize all dates to ISO 8601 (`YYYY-MM-DD`) for reliable cross-table joins.
3. **Fix orphaned references** — `timeline_posts.post_id` and `post_content.post_id` point to nonexistent posts; either re-link or mark as legacy.
4. **Deduplicate** the "Juan Londono (Muffin Man)" entry in `people`.
5. **Retire `ecd_events` v1** — it's fully superseded by `ecd_events_v2` with 9x more rows and a richer schema.
6. **Populate `people.birth_year`** — currently only 2 of 165 people have this filled in.
