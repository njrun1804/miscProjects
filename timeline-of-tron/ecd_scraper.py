#!/usr/bin/env python3
"""
ECD LiveJournal Scraper
=======================
Scrapes all posts from dodgeball.livejournal.com and saves structured data.

Usage:
    python3 ecd_scraper.py                    # Run full pipeline
    python3 ecd_scraper.py --phase ids        # Only collect post IDs
    python3 ecd_scraper.py --phase content    # Only download content (needs IDs first)
    python3 ecd_scraper.py --phase sidebar    # Only extract sidebar data
    python3 ecd_scraper.py --phase parse      # Only parse downloaded content
"""

import json
import re
import os
import sys
import time
import logging
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

import requests

# Setup
BASE_URL = "https://dodgeball.livejournal.com"
PROJECT_DIR = Path(__file__).parent
RAW_DIR = PROJECT_DIR / "db" / "raw_ecd_posts"
API_DIR = PROJECT_DIR / "db" / "api"
RAW_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# PHASE 1: Collect all post IDs via monthly pages
# ─────────────────────────────────────────────

def collect_post_ids():
    """Scan all monthly pages to discover every post URL and ID."""
    log.info("Phase 1: Collecting post IDs from monthly pages...")
    all_ids = set()

    for year in range(2005, 2026):
        start_month = 10 if year == 2005 else 1
        end_month = 10 if year == 2025 else 12
        for month in range(start_month, end_month + 1):
            url = f"{BASE_URL}/{year}/{month:02d}/"
            try:
                resp = requests.get(url, timeout=30)
                ids = set(int(m) for m in re.findall(
                    r'dodgeball\.livejournal\.com/(\d+)\.html', resp.text))
                all_ids.update(ids)
                if ids:
                    log.info(f"  {year}/{month:02d}: {len(ids)} posts (IDs: {min(ids)}-{max(ids)})")
            except Exception as e:
                log.warning(f"  {year}/{month:02d}: Error - {e}")
            time.sleep(0.3)  # Be polite

    sorted_ids = sorted(all_ids)
    log.info(f"Total unique post IDs discovered: {len(sorted_ids)}")
    log.info(f"ID range: {sorted_ids[0]} to {sorted_ids[-1]}")

    # Save to file
    index_file = RAW_DIR / "posts_index.json"
    with open(index_file, 'w') as f:
        json.dump({
            "total": len(sorted_ids),
            "min_id": sorted_ids[0],
            "max_id": sorted_ids[-1],
            "collected_at": datetime.now().isoformat(),
            "post_ids": sorted_ids,
            "post_urls": [f"{BASE_URL}/{pid}.html" for pid in sorted_ids]
        }, f, indent=2)
    log.info(f"Saved post index to {index_file}")
    return sorted_ids


# ─────────────────────────────────────────────
# PHASE 2: Download full post content
# ─────────────────────────────────────────────

def download_atom_feed():
    """Download the 25 most recent posts via ATOM feed (full HTML content)."""
    log.info("Downloading ATOM feed (25 most recent posts)...")
    resp = requests.get(f"{BASE_URL}/data/atom", timeout=30)
    root = ET.fromstring(resp.text)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}

    posts = []
    for entry in root.findall('.//atom:entry', ns):
        title = entry.find('atom:title', ns)
        published = entry.find('atom:published', ns)
        updated = entry.find('atom:updated', ns)
        content = entry.find('atom:content', ns)
        link = entry.find('atom:link[@rel="alternate"]', ns)

        post_url = link.get('href') if link is not None else ''
        post_id = int(re.search(r'/(\d+)\.html', post_url).group(1)) if post_url else 0

        posts.append({
            "id": post_id,
            "url": post_url,
            "title": title.text if title is not None else "",
            "date": published.text if published is not None else "",
            "updated": updated.text if updated is not None else "",
            "content_html": content.text if content is not None else "",
            "source": "atom_feed"
        })

    log.info(f"Downloaded {len(posts)} posts from ATOM feed")
    return posts


def download_posts_playwright(post_ids, already_downloaded=None):
    """Download full post content using Playwright headless browser."""
    from playwright.sync_api import sync_playwright

    if already_downloaded is None:
        already_downloaded = set()

    remaining = [pid for pid in post_ids if pid not in already_downloaded]
    log.info(f"Downloading {len(remaining)} posts via Playwright (skipping {len(already_downloaded)} already downloaded)...")

    posts = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for i, pid in enumerate(remaining):
            url = f"{BASE_URL}/{pid}.html"
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)

                # Extract post data from rendered page
                data = page.evaluate("""() => {
                    // Get post title
                    var titleEl = document.querySelector('.aentry-post__title, .b-singlepost-title, h1');
                    var title = titleEl ? titleEl.textContent.trim() : '';

                    // Get post body
                    var bodyEl = document.querySelector('.aentry-post__text, .b-singlepost-body, .entry-content');
                    var bodyText = bodyEl ? bodyEl.textContent.trim() : '';
                    var bodyHtml = bodyEl ? bodyEl.innerHTML : '';

                    // Get date
                    var dateEl = document.querySelector('.aentry-post__date, .b-singlepost-date time, .date');
                    var date = dateEl ? dateEl.textContent.trim() : '';

                    // Get comment count
                    var commentEl = document.querySelector('.aentry-post__comments-count, .b-singlepost-comments-count');
                    var comments = commentEl ? commentEl.textContent.trim() : '';

                    // Get images
                    var imgs = bodyEl ? Array.from(bodyEl.querySelectorAll('img')).map(img => img.src) : [];

                    return {title: title, body_text: bodyText, body_html: bodyHtml,
                            date: date, comments: comments, images: imgs};
                }""")

                post = {
                    "id": pid,
                    "url": url,
                    "title": data.get("title", ""),
                    "date": data.get("date", ""),
                    "body_text": data.get("body_text", ""),
                    "body_html": data.get("body_html", ""),
                    "comment_count_text": data.get("comments", ""),
                    "images": data.get("images", []),
                    "source": "playwright"
                }
                posts.append(post)

                # Save individual post
                post_file = RAW_DIR / f"{pid}.json"
                with open(post_file, 'w') as f:
                    json.dump(post, f, indent=2)

                if (i + 1) % 10 == 0:
                    log.info(f"  Downloaded {i+1}/{len(remaining)} posts (current: {pid})")

                time.sleep(2)  # Rate limiting

            except Exception as e:
                log.warning(f"  Error downloading post {pid}: {e}")
                posts.append({
                    "id": pid, "url": url, "error": str(e), "source": "playwright_error"
                })

        browser.close()

    log.info(f"Downloaded {len([p for p in posts if 'error' not in p])} posts successfully")
    return posts


def download_posts_bulk_pages():
    """
    Alternative: Download posts by navigating main page with ?skip=N
    and extracting all visible post text. Faster than individual posts.
    """
    from playwright.sync_api import sync_playwright

    log.info("Downloading posts via bulk page scraping...")
    all_posts = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Scrape main page with skip pagination (covers ~350+ recent posts)
        for skip in range(0, 400, 50):
            url = f"{BASE_URL}/?skip={skip}"
            log.info(f"  Loading {url}...")
            try:
                page.goto(url, wait_until="networkidle", timeout=60000)
                time.sleep(3)  # Let dynamic content load

                # Extract all post entries from the page
                posts_data = page.evaluate("""() => {
                    var posts = [];
                    // Try different selectors for post entries
                    var entries = document.querySelectorAll('.aentry, .b-singlepost, .entry');
                    if (entries.length === 0) {
                        // Fallback: get full page text
                        return [{type: 'fullpage', text: document.body.innerText}];
                    }
                    entries.forEach(function(entry) {
                        var titleEl = entry.querySelector('.aentry-post__title, h2, h3');
                        var bodyEl = entry.querySelector('.aentry-post__text, .entry-content');
                        var dateEl = entry.querySelector('.aentry-post__date, time');
                        var linkEl = entry.querySelector('a[href*=".html"]');
                        posts.push({
                            title: titleEl ? titleEl.textContent.trim() : '',
                            body: bodyEl ? bodyEl.textContent.trim() : '',
                            body_html: bodyEl ? bodyEl.innerHTML : '',
                            date: dateEl ? dateEl.textContent.trim() : '',
                            url: linkEl ? linkEl.href : ''
                        });
                    });
                    return posts;
                }""")

                # If we got fullpage text, parse it
                if posts_data and posts_data[0].get('type') == 'fullpage':
                    text = posts_data[0]['text']
                    # Parse the text by splitting on "- THROW A BALL -" markers
                    raw_posts = text.split('- THROW A BALL -')
                    for rp in raw_posts:
                        rp = rp.strip()
                        if not rp:
                            continue
                        # Try to extract date and title
                        date_match = re.match(
                            r'(\d+ \w+ \d{4} @ \d+:\d+ [ap]m)\s*(.*)', rp, re.DOTALL)
                        if date_match:
                            date_str = date_match.group(1)
                            rest = date_match.group(2).strip()
                            # First line is title
                            lines = rest.split('\n', 1)
                            title = lines[0].strip()
                            body = lines[1].strip() if len(lines) > 1 else ''
                            all_posts.append({
                                'date': date_str,
                                'title': title,
                                'body_text': body,
                                'source': f'bulk_skip_{skip}'
                            })
                else:
                    for pd in posts_data:
                        url_match = re.search(r'/(\d+)\.html', pd.get('url', ''))
                        post_id = int(url_match.group(1)) if url_match else 0
                        pd['id'] = post_id
                        pd['source'] = f'bulk_skip_{skip}'
                        all_posts.append(pd)

                log.info(f"    Extracted {len(posts_data)} entries from skip={skip}")

            except Exception as e:
                log.warning(f"  Error loading skip={skip}: {e}")

            time.sleep(2)

        # For older posts not covered by skip pagination,
        # scrape monthly archive pages
        log.info("  Scraping older monthly archive pages...")
        for year in range(2005, 2009):
            start_month = 10 if year == 2005 else 1
            for month in range(start_month, 13):
                url = f"{BASE_URL}/{year}/{month:02d}/"
                try:
                    page.goto(url, wait_until="networkidle", timeout=60000)
                    time.sleep(2)

                    text = page.evaluate("() => document.body.innerText")
                    raw_posts = text.split('- THROW A BALL -')
                    month_posts = []
                    for rp in raw_posts:
                        rp = rp.strip()
                        if not rp:
                            continue
                        date_match = re.match(
                            r'(\d+ \w+ \d{4} @ \d+:\d+ [ap]m)\s*(.*)', rp, re.DOTALL)
                        if date_match:
                            month_posts.append({
                                'date': date_match.group(1),
                                'title': date_match.group(2).split('\n')[0].strip(),
                                'body_text': '\n'.join(date_match.group(2).split('\n')[1:]).strip(),
                                'source': f'monthly_{year}_{month:02d}'
                            })
                    all_posts.extend(month_posts)
                    if month_posts:
                        log.info(f"    {year}/{month:02d}: {len(month_posts)} posts")
                except Exception as e:
                    log.warning(f"    Error {year}/{month:02d}: {e}")
                time.sleep(1)

        browser.close()

    log.info(f"Total posts downloaded via bulk: {len(all_posts)}")
    return all_posts


def download_all_content():
    """Master content download function."""
    # Load post index
    index_file = RAW_DIR / "posts_index.json"
    if not index_file.exists():
        log.error("Post index not found. Run --phase ids first.")
        return

    with open(index_file) as f:
        index = json.load(f)

    post_ids = index["post_ids"]
    log.info(f"Loaded {len(post_ids)} post IDs")

    # Check which posts already downloaded
    already = set()
    for f in RAW_DIR.glob("*.json"):
        if f.name.isdigit() or f.stem.isdigit():
            already.add(int(f.stem))
    log.info(f"Already downloaded: {len(already)} posts")

    # Step 1: Get ATOM feed posts (25 most recent with full HTML)
    atom_posts = download_atom_feed()
    for ap in atom_posts:
        if ap["id"] and ap["id"] not in already:
            post_file = RAW_DIR / f"{ap['id']}.json"
            with open(post_file, 'w') as f:
                json.dump(ap, f, indent=2)
            already.add(ap["id"])

    # Step 2: Download remaining posts via Playwright
    download_posts_playwright(post_ids, already)

    log.info("Content download complete!")


# ─────────────────────────────────────────────
# PHASE 3: Extract sidebar data
# ─────────────────────────────────────────────

def extract_sidebar():
    """Extract structured event data from the sidebar."""
    from playwright.sync_api import sync_playwright

    log.info("Phase 3: Extracting sidebar data...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(BASE_URL, wait_until="networkidle", timeout=60000)
        time.sleep(3)

        # Get sidebar text
        sidebar_text = page.evaluate("""() => {
            // Try to get the sidebar element
            var sidebar = document.querySelector('#sidebar, .sidebar, .layout-sidebar');
            if (!sidebar) {
                // Get full page text and we'll parse the sidebar section
                return document.body.innerText;
            }
            return sidebar.innerText;
        }""")

        browser.close()

    # Parse sidebar events
    events = parse_sidebar_text(sidebar_text)

    sidebar_file = RAW_DIR / "sidebar_events.json"
    with open(sidebar_file, 'w') as f:
        json.dump(events, f, indent=2)
    log.info(f"Extracted {len(events)} sidebar events")
    return events


def parse_sidebar_text(text):
    """Parse sidebar text into structured event data."""
    events = []

    # Split on the separator lines
    sections = re.split(r'_{5,}', text)

    for section in sections:
        section = section.strip()
        if not section:
            continue

        event = {}
        lines = [l.strip() for l in section.split('\n') if l.strip()]

        if not lines:
            continue

        # First line is usually the event name
        event['name'] = lines[0]

        # Look for date
        for line in lines:
            date_match = re.match(r'((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+,?\s+\d{4})', line)
            if date_match:
                event['date'] = date_match.group(1)

        # Look for Main Event Match
        for i, line in enumerate(lines):
            if 'Main Event Match' in line:
                # Next lines should be winner, "defeated", loser
                if i + 3 < len(lines):
                    event['main_event_winner'] = lines[i + 1]
                    event['main_event_loser'] = lines[i + 3] if lines[i + 2].lower() == 'defeated' else lines[i + 2]

        # Look for awards
        for i, line in enumerate(lines):
            if 'ECD Elite Inductee' in line and i + 1 < len(lines):
                event['ecd_elite_inductee'] = lines[i + 1]
            if 'Rimshot Contest Champion' in line and i + 1 < len(lines):
                event['rimshot_champion'] = lines[i + 1]
            if 'Hit The Human Champion' in line and i + 1 < len(lines):
                event['hit_the_human_champion'] = lines[i + 1]
            if '200 Events Award' in line and i + 1 < len(lines):
                event['200_events_award'] = lines[i + 1]
            if 'In Remembrance' in line and i + 1 < len(lines):
                event['in_remembrance'] = lines[i + 1]

        # Look for ProBowl fundraiser
        for line in lines:
            fund_match = re.search(r'\$([0-9,]+)\s+(?:For|for)\s+(.+)', line)
            if fund_match:
                event['fundraiser_amount'] = fund_match.group(1).replace(',', '')
                event['fundraiser_beneficiary'] = fund_match.group(2)

        if event.get('name') and len(event) > 1:
            events.append(event)

    return events


# ─────────────────────────────────────────────
# PHASE 4: Parse content into structured data
# ─────────────────────────────────────────────

def parse_all_posts():
    """Parse all downloaded posts into structured data."""
    log.info("Phase 4: Parsing all downloaded posts...")

    posts = []
    for f in sorted(RAW_DIR.glob("*.json")):
        if f.stem in ('posts_index', 'sidebar_events', 'all_posts',
                       'ecd_events', 'ecd_players', 'ecd_awards'):
            continue
        try:
            with open(f) as fh:
                post = json.load(fh)
            if post.get('error'):
                continue
            posts.append(post)
        except Exception as e:
            log.warning(f"Error reading {f}: {e}")

    log.info(f"Loaded {len(posts)} posts for parsing")

    # Extract structured data
    events = extract_events_from_posts(posts)
    players = extract_players_from_posts(posts)
    awards = extract_awards_from_posts(posts)

    # Save parsed data
    save_json(RAW_DIR / "all_posts.json", posts)
    save_json(RAW_DIR / "ecd_events.json", events)
    save_json(RAW_DIR / "ecd_players.json", players)
    save_json(RAW_DIR / "ecd_awards.json", awards)

    log.info(f"Parsed: {len(events)} events, {len(players)} players, {len(awards)} awards")
    return events, players, awards


def extract_events_from_posts(posts):
    """Extract event references and results from posts."""
    events = []

    for post in posts:
        text = post.get('body_text', '') or ''
        title = post.get('title', '') or ''
        full_text = f"{title}\n{text}"

        # Match event numbers: DODGEBALL [N], ECD [N], etc.
        event_matches = re.findall(
            r'(?:DODGEBALL|ECD|Dodgeball)\s+(\d+|[IVXLCDM]+)', full_text)

        # Match anniversary references
        anniv_matches = re.findall(
            r'(\d+)(?:st|nd|rd|th)\s+(?:Anniversary|birthday|year)', full_text, re.I)

        # Match scores: "X to Y" or "X-Y" in game context
        score_matches = re.findall(
            r'(?:score|final|won|defeated).*?(\d+)\s*(?:to|-)\s*(\d+)', full_text, re.I)

        # Match attendance
        attendance_matches = re.findall(
            r'(\d+)\s*(?:confirmed|attendees|players|participants|people)', full_text, re.I)

        # Match fundraiser amounts
        fund_matches = re.findall(
            r'\$\s*([0-9,]+(?:\.\d{2})?)', full_text)

        event = {
            'post_id': post.get('id'),
            'post_date': post.get('date', ''),
            'post_title': title,
            'event_numbers': event_matches,
            'anniversary_refs': anniv_matches,
            'scores': [{'team1': s[0], 'team2': s[1]} for s in score_matches],
            'attendance_mentions': attendance_matches,
            'fundraiser_amounts': fund_matches,
        }

        if any([event_matches, anniv_matches, score_matches]):
            events.append(event)

    return events


def extract_players_from_posts(posts):
    """Extract player names and mentions from all posts."""
    # Known ECD names (seed from existing data + sidebar)
    known_names = {
        'John Tronolone', 'KJohn Tronolone', 'Diana DiBuccio', 'Dan Spengeman',
        'Chris Adams', 'Tom Adams', 'Steve Adams', 'Kevin Adams',
        'Justin Pierce', 'Lauren Freda', 'Michael Rosinski', 'Valerie',
        'Bobby Brown', 'Matt Brown', 'Brody Letsche', 'Ryan Letsche',
        'Michelle Mullins', 'Kevin Megill', 'Sascha Basista', 'Kevin Fitzpatrick',
        'Zach Katz', 'Mike Edwards'
    }

    player_mentions = {}

    for post in posts:
        text = post.get('body_text', '') or ''
        title = post.get('title', '') or ''
        full_text = f"{title}\n{text}"
        post_id = post.get('id', 0)
        post_date = post.get('date', '')

        # Count mentions of known names
        for name in known_names:
            count = len(re.findall(re.escape(name), full_text, re.I))
            if count > 0:
                if name not in player_mentions:
                    player_mentions[name] = {
                        'name': name,
                        'total_mentions': 0,
                        'posts_mentioned': [],
                        'first_mention_date': post_date,
                        'last_mention_date': post_date
                    }
                player_mentions[name]['total_mentions'] += count
                player_mentions[name]['posts_mentioned'].append(post_id)
                player_mentions[name]['last_mention_date'] = post_date

        # Also find ALL-CAPS names (common in ECD posts)
        caps_names = re.findall(r'\b([A-Z][A-Z]+(?:\s+[A-Z][A-Z]+)+)\b', full_text)
        for cn in caps_names:
            cn_title = cn.title()  # Convert to title case
            if cn_title not in player_mentions and len(cn) > 4:
                player_mentions[cn_title] = {
                    'name': cn_title,
                    'total_mentions': 1,
                    'posts_mentioned': [post_id],
                    'first_mention_date': post_date,
                    'last_mention_date': post_date,
                    'discovered_via': 'caps_pattern'
                }

    return list(player_mentions.values())


def extract_awards_from_posts(posts):
    """Extract award mentions from posts."""
    awards = []

    award_patterns = [
        (r'Hall\s+of\s+Fame', 'Hall of Fame'),
        (r'HOF', 'Hall of Fame'),
        (r'ECD\s+Elite', 'ECD Elite'),
        (r'Rimshot\s+(?:Contest\s+)?Champion', 'Rimshot Champion'),
        (r'Hit\s+The\s+Human\s+Champion', 'Hit The Human Champion'),
        (r'(?:Dodgeball\s+)?Excellence\s+Award', 'Excellence Award'),
        (r'200\s+Events?\s+Award', '200 Events Award'),
        (r'MVP', 'MVP'),
    ]

    for post in posts:
        text = post.get('body_text', '') or ''
        title = post.get('title', '') or ''
        full_text = f"{title}\n{text}"

        for pattern, award_type in award_patterns:
            if re.search(pattern, full_text, re.I):
                awards.append({
                    'award_type': award_type,
                    'post_id': post.get('id'),
                    'post_date': post.get('date', ''),
                    'post_title': title,
                    'context': extract_context(full_text, pattern)
                })

    return awards


def extract_context(text, pattern, window=200):
    """Extract text surrounding a pattern match."""
    match = re.search(pattern, text, re.I)
    if match:
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        return text[start:end].strip()
    return ''


def save_json(filepath, data):
    """Save data as formatted JSON."""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)
    log.info(f"Saved {filepath}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    phase = None
    if '--phase' in sys.argv:
        idx = sys.argv.index('--phase')
        if idx + 1 < len(sys.argv):
            phase = sys.argv[idx + 1]

    if phase == 'ids' or phase is None:
        collect_post_ids()

    if phase == 'content' or phase is None:
        download_all_content()

    if phase == 'sidebar' or phase is None:
        extract_sidebar()

    if phase == 'parse' or phase is None:
        parse_all_posts()

    log.info("All phases complete!")


if __name__ == '__main__':
    main()
