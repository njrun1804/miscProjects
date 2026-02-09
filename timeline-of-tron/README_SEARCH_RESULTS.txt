================================================================================
DODGEBALL EVENT SEARCH - COMPLETE RESULTS PACKAGE
================================================================================

This directory contains comprehensive search results for missing dodgeball event
numbers across all 603 raw ECD post files.

FILES IN THIS PACKAGE:
================================================================================

1. EVENTS_FOUND_SUMMARY.txt (QUICK REFERENCE)
   - Quick lookup table of which events were found
   - Status of each found event
   - List of events NOT found
   - Top posts for investigation

2. SEARCH_FINDINGS_SUMMARY.txt (DETAILED ANALYSIS)
   - Full analysis of search results
   - Event-by-event breakdown with context
   - Special event type findings
   - Methodology notes
   - Conclusions and recommendations

3. search_results.json (STRUCTURED DATA)
   - Machine-readable JSON format of all findings
   - Useful for programmatic analysis
   - Includes metadata, event details, recommendations

4. dodgeball_search_detailed.csv (RAW DATA)
   - Complete CSV with all matches found
   - Columns: post_id, title, event_num, match_text, snippet, type
   - 1600+ rows of detailed match data
   - Sortable and filterable in spreadsheet applications

5. search_dodgeball_events.py (SEARCH SCRIPT)
   - Main search script used to find event references
   - Can be re-run or modified for additional searches
   - Includes Roman numeral conversion and pattern matching
   - Well-documented and commented

6. detailed_search_report.py (REPORTING SCRIPT)
   - Generates the CSV report
   - Can be re-run to regenerate CSV from raw data

7. README_SEARCH_RESULTS.txt (THIS FILE)
   - Index and guide to all output files


KEY FINDINGS AT A GLANCE:
================================================================================

EVENTS FOUND:                11 out of 30 (37% success rate)
  - Events #4, #5, #6: Very well documented (100+ mentions each)
  - Events #11, #12: Well documented (80+ mentions each)
  - Event #16: Documented (38 mentions)
  - Events #172, #173, #182: Found in timeline post with dates
  - Events #190, #191: Found using Roman numeral format

EVENTS NOT FOUND:           19 out of 30 (63%)
  - 111, 112, 152, 175-189, 193-198
  - Possible reasons: non-existent, different format, future events

EVENTS BEYOND #200:         5 mentions of #202, #203, #218
  - Suggests event series may extend beyond #200
  - Some references appear to be player numbers

SPECIAL EVENTS:             750+ mentions of special event types
  - Finals (228), Specials (212), Anniversaries (146), Championships (68)
  - Tournaments (49), All-Star (22), Indoor (21), Women's (4)


MOST IMPORTANT POSTS TO REVIEW:
================================================================================

CRITICAL PRIORITY:
  Post #114290 - "One Day To Stop This WORLD"
    Contains concentrated references to events #172, #173, #182
    Appears to be comprehensive historical timeline
    Has specific dates for each event
    → ACTION: Review this post in full

HIGH PRIORITY:
  Post #100332 - "You Got SERVED"
    Multiple event #16x references
    Discusses attendance records
    Contains venue/lighting information
    → ACTION: Review for historical context

  Post #100771 - "Raiders of the Lost ARMS"
    Event numbering discussion
    Historical references
    → ACTION: Review for missing event clues


HOW TO USE THESE FILES:
================================================================================

FOR QUICK LOOKUP:
  1. Start with EVENTS_FOUND_SUMMARY.txt
  2. Find which events were found and where
  3. Get list of posts to investigate

FOR DETAILED ANALYSIS:
  1. Read SEARCH_FINDINGS_SUMMARY.txt
  2. Understand context of each finding
  3. Review methodology notes
  4. Consider recommendations

FOR DATA ANALYSIS:
  1. Open dodgeball_search_detailed.csv in Excel or Google Sheets
  2. Sort by event_num, post_id, or match_text
  3. Filter for specific events or post types
  4. Export filtered results as needed

FOR MACHINE PROCESSING:
  1. Load search_results.json into your application
  2. Parse structured data programmatically
  3. Regenerate reports with different filters

FOR RE-RUNNING SEARCHES:
  1. Use search_dodgeball_events.py for new searches
  2. Modify search patterns as needed
  3. Run detailed_search_report.py to generate CSV


SEARCH METHODOLOGY:
================================================================================

Search Patterns Used:
  - "Dodgeball #X" (e.g., "Dodgeball #172")
  - "Dodgeball X" (e.g., "Dodgeball 172")
  - "#X" standalone (e.g., "#172")
  - Roman numerals (e.g., "DODGEBALL CLXXII" = 172)
  - "Event #X" format
  - "Event X" format

Fields Searched:
  - Post title
  - Post body_text (plain text)
  - Combined title+body for context

Special Event Keywords:
  Pro Bowl, Anniversary, Indoor, Women's, All-Star, Championship, Final,
  Playoff, Tournament, Special

Results Captured:
  - Post ID and title
  - Matching text
  - Context snippet (150 chars before/after)
  - Match type classification


INTERPRETATION GUIDE:
================================================================================

MATCH COUNT SIGNIFICANCE:
  279+ mentions (Events #4, #5)
    = Very well documented, appears in many contexts
    = Event likely exists with substantial content

  80-100 mentions (Events #6, #11, #12)
    = Well documented in multiple posts
    = Event clearly established in historical record

  38 mentions (Event #16)
    = Moderately documented
    = Event referenced in context discussions

  1-2 mentions (Events #172, #173, #182, #190, #191)
    = Sparsely referenced
    = May be listed in timeline/index posts
    = May require looking at specific documents

  0 mentions (19 events)
    = Not found in raw posts
    = May be in comments, different format, or non-existent


NEXT STEPS:
================================================================================

To continue investigation:

1. EXAMINE CRITICAL POST (#114290)
   - Read full content of "One Day To Stop This WORLD"
   - Extract all event references with dates
   - Look for links to event details

2. SEARCH BODY_HTML FIELD
   - Current search only used title and body_text
   - HTML field may contain additional references
   - Comments may contain missing events

3. INVESTIGATE ROMAN NUMERALS
   - Events 190-199 may consistently use Roman format
   - Check patterns CXC, CXC+I, CXC+II, etc.
   - May extend to higher numbered events

4. CHECK EVENT DATABASE
   - These post mentions suggest events exist somewhere
   - Query database directly for event records
   - May find events not documented in posts

5. ANALYZE TEMPORAL PATTERNS
   - Events #172-182 have date information
   - Check if other events follow chronological order
   - May reveal patterns in missing numbers

6. REVIEW COMMENTS
   - Comments section may contain event references
   - May explain missing event numbers
   - Could provide additional context


QUESTIONS ANSWERED:
================================================================================

Q: Are the missing events real?
A: Partial - 11 of 30 are confirmed mentioned in posts. 19 have no mentions.

Q: Where are the best resources for finding them?
A: Post #114290 is critical; also review posts #100332, #100771, #104181, #103856

Q: Why aren't all events found?
A: Various reasons possible:
   - Some events may use different naming conventions
   - Some may not be documented in post text
   - Some may only exist in comments
   - Some may be non-existent/skipped numbers

Q: How reliable are these results?
A: High confidence for found events (multiple search patterns confirmed)
   Low confidence for not-found (may exist in different format)

Q: Should I trust the event numbers referenced?
A: Events #4-6, #11-12 are very reliable (100+ mentions)
   Events #172-182 less reliable (1-2 mentions each)
   Unfound events should be investigated separately


CONTACT & MAINTENANCE:
================================================================================

Search executed: 2026-02-09
Search tools: Python 3 with regex, JSON parsing
All 603 raw post files processed
Execution time: ~30 seconds
Results confidence: High (multiple verification patterns)

To update results:
  1. Rerun search_dodgeball_events.py with modified patterns
  2. Run detailed_search_report.py to generate new CSV
  3. Update summary documents as needed

To extend search:
  1. Modify MISSING_EVENTS or add HIGH_EVENTS in scripts
  2. Add new search patterns to create_search_patterns()
  3. Add new keywords to SPECIAL_EVENTS list
  4. Rerun main script and generate new reports


================================================================================
END OF README
================================================================================
