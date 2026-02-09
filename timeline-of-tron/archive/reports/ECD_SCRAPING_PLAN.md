# ECD LiveJournal Scraping Plan
## East Coast Dodgeball Data Extraction & Site Integration

---

## 1. SOURCE OVERVIEW

**Source URL**: https://dodgeball.livejournal.com/
**Journal**: "dodgeball" (Journal ID: 434169)
**Time Span**: October 2005 – October 2025 (20 years)
**Calendar Years with Posts**: 2005–2025 (21 years)
**Estimated Total Posts**: ~300–400 (based on calendar sampling)

### Content Richness (from first post alone)
The very first post (Oct 23, 2005) contains: detailed game results with scores, 12+ named players with nicknames, team captains, rivalries, individual highlights, Hall of Fame inductees, event previews, and quotes. This density appears consistent across the archive — this is a *goldmine*.

### Existing ECD Data (Current DB)
The `ecd_events` table has only **19 sparse records** covering milestone events. The LiveJournal has 15-20x more data with dramatically richer detail.

---

## 2. DATA ENTITIES TO EXTRACT

### A. Posts (raw content layer)
| Field | Source | Example |
|-------|--------|---------|
| post_id | URL path | 162098 |
| title | Post heading | ">>> The BIRTH and the COMING" |
| date | Timestamp | 2005-10-23T04:00:00 |
| body_text | Full post content | (rich text with game results, narratives) |
| comment_count | "X Dodgeballers" link | 1 |
| images | img tags | ECD 222 P3.jpg |
| era | Derived from date | "founding" / "golden_age" / "modern" |
| event_reference | Parsed from title/body | "DODGEBALL 9", "20YA" |

### B. Events (structured from posts)
| Field | Source | Example |
|-------|--------|---------|
| event_number | Parsed from text | 9, 10 (X), 100, 200 |
| event_name | Title/body | "DODGEBALL X", "20YA", "2025 ProBowl" |
| event_type | Classification | regular, anniversary, probowl, indoor, fallfest, special |
| date | Post date or explicit | 2005-10-22 |
| team1_captain | Parsed from results | "Chris Adams" |
| team2_captain | Parsed from results | "KJohn Tronolone" |
| score | Parsed from results | "6-3" |
| attendance_count | Sidebar or body text | 60 |
| fundraiser_amount | Parsed | 1720.00 |
| fundraiser_beneficiary | Parsed | "Lauren & Emma" |
| location | Parsed if mentioned | Indoor/outdoor |
| theme_song | Parsed | 'Staind "Mudshovel"' |
| weather_notes | Parsed | "colder than VII, not raining as hard" |

### C. Players (aggregated across all posts)
| Field | Source | Example |
|-------|--------|---------|
| name | Parsed from text | "John Tronolone" |
| nicknames | Parsed | ["KJohn", "the King", "the Creation", "The Writer"] |
| first_appearance_event | First mention | Dodgeball 1 (or earliest) |
| last_appearance_event | Last mention | 20YA |
| total_mentions | Count across posts | 250+ |
| peak_year | Year with most mentions | 2006 |
| roles | Parsed | ["founder", "captain", "player"] |
| family_connections | Parsed | {"brothers": ["Tom Adams", "Steve Adams", "Kevin Adams"]} |
| is_hof | Hall of Fame flag | true |
| hof_induction_event | Event inducted | DODGEBALL X |

### D. Main Event Matches (sidebar + post content)
| Field | Source | Example |
|-------|--------|---------|
| event_name | Sidebar | "ANNIVERSARY XX" |
| event_date | Sidebar | 2025-09-27 |
| winner | Sidebar | "Diana DiBuccio" |
| loser | Sidebar | "John Tronolone" |
| match_type | Classification | "main_event" |
| context | Post body | "Two full decades later, we meet in our very first 1v1 match" |

### E. Awards & Honors
| Field | Source | Example |
|-------|--------|---------|
| award_type | Sidebar/body | "ECD Elite Inductee", "Rimshot Champion", "200 Events Award", "Hit The Human Champion", "Hall of Fame" |
| recipient | Name | "Sascha Basista" |
| event_name | Associated event | "ANNIVERSARY XX" |
| year | Year awarded | 2025 |

### F. Rivalries (parsed from narrative)
| Field | Source | Example |
|-------|--------|---------|
| player1 | Parsed | "Justin Pierce" |
| player2 | Parsed | "Diana DiBuccio" |
| description | Narrative | "Constant trash talking, filled with hatred" |
| first_mention_date | First post | 2005-10-23 |
| mention_count | Across posts | 15+ |

### G. Team Game Results (per-event)
| Field | Source | Example |
|-------|--------|---------|
| event_number | Parsed | 9 |
| game_number | Sequence within event | 1, 2, 3... |
| winner_team_captain | Parsed | "Chris Adams" |
| final_score | Parsed | "6-3" |
| notable_plays | Parsed highlights | ["KJohn nut shot on Tom", "Tom game-winner"] |
| eliminations | Player-level stats | {"Dan Spengeman": 5, "Lauren F.": 3} |

---

## 3. SCRAPING ARCHITECTURE

### Phase 1: Post URL Discovery (no dependencies)
**Goal**: Build complete index of every post URL and date.

**Approach**: Scrape the calendar/monthly subject pages which are lightweight and list all post titles + dates.

```
Step 1a: Hit each year's calendar page (2005-2025)
         → Extract which months have posts

Step 1b: For each month with posts, hit the "View Subjects" page
         URL pattern: https://dodgeball.livejournal.com/YYYY/MM/
         → Extract: date, time, post title, comment count, post URL

Output: posts_index.json
        [{url, title, date, comment_count}, ...]
```

**Technical Notes**:
- LiveJournal renders via JavaScript — must use browser automation (Puppeteer/Playwright) OR the LiveJournal XML-RPC API
- The `get_page_text` from Chrome browser works well for extracting rendered content
- Monthly pages are small and fast to process
- Expected: ~300-400 post entries

### Phase 2: Full Post Scraping (depends on Phase 1)
**Goal**: Download full text + metadata for every post.

**Approach**: Navigate to each individual post URL and extract rendered content.

```
Step 2a: For each URL in posts_index.json:
         → Navigate to post page
         → Extract: full body text, images, comment count
         → Rate limit: 2-3 second delay between requests

Step 2b: Store raw content
         → Save each post as individual JSON file in db/raw_ecd_posts/
         → Also maintain master ecd_posts_raw.json with all posts

Output: db/raw_ecd_posts/{post_id}.json
        db/raw_ecd_posts/all_posts.json
```

**Technical Notes**:
- Use browser's `get_page_text` for clean text extraction (handles JS rendering)
- Also capture HTML for image URLs
- Respect rate limiting (LiveJournal may throttle)
- Estimated time: 300 posts × 3 sec = ~15 minutes
- Consider batching by year for checkpointing

### Phase 3: Sidebar Data Extraction (no dependencies — can run parallel with Phase 1)
**Goal**: Extract the structured sidebar data which contains clean event summaries.

**Approach**: The sidebar on the main page contains 4 recent event blocks with structured data.

```
Step 3a: Parse homepage sidebar
         → Anniversary XX (Sept 27, 2025): Main Event, awards, etc.
         → 2025 ProBowl (Feb 8, 2025): Main Event, fundraiser
         → INDOOR.III (Sept 21, 2024): Main Event, Rimshot winner
         → 18th Anniversary (Aug 26, 2023): Main Event, HOF, awards

Step 3b: Check if sidebar content changes on archive pages
         (older sidebar data for historical events?)

Output: ecd_sidebar_events.json
```

**Note**: Sidebar may only show the 4 most recent events. Historical sidebar data may need to come from post content parsing (Phase 4).

### Phase 4: NLP / Structured Data Extraction (depends on Phase 2)
**Goal**: Parse raw post text into structured data entities.

This is the most complex phase. Uses pattern matching + LLM-assisted extraction.

```
Step 4a: EVENT IDENTIFICATION
         Pattern match for: "DODGEBALL [number/roman numeral]",
         "Anniversary", "ProBowl", "Indoor", "FallFest", "Bowl Weekend"
         → Map each post to an event (some posts = previews, some = results)

Step 4b: PLAYER NAME EXTRACTION
         Use NER (Named Entity Recognition) or regex patterns
         → ALL-CAPS names in sidebar format
         → Names preceded by titles ("Captain", "rookie")
         → Names in rivalry descriptions
         → Cross-reference with existing people table in tron.db
         → Build comprehensive player roster with aliases

Step 4c: GAME RESULTS EXTRACTION
         Pattern match for score formats: "X to Y", "X-Y"
         → Identify captains: "[Name] and company defeated [Name]"
         → Identify individual highlights and eliminations

Step 4d: AWARD EXTRACTION
         Pattern match for: "Hall of Fame", "Excellence Award",
         "Rimshot", "Hit The Human", "200 Events"
         → Map award to recipient and event

Step 4e: RIVALRY EXTRACTION
         Pattern match for: "rivalry", "feud", "vs.", "nemesis",
         "arch-nemesis", "defeated"
         → Build rivalry pairs with context quotes

Step 4f: FUNDRAISER EXTRACTION
         Pattern match for: "$", "raised", "fundraiser", "donation"
         → Amount, beneficiary, event

Step 4g: ATTENDANCE EXTRACTION
         Pattern match for: "attendance", "confirmed", "sold out",
         player count numbers in context
         → Per-event attendance figures

Output:
  ecd_events_full.json
  ecd_players.json
  ecd_main_events.json
  ecd_awards.json
  ecd_rivalries.json
  ecd_game_results.json
  ecd_fundraisers.json
```

**Technical Notes**:
- LLM-assisted extraction recommended for narrative content (Claude API or manual review)
- Regex handles structured patterns (scores, ALL-CAPS names)
- Cross-reference with existing `people` table for name normalization
- Existing `name_resolver.py` utility can be extended for ECD names

### Phase 5: Sentiment & Theme Analysis (depends on Phase 4)
**Goal**: Apply the same sentiment/theme analysis used in the Timeline of Tron data.

```
Step 5a: VADER sentiment analysis on each post
         → compound, positive, negative scores

Step 5b: Emotion classification
         → pride, joy, nostalgia, competitiveness, sadness, gratitude

Step 5c: Theme classification
         → competition, community, growth, rivalry, celebration, memorial

Step 5d: Era/chapter classification
         → "Founding Era" (2005-2006)
         → "Growth Era" (2007-2009)
         → "Golden Age" (2010-2013)
         → "Evolution Era" (2014-2018)
         → "Legacy Era" (2019-2022)
         → "Celebration Era" (2023-2025)

Output: ecd_sentiment.json, ecd_themes.json
```

### Phase 6: Database Integration (depends on Phase 4 + 5)
**Goal**: Integrate all extracted data into tron.db with new tables.

```
NEW TABLES:
  ecd_posts          — All raw posts with text + sentiment
  ecd_events_v2      — Comprehensive event records (replaces sparse ecd_events)
  ecd_players        — Full player roster with stats
  ecd_game_results   — Per-event game results and scores
  ecd_main_events    — 1v1 featured matches
  ecd_awards_full    — All awards across all events
  ecd_rivalries      — Player rivalry pairs
  ecd_fundraisers    — Fundraiser records
  ecd_player_mentions — Per-post player mention counts
  ecd_highlights     — Notable plays and moments

UPDATED TABLES:
  people             — Add any new ECD people not already tracked
  co_occurrences     — Add ECD-sourced relationship data

Step 6a: Create schema migrations
Step 6b: Import all structured data
Step 6c: Generate JSON API files for frontend
Step 6d: Validate data integrity
```

### Phase 7: JSON API Generation (depends on Phase 6)
**Goal**: Export frontend-ready JSON files matching existing API pattern.

```
New API Files:
  ecd_posts.json              — All posts with metadata
  ecd_events_v2.json          — Full event records
  ecd_players.json            — Player profiles with stats
  ecd_player_network.json     — D3-ready relationship graph
  ecd_game_results.json       — Event-by-event results
  ecd_main_events.json        — 1v1 match history
  ecd_awards_full.json        — Complete awards history
  ecd_rivalries.json          — Rivalry data with context
  ecd_fundraisers.json        — Fundraiser timeline
  ecd_timeline.json           — Year-by-year ECD summary
  ecd_highlights.json         — Greatest moments curated list
  ecd_era_summary.json        — Era breakdowns with stats
  ecd_attendance_trends.json  — Attendance over time
```

---

## 4. DEPENDENCY GRAPH

```
Phase 1 ──────────────────► Phase 2 ──────► Phase 4 ──────► Phase 5
(URL Discovery)             (Full Scrape)   (NLP Extract)   (Sentiment)
                                                   │              │
Phase 3 ──────────────────────────────────────────►│              │
(Sidebar)                                          ▼              ▼
                                              Phase 6 ◄───────────┘
                                              (DB Integration)
                                                   │
                                                   ▼
                                              Phase 7
                                              (JSON API Gen)
                                                   │
                                                   ▼
                                              [SITE BUILD]
                                              (New ECD Room/Section)
```

**Parallelizable**: Phase 1 + Phase 3 can run simultaneously
**Bottleneck**: Phase 2 (full scrape) is the longest step (~15 min)
**Most Complex**: Phase 4 (NLP extraction) requires the most logic

---

## 5. TECHNICAL APPROACH OPTIONS

### Option A: Browser Automation (Recommended)
**Tool**: Chrome browser via MCP tools (already available in Cowork)
**Pros**: Handles JavaScript rendering, already proven to work
**Cons**: Slower, sequential navigation required
**Best for**: Phase 1-3 (scraping)

### Option B: LiveJournal XML-RPC API
**Endpoint**: `https://www.livejournal.com/interface/xmlrpc`
**Method**: `LJ.XMLRPC.getevents` — returns post content as XML
**Pros**: Fast, structured, no JS rendering needed, gets ALL posts in bulk
**Cons**: May require auth, rate limits apply, API may be deprecated
**Best for**: Phase 2 (bulk download) if available

### Option C: Python + Requests + BeautifulSoup
**Approach**: Fetch raw HTML, parse static content
**Pros**: Fast, scriptable, can run headlessly
**Cons**: Won't render JS content (LiveJournal uses heavy JS)
**Best for**: Supplementary parsing if HTML has enough data

### Recommended Hybrid Approach:
1. **Try Option B first** (API) — fastest if it works
2. **Fall back to Option A** (browser) — proven to work
3. **Use Option C** for post-processing and parsing

### For Phase 4 (NLP Extraction):
- **Primary**: Python script with regex patterns for structured data
- **Secondary**: Claude API for narrative-heavy content extraction
- **Validation**: Manual spot-check of 10% of records

---

## 6. ESTIMATED DATA VOLUMES

| Entity | Estimated Records |
|--------|------------------|
| Posts | 300-400 |
| Events (unique) | 222+ (sidebar shows event numbers up to 222+) |
| Players (unique) | 100-200+ ("generated over 60 players" by event 9 alone) |
| Main Event Matches | 30-50 (modern events have featured matches) |
| Awards | 50-100 |
| Rivalries | 15-25 |
| Game Results | 200+ (per-event scores) |
| Fundraisers | 10-15 |
| Images | 200+ |

---

## 7. SCRAPING SCRIPT OUTLINE

```python
# ecd_scraper.py — Master scraping orchestrator

# Phase 1: Build post index
def discover_posts():
    """Iterate calendar years → months → extract post URLs + titles"""

# Phase 2: Download full posts
def scrape_all_posts(post_index):
    """Navigate to each post URL, extract full content"""

# Phase 3: Extract sidebar
def scrape_sidebar():
    """Parse homepage sidebar for structured event data"""

# Phase 4: NLP extraction
def extract_events(posts): ...
def extract_players(posts): ...
def extract_game_results(posts): ...
def extract_awards(posts): ...
def extract_rivalries(posts): ...
def extract_main_events(posts, sidebar_data): ...
def extract_fundraisers(posts): ...

# Phase 5: Sentiment
def analyze_sentiment(posts): ...
def classify_themes(posts): ...
def assign_eras(events): ...

# Phase 6: DB integration
def create_tables(): ...
def import_data(): ...
def validate_integrity(): ...

# Phase 7: JSON export
def export_api_json(): ...
```

---

## 8. RISK FACTORS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| LiveJournal blocks scraping | High | Use browser (looks like real user), respect rate limits, try API first |
| JS rendering inconsistency | Medium | Browser approach handles this; fallback to API |
| Name disambiguation | Medium | Extend existing `name_resolver.py` with ECD-specific aliases |
| Score format varies over 20 years | Medium | Multiple regex patterns, manual review of edge cases |
| Some posts are image-only (no text) | Low | Flag image-only posts, extract what metadata exists |
| Posts deleted or edited since original | Low | Capture what's currently available, note gaps |
| Rate limiting/throttling | Medium | 3-second delays, session cookies, checkpoint/resume |

---

## 9. SITE INTEGRATION PREVIEW

The scraped data enables a **dedicated ECD section** of the Timeline of Tron site. Options:

**Option A: New standalone room** — "The Court" (8th room)
- Full ECD history dashboard
- Player network graph (D3)
- Event timeline with scores
- Rivalry tracker
- Awards history
- Attendance trends
- Era breakdown

**Option B: Major expansion of Dynasty room**
- Add ECD sub-tabs alongside career/awards
- Event history timeline
- Player spotlight carousel

**Option C: Hybrid** — ECD content in Dynasty + standalone deep-dive page

*(Site integration is a separate phase after scraping is complete)*

---

## 10. IMMEDIATE NEXT STEPS

1. **Validate API access** — Test LiveJournal XML-RPC API for bulk post retrieval
2. **Build Phase 1 script** — Calendar/subject page crawler for post index
3. **Run Phase 1** — Generate complete `posts_index.json`
4. **Build Phase 2 script** — Full post downloader with rate limiting
5. **Run Phase 2** — Download all ~300-400 posts
6. **Begin Phase 4** — Start with structured patterns (scores, names) before narrative NLP
