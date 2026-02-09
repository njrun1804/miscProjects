# Sidebar Event Scraper - Usage Guide

## Quick Start

Run the scraper from the project root:

```bash
python3 scrape_sidebar_events.py
```

## Requirements

Install required packages:
```bash
pip install requests beautifulsoup4
```

## What It Does

The scraper:
1. Fetches the homepage from https://dodgeball.livejournal.com/
2. Parses the sidebar containing recent ECD event information
3. Extracts structured data for each event
4. Saves all data to `db/raw_ecd_posts/sidebar_events.json`

## Output Data

The script generates a JSON file with the following structure:

```json
{
  "source": "https://dodgeball.livejournal.com/",
  "scraped_at": "ISO-8601 timestamp",
  "event_count": 4,
  "events": [
    {
      "event_name": "Event Name",
      "date": "September 27, 2025",
      "main_event": {
        "winner": "Person Name",
        "loser": "Person Name"
      },
      "awards": [
        {
          "title": "Award Type",
          "recipient": "Person Name"
        }
      ],
      "fundraiser": null
    }
  ]
}
```

## Data Extracted

For each event, the scraper captures:

- **Event Name**: The official name of the dodgeball event
- **Date**: When the event took place (Month DD, YYYY format)
- **Main Event Match**: 
  - Winner: Person who won the main match
  - Loser: Person who lost the main match
- **Awards**: Various titles and honors:
  - ECD Elite Inductee
  - Rimshot Contest Champion
  - Hit The Human Champion
  - 200 Events Award
  - In Remembrance
  - Fundraiser amounts
  - Other special awards

## File Locations

- **Script**: `/sessions/upbeat-festive-hopper/mnt/Projects/miscProjects/timeline-of-tron/scrape_sidebar_events.py`
- **Output**: `/sessions/upbeat-festive-hopper/mnt/Projects/miscProjects/timeline-of-tron/db/raw_ecd_posts/sidebar_events.json`

## Customization

To modify the scraper:

1. Change the target URL - modify `self.base_url` in the `SidebarEventScraper` class
2. Change output location - modify the `output_path` in the `main()` function
3. Add new award types - update the award keyword list in `parse_events_from_text_nodes()`

## Troubleshooting

**Issue**: ConnectionError when fetching the homepage
- **Solution**: Check internet connection and ensure the website is accessible

**Issue**: No events found
- **Solution**: The website structure may have changed. Inspect the sidebar HTML to verify the structure.

**Issue**: Incomplete data extraction
- **Solution**: The sidebar HTML structure may have changed. Check the actual HTML using:
  ```python
  import requests
  from bs4 import BeautifulSoup
  response = requests.get('https://dodgeball.livejournal.com/')
  soup = BeautifulSoup(response.text, 'html.parser')
  sidebar = soup.find('div', {'id': 'sidebar'})
  print(sidebar.prettify())
  ```

## Recent Updates

- **2026-02-08**: Initial creation with support for parsing 4 recent events
- Successfully extracts all major award categories
- Properly handles main event match data
- Saves structured JSON output

## Integration with Database

The JSON output is ready for database integration:

```python
import json

with open('db/raw_ecd_posts/sidebar_events.json', 'r') as f:
    sidebar_data = json.load(f)

# Access events
for event in sidebar_data['events']:
    print(f"{event['event_name']} - {event['date']}")
    # Insert into database...
```

