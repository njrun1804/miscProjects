# ECD Sidebar Event Scraper - Summary

## Overview
Successfully created and executed a Python scraper to extract structured event data from the dodgeball.livejournal.com homepage sidebar.

## Script Location
- **Scraper Script**: `/sessions/upbeat-festive-hopper/mnt/Projects/miscProjects/timeline-of-tron/scrape_sidebar_events.py`
- **Output File**: `/sessions/upbeat-festive-hopper/mnt/Projects/miscProjects/timeline-of-tron/db/raw_ecd_posts/sidebar_events.json`

## Data Extracted

### Events Found: 4 Recent ECD Events

#### 1. ANNIVERSARY XX
- **Date**: September 27, 2025
- **Main Event**: DIANA DIBUCCIO defeated JOHN TRONOLONE
- **Awards**:
  - In Remembrance: MICHAEL ROSINSKI
  - 200 Events Award: DIANA DIBUCCIO
  - ECD Elite Inductee: SASCHA BASISTA
  - Rimshot Contest Champion: KEVIN FITZPATRICK

#### 2. 2025 PRO BOWL
- **Date**: February 8, 2025
- **Main Event**: BOBBY BROWN defeated MATT BROWN
- **Fundraiser**: $1,720 For LAUREN & EMMA

#### 3. INDOOR.III:FAMILY AFFAIR
- **Date**: September 21, 2024
- **Main Event**: BRODY LETSCHE defeated RYAN LETSCHE
- **Awards**:
  - Rimshot Contest Champion: ZACH KATZ

#### 4. 18TH ANNIVERSARY
- **Date**: August 26, 2023
- **Main Event**: MICHELLE MULLINS defeated DAN SPENGEMAN
- **Awards**:
  - ECD Elite Inductee: DAN SPENGEMAN
  - Hit The Human Champion: KEVIN MEGILL

## Technical Details

### Libraries Used
- `requests` - HTTP requests for fetching the homepage
- `BeautifulSoup` - HTML parsing and data extraction
- `json` - JSON serialization
- `re` - Regular expressions for pattern matching
- `datetime` - Timestamp recording

### Parsing Approach
The scraper analyzes the sidebar HTML structure to identify:
1. **Event Titles** - Found in `<big>` tags
2. **Dates** - Found in `<small>` tags with date patterns (Month DD, YYYY)
3. **Labels** - Found in `<small>` tags (e.g., "Main Event Match", "ECD Elite Inductee")
4. **Values** - Found in `<b>` (bold) tags paired with labels

### Data Structure
Each event in the JSON output includes:
- `event_name` - The name/title of the event
- `date` - Event date
- `main_event` - Object with winner and loser
- `awards` - Array of award objects with title and recipient
- `fundraiser` - Fundraiser information (if applicable)

### Output Format (JSON)
```json
{
  "source": "https://dodgeball.livejournal.com/",
  "scraped_at": "ISO-8601 timestamp",
  "event_count": 4,
  "events": [
    {
      "event_name": "Event Name",
      "date": "Month DD, YYYY",
      "main_event": {
        "winner": "Name",
        "loser": "Name"
      },
      "awards": [
        {
          "title": "Award Name",
          "recipient": "Person Name"
        }
      ],
      "fundraiser": null
    }
  ]
}
```

## Key Features

✓ Fetches live data from dodgeball.livejournal.com
✓ Parses structured HTML with BeautifulSoup
✓ Extracts 4 recent ECD events with full details
✓ Captures Main Event match winners and losers
✓ Extracts all awards with recipients:
  - ECD Elite Inductee
  - Rimshot Contest Champion
  - Hit The Human Champion
  - 200 Events Award
  - Fundraiser amounts
✓ Saves to JSON format for database integration
✓ Includes metadata (source, timestamp, event count)
✓ Proper error handling and logging

## File Size
- Output JSON: 1.9 KB (well-formatted, 4 events)

## Execution Status
✓ Successfully completed
✓ All 4 expected events extracted
✓ Data properly formatted and saved
