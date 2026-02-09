"""
Scraper for ECD sidebar event data from dodgeball.livejournal.com
Extracts structured event data from the homepage sidebar
"""
import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
from typing import Dict, List, Any, Optional

class SidebarEventScraper:
    def __init__(self):
        self.base_url = "https://dodgeball.livejournal.com/"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self.events = []

    def fetch_homepage(self) -> Optional[str]:
        """Fetch the homepage HTML"""
        try:
            print(f"Fetching {self.base_url}...")
            response = requests.get(self.base_url, headers=self.headers, timeout=10)
            response.raise_for_status()
            print(f"Successfully fetched homepage (Status: {response.status_code})")
            return response.text
        except requests.exceptions.RequestException as e:
            print(f"Error fetching homepage: {e}")
            return None

    def extract_sidebar_content(self, html: str) -> Optional[BeautifulSoup]:
        """Find and return the sidebar element"""
        soup = BeautifulSoup(html, 'html.parser')
        sidebar = soup.find('div', {'id': 'sidebar'})
        
        if sidebar:
            print("Found sidebar element")
            return sidebar
        
        print("Warning: Could not find sidebar element by ID")
        return None

    def parse_events_from_sidebar(self, sidebar) -> List[Dict[str, Any]]:
        """
        Parse events from sidebar using HTML structure.
        Events are separated by underscores and have a clear structure:
        - Event title (big/u tags)
        - Date (small tag)
        - Main Event Match with winner and loser
        - Various awards (each with small label + bold name)
        - Optional fundraiser info
        """
        events = []
        
        # Get all children that are direct content
        center = sidebar.find('center')
        if not center:
            print("No center tag found in sidebar")
            return events
        
        # Process all elements - split by separator (underscores)
        current_event = None
        elements = center.find_all(recursive=False)
        
        for elem in elements:
            text = elem.get_text(strip=True)
            
            # Skip empty elements
            if not text:
                continue
            
            # Event title is in big/u tags
            title_tag = elem.find('big')
            if title_tag:
                # Save previous event if exists
                if current_event and current_event['event_name']:
                    events.append(current_event)
                
                # Start new event
                current_event = {
                    'event_name': None,
                    'date': None,
                    'main_event': {
                        'winner': None,
                        'loser': None
                    },
                    'awards': [],
                    'fundraiser': None
                }
                
                # Extract event name from the title
                current_event['event_name'] = title_tag.get_text(strip=True)
                continue
            
            # Date is in small tag after title
            if current_event and not current_event['date']:
                small_tag = elem.find('small')
                if small_tag:
                    date_text = small_tag.get_text(strip=True)
                    # Verify it looks like a date
                    if re.search(r'[A-Za-z]+\s+\d{1,2},?\s+\d{4}', date_text):
                        current_event['date'] = date_text
                    continue
            
            # Process content based on small tag labels
            if current_event:
                small_tag = elem.find('small')
                bold_tag = elem.find('b')
                
                if small_tag:
                    label = small_tag.get_text(strip=True).lower()
                    value = bold_tag.get_text(strip=True) if bold_tag else text
                    
                    # Main Event Match
                    if 'main event' in label:
                        # The winner is the next bold text
                        current_event['main_event']['winner'] = None
                        current_event['main_event']['loser'] = None
                    elif current_event['main_event']['winner'] is None and current_event['main_event']['loser'] is None:
                        # If we're still setting main event match, assign winner
                        current_event['main_event']['winner'] = value
                    elif 'defeated' in text.lower() and current_event['main_event']['winner']:
                        # Next value after defeated is loser
                        if bold_tag and current_event['main_event']['loser'] is None:
                            # Skip the defeated text, take next element
                            continue
                        else:
                            # This is the loser
                            current_event['main_event']['loser'] = value
                    elif current_event['main_event']['winner'] and current_event['main_event']['loser'] is None:
                        # This might be loser after defeated
                        if 'defeated' not in text.lower():
                            current_event['main_event']['loser'] = value
                    
                    # Awards
                    elif any(keyword in label for keyword in [
                        'elite inductee', 'rimshot', 'hit the human',
                        '200 events', 'fundraiser', 'remembrance'
                    ]):
                        current_event['awards'].append({
                            'title': label.strip(),
                            'recipient': value if value not in ['main event match', 'defeated', ''] else None
                        })
        
        # Don't forget the last event
        if current_event and current_event['event_name']:
            events.append(current_event)
        
        return events

    def parse_events_improved(self, sidebar) -> List[Dict[str, Any]]:
        """
        Improved parser that reconstructs event blocks from the HTML.
        """
        events = []
        center = sidebar.find('center')
        if not center:
            return events
        
        # Get all direct children
        children = list(center.children)
        
        current_event = None
        i = 0
        
        while i < len(children):
            child = children[i]
            
            # Skip text nodes and empty elements
            if isinstance(child, str):
                text = child.strip()
                if not text or text == '__________________':
                    i += 1
                    continue
            
            # Look for big/u tags - event title
            big_tag = None
            if hasattr(child, 'find'):
                big_tag = child.find('big')
            elif hasattr(child, 'name') and child.name in ['big', 'b']:
                big_tag = child
            
            if big_tag:
                # Save previous event
                if current_event and current_event.get('event_name'):
                    events.append(current_event)
                
                # Start new event
                current_event = {
                    'event_name': big_tag.get_text(strip=True),
                    'date': None,
                    'main_event': {},
                    'awards': [],
                    'fundraiser': None
                }
                i += 1
                continue
            
            # Process data for current event
            if current_event is not None:
                # Check for small tags (labels)
                small_tag = None
                bold_tag = None
                
                if hasattr(child, 'find'):
                    small_tag = child.find('small')
                    bold_tag = child.find('b')
                
                # If this is a date (small tag with date)
                if small_tag and not current_event.get('date'):
                    date_text = small_tag.get_text(strip=True)
                    if re.search(r'[A-Za-z]+\s+\d{1,2},?\s+\d{4}', date_text):
                        current_event['date'] = date_text
                
                # If we have small + bold, it's a label + value
                elif small_tag and bold_tag:
                    label = small_tag.get_text(strip=True)
                    value = bold_tag.get_text(strip=True)
                    
                    label_lower = label.lower()
                    
                    # Main Event Match - need special handling
                    if 'main event' in label_lower:
                        # Next should be winner, then "defeated", then loser
                        current_event['_collecting_main_event'] = True
                        current_event['main_event']['winner'] = None
                        current_event['main_event']['loser'] = None
                    
                    # If we're collecting main event data
                    elif current_event.get('_collecting_main_event'):
                        if current_event['main_event']['winner'] is None:
                            current_event['main_event']['winner'] = value
                        elif current_event['main_event']['loser'] is None:
                            current_event['main_event']['loser'] = value
                            current_event['_collecting_main_event'] = False
                    
                    # Awards and other labeled data
                    else:
                        current_event['awards'].append({
                            'title': label,
                            'recipient': value
                        })
                
                # Handle "defeated" text nodes
                elif isinstance(child, str) and 'defeated' in child.lower():
                    # This is between winner and loser, just skip
                    pass
            
            i += 1
        
        # Save last event
        if current_event and current_event.get('event_name'):
            events.append(current_event)
        
        # Clean up helper fields
        for event in events:
            if '_collecting_main_event' in event:
                del event['_collecting_main_event']
            if not event.get('main_event') or (not event['main_event'].get('winner') and not event['main_event'].get('loser')):
                if 'main_event' in event:
                    del event['main_event']
            if not event.get('awards'):
                del event['awards']
        
        return events

    def parse_events_from_text_nodes(self, sidebar) -> List[Dict[str, Any]]:
        """
        Parse by analyzing text content node by node
        """
        events = []
        center = sidebar.find('center')
        if not center:
            return events
        
        # Extract all text with structure info
        lines = []
        for elem in center.find_all(['big', 'small', 'b']):
            text = elem.get_text(strip=True)
            if text:
                lines.append({
                    'text': text,
                    'tag': elem.name
                })
        
        current_event = None
        skip_defeated = False
        
        for i, line in enumerate(lines):
            text = line['text']
            tag = line['tag']
            
            # Event title (big tag)
            if tag == 'big':
                if current_event and current_event.get('event_name'):
                    events.append(current_event)
                
                current_event = {
                    'event_name': text,
                    'date': None,
                    'main_event': {
                        'winner': None,
                        'loser': None
                    },
                    'awards': [],
                    'fundraiser': None
                }
            
            elif current_event:
                # Date (small tag with date pattern)
                if tag == 'small' and not current_event['date']:
                    if re.search(r'[A-Za-z]+\s+\d{1,2},?\s+\d{4}', text):
                        current_event['date'] = text
                        continue
                
                # Main Event Match label
                if tag == 'small' and 'main event' in text.lower():
                    # Next two b tags are winner and loser
                    current_event['_next_is_winner'] = True
                    continue
                
                # Handle defeated keyword
                if 'defeated' in text.lower():
                    skip_defeated = True
                    current_event['_next_is_loser'] = True
                    continue
                
                # Bold values
                if tag == 'b':
                    # Check if this is part of main event
                    if current_event.get('_next_is_winner'):
                        current_event['main_event']['winner'] = text
                        current_event['_next_is_winner'] = False
                        current_event['_next_is_loser'] = True
                    elif current_event.get('_next_is_loser'):
                        current_event['main_event']['loser'] = text
                        current_event['_next_is_loser'] = False
                    else:
                        # This is a value for a previous label
                        if i > 0 and lines[i-1]['tag'] == 'small':
                            label = lines[i-1]['text']
                            current_event['awards'].append({
                                'title': label,
                                'recipient': text
                            })
                
                # Small tag labels
                if tag == 'small' and not re.search(r'[A-Za-z]+\s+\d{1,2},?\s+\d{4}', text):
                    # This is a label, we'll pair it with next bold
                    pass
        
        # Save last event
        if current_event and current_event.get('event_name'):
            events.append(current_event)
        
        # Clean up
        for event in events:
            for key in ['_next_is_winner', '_next_is_loser']:
                if key in event:
                    del event[key]
            if not event.get('awards'):
                del event['awards']
        
        return events

    def scrape(self) -> List[Dict[str, Any]]:
        """Main scraping function"""
        print("\n=== Starting ECD Sidebar Event Scraper ===\n")
        
        # Fetch homepage
        html = self.fetch_homepage()
        if not html:
            return []
        
        # Extract sidebar
        print("Looking for sidebar...")
        sidebar = self.extract_sidebar_content(html)
        if not sidebar:
            return []
        
        # Extract events using the best method
        print("Extracting events...")
        self.events = self.parse_events_from_text_nodes(sidebar)
        
        print(f"\nExtracted {len(self.events)} events total")
        return self.events

    def save_to_json(self, filepath: str) -> bool:
        """Save extracted events to JSON file"""
        try:
            print(f"\nSaving to {filepath}...")
            
            output = {
                'source': 'https://dodgeball.livejournal.com/',
                'scraped_at': datetime.now().isoformat(),
                'event_count': len(self.events),
                'events': self.events
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            
            print(f"Successfully saved {len(self.events)} events to {filepath}")
            return True
        except Exception as e:
            print(f"Error saving to JSON: {e}")
            return False

def main():
    scraper = SidebarEventScraper()
    
    # Scrape the events
    events = scraper.scrape()
    
    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), 'db')
    scraper.save_to_json(output_path)
    
    # Print detailed summary
    print("\n=== Detailed Event Summary ===")
    for event in events:
        print(f"\n{event.get('event_name', 'Unknown')} ({event.get('date', 'No date')})")
        if event.get('main_event'):
            me = event['main_event']
            if me.get('winner'):
                print(f"  Main Event: {me['winner']} defeated {me.get('loser', 'Unknown')}")
        if event.get('awards'):
            for award in event['awards']:
                print(f"  {award['title']}: {award['recipient']}")
        if event.get('fundraiser'):
            print(f"  Fundraiser: {event['fundraiser']}")

if __name__ == '__main__':
    main()
