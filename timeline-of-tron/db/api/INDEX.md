# Timeline of Tron — JSON API Index

**Active Files:** 54 + 1 index
**Archived:** 64 unused/superseded files in `archive/unused-json/`

---

## Lobby

| File | Records | Description |
|------|---------|-------------|
| `sentiment_timeline.json` | 23 | Yearly sentiment trends from milestone analysis |
| `lj_comments.json` | 44 | LiveJournal comment aggregates by year |

## The Arc

| File | Records | Description |
|------|---------|-------------|
| `heros_journey_narrative.json` | 9 | Rich narrative for each hero's journey stage with milestones and quotes |
| `turning_point_impact.json` | 14 | Quantified shock/recovery for turning points |
| `turning_points.json` | 13 | Major turning points with impact levels |
| `turning_points_detailed.json` | 13 | Detailed turning point analysis with before/after states |
| `year_summaries.json` | 23 | Comprehensive summary per year |
| `life_chapters.json` | 19 | Distinct life chapters and phases |
| `epic_numbers.json` | 18 | Significant numerical achievements and records |

## The Constellation

| File | Records | Description |
|------|---------|-------------|
| `relationship_constellation.json` | 2 | D3 force graph data (nodes + links) |
| `people.json` | 164 | All people with metadata and importance scores |
| `people_profiles.json` | — | Rich people profiles with related quotes |
| `person_arc.json` | 40 | Character arc and trajectory per person |
| `person_timelines.json` | 80 | Timeline of events per person |
| `co_occurrences.json` | 56 | Co-occurrence of people in same events |
| `temporal_network.json` | 21 | Network structure evolution over time |
| `people_highlights.json` | 46 | Highlighted events for key people |
| `song_person_map.json` | 6 | Mappings between songs and people |
| `ecd_players.json` | 128 | ECD player data (used for constellation matching) |
| `ecd_awards_v2.json` | 27 | ECD awards (used in constellation enrichment) |
| `ecd_player_network.json` | — | Player network graph for constellation overlay |

## The Record Book

| File | Records | Description |
|------|---------|-------------|
| `fun_facts.json` | 60 | Interesting miscellaneous facts |
| `streaks.json` | 10 | Notable streaks and consecutive achievements |
| `sports.json` | 26 | Sports events and achievements |
| `entertainment.json` | 17 | Entertainment events and appearances |
| `year_intensity_breakdown.json` | 23 | Intensity and activity levels by year |
| `ecd_match_results.json` | 99 | ECD match outcomes and statistics |
| `expanded_comebacks.json` | 213 | Detailed comeback events with crisis/recovery phases |

## The Atlas

| File | Records | Description |
|------|---------|-------------|
| `travel.json` | 34 | Travel destinations and trips |
| `medical_events.json` | 14 | Medical events and health occurrences |
| `cruise_detail.json` | 6 | Cruise ship events and experiences |

## The Vault

| File | Records | Description |
|------|---------|-------------|
| `quotes.json` | 79 | Quotes throughout the timeline |
| `writing_evolution.json` | 21 | Evolution of writing style and patterns |
| `year_keywords.json` | 211 | Top keywords per year with TF-IDF scores |
| `insights_full.json` | 28 | Key insights and analysis points |
| `quote_attribution.json` | 35 | Attribution and metadata for quotes |

*Also uses: `song_person_map.json`, `life_chapters.json`, `turning_points_detailed.json`, `people_profiles.json`*

## The Dynasty

| File | Records | Description |
|------|---------|-------------|
| `career.json` | 12 | Career events and milestones |
| `awards_enriched.json` | 51 | Enhanced awards data with metadata |
| `awards_categories.json` | 10 | Distinct award categories with counts |
| `traditions.json` | 14 | Recurring traditions and habits |
| `wwe_events.json` | 16 | WWE events and appearances |

## ECD (East Coast Dodgeball)

| File | Records | Description |
|------|---------|-------------|
| `ecd_stats_dashboard.json` | — | Dashboard summary statistics |
| `ecd_sentiment_timeline.json` | 21 | ECD sentiment aggregated by year |
| `ecd_attendance_trends.json` | 8 | Annual event attendance statistics |
| `ecd_community_narrative.json` | 21 | Narrative summary of community evolution |
| `ecd_players_full.json` | 128 | ECD players ranked by mentions |
| `ecd_rivalries.json` | 166 | Notable rivalries with intensity scores |
| `ecd_emotion_distribution.json` | — | Emotion distribution across posts |
| `ecd_highlights.json` | — | Community highlight moments |
| `ecd_awards_full.json` | 27 | Community awards and recognitions |
| `ecd_fundraisers.json` | 3 | Fundraising events |
| `ecd_game_results.json` | — | Individual game results |

## Shared / Cross-Room

| File | Records | Description |
|------|---------|-------------|
| `milestones_enriched.json` | 226 | All milestones with sentiment analysis |
| `milestone_people.json` | 74 | Mappings between milestones and people |

## Metadata

| File | Description |
|------|-------------|
| `api_index.json` | Master index of all endpoints with record counts |

---

## Data Format

- JSON with 2-space indentation
- Unicode support (ensure_ascii=False)
- Sentiment scores: -1 to 1 range
- Dates: YYYY-MM-DD where present

## Archived Data

64 unused/superseded JSON files are preserved in `archive/unused-json/` for reference. These include older versions (e.g., `awards.json` superseded by `awards_enriched.json`), duplicate exports, and pipeline outputs not consumed by the frontend.
