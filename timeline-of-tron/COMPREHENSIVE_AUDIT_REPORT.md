# Timeline of Tron — Comprehensive Data Integrity Audit

**Audit Date:** February 9, 2026
**Scope:** All 118 API files, 9 HTML pages, 17 JS modules, 578 raw posts
**Method:** Automated cross-referencing across every data layer

---

## Executive Summary

The audit examined data flow from raw posts → parsed intermediates → API layer → JS rendering → HTML display across all 9 rooms. **32 distinct issues** were identified across 4 severity levels.

| Severity | Count | Examples |
|----------|-------|---------|
| CRITICAL | 7 | Event count mismatches, missing people, duplicate matches |
| HIGH | 8 | Hardcoded stale counts in HTML, player year ranges wrong |
| MEDIUM | 9 | Fallback defaults, award name normalization, magic numbers |
| LOW | 8 | Visual-only era band end years, content strings |

---

## Layer 1: Event Data (5 files cross-referenced)

### CRITICAL: Two divergent event datasets

The project has two competing "truths":

| File | Events | Range |
|------|--------|-------|
| `parsed_events_v2.json` (raw layer) | 168 | #3–#200 |
| `ecd_events_v2.json` (API layer) | 222 | #1–#222 |
| `ecd_events_full.json` | 168 | #3–#200 |
| `ecd_timeline.json` | 168 | #3–#200 |
| `ecd_events.json` | 168 | #3–#200 |

The V2 API file contains the 54 newly added events (#201–#222 plus gap-fills), but the three other API files and the raw parsed source still only have 168. **The V2 file needs to become the canonical source, and all downstream files need regeneration.**

### CRITICAL: 10 impossible dates (pre-2000 for a 2005-founded org)

| Event # | Date in File | Likely Actual Year |
|---------|-------------|-------------------|
| 49 | 1982-03-10 | ~2008 |
| 57 | 1985-06-23 | ~2008 |
| 71 | 1990-05-09 | ~2009 |
| 73 | 1983-01-07 | ~2009 |
| 79 | 1982-03-10 | ~2009 |
| 81 | 1982-03-10 | ~2009 |
| 92 | 1983-01-07 | ~2010 |
| 114 | 1983-01-07 | ~2010 |
| 119 | 1986-11-08 | ~2011 |
| 140 | 1986-06-15 | ~2012 |

Root cause: Parser pulled birthdays or other dates from post body instead of the actual event date.

### Additional date issues

- 53 events have year field ≠ date field (e.g., Event #29: date=2005-11-26 but year=2012)
- 66 events (39%) have NULL dates
- 5 events share the suspicious date 2010-08-14 with different year values

---

## Layer 2: People & Player Data (12 files cross-referenced)

### CRITICAL: 70 ECD players missing from people.json

`ecd_players_full.json` has 128 players, but `people.json` only contains 58 of them. The 70 missing players include active participants like Bethany Schonberg, Michael Edwards, Rob Avakian, and Darien Brown.

### HIGH: 87 players lack proper categorization

Only 41 of 128 ECD players are tagged with `category: "ecd_player"`. The remaining 87 won't surface correctly in category-based filters.

### HIGH: Confirmed duplicate person

Dan Spengeman (ID 15, importance 38.0) and Danny Sponge (ID 59, importance 22.0) are the same person tracked as two entries with 5 co-occurrence records proving it.

### MEDIUM: Spelling error propagated across files

"Julia Dennabuam" in people.json vs. "Julia Dennebaum" everywhere else.

### MEDIUM: 30+ fragmentary/corrupted names in aliases

Parsing artifacts like "Chris Adams As", "John Tronolone It", "Joey Smalls's", "Ryan Mc", "Pond Scum" (team name, not person).

---

## Layer 3: Match Results & Stats (10 files cross-referenced)

### CRITICAL: Match record count mismatch

| File | Records |
|------|---------|
| `parsed_match_results_v2.json` | 99 |
| `ecd_match_results.json` (API) | 114 |
| `ecd_game_results.json` | 99 |

The 15 extra API records are "main_event" type records not present in parsed source.

### CRITICAL: Duplicate match records inflating stats

Multiple match-player combinations appear 2–4 times with conflicting scores:

- Chris Adams vs Kevin Fitzpatrick: 4 records (scores: null, null, "4-4", null)
- Dan Spengeman vs Julia Dennebaum: 4 records
- Juan Londono vs Justin Wolf: 4 records
- 5+ more duplicate sets

### HIGH: Player year ranges out of sync with actual matches

Example: John Tronolone recorded as 2005–2010 but has match in 2025. Ryan Letsche recorded as 2006–2008 but has matches in 2010, 2024, 2025.

### HIGH: Award recipient name normalization failures

11 of 25 award recipients don't match any player: mixed case ("DAN SPENGEMAN" vs "Dan Spengeman"), malformed entries ("Ray Marzarella to"), non-player entries ("$1,720 For LAUREN & EMMA", "Awards").

### MEDIUM: >50% of match records have null scores

---

## Layer 4: JS Rendering (17 modules audited)

### HIGH: Hardcoded stale counts in HTML

| File | Line(s) | Current Text | Should Be |
|------|---------|-------------|-----------|
| `ecd.html` | 7, 9 | "128 players. 168 events. 21 years" | "128 players. 222 events. 21 years" |
| `ecd.html` | 112 | "128 Players. 168 Events. 20 Years." | Update to match |
| `records.html` | 54 | "171 events" | "222 events" (was already wrong at 171) |

### MEDIUM: Stale fallback in ecd.js

Line 129: `d.event_count || 168` — fallback defaults to old count if API fails to load.

### MEDIUM: Award filter too narrow

Line 928: Filters by exact string `"200 Events Award"`. Any new milestone awards (e.g., "220 Events Award") would silently not display.

### LOW: Era band visual ends at 2025

`ecd.js` line 172 and `arc.js` line 172 both cap the "Legacy" era background band at 2025. Data renders fine; the chart background just stops a year early.

### PASSING: No structural rendering issues

All year ranges in JS use dynamic calculation (no hardcoded upper limits). 3-digit event numbers render correctly. Date parsing handles all formats. Search indexes load dynamically. D3 constellation handles arbitrary node counts.

---

## Layer 5: Cross-Page Consistency

### HIGH: Lobby claims wrong people count

`index.html` lines 79, 191: "124 people" but `people.json` actually has 164 entries. Off by 40 (24% error).

### MEDIUM: Lobby milestone count off by 1

`index.html` line 7: "227 milestones" but `milestones_enriched.json` has 226.

### PASSING: 10 other lobby stats verified correct

19 chapters, 79 quotes, 34 trips, 27 bowling games, 218 ping pong rounds, 8.6 lbs shrimp, 38 cornholios, 254 cornhole wins — all match source data.

---

## Layer 6: Stats Dashboard & Derived Files

### CRITICAL: parse_stats_v2.json reports fabricated metrics

Reports 222 events (from V2 file) but includes era names (Legacy, Reunion, Modern) and event types (family_affair, holiday, reunion, masters, indoor, probowl) that don't exist in the canonical 168-event dataset. The stats file was generated from the expanded V2 data but the supporting files weren't updated to match.

### HIGH: Dashboard player count ambiguous

Dashboard reports 128 players, but only 73 unique players appear in actual match records. The 128 figure likely includes text-mentioned players who never played a documented match.

---

## Prioritized Fix Plan

### Phase 1: Data Foundation (resolve the split truth)

1. Decide: Is `ecd_events_v2.json` (222 events) the canonical source going forward?
2. If yes: regenerate `ecd_events_full.json`, `ecd_timeline.json`, `ecd_events.json` from V2
3. Regenerate `ecd_stats_dashboard.json` from canonical source
4. Regenerate `parse_stats_v2.json` to match

### Phase 2: People & Player Data

5. Add 70 missing ECD players to `people.json`
6. Tag all 128 ECD players with `category: "ecd_player"`
7. Merge Dan Spengeman / Danny Sponge into one entry
8. Fix "Julia Dennabuam" → "Julia Dennebaum"
9. Clean 30+ fragmentary alias names

### Phase 3: Match & Stats Integrity

10. De-duplicate match records (keep version with score data)
11. Clarify "main_event" record handling
12. Regenerate `ecd_player_years.json` from actual match data
13. Normalize award recipient names (case + typos)

### Phase 4: HTML & JS Updates

14. Update `ecd.html` event counts (lines 7, 9, 112)
15. Update `records.html` event count (line 54)
16. Update `index.html` people count (lines 79, 191)
17. Update `index.html` milestone count (line 7)
18. Update `ecd.js` fallback (line 129) and award filter (line 928)

### Phase 5: Date Cleanup (separate effort as noted)

19. Fix 10 impossible pre-2000 dates
20. Reconcile 53 date/year mismatches
21. Fill in dates where possible from raw post content

---

## Verification Methodology Used

Each finding was produced by reading the actual JSON/JS/HTML files and programmatically comparing:

- Record counts across matching files
- Field-level values (names, dates, numbers) for every shared record
- Referential integrity (do IDs in file A exist in file B?)
- Aggregate stats vs. independently computed totals from raw data
- Hardcoded values in rendering code vs. actual data ranges

No files were modified during this audit. All findings reference specific files, line numbers, and values.
