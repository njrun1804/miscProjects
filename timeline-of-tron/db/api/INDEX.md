# TRON Timeline API - Complete Endpoint Index

**Generated:** 2026-02-09  
**Total Files:** 92  
**Total Records:** 6,856  
**Total Size:** 2.34 MB  

---

## Table of Contents

1. [Core Tables](#core-tables)
2. [ECD Community](#ecd-community)
3. [Sentiment & Emotional Analysis](#sentiment--emotional-analysis)
4. [Hero's Journey & Narrative](#heros-journey--narrative)
5. [Eras & Temporal Analysis](#eras--temporal-analysis)
6. [People & Relationships](#people--relationships)
7. [Topics & Writing](#topics--writing)
8. [Travel & Location](#travel--location)
9. [Derived Relationships](#derived-relationships)
10. [Composite Room Data](#composite-room-data)
11. [Metadata](#metadata)

---

## Core Tables

### people.json
**Records:** 164 | **Size:** 61.70 KB  
**Description:** All people mentioned in the timeline with metadata.  
**Ordering:** by importance_score DESC, name  
**Key Fields:** name, importance_score, category, first_year, dominant_topic

### milestones_enriched.json
**Records:** 226 | **Size:** 117.03 KB  
**Description:** All milestones in chronological order with sentiment analysis.  
**Ordering:** by year, id  
**Key Fields:** id, year, category, description, vader_compound

### awards.json
**Records:** 51 | **Size:** 7.21 KB  
**Description:** Awards and recognition events.  
**Ordering:** by year  
**Key Fields:** year, award_name, category, honor_type

### awards_enriched.json
**Records:** 51 | **Size:** 11.23 KB  
**Description:** Enhanced awards data with additional metadata.  
**Ordering:** by year  
**Key Fields:** year, award_name, category, significance_score

### awards_categories.json
**Records:** 10 | **Size:** 0.99 KB  
**Description:** Distinct award categories with counts and year ranges.  
**Key Fields:** category, count, min_year, max_year

### quotes.json
**Records:** 79 | **Size:** 21.36 KB  
**Description:** Quotes throughout the timeline.  
**Ordering:** by year  
**Key Fields:** year, quote_text, source, context

### career.json
**Records:** 12 | **Size:** 3.39 KB  
**Description:** Career events and milestones.  
**Ordering:** by year  
**Key Fields:** year, event_type, description, role

### travel.json
**Records:** 34 | **Size:** 15.04 KB  
**Description:** Travel destinations and trips.  
**Ordering:** by year  
**Key Fields:** year, destination, duration, significance

### medical_history.json
**Records:** 14 | **Size:** 4.49 KB  
**Description:** Medical events and health-related occurrences.  
**Ordering:** by year  
**Key Fields:** year, event_type, description, severity_score

### medical_events.json
**Records:** 14 | **Size:** 4.49 KB  
**Description:** Alias for medical_history.json.

### topics.json
**Records:** 8 | **Size:** 1.14 KB  
**Description:** Main topics of discussion throughout timeline.  
**Key Fields:** topic_id, topic_name, description, occurrence_count

### life_chapters.json
**Records:** 19 | **Size:** 11.45 KB  
**Description:** Distinct life chapters and phases.  
**Ordering:** by start_year  
**Key Fields:** chapter_id, start_year, end_year, chapter_name, theme

### turning_points.json
**Records:** 13 | **Size:** 2.65 KB  
**Description:** Major turning points in the timeline.  
**Ordering:** by year  
**Key Fields:** year, turning_point_type, description, impact_level

### fun_facts.json
**Records:** 60 | **Size:** 10.86 KB  
**Description:** Interesting miscellaneous facts.  
**Ordering:** by year (nulls last)  
**Key Fields:** fact_id, year, fact_text, category

### traditions.json
**Records:** 14 | **Size:** 3.37 KB  
**Description:** Recurring traditions and habits.  
**Key Fields:** tradition_id, name, description, frequency

### person.json
**Records:** 1 | **Size:** 0.68 KB  
**Description:** Central person profile (main subject).  
**Key Fields:** name, birth_year, career_start, bio_summary

### entertainment.json
**Records:** 17 | **Size:** 2.69 KB  
**Description:** Entertainment-related events and appearances.  
**Ordering:** by year  
**Key Fields:** year, event_type, description, audience_scale

### epic_numbers.json
**Records:** 18 | **Size:** 2.50 KB  
**Description:** Significant numerical achievements and records.  
**Key Fields:** number_id, category, value, context, achievement_year

### sports.json
**Records:** 26 | **Size:** 4.96 KB  
**Description:** Sports-related events and achievements.  
**Ordering:** by year (nulls last)  
**Key Fields:** year, sport_type, event_description, outcome

### streaks.json
**Records:** 10 | **Size:** 1.86 KB  
**Description:** Notable streaks and consecutive achievements.  
**Ordering:** by start_year  
**Key Fields:** streak_id, description, start_year, end_year, streak_length

### lj_commenters.json
**Records:** 52 | **Size:** 8.80 KB  
**Description:** LiveJournal community commenters ranked by activity.  
**Ordering:** by comment_count DESC  
**Key Fields:** commenter_name, comment_count, first_post_year, last_post_year

### lj_comments.json
**Records:** 44 | **Size:** 8.65 KB  
**Description:** LiveJournal comment aggregates by year.  
**Ordering:** by year  
**Key Fields:** year, comment_count, active_commenters, sentiment_avg

### locations.json
**Records:** 29 | **Size:** 5.71 KB  
**Description:** Geographic locations mentioned in timeline.  
**Key Fields:** location_id, location_name, country, coordinates, significance

### comebacks.json
**Records:** 9 | **Size:** 1.66 KB  
**Description:** Comeback events from adversity.  
**Ordering:** by year  
**Key Fields:** year, comeback_type, description, recovery_duration

### cruise_detail.json
**Records:** 6 | **Size:** 1.58 KB  
**Description:** Cruise ship events and experiences.  
**Ordering:** by year  
**Key Fields:** year, ship_name, duration, destinations, significance

### song_person_map.json
**Records:** 6 | **Size:** 2.12 KB  
**Description:** Mappings between songs and people mentioned.  
**Key Fields:** song_title, person_name, context, year

### wwe_events.json
**Records:** 16 | **Size:** 2.84 KB  
**Description:** WWE-related events and appearances.  
**Ordering:** by year  
**Key Fields:** year, event_type, description, opponent, outcome

### insights.json
**Records:** 28 | **Size:** 12.83 KB  
**Description:** Key insights and analysis points.  
**Ordering:** by sort_order  
**Key Fields:** insight_id, category, insight_text, supporting_data, confidence_score

### post_content.json
**Records:** 0 | **Size:** 0.00 KB  
**Description:** Blog post content archive.

### timeline_posts.json
**Records:** 0 | **Size:** 0.00 KB  
**Description:** Timeline blog post entries.

---

## ECD Community

### ecd_posts.json
**Records:** 527 | **Size:** 298.75 KB  
**Description:** All posts from ECD (Epic Community Database).  
**Ordering:** by year, id  
**Key Fields:** id, year, post_text, author, sentiment_compound, sentiment_label

### ecd_events_v2.json
**Records:** 168 | **Size:** 75.32 KB  
**Description:** ECD events with full metadata.  
**Ordering:** by year, event_number  
**Key Fields:** year, event_number, event_name, attendance, significance_score

### ecd_events_full.json
**Records:** 168 | **Size:** 75.32 KB  
**Description:** Alias for ecd_events_v2.json.

### ecd_players_full.json
**Records:** 128 | **Size:** 33.83 KB  
**Description:** ECD players ranked by mentions.  
**Ordering:** by total_mentions DESC  
**Key Fields:** player_name, total_mentions, peak_year, career_span, win_count

### ecd_players_v2.json
**Records:** 128 | **Size:** 33.83 KB  
**Description:** Alias for ecd_players_full.json.

### ecd_match_results.json
**Records:** 99 | **Size:** 26.50 KB  
**Description:** ECD match outcomes and statistics.  
**Ordering:** by year, id  
**Key Fields:** year, id, player1, player2, winner, significance_score

### ecd_awards_v2.json
**Records:** 27 | **Size:** 6.60 KB  
**Description:** ECD community awards and recognitions.  
**Ordering:** by year  
**Key Fields:** year, award_type, recipient, description

### ecd_awards_full.json
**Records:** 27 | **Size:** 6.60 KB  
**Description:** Alias for ecd_awards_v2.json.

### ecd_rivalries.json
**Records:** 166 | **Size:** 48.23 KB  
**Description:** Notable rivalries in ECD community.  
**Ordering:** by mention_count DESC  
**Key Fields:** player1, player2, mention_count, significance_score, competitive_intensity

### ecd_rivalries_full.json
**Records:** 166 | **Size:** 48.23 KB  
**Description:** Alias for ecd_rivalries.json.

### ecd_fundraisers.json
**Records:** 3 | **Size:** 0.52 KB  
**Description:** ECD fundraising events.  
**Ordering:** by year  
**Key Fields:** year, fundraiser_name, amount_raised, cause

### ecd_player_years.json
**Records:** 106 | **Size:** 24.54 KB  
**Description:** ECD player statistics by year.  
**Ordering:** by year, player_name  
**Key Fields:** year, player_name, wins, losses, events_played, ranking

### ecd_community_narrative.json
**Records:** 21 | **Size:** 7.22 KB  
**Description:** Narrative summary of ECD community evolution.  
**Ordering:** by year  
**Key Fields:** year, narrative_text, major_events, key_players, sentiment_summary

### ecd_attendance_trends.json
**Records:** 8 | **Size:** 0.56 KB  
**Description:** Annual ECD event attendance statistics.  
**Ordering:** by year  
**Key Fields:** year, total_attendance, events

---

## Sentiment & Emotional Analysis

### sentiment_timeline.json
**Records:** 23 | **Size:** 4.40 KB  
**Description:** Yearly sentiment trends from milestone analysis.  
**Key Fields:** year, avg_sentiment, milestone_count, intensity_score, year_theme

### emotion_distribution.json
**Records:** 3 | **Size:** 0.18 KB  
**Description:** Distribution of sentiment labels across posts.  
**Key Fields:** sentiment_label, count

### ecd_sentiment.json
**Records:** 21 | **Size:** 1.78 KB  
**Description:** ECD posts sentiment aggregated by year.  
**Key Fields:** year, avg_sentiment, post_count

### ecd_sentiment_timeline.json
**Records:** 21 | **Size:** 1.78 KB  
**Description:** Alias for ecd_sentiment.json.

### yearly_sentiment_trend.json
**Records:** 23 | **Size:** 1.79 KB  
**Description:** Sentiment trends from milestone data.  
**Ordering:** by year  
**Key Fields:** year, avg_sentiment, count

### sentiment_by_milestone_type.json
**Records:** 16 | **Size:** 1.43 KB  
**Description:** Average sentiment by milestone category.  
**Key Fields:** category, avg_sentiment, count

---

## Hero's Journey & Narrative

### heros_journey.json
**Records:** 9 | **Size:** 5.67 KB  
**Description:** The hero's journey stages and structure.  
**Key Fields:** stage_id, stage_name, year_start, year_end, description, archetype

### heros_journey_narrative.json
**Records:** 9 | **Size:** 164.34 KB  
**Description:** Rich narrative for each journey stage including milestones and quotes.  
**Key Fields:** stage details + related milestones + relevant quotes

### comeback_narrative.json
**Records:** 0 | **Size:** 0 KB  
**Description:** Comeback events grouped by type (skipped - column structure issue).

### comeback_phases.json
**Records:** 0 | **Size:** 0 KB  
**Description:** Comeback summary statistics (skipped - column structure issue).

### turning_points_detailed.json
**Records:** 13 | **Size:** 9.07 KB  
**Description:** Detailed analysis of turning points.  
**Ordering:** by turning_point_year  
**Key Fields:** turning_point_year, turning_point_type, impact_score, before_state, after_state

### medical_comeback_pairs.json
**Records:** 8 | **Size:** 2.40 KB  
**Description:** Pairs of medical crises and comebacks.  
**Ordering:** by medical_year  
**Key Fields:** medical_year, recovery_year, crisis_type, recovery_type, recovery_duration

---

## Eras & Temporal Analysis

### eras.json
**Records:** 23 | **Size:** 6.82 KB  
**Description:** Distinct historical eras in the timeline.  
**Ordering:** by start_year  
**Key Fields:** era_id, era_name, start_year, end_year, theme, key_characteristics

### year_transitions.json
**Records:** 22 | **Size:** 6.43 KB  
**Description:** Significant transitions between years.  
**Ordering:** by year_from  
**Key Fields:** year_from, year_to, transition_type, significance_score, description

### year_intensity_breakdown.json
**Records:** 23 | **Size:** 7.28 KB  
**Description:** Intensity and activity levels by year.  
**Ordering:** by year  
**Key Fields:** year, intensity_score, event_count, emotional_intensity, significance_level

### parallel_timelines.json
**Records:** 104 | **Size:** 19.42 KB  
**Description:** Parallel events across different life domains.  
**Ordering:** by year, domain  
**Key Fields:** year, domain, event_description, related_events, timeline_id

### year_summary.json
**Records:** 23 | **Size:** 7.95 KB  
**Description:** Comprehensive summary for each year.  
**Ordering:** by year  
**Key Fields:** year, year_theme, intensity_score, major_events_count, sentiment_summary

### year_summaries.json
**Records:** 23 | **Size:** 7.95 KB  
**Description:** Alias for year_summary.json.

### year_deep_dive.json
**Records:** 23 | **Size:** 195.07 KB  
**Description:** Comprehensive year data including all related events, quotes, and activities.  
**Key Fields:** year + milestones + quotes + career + travel + medical_events

### year_keywords.json
**Records:** 211 | **Size:** 19.30 KB  
**Description:** Top keywords for each year with TF-IDF scores.  
**Ordering:** by year, tfidf_score DESC  
**Key Fields:** year, keyword, tfidf_score, frequency, relevance

### year_similarity.json
**Records:** 253 | **Size:** 17.66 KB  
**Description:** Similarity scores between year pairs.  
**Ordering:** by year1, year2  
**Key Fields:** year1, year2, similarity_score, shared_themes, shared_events

---

## People & Relationships

### people.json
**Records:** 164 | **Size:** 61.70 KB  
**Description:** Core people database (see Core Tables section above).

### people_profiles.json
**Records:** 0 | **Size:** 0 KB  
**Description:** Rich people profiles with related quotes (skipped - column structure issue).

### relationship_constellation.json
**Records:** 2 | **Size:** 25.77 KB  
**Description:** D3 force graph data for relationship visualization.  
**Key Fields:** nodes (people) + links (relationships with strength weights)

### relationship_graph.json
**Records:** 74 | **Size:** 15.78 KB  
**Description:** Complete relationship network graph.  
**Key Fields:** person1, person2, relationship_type, relationship_strength, connection_context

### relationship_graph_full.json
**Records:** 74 | **Size:** 15.78 KB  
**Description:** Alias for relationship_graph.json.

### co_occurrences.json
**Records:** 56 | **Size:** 9.78 KB  
**Description:** Co-occurrence of people in the same events/milestones.  
**Ordering:** by co_occurrence_count DESC  
**Key Fields:** person1, person2, co_occurrence_count, contexts, first_year, last_year

### co_occurrence_strength.json
**Records:** 56 | **Size:** 9.78 KB  
**Description:** Alias for co_occurrences.json.

### person_arc.json
**Records:** 40 | **Size:** 6.79 KB  
**Description:** Character arc and trajectory for each person.  
**Ordering:** by total_mentions DESC  
**Key Fields:** person_name, total_mentions, arc_type, peak_year, active_years, dominant_role

### person_timelines.json
**Records:** 80 | **Size:** 13.22 KB  
**Description:** Timeline of events for each person.  
**Ordering:** by person_name, year  
**Key Fields:** person_name, year, event_type, event_description, significance_score

### people_highlights.json
**Records:** 46 | **Size:** 7.43 KB  
**Description:** Highlighted events for key people.  
**Key Fields:** person_name, highlight_year, highlight_event, significance_score

### temporal_network.json
**Records:** 21 | **Size:** 3.79 KB  
**Description:** Network structure evolution over time.  
**Ordering:** by year  
**Key Fields:** year, network_density, key_nodes, community_count, avg_connection_strength

### people_by_arc_type.json
**Records:** 5 | **Size:** 66.28 KB  
**Description:** People grouped by their character arc category.  
**Key Fields:** category -> [people array with all metadata]

### people_importance_scores.json
**Records:** 164 | **Size:** 23.75 KB  
**Description:** People ranked by importance score.  
**Ordering:** by importance_score DESC  
**Key Fields:** name, importance_score, peak_year, active_years, dominant_topic

---

## Topics & Writing

### topics.json
**Records:** 8 | **Size:** 1.14 KB  
**Description:** Main topics (see Core Tables section).

### topic_evolution.json
**Records:** 184 | **Size:** 11.95 KB  
**Description:** How topics evolve and change over time.  
**Ordering:** by year, topic_id  
**Key Fields:** year, topic_id, topic_name, mentions, sentiment_trend, relevance_score

### writing_evolution.json
**Records:** 21 | **Size:** 7.91 KB  
**Description:** Evolution of writing style and patterns.  
**Ordering:** by year  
**Key Fields:** year, avg_post_length, tone_shift, vocabulary_richness, primary_themes

### topic_person_timeline.json
**Records:** 1232 | **Size:** 304.38 KB  
**Description:** Comprehensive timeline of topics and associated people.  
**Ordering:** by year, topic_name, person_name  
**Key Fields:** year, topic_name, person_name, context, mentions, relevance_score

### theme_cloud.json
**Records:** 187 | **Size:** 15.13 KB  
**Description:** Aggregated keywords with TF-IDF scores.  
**Ordering:** by total_score DESC  
**Key Fields:** keyword, total_score, year_count, occurrences

---

## Travel & Location

### travel.json
**Records:** 34 | **Size:** 15.04 KB  
**Description:** Travel events (see Core Tables section).

### locations.json
**Records:** 29 | **Size:** 5.71 KB  
**Description:** Geographic locations (see Core Tables section).

### travel_sentiment_by_location.json
**Records:** 0 | **Size:** 0 KB  
**Description:** Travel sentiment analysis by destination (skipped - column structure issue).

### location_frequency.json
**Records:** 29 | **Size:** 1.97 KB  
**Description:** How often each location was visited.  
**Key Fields:** destination, visits

### travel_medical_correlations.json
**Records:** 66 | **Size:** 20.28 KB  
**Description:** Correlations between travel and medical events.  
**Ordering:** by medical_year  
**Key Fields:** travel_year, medical_year, destination, medical_event, correlation_score

---

## Derived Relationships

### milestone_people.json
**Records:** 74 | **Size:** 10.97 KB  
**Description:** Mappings between milestones and people mentioned.  
**Ordering:** by milestone_id  
**Key Fields:** milestone_id, person_name, role_in_event, significance_score

### ecd_rivalry_timeline.json
**Records:** 47 | **Size:** 9.43 KB  
**Description:** Rivalry events throughout ECD history.  
**Ordering:** by year, player1  
**Key Fields:** year, player1, player2, rivalry_intensity, event_type, outcome

### career_chapter_map.json
**Records:** 11 | **Size:** 1.93 KB  
**Description:** Mapping of life chapters to career phases.  
**Key Fields:** chapter_id, chapter_name, career_phase, start_year, end_year

### quote_attribution.json
**Records:** 35 | **Size:** 5.13 KB  
**Description:** Attribution and metadata for quotes.  
**Key Fields:** quote_id, quote_text, speaker, attributed_person, context_year, reliability_score

### expanded_comebacks.json
**Records:** 213 | **Size:** 107.90 KB  
**Description:** Detailed comeback events with crisis and recovery phases.  
**Ordering:** by crisis_year  
**Key Fields:** crisis_year, recovery_year, crisis_type, crisis_description, recovery_details, recovery_duration

---

## Composite Room Data

Composite endpoints combining multiple data sources for specific use cases:

### arc_data.json
**Records:** 18 | **Size:** 0 KB  
**Description:** Arc room data - journey stages and turning points (skipped - column structure issue).

### constellation_data.json
**Records:** 2 | **Size:** 17.27 KB  
**Description:** Relationship constellation for the Constellation Room.  
**Key Fields:** people_count, relationships array

### vault_data.json
**Records:** 2 | **Size:** 33.27 KB  
**Description:** Vault room data - quotes and keywords.  
**Key Fields:** quotes array, top_keywords array

### dynasty_data.json
**Records:** 3 | **Size:** 19.45 KB  
**Description:** Dynasty room data - career, awards, and traditions.  
**Key Fields:** career_events, awards, traditions

---

## Metadata

### api_index.json
**Records:** 4 | **Size:** 7.52 KB  
**Description:** Master index of all generated endpoints with record counts and descriptions.  
**Key Fields:** generated_at, total_files, total_records, endpoints (with filename, records, size_bytes)

### schema_info.json
**Records:** 67 | **Size:** 14.87 KB  
**Description:** Complete database schema information.  
**Key Fields:** [table_name] -> {columns: [...], row_count: N}

### data_quality_report.json
**Records:** 1 | **Size:** 37.65 KB  
**Description:** Data quality metrics including null rates per column.  
**Key Fields:** tables -> [table] -> {columns -> {column} -> {null_rate}}

### ner_entities.json
**Records:** 436 | **Size:** 66.20 KB  
**Description:** Named Entity Recognition results.  
**Ordering:** by year, entity_label  
**Key Fields:** year, entity_label, entity_text, confidence_score, context

---

## Export Statistics

| Metric | Value |
|--------|-------|
| **Total JSON Files** | 92 |
| **Total Records Exported** | 6,856 |
| **Total Data Size** | 2.34 MB |
| **Largest File** | heros_journey_narrative.json (164.34 KB, 9 records) |
| **Most Records** | topic_person_timeline.json (1,232 records) |
| **Smallest File** | emotion_distribution.json (0.18 KB, 3 records) |

---

## Usage Notes

### Data Format
- All files are JSON with 2-space indentation
- Unicode support enabled (ensure_ascii=False)
- Dates typically in YYYY-MM-DD format where present
- Numeric scores normalized to 0-1 range or -1 to 1 for sentiment

### Relationships Between Endpoints
- **people.json** is the core reference - all person-related endpoints link back to it
- **milestones_enriched.json** is comprehensive; other views filter/aggregate this
- **ecd_posts.json** contains raw sentiment data; aggregates available in ecd_sentiment.json
- **year_deep_dive.json** is the most comprehensive single year view
- **topic_person_timeline.json** is largest and contains detailed cross-references

### Common Queries
- Timeline view: Use **year_summary.json** or **year_deep_dive.json**
- People insights: Use **people_importance_scores.json** or **relationship_constellation.json**
- Sentiment analysis: Use **sentiment_timeline.json** or **yearly_sentiment_trend.json**
- ECD community: Use **ecd_events_v2.json** + **ecd_players_full.json** + **ecd_rivalries.json**
- Content themes: Use **theme_cloud.json** or **year_keywords.json**

### Missing/Skipped Endpoints
Some requested endpoints were skipped due to table structure issues:
- **comeback_narrative** & **comeback_phases** - no `comeback_type` column
- **people_profiles** - no `attributed_to` column in quotes table
- **travel_sentiment_by_location** - no `sentiment` column in travel table
- **arc_data** - no `is_turning_point` column in milestones table

These can be re-enabled if the database schema is updated.

---

## Last Generated
2026-02-09 00:54:00  
Schema version from database introspection

