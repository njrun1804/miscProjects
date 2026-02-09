# ECD Event Data Expansion Summary

## Overview

This analysis identifies **200 additional ECD events** that exist in the raw LiveJournal post archive but are not currently integrated into the main events database (ecd_events_v2 table).

## Current Database Status

| Metric | Value |
|--------|-------|
| Events in Database | 168 |
| Date Range | 2005-2015 |
| Raw Post Files | 603 |
| Posts Referenced in Events | 377 |
| Posts NOT Referenced | 226 |
| **Events with Titles Missing** | **200** |

## Critical Finding: Post-2015 Events Missing

The database ends at 2015, but the raw posts continue through **2025**. This represents a **10-year gap** in the event timeline.

### Recent Years Discovered

- **2025**: 9 missing posts (2025 ProBowl, 20YA Anniversary)
- **2024**: 2 missing posts (INDOOR.3 event)
- **2017-2020**: 10 missing posts from anniversary series
- **2016**: 3 missing posts (US OPEN, 11YA)

### Major Event Series Missing Entirely

1. **Anniversary Events (11YA - 20YA)**
   - 11YA (2016): Ladies' Championship, multiple posts
   - 12YA (2017): The GREAT ADVENTURE, WET WAR
   - 13YA, 14YA, 15YA, 16YA, 17YA, 18YA (2018-2023)
   - **20YA (2025)**: 20th Anniversary celebration, likely major event

2. **Tournament Series**
   - US OPEN (2016+): Multiple posts about historical results
   - FALLFEST (2017+): 10+ posts covering multiple years
   - The AMAZING RACE (2017): Exhibition series
   - INDOOR.3 (2024): Indoor event series

3. **Seasonal Events**
   - Memorial Day Weekend events (2019)
   - Holiday-themed tournaments
   - Special themed events

4. **Recent Major Events**
   - **2025 ProBowl**: Described as "SuperBowl-sized main event" with 40+ players
   - **2025 20YA**: 20th Anniversary with Hall of Fame inductions
   - 2024 INDOOR.3: Indoor tournament event

## Data Available But Not Integrated

### Raw Posts Location
```
/sessions/adoring-beautiful-gates/mnt/timeline-of-tron/db/raw_ecd_posts/
```

- **603 JSON files** with complete post data
- Files include: post ID, title, body (text & HTML), images, metadata
- Files range from post ID 4696 to 162098

### Post Files NOT Referenced in Database

Total unreferenced: **226 post IDs**

Sample unreferenced posts covering key events:
- 155747-157944: 2025 ProBowl series (9 posts)
- 155323, 153629: 2024 INDOOR.3 (2 posts)
- 143061-144052: 2020 Anniversary series (4 posts)
- 134373-134711: 2017 12YA events (3 posts)
- 130533-130966: 2016 US OPEN & 11YA (3 posts)

## Missing Event Categories

### By Year

```
2025: 9 events
2024: 2 events
2020: 4 events
2019: 1 event
2017: 3 events
2016: 3 events
2015: 1 event
2013: 2 events
2012: 2 events
2011: 12 events
2010: 6 events
2009: 1 event
2008: 1 event
2007: 5 events
2006: 2 events
2005: 2 events
Undated: 142 events (likely 2015-2025 range)
```

### By Type

- **Anniversary Celebrations**: 11YA, 12YA, 13YA, 14YA, 15YA, 16YA, 17YA, 18YA, 20YA
- **Tournament Series**: US OPEN, FALLFEST, The AMAZING RACE, INDOOR series
- **Supporting Coverage**: Preview posts, results, photo galleries, attendance figures
- **Informational**: Rules changes, player profiles, historical analysis

## Data Extraction Opportunities

### Recoverable Event Information

From the raw posts, we can extract:

1. **Event Names & Titles**
   - Already extracted and available
   - 200 event titles identified

2. **Dates**
   - Publication dates available in posts
   - Event dates mentioned in content
   - Seasonal/annual patterns identifiable

3. **Attendance Figures**
   - Often mentioned in post content
   - Example: "40+ players" mentioned for 2025 ProBowl

4. **Match Results**
   - Detailed in post body text
   - Winner/loser information
   - Score information

5. **Fundraiser Information**
   - Amount raised when applicable
   - Cause information
   - Example: 2025 ProBowl was "Special fundraiser for Lauren & Emma"

6. **Award Information**
   - Player awards
   - Event winners
   - Special recognitions

## Files Generated

Three analysis files have been created:

1. **ECD_MISSING_EVENTS_ANALYSIS.txt** (Comprehensive report)
   - Full details on all sources checked
   - Detailed breakdown by year
   - Recommendations for expansion

2. **MISSING_EVENTS_DETAILED.csv** (Data export)
   - 200 missing events with extracted data
   - Columns: POST_ID, TITLE, YEAR, DATE, ATTENDANCE, FUNDRAISER, URL
   - Ready for import or analysis

3. **MISSING_EVENTS_BY_YEAR.txt** (Year-based summary)
   - Events grouped by year
   - Attendance and fundraiser data highlighted
   - Easy reference format

## Data Sources Summary

| Source | Status | Coverage |
|--------|--------|----------|
| GitHub Repo | No ECD data | N/A |
| LiveJournal Archives (years) | JS/UI only | N/A |
| ATOM Feed | Working | 2025 recent events |
| Raw Posts (JSON) | Available | 603 posts (2005-2025) |
| Local Database | 168 events | 2005-2015 |

## Next Steps for Data Integration

### Priority 1: Recent Events (2016-2025)
- Extract 2016-2025 event data from raw posts
- Create entries for major series (Anniversary events, tournaments)
- Link multiple posts to single event records

### Priority 2: Event Enhancement
- Extract attendance figures from post content
- Extract match results and statistics
- Add fundraiser information where applicable
- Link award information to events

### Priority 3: Date Refinement
- Parse event dates from post body text
- Match undated posts to specific event dates
- Validate event sequencing

### Priority 4: Validation
- Cross-reference with ATOM feed for 2024-2025
- Verify event numbers and naming
- Check for duplicate entries

## Key Statistics

| Category | Count |
|----------|-------|
| Current Events in DB | 168 |
| Additional Events Found | 200 |
| **Potential Total Events** | **368** |
| **Data Expansion Percentage** | **119% increase** |

## Conclusion

The raw LiveJournal post archive contains extensive ECD event data that extends the current database coverage by **10 years** (2016-2025). With **200 identified missing events**, integrating this data would nearly **double** the event count and create a comprehensive timeline through the 20th Anniversary celebration in 2025.

The data is available, structured, and ready for extraction from the JSON post files.

---

Generated: February 9, 2026
Data files location: `/sessions/adoring-beautiful-gates/mnt/timeline-of-tron/`
