#!/usr/bin/env python3
"""
ECD Smart Parser v2
===================
Iterative, pattern-aware parser for the ECD LiveJournal corpus.
Built from corpus analysis of 578 posts spanning 2005-2025.

Approach:
  Pass 1: Title parsing + post classification + event number extraction
  Pass 2: Section splitting + match result extraction
  Pass 3: Player roster building with deduplication
  Pass 4: Awards, fundraisers, attendance, seasons
  Pass 5: Cross-referencing and enrichment
"""

import json
import re
import os
import logging
from pathlib import Path
from collections import defaultdict, Counter
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

PROJECT_DIR = Path("/sessions/upbeat-festive-hopper/mnt/Projects/miscProjects/timeline-of-tron")
RAW_DIR = PROJECT_DIR / "db" / "raw_ecd_posts"
API_DIR = PROJECT_DIR / "db" / "api"

# ─────────────────────────────────────────────────────────
# KNOWN PLAYER DATABASE (seed from corpus analysis + posts)
# ─────────────────────────────────────────────────────────
KNOWN_PLAYERS = {
    # Core players (most mentioned)
    "John Tronolone", "Chris Adams", "Kevin Adams", "Tom Adams", "Steve Adams",
    "Kevin Fitzpatrick", "Kevin Megill", "Justin Pierce", "Ryan Letsche",
    "Dan Spengeman", "Diana DiBuccio", "Juan Londono",
    "Lauren Freda", "Lauren Stopa", "Lauren Winston",
    "Justin Wolf", "Sara DeCuir", "Sascha Basista",
    "Bobby Brown", "Matt Brown", "Michelle Mullins",
    "Brody Letsche", "Valerie Winston",
    "Zach Katz", "Mike Edwards",
    # Secondary players (from corpus analysis)
    "Michael Rosinski", "Michael Krott", "Jon Yochum",
    "Kathryn Nogueira", "Elizabeth Nogueira",
    "Alison Bertsch", "Aimee Savoth", "Christina Guarino",
    "Melissa Kerr", "Pam D'Luhy", "Bethany Schonberg",
    "Eamon Fitzpatrick", "Joanice",
    # More players found in corpus
    "Rob Pellecchia", "Derek Carty", "Dan Karen", "Robert Brown",
    "Bobby Vetrano", "Ryan McCrorey", "Lenny Herrera",
    "Julia Dennebaum", "Travis", "Ryan Rafferty", "Ashley",
    "Jonathan Ranchin", "Mari Travassos", "Zack Berghoff",
    "Katie", "Lima", "Godynick",
    "Lauren", "Mike Rosinski",
}

# Words that look like names but aren't
NAME_STOPWORDS = {
    "The", "This", "That", "But", "And", "For", "Not", "With", "From",
    "What", "When", "Where", "Who", "How", "Why", "All", "One", "Two",
    "Team", "Game", "Wall", "Season", "Event", "Results", "Match",
    "Main", "Hall", "Fame", "Elite", "Award", "Contest", "Champion",
    "Dodgeball", "Indoor", "Anniversary", "ProBowl", "Rimshot",
    "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
    "Adams", "Attendance", "East", "Coast", "High", "School", "Episode",
    "Pro", "Bowl", "Star", "Mega", "Special", "Night", "First", "Last",
    "New", "Next", "More", "Some", "Like", "Just", "Here", "There",
    "Will", "Can", "Has", "Had", "Was", "Were", "Are", "Been",
    "Would", "Could", "Should", "May", "Might", "Must",
    "Still", "Very", "Much", "Most", "Over", "Under", "Before", "After",
    "Also", "Even", "Ever", "Never", "Always", "Often", "Well",
    "Lets", "Let", "Get", "Got", "Got", "Take", "Make", "Come",
    "See", "Look", "Find", "Give", "Tell", "Say", "Think",
    "ECD", "HTH", "HOF", "MVP", "Sputz", "Fun", "Pre",
    "WALL", "ALL", "TEAM", "DODGEBALL",
    "Welcome", "Right", "Left", "Back", "Top", "Bottom",
    "Great", "Good", "Best", "Better", "Record", "Records",
    "Year", "Years", "Week", "Weeks", "Day", "Days", "Month",
    "Score", "Scores", "Point", "Points", "Win", "Wins", "Loss",
    "Total", "Final", "Half", "Round", "Rounds",
    "Prior", "Affair", "Mega", "East Coast", "Coast Dodgeball",
}

# Nickname mappings
NICKNAMES = {
    "the Creation": "John Tronolone",
    "the King": "John Tronolone",
    "KJohn": "John Tronolone",
    "KJohn Tronolone": "John Tronolone",
    "The Writer": "John Tronolone",
    "Sputz": "Michael Krott",
    "Michael Sputz Krott": "Michael Krott",
    "Fitz": "Kevin Fitzpatrick",
    "Megill": "Kevin Megill",
    "Spengeman": "Dan Spengeman",
    "DiBuccio": "Diana DiBuccio",
    "Diana": "Diana DiBuccio",
    "Pierce": "Justin Pierce",
    "Edwards": "Mike Edwards",
    "Basista": "Sascha Basista",
    "Londono": "Juan Londono",
    "Valerie": "Valerie Winston",
    "Lauren": "Lauren Freda",  # Most common Lauren
    "Mike Rosinski": "Michael Rosinski",
    "Rosinski": "Michael Rosinski",
    "Krott": "Michael Krott",
    "Letsche": "Ryan Letsche",
    "Diana Di": "Diana DiBuccio",
    "Di Buccio": "Diana DiBuccio",
    "Dibuccio": "Diana DiBuccio",
    "Tronolone": "John Tronolone",
    "The Piercer": "Justin Pierce",
    "the Piercer": "Justin Pierce",
    "The Annihilator": "Kevin Adams",
    "the Annihilator": "Kevin Adams",
    "The Punter": "Tom Adams",
    "the Punter": "Tom Adams",
}

# Roman numeral converter
ROMAN_MAP = {
    'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
}

def roman_to_int(s):
    """Convert Roman numeral string to integer."""
    s = s.upper().strip()
    if not s or not all(c in ROMAN_MAP for c in s):
        return None
    result = 0
    for i, c in enumerate(s):
        if i + 1 < len(s) and ROMAN_MAP[c] < ROMAN_MAP[s[i + 1]]:
            result -= ROMAN_MAP[c]
        else:
            result += ROMAN_MAP[c]
    return result


# ─────────────────────────────────────────────────────────
# PASS 1: Load posts + Title parsing + Classification
# ─────────────────────────────────────────────────────────

def load_all_posts():
    """Load all downloaded posts."""
    posts = []
    for f in sorted(RAW_DIR.glob("*.json")):
        if not f.stem.isdigit():
            continue
        try:
            with open(f) as fh:
                post = json.load(fh)
            if post.get('error'):
                continue
            posts.append(post)
        except:
            pass
    log.info(f"Loaded {len(posts)} posts")
    return posts


def classify_post(post):
    """Classify post type based on title and content."""
    title = (post.get('title') or '').lower()
    body = (post.get('body_text') or '')[:500].lower()
    combined = f"{title} {body}"

    # Classification rules (ordered by specificity)
    if any(k in title for k in ['results', 'scores', 'final score', 'recap']):
        return 'event_results'
    if any(k in title for k in ['preview', 'upcoming', 'confirmed', 'prediction']):
        return 'event_preview'
    if any(k in title for k in ['poster', 'official poster', 'promotional']):
        return 'poster'
    if any(k in title for k in ['statistics', 'stats', 'record']):
        return 'statistics'
    if re.search(r'\d+ya\b', title):
        return 'anniversary_retrospective'
    if any(k in title for k in ['anniversary', 'birthday']):
        return 'anniversary'
    if any(k in title for k in ['probowl', 'pro bowl', 'fundrais']):
        return 'probowl'
    if 'indoor' in title:
        return 'indoor_event'
    if any(k in title for k in ['goodbye', 'farewell', 'see you later', 'retirement']):
        return 'farewell'
    if any(k in title for k in ['rimshot', 'hit the human', 'htth']):
        return 'contest'
    if any(k in title for k in ['season', 'finale']):
        return 'season_recap'

    # Content-based classification
    if 'defeated' in combined and re.search(r'\d+\s*[-–]\s*\d+', combined):
        return 'event_results'
    if 'captain' in combined and ('team' in combined or 'picked' in combined):
        return 'event_results'
    if any(k in combined for k in ['save the date', 'mark your calendar']):
        return 'announcement'
    if 'infographic' in combined or 'flickr' in combined:
        return 'infographic'
    if len(body) < 100 and post.get('images'):
        return 'image_post'

    # Default: if substantial text with game language, it's results
    if len(body) > 500 and any(k in combined for k in ['dodgeball', 'eliminated', 'thrown', 'defeated', 'captain']):
        return 'event_results'

    # Posts with >>> prefix are usually narratives about events
    if title.startswith('>>>') or title.startswith('> > >'):
        if 'defeated' in combined or 'captain' in combined or 'dodgeball' in combined:
            return 'event_narrative'
        return 'event_narrative'

    # Posts with event numbers in title
    if re.search(r'(?i)dodgeball\s+\w+', title) or re.search(r'(?i)episode\s+\w+', title):
        return 'event_narrative'

    # Posts about specific competitions/formats
    if any(k in combined for k in ['wall v', 'wall vs', 'wall-all', 'team wall', 'team all']):
        return 'event_results'

    # Short posts with images
    if len(body) < 200 and post.get('images'):
        return 'image_post'

    # Posts with substantial game content
    if len(body) > 300 and any(k in combined for k in ['game', 'elimination', 'throw', 'ball', 'round']):
        return 'event_narrative'

    return 'other'


def extract_event_numbers(post):
    """Extract all event number references from a post using all 5 numbering systems."""
    title = post.get('title') or ''
    body = post.get('body_text') or ''
    text = f"{title}\n{body}"

    refs = []

    # System 1: DODGEBALL [NUMBER] (decimal)
    for m in re.finditer(r'(?i)dodgeball\s+(\d+)', text):
        refs.append({'system': 'dodgeball', 'raw': m.group(1), 'number': int(m.group(1))})

    # System 1b: DODGEBALL [ROMAN]
    for m in re.finditer(r'(?i)dodgeball\s+([IVXLCDM]{1,10})\b', text):
        num = roman_to_int(m.group(1))
        if num and 1 <= num <= 300:
            refs.append({'system': 'dodgeball_roman', 'raw': m.group(1), 'number': num})

    # System 2: Season [NUMBER]
    for m in re.finditer(r'(?i)season\s+(\d+)', text):
        refs.append({'system': 'season', 'raw': m.group(1), 'number': int(m.group(1))})

    # System 3: [N]YA format
    for m in re.finditer(r'(\d+)YA\b', text):
        refs.append({'system': 'year_anniversary', 'raw': m.group(1), 'number': int(m.group(1))})

    # Also in titles: "20YA" pattern
    for m in re.finditer(r'(\d+)YA\b', title):
        refs.append({'system': 'year_anniversary_title', 'raw': m.group(1), 'number': int(m.group(1))})

    # System 4: C-style (C30, C70)
    for m in re.finditer(r'\bC(\d+)\b', text):
        num = int(m.group(1))
        if num > 1 and num < 300:  # Filter out random C-prefixed numbers
            refs.append({'system': 'c_style', 'raw': f'C{m.group(1)}', 'number': num})

    # System 5: ECD [NUMBER/ROMAN]
    for m in re.finditer(r'(?i)\bECD\s+(\d+)', text):
        refs.append({'system': 'ecd', 'raw': m.group(1), 'number': int(m.group(1))})
    for m in re.finditer(r'(?i)\bECD\s+([IVXLCDM]{1,10})\b', text):
        num = roman_to_int(m.group(1))
        if num and 1 <= num <= 300:
            refs.append({'system': 'ecd_roman', 'raw': m.group(1), 'number': num})

    # Deduplicate
    seen = set()
    unique_refs = []
    for r in refs:
        key = (r['system'].split('_')[0], r['number'])
        if key not in seen:
            seen.add(key)
            unique_refs.append(r)

    return unique_refs


def parse_title(title):
    """Extract structured data from post title."""
    result = {
        'raw_title': title,
        'has_arrow_prefix': title.startswith('>>>'),
        'pipe_parts': [],
        'colon_parts': [],
        'ya_number': None,
        'keywords': [],
    }

    # Remove arrow prefix
    clean = re.sub(r'^>>>\s*', '', title).strip()

    # Extract YA number
    ya_match = re.search(r'(\d+)YA\b', clean)
    if ya_match:
        result['ya_number'] = int(ya_match.group(1))

    # Split on pipe
    if '|' in clean:
        result['pipe_parts'] = [p.strip() for p in clean.split('|')]

    # Split on colon
    if ':' in clean and '|' not in clean:
        result['colon_parts'] = [p.strip() for p in clean.split(':', 1)]

    # Extract ALL-CAPS keywords
    caps_words = re.findall(r'\b([A-Z]{2,})\b', clean)
    result['keywords'] = [w for w in caps_words if w not in {'THE', 'AND', 'FOR', 'OR', 'OF', 'IN', 'TO', 'A', 'IS', 'IT'}]

    return result


# ─────────────────────────────────────────────────────────
# PASS 2: Section splitting + Match result extraction
# ─────────────────────────────────────────────────────────

def split_sections(text):
    """Split post text into logical sections."""
    # Primary split on underscores
    sections = re.split(r'_{3,}', text)
    if len(sections) == 1:
        # Try ellipsis
        sections = re.split(r'\.{5,}', text)
    if len(sections) == 1:
        # Try triple dash
        sections = re.split(r'-{5,}', text)

    return [s.strip() for s in sections if s.strip()]


def extract_match_results(text):
    """Extract match results from text: winner defeated loser score."""
    results = []
    seen_matches = set()  # Deduplication

    def add_result(winner, loser, score, match_type, raw_text):
        """Add a match result with deduplication."""
        # Clean names: strip newlines, extra whitespace
        winner = re.sub(r'\s+', ' ', winner.strip())
        loser = re.sub(r'\s+', ' ', loser.strip())
        # Validate: must be 2+ chars, not just a word fragment
        if len(winner) < 3 or len(loser) < 3:
            return
        if winner.split()[0] in NAME_STOPWORDS or loser.split()[0] in NAME_STOPWORDS:
            return
        # Check for fragments (single names that aren't known)
        if len(winner.split()) == 1 and winner not in KNOWN_PLAYERS and winner not in NICKNAMES:
            return
        if len(loser.split()) == 1 and loser not in KNOWN_PLAYERS and loser not in NICKNAMES:
            return
        # Dedup key
        key = (resolve_name(winner), resolve_name(loser))
        score_num = None
        if score:
            parts = score.split('-')
            if len(parts) == 2:
                try:
                    score_num = (int(parts[0]), int(parts[1]))
                except: pass
        dedup = (key[0], key[1], score)
        if dedup in seen_matches:
            return
        seen_matches.add(dedup)
        results.append({
            'winner': resolve_name(winner, raw_text),
            'loser': resolve_name(loser, raw_text),
            'score': score,
            'score_winner': score_num[0] if score_num else None,
            'score_loser': score_num[1] if score_num else None,
            'match_type': match_type,
            'raw_text': raw_text[:150]
        })

    # Pattern 0: MULTILINE "[Name]\ndefeated\n[Name]" (most common in this corpus!)
    for m in re.finditer(
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})\s*\n\s*defeated\s*\n\s*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})',
        text
    ):
        winner = m.group(1).strip()
        loser = m.group(2).strip()
        if winner.split()[0] in NAME_STOPWORDS or loser.split()[0] in NAME_STOPWORDS:
            continue
        # Look for score nearby
        after = text[m.end():m.end()+60]
        score_match = re.search(r'(\d+)\s*[-–]\s*(\d+)', after)
        if not score_match:
            score_match = re.search(r'(\d+)\s+to\s+(\d+)', after)
        score = f"{score_match.group(1)}-{score_match.group(2)}" if score_match else None
        add_result(winner, loser, score, 'individual', text[max(0, m.start()-20):m.end()+40])

    # Pattern 1: "[Name] defeated [Name]" with optional score (same line)
    for m in re.finditer(
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})\s+defeated\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})',
        text
    ):
        winner = m.group(1).strip()
        loser = m.group(2).strip()

        # Look for score nearby (within 30 chars after)
        after = text[m.end():m.end()+40]
        score_match = re.search(r'(\d+)\s*[-–]\s*(\d+)', after)
        score = f"{score_match.group(1)}-{score_match.group(2)}" if score_match else None
        add_result(winner, loser, score, 'individual', text[max(0, m.start()-20):m.end()+40])

    # Pattern 2: "[Name] and company defeated [Name]"
    for m in re.finditer(
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})\s+and\s+company\s+defeated\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})',
        text
    ):
        winner = m.group(1).strip()
        loser = m.group(2).strip()
        if winner.split()[0] in NAME_STOPWORDS or loser.split()[0] in NAME_STOPWORDS:
            continue

        after = text[m.end():m.end()+40]
        score_match = re.search(r'(\d+)\s*[-–]\s*(\d+)', after)
        score = f"{score_match.group(1)}-{score_match.group(2)}" if score_match else None

        add_result(winner, loser, score, 'team', text[max(0, m.start()-20):m.end()+40])

    # Pattern 3: ALL-CAPS "[NAME] defeated [NAME]" (sidebar style)
    for m in re.finditer(
        r'([A-Z][A-Z\s]+[A-Z])\s+defeated\s+([A-Z][A-Z\s]+[A-Z])',
        text
    ):
        winner = m.group(1).strip().title()
        loser = m.group(2).strip().title()
        if winner in NAME_STOPWORDS or loser in NAME_STOPWORDS:
            continue
        add_result(winner, loser, None, 'main_event', text[max(0, m.start()-20):m.end()+40])

    # Pattern 4: "beat" or "outlasted"
    for verb in ['beat', 'outlasted', 'bested', 'conquered']:
        for m in re.finditer(
            rf'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){{0,2}})\s+{verb}\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){{0,2}})',
            text
        ):
            winner = m.group(1).strip()
            loser = m.group(2).strip()
            if winner.split()[0] in NAME_STOPWORDS or loser.split()[0] in NAME_STOPWORDS:
                continue
            after = text[m.end():m.end()+40]
            score_match = re.search(r'(\d+)\s*[-–]\s*(\d+)', after)
            score = f"{score_match.group(1)}-{score_match.group(2)}" if score_match else None
            add_result(winner, loser, score, 'individual', text[max(0, m.start()-20):m.end()+40])

    return results


def extract_scores(text):
    """Extract all score mentions from text."""
    scores = []

    # Dash format: 6-3, 7-5
    for m in re.finditer(r'(?<!\d)(\d{1,2})\s*[-–]\s*(\d{1,2})(?!\d)', text):
        s1, s2 = int(m.group(1)), int(m.group(2))
        # Filter: scores typically between 0-10 for dodgeball
        if 0 <= s1 <= 15 and 0 <= s2 <= 15 and (s1 + s2) > 0:
            # Check context - avoid dates like 2005-10
            before = text[max(0, m.start()-10):m.start()]
            if not re.search(r'\d{4}$', before):  # Not a date
                scores.append({
                    'score1': s1, 'score2': s2,
                    'display': f"{s1}-{s2}",
                    'context': text[max(0, m.start()-40):m.end()+40].strip()
                })

    # Word format: "6 to 3"
    for m in re.finditer(r'(\d{1,2})\s+to\s+(\d{1,2})', text):
        s1, s2 = int(m.group(1)), int(m.group(2))
        if 0 <= s1 <= 15 and 0 <= s2 <= 15 and (s1 + s2) > 0:
            scores.append({
                'score1': s1, 'score2': s2,
                'display': f"{s1}-{s2}",
                'context': text[max(0, m.start()-40):m.end()+40].strip()
            })

    return scores


# ─────────────────────────────────────────────────────────
# PASS 3: Player roster building
# ─────────────────────────────────────────────────────────

def resolve_name(name, context=''):
    """Resolve a name to its canonical form, using context for disambiguation."""
    name = re.sub(r'\s+', ' ', name.strip())
    if name in NICKNAMES:
        return NICKNAMES[name]
    # Check for partial matches (case-insensitive)
    for nick, canonical in NICKNAMES.items():
        if nick.lower() == name.lower():
            return canonical

    # Contextual first-name disambiguation
    ctx_lower = context.lower() if context else ''
    FIRST_NAME_MAP = {
        'Kevin': [
            ('Kevin Adams', ['annihilator', 'steve adams', 'tom adams', 'brothers', 'adams family']),
            ('Kevin Fitzpatrick', ['fitz', 'fitzpatrick', 'eamon', 'youngest']),
            ('Kevin Megill', ['megill', 'sputz', 'rimshot', 'pie']),
        ],
        'Lauren': [
            ('Lauren Freda', ['freda', 'chris adams', 'girlfriend', 'chris', 'first lady']),
            ('Lauren Stopa', ['stopa', 'be my lover', 'fame', 'accuracy']),
            ('Lauren Winston', ['winston', 'valerie', 'sister']),
        ],
        'Ryan': [
            ('Ryan Letsche', ['letsche', 'brody', 'targets', 'rim']),
            ('Ryan McCrorey', ['mccrorey', 'crorey']),
            ('Ryan Rafferty', ['rafferty']),
        ],
        'Michael': [
            ('Michael Krott', ['krott', 'sputz']),
            ('Michael Rosinski', ['rosinski', 'remembrance']),
        ],
        'Justin': [
            ('Justin Pierce', ['pierce', 'piercer', 'diana', 'rivalry', 'nemesis']),
            ('Justin Wolf', ['wolf']),
        ],
    }

    first = name.split()[0] if name.split() else ''
    if first in FIRST_NAME_MAP and len(name.split()) == 1:
        for full_name, context_clues in FIRST_NAME_MAP[first]:
            if any(clue in ctx_lower for clue in context_clues):
                return full_name
        # Default to most common if no context match
        return FIRST_NAME_MAP[first][0][0]

    return name


def extract_players_from_post(post):
    """Extract player name mentions from a post."""
    # CRITICAL: Replace newlines with spaces to prevent malformed name extraction
    title = (post.get('title') or '').replace('\n', ' ')
    body = (post.get('body_text') or '').replace('\n', ' ')
    text = f"{title} {body}"
    # Also collapse multiple spaces
    text = re.sub(r'\s+', ' ', text)
    found = {}

    # Method 1: Match known players
    for name in KNOWN_PLAYERS:
        count = len(re.findall(re.escape(name), text, re.I))
        if count > 0:
            canonical = resolve_name(name)
            if canonical not in found:
                found[canonical] = 0
            found[canonical] += count

    # Method 2: Match nicknames
    for nick, canonical in NICKNAMES.items():
        count = len(re.findall(r'\b' + re.escape(nick) + r'\b', text, re.I))
        if count > 0:
            if canonical not in found:
                found[canonical] = 0
            found[canonical] += count

    # Method 3: Contextual name extraction (near "defeated", "captain", etc.)
    context_patterns = [
        r'(?:captain|Captain)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){1,2})',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){1,2})\s+(?:defeated|beat|eliminated)',
        r'(?:defeated|beat|eliminated)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){1,2})',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){1,2})\s+and\s+company',
        r'(?:vs\.?|versus)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){1,2})',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){1,2})\s+(?:scored|threw|caught)',
    ]

    for pattern in context_patterns:
        for m in re.finditer(pattern, text):
            name = m.group(1).strip()
            # Validate: at least 2 words, not a stopword
            words = name.split()
            if len(words) >= 2 and words[0] not in NAME_STOPWORDS and words[-1] not in NAME_STOPWORDS:
                canonical = resolve_name(name)
                if canonical not in found:
                    found[canonical] = 0
                found[canonical] += 1

    return found


def build_player_roster(posts):
    """Build comprehensive player roster across all posts."""
    roster = {}

    for post in posts:
        post_id = post.get('id', 0)
        post_date = post.get('date', '')
        players_found = extract_players_from_post(post)

        for name, count in players_found.items():
            if name not in roster:
                roster[name] = {
                    'name': name,
                    'total_mentions': 0,
                    'post_count': 0,
                    'posts': [],
                    'first_mention_post': post_id,
                    'first_mention_date': post_date,
                    'last_mention_post': post_id,
                    'last_mention_date': post_date,
                    'nicknames': set(),
                    'roles': set(),
                    'wins': 0,
                    'losses': 0,
                }
            roster[name]['total_mentions'] += count
            roster[name]['post_count'] += 1
            roster[name]['posts'].append(post_id)
            roster[name]['last_mention_post'] = post_id
            if post_date:
                roster[name]['last_mention_date'] = post_date

    # Add nickname info
    for nick, canonical in NICKNAMES.items():
        if canonical in roster:
            roster[canonical]['nicknames'].add(nick)

    # Convert sets to lists for JSON
    for name in roster:
        roster[name]['nicknames'] = list(roster[name]['nicknames'])
        roster[name]['roles'] = list(roster[name]['roles'])
        # Trim posts list to just count for large sets
        if len(roster[name]['posts']) > 20:
            roster[name]['sample_posts'] = roster[name]['posts'][:20]
            roster[name]['posts'] = []  # Clear to save space

    return roster


# ─────────────────────────────────────────────────────────
# PASS 4: Awards, Fundraisers, Attendance, Seasons
# ─────────────────────────────────────────────────────────

def extract_awards(text, post_id, post_date):
    """Extract award mentions from text."""
    awards = []

    # Direct patterns: "Award: Name" or "Award\nNAME"
    direct_patterns = [
        (r'ECD\s*Elite\s+(?:Inductee|inductee)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', 'ECD Elite'),
        (r'ECD\s*Elite\s+(?:Inductee|inductee)\s*\n\s*([A-Z][A-Z\s]+[A-Z])', 'ECD Elite'),
        (r'Rimshot\s+(?:Contest\s+)?(?:Champion|winner)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', 'Rimshot Champion'),
        (r'Rimshot\s+(?:Contest\s+)?(?:Champion|winner)\s*\n\s*([A-Z][A-Z\s]+[A-Z])', 'Rimshot Champion'),
        (r'(?i)rimshot\s+contest\s+(?:#\d+)?[:\s]*(?:"|")?.*?(?:Winner|winner)\s*[★:]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', 'Rimshot Champion'),
        (r'Hit\s+[Tt]he\s+Human\s+Champion[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', 'Hit The Human Champion'),
        (r'Hit\s+[Tt]he\s+Human\s+Champion\s*\n\s*([A-Z][A-Z\s]+[A-Z])', 'Hit The Human Champion'),
        (r'200\s+Events?\s+Award[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', '200 Events Award'),
        (r'200\s+Events?\s+Award\s*\n\s*([A-Z][A-Z\s]+[A-Z])', '200 Events Award'),
        (r'(?:MVP|Most\s+Valuable)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', 'MVP'),
        (r'Excellence\s+Award[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', 'Excellence Award'),
        (r'In\s+Remembrance\s*\n\s*([A-Z][A-Z\s]+[A-Z])', 'In Remembrance'),
        (r'In\s+Remembrance[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', 'In Remembrance'),
    ]

    for pattern, award_type in direct_patterns:
        for m in re.finditer(pattern, text):
            recipient = m.group(1).strip()
            if recipient.isupper():
                recipient = recipient.title()
            if recipient and len(recipient) > 2 and recipient.split()[0] not in NAME_STOPWORDS:
                awards.append({
                    'award_type': award_type,
                    'recipient': resolve_name(recipient),
                    'post_id': post_id,
                    'date': post_date,
                    'context': text[max(0, m.start()-30):m.end()+50].strip()[:200]
                })

    # Hall of Fame: Multiple patterns since it's mentioned many ways
    # Pattern: "Hall of Famer [Name]" or "Hall of Famer, [Name]"
    for m in re.finditer(r'Hall\s+of\s+Famer[,:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', text):
        name = m.group(1).strip()
        if name.split()[0] not in NAME_STOPWORDS:
            awards.append({
                'award_type': 'Hall of Fame',
                'recipient': resolve_name(name),
                'post_id': post_id,
                'date': post_date,
                'mention_type': 'reference',
                'context': text[max(0, m.start()-20):m.end()+30].strip()[:200]
            })

    # Pattern: "inducted into...Hall of Fame" lists
    for m in re.finditer(r'(?:inaugural class|inducted).{0,30}(?:Hall of Fame|ECDElite)[:\s]*(.{20,200}?)(?:\.|$)', text, re.I):
        names_text = m.group(1)
        # Extract names from comma-separated or "and"-separated list
        name_matches = re.findall(r'([A-Z][a-z]+\s+[A-Z][a-z\']+)', names_text)
        for name in name_matches:
            if name.split()[0] not in NAME_STOPWORDS:
                awards.append({
                    'award_type': 'Hall of Fame',
                    'recipient': resolve_name(name),
                    'post_id': post_id,
                    'date': post_date,
                    'mention_type': 'induction_list',
                    'context': m.group(0)[:200]
                })

    # Pattern: "Hall of Fame: INAUGURAL CLASS" followed by names
    for m in re.finditer(r'Hall\s+of\s+Fame[:\s]*(?:INAUGURAL CLASS|New Class|Class of \d+)[!\s]*\n(.{50,500}?)(?:\n\n|\n___)', text, re.I):
        names_text = m.group(1)
        name_matches = re.findall(r'([A-Z][a-z]+\s+[A-Z][a-z\']+)', names_text)
        for name in name_matches:
            if name.split()[0] not in NAME_STOPWORDS:
                awards.append({
                    'award_type': 'Hall of Fame',
                    'recipient': resolve_name(name),
                    'post_id': post_id,
                    'date': post_date,
                    'mention_type': 'class_list',
                    'context': names_text[:200]
                })

    # Pattern: "rimshot contest winner [Name]" in flowing text
    for m in re.finditer(r'(?i)rimshot\s+contest\s+winner\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+){0,2})', text):
        name = m.group(1).strip()
        if name.split()[0] not in NAME_STOPWORDS:
            awards.append({
                'award_type': 'Rimshot Champion',
                'recipient': resolve_name(name),
                'post_id': post_id,
                'date': post_date,
                'context': text[max(0, m.start()-20):m.end()+30].strip()[:200]
            })

    return awards


def extract_fundraisers(text, post_id, post_date):
    """Extract fundraiser information."""
    fundraisers = []

    # Pattern: "$X,XXX for [beneficiary]" or "$X,XXX raised"
    for m in re.finditer(r'\$\s*([\d,]+(?:\.\d{2})?)\s+(?:for|For|FOR|raised|donated)', text):
        amount_str = m.group(1).replace(',', '')
        try:
            amount = float(amount_str)
        except:
            continue

        # Look for beneficiary
        after = text[m.end():m.end()+100]
        beneficiary = None
        ben_match = re.match(r'\s*(?:for|For|FOR)\s+(.+?)(?:\.|!|\n|$)', after)
        if ben_match:
            beneficiary = ben_match.group(1).strip()

        if amount > 10:  # Filter noise
            fundraisers.append({
                'amount': amount,
                'beneficiary': beneficiary,
                'post_id': post_id,
                'date': post_date,
                'context': text[max(0, m.start()-30):m.end()+60].strip()
            })

    return fundraisers


def extract_attendance(text, post_id):
    """Extract attendance figures."""
    attendance = []

    patterns = [
        r'(\d+)\s+(?:confirmed|players|participants|competitors|combatants|people)\b',
        r'(?:attendance|Attendance)[:\s]+(\d+)',
        r'(?:Official Attendance|official attendance)\s*(?:Figure)?[:\s]+(\d+)',
        r'(\d+)\s+veterans?\b',
        r'(\d+)\s+(?:men|women|guys|girls|players)\s+(?:and|&)',
    ]

    for pattern in patterns:
        for m in re.finditer(pattern, text, re.I):
            num = int(m.group(1))
            if 2 <= num <= 200:  # Reasonable attendance range
                attendance.append({
                    'count': num,
                    'context': text[max(0, m.start()-20):m.end()+20].strip(),
                    'post_id': post_id
                })

    return attendance


def extract_seasons(text, post_id):
    """Extract season references."""
    seasons = []
    for m in re.finditer(r'(?i)season\s+(\d+)', text):
        num = int(m.group(1))
        if 1 <= num <= 30:
            seasons.append({
                'season_number': num,
                'post_id': post_id,
                'context': text[max(0, m.start()-30):m.end()+50].strip()
            })
    return seasons


def extract_rivalries(text, post_id):
    """Extract rivalry mentions."""
    rivalries = []

    # Pattern: "X vs Y" or "X/Y rivalry"
    patterns = [
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+)?)\s+(?:vs\.?|versus|v\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+)?)',
        r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+)?)\s*/\s*([A-Z][a-z]+(?:\s+[A-Z][a-z\']+)?)\s+rivalry',
        r'(?:rivalry|feud)\s+(?:between|with)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+)?)\s+(?:and|&)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z\']+)?)',
    ]

    for pattern in patterns:
        for m in re.finditer(pattern, text):
            p1, p2 = m.group(1).strip(), m.group(2).strip()
            if p1.split()[0] not in NAME_STOPWORDS and p2.split()[0] not in NAME_STOPWORDS:
                rivalries.append({
                    'player1': resolve_name(p1),
                    'player2': resolve_name(p2),
                    'post_id': post_id,
                    'context': text[max(0, m.start()-40):m.end()+40].strip()
                })

    # Also look for "arch-nemesis", "nemesis" mentions
    for m in re.finditer(r'([A-Z][a-z]+(?:\s+[A-Z][a-z\']+)?)[\'s]*\s+(?:arch-?nemesis|nemesis|rival)', text):
        name = m.group(1).strip()
        if name.split()[0] not in NAME_STOPWORDS:
            rivalries.append({
                'player1': resolve_name(name),
                'player2': None,
                'post_id': post_id,
                'context': text[max(0, m.start()-40):m.end()+60].strip()
            })

    return rivalries


def extract_weather(text):
    """Extract weather mentions."""
    weather = []
    patterns = [
        r'(?:weather|Weather).*?(?:\.|!)',
        r'(?:rain|raining|rainy|rained)',
        r'(?:cold|colder|freezing|frigid)',
        r'(?:hot|scorching|heat|humid)',
        r'(?:snow|snowing|snowed|ice|icy)',
        r'(?:wind|windy|breezy)',
    ]
    for p in patterns:
        for m in re.finditer(p, text, re.I):
            weather.append(text[max(0, m.start()-30):m.end()+30].strip())
    return weather


def extract_nicknames_from_text(text):
    """Extract nickname patterns from text."""
    nicknames = []

    # Pattern: "the [Word]" as nickname
    for m in re.finditer(r'"the\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)?)"', text):
        nicknames.append(m.group(0))

    # Pattern: known as "[Nickname]"
    for m in re.finditer(r'(?:known as|nicknamed|called)\s+"([^"]+)"', text, re.I):
        nicknames.append(m.group(1))

    return nicknames


def extract_music(text):
    """Extract music/song references."""
    music = []

    # Pattern: "Song" by Artist or Artist's "Song"
    for m in re.finditer(r'"([^"]+)"\s+(?:by|from)\s+([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)', text):
        music.append({'song': m.group(1), 'artist': m.group(2)})

    # Pattern: Artist "Song"
    for m in re.finditer(r'([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*)\s+"([^"]+)"', text):
        artist = m.group(1)
        if artist.split()[0] not in NAME_STOPWORDS and len(artist) > 3:
            music.append({'song': m.group(2), 'artist': artist})

    return music


# ─────────────────────────────────────────────────────────
# MAIN: Run all passes
# ─────────────────────────────────────────────────────────

def main():
    log.info("=" * 60)
    log.info("ECD Smart Parser v2 — Starting")
    log.info("=" * 60)

    # Load posts
    posts = load_all_posts()

    # Merge sidebar data
    sidebar_file = RAW_DIR / "sidebar_events.json"
    sidebar_events = []
    if sidebar_file.exists():
        with open(sidebar_file) as f:
            sidebar = json.load(f)
            sidebar_events = sidebar.get('events', [])
        log.info(f"Loaded {len(sidebar_events)} sidebar events")

    # ─── PASS 1: Title + Classification + Event Numbers ───
    log.info("Pass 1: Title parsing + classification + event numbers...")
    all_events = {}  # event_number -> event data
    post_metadata = []

    for post in posts:
        pid = post.get('id', 0)
        title = post.get('title', '')
        body = post.get('body_text', '')

        # Classify
        post_type = classify_post(post)

        # Parse title
        title_data = parse_title(title)

        # Extract event numbers
        event_refs = extract_event_numbers(post)

        # Store metadata
        meta = {
            'post_id': pid,
            'title': title,
            'date': post.get('date', ''),
            'post_type': post_type,
            'title_data': title_data,
            'event_refs': event_refs,
            'body_length': len(body),
            'has_images': bool(post.get('images')),
            'image_count': len(post.get('images', [])),
        }
        post_metadata.append(meta)

        # Register events
        for ref in event_refs:
            if ref['system'].startswith('dodgeball') or ref['system'].startswith('ecd'):
                enum = ref['number']
                if enum not in all_events:
                    all_events[enum] = {
                        'event_number': enum,
                        'posts': [],
                        'dates': [],
                        'names': [],
                        'types': set(),
                        'seasons': [],
                    }
                all_events[enum]['posts'].append(pid)
                if post.get('date'):
                    all_events[enum]['dates'].append(post['date'])

    log.info(f"  Classified {len(post_metadata)} posts")
    log.info(f"  Discovered {len(all_events)} unique events")

    # Post type distribution
    type_counts = Counter(m['post_type'] for m in post_metadata)
    for ptype, count in type_counts.most_common():
        log.info(f"    {ptype}: {count}")

    # ─── PASS 2: Match results + Scores ───
    log.info("Pass 2: Match result extraction...")
    all_match_results = []
    all_scores = []

    for post in posts:
        text = f"{post.get('title', '')}\n{post.get('body_text', '')}"
        pid = post.get('id', 0)

        matches = extract_match_results(text)
        for match in matches:
            match['post_id'] = pid
            match['post_date'] = post.get('date', '')
            all_match_results.append(match)

        scores = extract_scores(post.get('body_text', ''))
        for score in scores:
            score['post_id'] = pid
            all_scores.append(score)

    log.info(f"  Extracted {len(all_match_results)} match results")
    log.info(f"  Found {len(all_scores)} score mentions")

    # Update player win/loss records from match results
    win_counts = Counter()
    loss_counts = Counter()
    for match in all_match_results:
        win_counts[match['winner']] += 1
        loss_counts[match['loser']] += 1

    # ─── PASS 3: Player roster ───
    log.info("Pass 3: Building player roster...")
    player_roster = build_player_roster(posts)

    # Enrich with win/loss data
    for name, data in player_roster.items():
        data['wins'] = win_counts.get(name, 0)
        data['losses'] = loss_counts.get(name, 0)

    log.info(f"  Built roster of {len(player_roster)} players")

    # Top players by mentions
    top_players = sorted(player_roster.values(), key=lambda p: p['total_mentions'], reverse=True)
    for p in top_players[:10]:
        log.info(f"    {p['name']}: {p['total_mentions']} mentions, {p['wins']}W-{p['losses']}L")

    # ─── PASS 4: Awards, Fundraisers, Attendance, Seasons, etc ───
    log.info("Pass 4: Awards, fundraisers, attendance, seasons...")
    all_awards = []
    all_fundraisers = []
    all_attendance = []
    all_seasons = []
    all_rivalries = []
    all_weather = []
    all_nicknames = []
    all_music = []

    for post in posts:
        text = f"{post.get('title', '')}\n{post.get('body_text', '')}"
        pid = post.get('id', 0)
        pdate = post.get('date', '')

        all_awards.extend(extract_awards(text, pid, pdate))
        all_fundraisers.extend(extract_fundraisers(text, pid, pdate))
        all_attendance.extend(extract_attendance(text, pid))
        all_seasons.extend(extract_seasons(text, pid))
        all_rivalries.extend(extract_rivalries(text, pid))

        weather = extract_weather(text)
        if weather:
            all_weather.append({'post_id': pid, 'mentions': weather})

        nicks = extract_nicknames_from_text(text)
        if nicks:
            all_nicknames.extend(nicks)

        music = extract_music(text)
        if music:
            all_music.extend([{**m, 'post_id': pid} for m in music])

    # Add sidebar awards
    for event in sidebar_events:
        for award in event.get('awards', []):
            recipient = award.get('recipient', '').strip()
            if recipient.startswith('$'):
                # This is a fundraiser, not an award
                amount_match = re.search(r'\$([\d,]+)', recipient)
                if amount_match:
                    all_fundraisers.append({
                        'amount': float(amount_match.group(1).replace(',', '')),
                        'beneficiary': re.sub(r'\$[\d,]+\s+For\s+', '', recipient),
                        'event_name': event.get('event_name'),
                        'date': event.get('date'),
                        'source': 'sidebar'
                    })
            else:
                all_awards.append({
                    'award_type': award['title'],
                    'recipient': resolve_name(recipient.title() if recipient.isupper() else recipient),
                    'event_name': event.get('event_name'),
                    'date': event.get('date'),
                    'source': 'sidebar'
                })

    # Add sidebar match results
    for event in sidebar_events:
        me = event.get('main_event')
        if me:
            all_match_results.append({
                'winner': resolve_name(me['winner'].title()),
                'loser': resolve_name(me['loser'].title()),
                'score': None,
                'match_type': 'main_event',
                'event_name': event.get('event_name'),
                'date': event.get('date'),
                'source': 'sidebar'
            })

    log.info(f"  Awards: {len(all_awards)}")
    log.info(f"  Fundraisers: {len(all_fundraisers)}")
    log.info(f"  Attendance records: {len(all_attendance)}")
    log.info(f"  Season references: {len(all_seasons)}")
    log.info(f"  Rivalries: {len(all_rivalries)}")
    log.info(f"  Weather mentions: {len(all_weather)}")
    log.info(f"  Music references: {len(all_music)}")

    # Deduplicate awards
    seen_awards = set()
    unique_awards = []
    for a in all_awards:
        key = (a['award_type'], a['recipient'])
        if key not in seen_awards:
            seen_awards.add(key)
            unique_awards.append(a)
    log.info(f"  Unique awards (deduplicated): {len(unique_awards)}")

    # Award distribution
    award_types = Counter(a['award_type'] for a in unique_awards)
    for atype, count in award_types.most_common():
        log.info(f"    {atype}: {count}")

    # Deduplicate rivalries
    seen_rivalries = set()
    unique_rivalries = []
    for r in all_rivalries:
        key = tuple(sorted([r['player1'] or '', r['player2'] or '']))
        if key not in seen_rivalries and key != ('', ''):
            seen_rivalries.add(key)
            unique_rivalries.append(r)
    log.info(f"  Unique rivalries: {len(unique_rivalries)}")

    # Season summary
    season_nums = sorted(set(s['season_number'] for s in all_seasons))
    log.info(f"  Seasons found: {season_nums}")

    # ─── PASS 5: Enrichment + Cross-referencing ───
    log.info("Pass 5: Cross-referencing and enrichment...")

    # Enrich events with match results, attendance, awards
    for match in all_match_results:
        mpid = match.get('post_id')
        if mpid:
            # Find which event this post belongs to
            for enum, edata in all_events.items():
                if mpid in edata['posts']:
                    if 'matches' not in edata:
                        edata['matches'] = []
                    edata['matches'].append(match)
                    break

    for att in all_attendance:
        apid = att.get('post_id')
        if apid:
            for enum, edata in all_events.items():
                if apid in edata['posts']:
                    if 'attendance' not in edata:
                        edata['attendance'] = []
                    edata['attendance'].append(att['count'])
                    break

    # Build post lookup for enrichment
    post_lookup = {p.get('id'): p for p in posts}
    meta_lookup = {m['post_id']: m for m in post_metadata}

    # Enrich events with names, dates, types
    for enum, edata in all_events.items():
        types = set()
        event_names = []
        event_dates = []

        for pid in edata['posts']:
            meta = meta_lookup.get(pid, {})
            post = post_lookup.get(pid, {})

            # Classify type
            ptype = meta.get('post_type', '')
            if ptype in ('anniversary', 'anniversary_retrospective'):
                types.add('anniversary')
            elif ptype == 'probowl':
                types.add('probowl')
            elif ptype == 'indoor_event':
                types.add('indoor')
            elif ptype in ('event_results', 'event_narrative'):
                types.add('regular')

            # Get event name from title
            title = post.get('title', '')
            if title:
                event_names.append(title)

            # Get date
            pdate = post.get('date', '')
            if pdate:
                event_dates.append(pdate)

        edata['types'] = list(types)
        edata['event_name'] = event_names[0] if event_names else f"Dodgeball {enum}"
        edata['all_titles'] = event_names[:5]
        edata['date'] = event_dates[0] if event_dates else None
        edata['all_dates'] = event_dates[:5]

        # Determine best attendance figure
        if edata.get('attendance'):
            edata['best_attendance'] = max(edata['attendance'])

    # Convert sets to lists for JSON serialization
    for enum, edata in all_events.items():
        if isinstance(edata.get('types'), set):
            edata['types'] = list(edata['types'])

    # ─── SAVE ALL OUTPUT ───
    log.info("Saving output files...")

    def save(filename, data, directory=RAW_DIR):
        filepath = directory / filename
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        log.info(f"  Saved {filepath.name} ({os.path.getsize(filepath)//1024}KB)")

    # Raw parsed data
    save('parsed_all_posts_v2.json', post_metadata)
    save('parsed_events_v2.json', all_events)
    save('parsed_players_v2.json', player_roster)
    save('parsed_match_results_v2.json', all_match_results)
    save('parsed_scores_v2.json', all_scores)
    save('parsed_awards_v2.json', unique_awards)
    save('parsed_fundraisers_v2.json', all_fundraisers)
    save('parsed_attendance_v2.json', all_attendance)
    save('parsed_seasons_v2.json', all_seasons)
    save('parsed_rivalries_v2.json', unique_rivalries)
    save('parsed_weather_v2.json', all_weather)
    save('parsed_music_v2.json', all_music)
    save('parsed_nicknames_v2.json', list(set(all_nicknames)))

    # API-ready versions
    api_events = []
    for enum in sorted(all_events.keys()):
        e = all_events[enum]
        api_events.append({
            'event_number': enum,
            'dates': e.get('dates', []),
            'post_ids': e.get('posts', []),
            'event_types': e.get('types', []),
            'matches': e.get('matches', []),
            'attendance': e.get('best_attendance'),
        })
    save('ecd_events_v2.json', api_events, API_DIR)

    api_players = []
    for name in sorted(player_roster.keys(), key=lambda n: player_roster[n]['total_mentions'], reverse=True):
        p = player_roster[name]
        api_players.append({
            'name': p['name'],
            'total_mentions': p['total_mentions'],
            'post_count': p['post_count'],
            'wins': p['wins'],
            'losses': p['losses'],
            'nicknames': p['nicknames'],
            'first_mention_date': p['first_mention_date'],
            'last_mention_date': p['last_mention_date'],
        })
    save('ecd_players_v2.json', api_players, API_DIR)

    save('ecd_awards_v2.json', unique_awards, API_DIR)
    save('ecd_match_results.json', all_match_results, API_DIR)
    save('ecd_fundraisers.json', all_fundraisers, API_DIR)
    save('ecd_rivalries.json', unique_rivalries, API_DIR)

    # Summary stats
    stats = {
        'total_posts': len(posts),
        'posts_with_text': sum(1 for p in posts if len(p.get('body_text', '')) > 50),
        'posts_image_only': sum(1 for p in posts if len(p.get('body_text', '')) < 10 and p.get('images')),
        'unique_events': len(all_events),
        'event_number_range': f"{min(all_events.keys())}-{max(all_events.keys())}" if all_events else "none",
        'total_players': len(player_roster),
        'match_results': len(all_match_results),
        'scores_found': len(all_scores),
        'awards': len(unique_awards),
        'fundraisers': len(all_fundraisers),
        'total_fundraiser_amount': sum(f.get('amount', 0) for f in all_fundraisers),
        'attendance_records': len(all_attendance),
        'seasons_found': season_nums,
        'rivalries': len(unique_rivalries),
        'weather_mentions': len(all_weather),
        'music_references': len(all_music),
        'post_type_distribution': dict(type_counts.most_common()),
        'award_type_distribution': dict(award_types.most_common()),
        'top_10_players': [(p['name'], p['total_mentions'], p['wins'], p['losses'])
                          for p in top_players[:10]],
        'parsed_at': datetime.now().isoformat(),
    }
    save('parse_stats_v2.json', stats)

    # Print final summary
    log.info("=" * 60)
    log.info("PARSING COMPLETE — SUMMARY")
    log.info("=" * 60)
    log.info(f"Posts processed:     {stats['total_posts']}")
    log.info(f"Posts with text:     {stats['posts_with_text']}")
    log.info(f"Unique events:       {stats['unique_events']} (range: {stats['event_number_range']})")
    log.info(f"Players in roster:   {stats['total_players']}")
    log.info(f"Match results:       {stats['match_results']}")
    log.info(f"Score mentions:      {stats['scores_found']}")
    log.info(f"Awards:              {stats['awards']}")
    log.info(f"Fundraisers:         {stats['fundraisers']} (${stats['total_fundraiser_amount']:,.2f})")
    log.info(f"Attendance records:  {stats['attendance_records']}")
    log.info(f"Seasons:             {len(season_nums)}")
    log.info(f"Rivalries:           {stats['rivalries']}")
    log.info(f"Music refs:          {stats['music_references']}")
    log.info("=" * 60)


if __name__ == '__main__':
    main()
