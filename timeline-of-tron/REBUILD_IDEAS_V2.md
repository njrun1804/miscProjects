# REBUILD V2: Implementation Guide

> **For Claude Code Opus 4.6** — Phase-by-phase build spec for The Timeline of Tron rebuild.
> Each phase is self-contained and deployable. Build in order. Test after each phase.

---

## Vision (Read This First)

The rebuild transforms the current single-page dashboard into **7 rooms + a lobby** — an interactive autobiography told through data. Each room is a separate HTML page with its own emotional palette, interaction model, and data sources. Together they form a museum-like experience: walk in, choose a gallery, explore.

**Core principles:**
- The LiveJournal aesthetic stays and evolves per room
- No frameworks. Vanilla JS, D3.js, Chart.js, Leaflet.js — all vendored locally
- No build process. Open HTML in browser. Deploy to GitHub Pages.
- Every room works independently. Cross-room links (wormholes) enhance but don't require each other.
- The data obsession IS the story. The precision of measurement is a character trait, not just a fun fact.

**File structure after rebuild:**
```
timeline-of-tron/
├── index.html                    # The Lobby (landing page)
├── arc.html                      # Room 1: The Arc (Hero's Journey + Sentiment)
├── constellation.html            # Room 2: The Constellation (People + Relationships)
├── comeback.html                 # Room 3: The Comeback Lab
├── records.html                  # Room 4: The Record Book
├── atlas.html                    # Room 5: The Atlas (Travel)
├── vault.html                    # Room 6: The Vault (Quotes + Writing)
├── dynasty.html                  # Room 7: The Dynasty (Career, Awards, ECD)
├── room0.html                    # Hidden Room: The Before
├── css/
│   ├── base.css                  # Shared variables, reset, typography, nav, footer, LJ signatures
│   ├── lobby.css                 # Lobby-specific styles
│   ├── arc.css                   # Room 1 styles (stage palettes, scroll animations)
│   ├── constellation.css         # Room 2 styles (dark sky, star nodes)
│   ├── comeback.css              # Room 3 styles (clinical + recovery)
│   ├── records.css               # Room 4 styles (warm wood, parchment)
│   ├── atlas.css                 # Room 5 styles (ocean blue, map)
│   ├── vault.css                 # Room 6 styles (charcoal, glowing quotes)
│   ├── dynasty.css               # Room 7 styles (deep green, trophy gold)
│   └── room0.css                 # Room 0 styles (near-black, single warm light)
├── js/
│   ├── data-loader.js            # Shared: fetch + cache all JSON, export getters
│   ├── nav.js                    # Shared: room navigation, search bar, LJ header
│   ├── wormholes.js              # Shared: cross-room contextual links
│   ├── seismograph.js            # Lobby: sentiment line animation
│   ├── arc.js                    # Room 1: scroll-driven hero's journey
│   ├── constellation.js          # Room 2: D3 force simulation
│   ├── comeback.js               # Room 3: Sankey + Recovery Clock
│   ├── records.js                # Room 4: gauges, streaks, obsession index
│   ├── atlas.js                  # Room 5: Leaflet map
│   ├── vault.js                  # Room 6: quote wall + keyword river
│   ├── dynasty.js                # Room 7: staircase, trophies, ECD, traditions
│   └── room0.js                  # Room 0: hidden clue tracking
├── lib/
│   ├── chart.js                  # Chart.js v4.5.1 (existing)
│   ├── d3.min.js                 # D3.js v7 (vendor this)
│   ├── d3-sankey.min.js          # D3 Sankey plugin (vendor this)
│   ├── leaflet.js                # Leaflet.js (vendor this)
│   ├── leaflet.css               # Leaflet styles (vendor this)
│   └── fuse.min.js               # Fuse.js (lightweight fuzzy search, vendor this)
├── db/api/                       # 60+ JSON endpoints (existing, no changes)
├── data/                         # Content database (existing, no changes)
├── archive/                      # Original sources (existing)
├── old-site/                     # Move current index.html + js/ + css/ here as backup
│   ├── index.html
│   ├── css/styles.css
│   ├── js/data.js
│   ├── js/plugins.js
│   ├── js/charts.js
│   └── js/app.js
├── CLAUDE.md
├── README.md
├── REBUILD_IDEAS_V2.md
└── tron_timeline_dashboard.html  # Original monolithic backup (keep)
```

---

## Phase 0: Prep Work (Do First)

### 0A. Back up the current site
```bash
mkdir -p old-site
cp index.html old-site/
cp -r css/ old-site/css/
cp -r js/ old-site/js/
```
Keep `tron_timeline_dashboard.html` in root as the original backup.

### 0B. Vendor new libraries
Download and save to `lib/`:
- **D3.js v7**: `https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js`
- **D3 Sankey**: `https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3/dist/d3-sankey.min.js`
- **Leaflet.js v1.9**: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` + `leaflet.css`
- **Fuse.js v7**: `https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js`

### 0C. Fix known data issues
1. **Sentiment mis-scores** in `db/tron.db`: 2011 MRI injury scored positive (+0.400), 2019 game scored negative (-0.400). Fix and re-export `sentiment_timeline.json`.
2. **Travel geocoding**: Add `lat`/`lng` fields to all 34 entries in `db/api/travel.json`. Use Nominatim or hardcode — all locations are well-known cities/countries. Required for Room 5 (The Atlas).
3. **Awards context**: The Janet Jackson dynasty (5 wins) needs context/explanation added to `db/api/awards_enriched.json` — what are these awards? Selection process?

### 0D. Create shared data loader module
**File: `js/data-loader.js`**

This module fetches all JSON from `db/api/` and caches it. Every room imports from here instead of fetching directly.

```javascript
// js/data-loader.js
const DATA_CACHE = {};
const API_BASE = 'db/api/';

export async function loadData(filename) {
    if (DATA_CACHE[filename]) return DATA_CACHE[filename];
    const resp = await fetch(API_BASE + filename);
    const data = await resp.json();
    DATA_CACHE[filename] = data;
    return data;
}

export async function loadMultiple(filenames) {
    const results = {};
    await Promise.all(filenames.map(async f => {
        results[f.replace('.json', '')] = await loadData(f);
    }));
    return results;
}
```

---

## Phase 1: Base CSS + Shared Navigation + Lobby

**Goal:** Create the design system, shared nav component, and the lobby page. After this phase, you have a working landing page that links to placeholder room pages.

### 1A. Create `css/base.css` — The Design System

**CSS custom properties (root-level, shared by all rooms):**
```css
:root {
    /* Base LJ palette (lobby defaults) */
    --lj-bg: #e8e0d0;
    --lj-panel: #f5f0e6;
    --lj-border: #c4b8a0;
    --lj-header-bg: #4a6741;
    --lj-header-text: #e8e0d0;
    --lj-link: #5c3d1a;
    --lj-text: #2c2416;
    --lj-text-secondary: #6b5b47;
    --lj-accent: #8b1a1a;
    --lj-accent2: #1a4a8b;
    --lj-accent3: #6b4a8b;
    --lj-gold: #c9a84c;
    --lj-shadow: rgba(90,78,60,0.15);

    /* Typography */
    --font-body: Georgia, 'Times New Roman', serif;
    --font-mono: 'Courier Prime', 'Courier New', monospace;
    --font-sans: 'Trebuchet MS', 'Lucida Grande', sans-serif;

    /* Spacing */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 2rem;
    --space-xl: 4rem;

    /* Borders */
    --radius: 3px;
    --border: 1px solid var(--lj-border);
}
```

**Include in base.css:**
- CSS reset (minimal — box-sizing, margin/padding zero)
- Google Fonts import (Courier Prime)
- Typography defaults (body = Georgia, h1-h6 = Courier Prime, .sans = Trebuchet)
- `.container` class (max-width: 1100px, centered)
- `.lj-header` — the shared LiveJournal-style header (userpic, username, tagline, nav links)
- `.lj-nav` — "Recent Entries | Archive | Friends | User Info | Memories" bar (functional: links to rooms)
- `.room-nav` — The seven room cards navigation (used in lobby, collapsed to horizontal bar in rooms)
- `.lj-footer` — Hit counter, mood tag, music tag, copyright
- `.lj-mood`, `.lj-current` — Mood and music indicator classes
- `.wormhole-link` — Small contextual cross-room link styling
- `.lj-cut-toggle` — Expand/collapse toggle (the "(expand — lj-cut)" pattern)
- Print styles
- Responsive breakpoints: 768px (tablet), 480px (phone)

### 1B. Create `js/nav.js` — Shared Navigation

Handles:
- Injecting the `.lj-header` and `.lj-nav` into every page
- Active room highlighting in navigation
- Simple Fuse.js search bar in header (searches across all data, returns room links)
- Mobile hamburger menu toggle
- Room mood/music tags (each room passes its mood and music to nav.js)

### 1C. Create `index.html` — The Lobby

**Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Timeline of Tron</title>
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/lobby.css">
</head>
<body class="room-lobby">
    <!-- LJ Header (injected by nav.js) -->
    <div id="lj-header-mount"></div>

    <main class="lobby">
        <!-- Hero -->
        <section class="lobby-hero">
            <h1 class="lobby-title">The Timeline of Tron</h1>
            <p class="lobby-subtitle">22 years. 227 milestones. One obsessively documented life.</p>
        </section>

        <!-- Emotional Seismograph -->
        <section class="lobby-seismograph">
            <canvas id="seismograph" width="1000" height="120"></canvas>
            <p class="seismograph-label">The shape of a life, 2004–2026</p>
        </section>

        <!-- Room Cards -->
        <section class="lobby-rooms">
            <h2 class="lobby-rooms-title">Choose Your Lens</h2>
            <div class="room-grid">
                <!-- 7 room cards, each with: title, icon/emoji, one-line teaser, mood tag, link -->
                <a href="arc.html" class="room-card room-card--arc">
                    <span class="room-card__icon">📖</span>
                    <h3>The Arc</h3>
                    <p>The hero's journey from 2004 to now</p>
                    <span class="room-card__mood">Mood: cinematic</span>
                </a>
                <a href="constellation.html" class="room-card room-card--constellation">
                    <span class="room-card__icon">✨</span>
                    <h3>The Constellation</h3>
                    <p>124 people. Who connects to whom.</p>
                    <span class="room-card__mood">Mood: contemplative</span>
                </a>
                <a href="comeback.html" class="room-card room-card--comeback">
                    <span class="room-card__icon">🔬</span>
                    <h3>The Comeback Lab</h3>
                    <p>Every crisis has a recovery pattern</p>
                    <span class="room-card__mood">Mood: hopeful</span>
                </a>
                <a href="records.html" class="room-card room-card--records">
                    <span class="room-card__icon">🏆</span>
                    <h3>The Record Book</h3>
                    <p>8.6 lbs of shrimp. To the decimal.</p>
                    <span class="room-card__mood">Mood: proud</span>
                </a>
                <a href="atlas.html" class="room-card room-card--atlas">
                    <span class="room-card__icon">🌍</span>
                    <h3>The Atlas</h3>
                    <p>34 trips. 20+ countries. Recovery by travel.</p>
                    <span class="room-card__mood">Mood: wandering</span>
                </a>
                <a href="vault.html" class="room-card room-card--vault">
                    <span class="room-card__icon">💬</span>
                    <h3>The Vault</h3>
                    <p>79 quotes. 22 years of evolving voice.</p>
                    <span class="room-card__mood">Mood: intimate</span>
                </a>
                <a href="dynasty.html" class="room-card room-card--dynasty">
                    <span class="room-card__icon">👑</span>
                    <h3>The Dynasty</h3>
                    <p>Career. Awards. Dodgeball. What was built.</p>
                    <span class="room-card__mood">Mood: accomplished</span>
                </a>
            </div>
        </section>
    </main>

    <!-- LJ Footer (injected by nav.js) -->
    <div id="lj-footer-mount"></div>

    <script src="lib/fuse.min.js"></script>
    <script type="module" src="js/data-loader.js"></script>
    <script type="module" src="js/nav.js"></script>
    <script type="module" src="js/seismograph.js"></script>
</body>
</html>
```

### 1D. Create `js/seismograph.js` — Lobby Animation

Draws an animated sentiment line on the lobby canvas.

**Data source:** `db/api/sentiment_timeline.json`

**Behavior:**
1. Fetch sentiment data (23 years of avg_sentiment values)
2. Normalize to canvas height (map -1..+1 to canvas Y)
3. Animate drawing the line left-to-right over 3 seconds using `requestAnimationFrame`
4. Line color: warm gradient (lj-accent → lj-gold → lj-header-bg)
5. No axes, no labels, no grid — just the shape. Caption below says "The shape of a life, 2004–2026"
6. On hover: faint year labels appear at data points

### 1E. Create placeholder room pages

Create `arc.html`, `constellation.html`, `comeback.html`, `records.html`, `atlas.html`, `vault.html`, `dynasty.html` — each with:
- Shared `base.css` + room-specific CSS
- The shared nav header
- A `<main>` with a title and "Coming soon" message
- The shared footer with room-specific mood/music tags

**After Phase 1: Deploy. The lobby is live and links to 7 placeholder rooms.**

---

## Phase 2: Room 1 — The Arc (Hero's Journey + Emotional Timeline)

**Goal:** Build the emotional centerpiece of the site — a scroll-driven narrative through 9 hero's journey stages with persistent sentiment visualization.

### Data sources to load:
- `heros_journey_narrative.json` — 9 stages with milestones, quotes, people, turning points per stage
- `sentiment_timeline.json` — Emotional arc with dominant emotions per year
- `turning_points.json` — 13 critical moments (7 redemptive, 5 contaminated, 1 stable)
- `quotes.json` — Thematically matched to stages
- `milestones_enriched.json` — Filtered by hero's journey stage

### Page structure (`arc.html`):
```
<body class="room-arc">
    [shared nav]
    <aside class="arc-sentiment-line">
        <!-- Persistent vertical sentiment line on left edge (desktop) or bottom (mobile) -->
        <canvas id="sentimentLine"></canvas>
    </aside>
    <main class="arc-stages">
        <section class="arc-stage" data-stage="ordinary-world" id="stage-1">
            <div class="stage-bg"></div> <!-- Background color shifts per stage -->
            <div class="stage-content">
                <span class="stage-number">I</span>
                <h2 class="stage-title">Ordinary World</h2>
                <p class="stage-years">2004–2007</p>
                <p class="stage-prose">Literary narrative paragraph...</p>
                <div class="stage-milestones">
                    <!-- 3-5 milestone cards that fade in on scroll -->
                </div>
                <div class="stage-turning-points">
                    <!-- Diamond markers for turning points in this stage -->
                </div>
                <blockquote class="stage-quote">
                    <!-- Key quote from this stage -->
                </blockquote>
                <div class="stage-people">
                    <!-- Avatars/names of people active in this stage -->
                </div>
            </div>
        </section>
        <!-- Repeat for all 9 stages -->
    </main>
    <nav class="arc-chapter-nav">
        <!-- Sidebar chapter navigation: click to jump to any stage -->
    </nav>
    [shared footer with mood: "cinematic", music: contextual per stage]
</body>
```

### Stage-to-palette mapping (define in `css/arc.css`):
```css
.arc-stage[data-stage="ordinary-world"]    { --stage-bg: #b0bec5; --stage-text: #263238; } /* Cool grey-blue */
.arc-stage[data-stage="call-to-adventure"] { --stage-bg: #d4a24e; --stage-text: #3e2723; } /* Warm amber */
.arc-stage[data-stage="tests-allies"]      { --stage-bg: #4a6741; --stage-text: #e8e0d0; } /* Forest green */
.arc-stage[data-stage="approach-cave"]     { --stage-bg: #4a2d6b; --stage-text: #e0d6ef; } /* Deep purple */
.arc-stage[data-stage="ordeal"]            { --stage-bg: #6b1a1a; --stage-text: #f5e6e6; } /* Dark red */
.arc-stage[data-stage="reward"]            { --stage-bg: #c9a84c; --stage-text: #2c2416; } /* Gold */
.arc-stage[data-stage="road-back"]         { --stage-bg: #1a5c5c; --stage-text: #e0f0f0; } /* Teal */
.arc-stage[data-stage="resurrection"]      { --stage-bg: linear-gradient(135deg, #d4a24e, #c9a84c, #e8e0d0); } /* Sunrise */
.arc-stage[data-stage="return-elixir"]     { --stage-bg: #e8e0d0; --stage-text: #2c2416; } /* Home cream */
```

### Key interactions (implement in `js/arc.js`):
1. **Scroll-driven stage detection**: Use `IntersectionObserver` on each `.arc-stage`. When a stage enters 50% viewport, update the sentiment line position and chapter nav highlight.
2. **Sentiment line**: Draws progressively as user scrolls. Vertical line on left (desktop). Turning point diamonds glow when their stage is active: green = redemptive, red = contaminated.
3. **Milestone fade-in**: Each `.stage-milestones` card has `opacity: 0; transform: translateY(20px)` initially. IntersectionObserver triggers fade-in.
4. **Quote animation**: Blockquotes slide in from the right when their stage activates.
5. **Chapter nav**: Fixed sidebar (desktop) or bottom dots (mobile). Click jumps to stage via `scrollIntoView({ behavior: 'smooth' })`.

### Key narrative callout to include:
At the 2009 stage, add a callout box:
> *"2009 wasn't the happiest year. It was the most alive. Sentiment score: 0.076. But emotional range: -0.751 to +0.91. The greatest years aren't the calmest."*

This uses real data (sentiment_timeline.json: 2009 avg_sentiment = 0.076, quote_sentiments range).

**After Phase 2: Deploy. The Arc is the first fully-built room.**

---

## Phase 3: Room 2 — The Constellation (People + Relationships)

**Goal:** Interactive D3 force graph of 124 people as stars on a dark background. Click to explore.

### Data sources:
- `relationship_constellation.json` — 123 nodes, 39 links, pre-clustered
- `co_occurrences.json` — 56 pairs with strength metrics
- `people_profiles.json` — 122 profiles with highlights, timeline, quotes
- `quotes.json` — Filter by speaker

### Page structure (`constellation.html`):
```
<body class="room-constellation">
    [shared nav]
    <main class="constellation-container">
        <div class="constellation-sky" id="constellationMount">
            <!-- D3 force simulation renders here (SVG) -->
        </div>
        <aside class="constellation-sidebar" id="personPanel">
            <!-- Slides in when a star is clicked -->
            <button class="sidebar-close">&times;</button>
            <h2 class="person-name"></h2>
            <p class="person-years"></p>
            <p class="person-highlight"></p>
            <div class="person-connections"></div>
            <div class="person-milestones"></div>
            <div class="person-quotes"></div>
            <div class="person-wormholes"></div>
        </aside>
    </main>
    <section class="inner-circle-timeline">
        <!-- Secondary viz: how inner circle size changes over time -->
        <canvas id="innerCircleChart"></canvas>
    </section>
    [shared footer with mood: "contemplative"]
</body>
```

### D3 implementation (`js/constellation.js`):
1. **Background**: Dark navy `#0a1628` (set via `--room-bg` in constellation.css)
2. **Nodes**: Circles. Radius = `Math.sqrt(mentions) * 3 + 4`. Fill = era color (2004-2008: blue, 2009-2012: green, 2013-2016: purple, 2017+: gold). Stroke = white at 0.3 opacity.
3. **Links**: Lines between co-occurring people. Stroke-width = co-occurrence strength. Color = white at 0.15 opacity.
4. **Force simulation**: `d3.forceSimulation()` with `forceLink`, `forceManyBody(-30)`, `forceCenter`, `forceCollide`.
5. **Click behavior**: Clicking a node:
   - Transitions: clicked node moves to center, connected nodes pull closer (increase link force), unconnected nodes fade to 0.1 opacity
   - Sidebar slides in from right with person details
   - Sidebar data pulled from `people_profiles.json` filtered by person name
6. **Hover behavior**: Show tooltip with name and milestone count
7. **Search**: Small search box above the constellation. Typing a name highlights matching nodes.

### The Pops vs Rob annotation:
When the user clicks The Pops (31 mentions) or browses the constellation, include a note at the bottom of the sidebar panel for people with very few mentions relative to their significance:
> *"Some people are so woven into the fabric that the fabric forgets to name them."*

### Inner Circle Timeline (below constellation):
A Chart.js line chart showing approximate "active people count" per year. Count = number of unique people who appear in milestones for that year. Shows expansion (2008-2012 post-coming-out), contraction (2017 surgery), and stabilization (2020+). Use `milestones_enriched.json` to compute.

**After Phase 3: Deploy. Two rooms live.**

---

## Phase 4: Room 3 — The Comeback Lab + Room 4 — The Record Book

### Room 3: The Comeback Lab

**Goal:** Visualize the behavioral pattern behind 12 comeback arcs. Crisis type predicts recovery type.

### Data sources:
- `comeback_narrative.json` — 12 valley-to-peak arcs
- `medical_events.json` — 14 health events
- `turning_points.json` — 13 critical moments
- `sentiment_timeline.json` — For valley/peak identification

### Centerpiece: Sankey Diagram
Using D3 Sankey plugin. Three columns:
- **Left (Crisis Type):** Physical trauma, Mental health, Relationship, Career
- **Middle (Recovery Behavior):** Travel/Adventure, Community creation, Physical fitness, Freedom/Exploration
- **Right (Outcome):** Documented with sentiment recovery score

Flow widths proportional to number of instances. Each flow is clickable — reveals the specific comeback story in a detail panel below.

### Secondary viz: Recovery Clock
A radial/polar chart (Chart.js) showing average recovery time by crisis type. Slices = crisis types. Radius = months to recovery. The 7.1-month average is the headline stat.

### Tongue-in-cheek callout:
> *"Based on 22 years of data: if you break a bone, book a cruise. If you're having an existential crisis, start a dodgeball tournament."*

---

### Room 4: The Record Book

**Goal:** Celebrate the obsessive precision of measurement as a character trait.

### Data sources:
- `fun_facts.json` — 60 entries
- `streaks.json` — 10 entries
- `traditions.json` — 14 entries
- `sports.json` — Sports records
- `epic_numbers.json` — Single-event records

### Sections:

**The Obsession Index** (new concept): Display the most precisely tracked stats in a grid. Each card shows the stat AND the precision level:
- "4:10:18 PM CT" — time-of-day, to the second
- "8.6 lbs" — weight, to the tenth of a pound
- "6h 7m 3s" — duration, to the second
- "218 rounds" — count, every single round
- "3 waters + 2 Vitamin Waters + 5 energy bars" — consumption, itemized
Sidebar annotation: *"Why track shrimp consumption to the decimal? Because if you're going to eat 8.6 pounds of shrimp, you should know exactly how far you went."*

**Sports Gauges**: Three half-circle Chart.js doughnut gauges for win rates (Table Tennis 93.9%, Cornhole 72.2%, Famous Faces 45.0%). Style as vintage speedometers — serif fonts on labels, warm panel backgrounds.

**Streak Tracker**: Horizontal bar chart. Active streaks in green, broken streaks in red. Each bar = streak duration in years. Annotation on WrestleMania streak (broken 2017): link to The Comeback Lab's surgery recovery.

**Record Wall**: All 60 fun facts as a scrollable grid of framed "record" cards. Each card has the stat in large monospace, context in small serif italics, and the year.

**The 20-Year Gap**: A special callout about the Rangers story — MSG Rangers game 2001, not again until 2021. *"Some obsessions replace others. The seat at MSG waited 20 years."*

### Room palette (records.css):
```css
.room-records { --room-bg: #f5efe0; --room-text: #2c1810; --room-accent: #8b6914; --room-panel: #faf5e8; }
```

**After Phase 4: Deploy. Four rooms live.**

---

## Phase 5: Room 5 — The Atlas + Room 6 — The Vault

### Room 5: The Atlas

**Goal:** Interactive map of 34 travel entries, colored by sentiment, with a "Recovery Trips" toggle.

**Requires:** Phase 0C geocoding complete (lat/lng on all travel entries).

### Data sources:
- `travel.json` — 34 entries with sentiment + geocoded coordinates
- `travel_sentiment_by_location.json` — Geographic emotional resonance
- `medical_events.json` — For Recovery Trips toggle
- `location_frequency.json` — Recurring locations

### Implementation:
1. **Leaflet map** centered on world view. Tile layer: CartoDB Positron (light, minimal) or Stamen Toner Lite.
2. **Pins**: Circle markers. Color = sentiment (green positive, amber neutral, red negative). Size = significance (use a 1-5 scale based on milestone count during that trip).
3. **Click pin**: Popup card with destination, dates, sentiment score, key milestones, who was there.
4. **Recovery Trips toggle**: Button above map. When active, highlights post-medical-event trips with a special pulsing marker and draws a line from the medical event's location (or a timeline point) to the recovery destination.
5. **Timeline scrubber**: Range slider below map. Drag to filter pins by year range. Watch the travel radius expand from domestic → international over time.
6. **Stats bar**: Total countries, total trips, avg sentiment international vs domestic.

### Room palette (atlas.css):
```css
.room-atlas { --room-bg: #f0f4f8; --room-text: #1a2a3a; --room-accent: #1a5c8b; --room-panel: #ffffff; }
```

---

### Room 6: The Vault

**Goal:** 79 quotes as a filterable wall, plus a writing evolution timeline and keyword river.

### Data sources:
- `quotes.json` — 79 quotes with emotion + theme classification
- `writing_evolution.json` — 21 years of style data
- `year_keywords.json` — 211 TF-IDF keywords per year
- `emotion_distribution.json` — Emotion prevalence by period

### Section 1: Quote Wall
- Dark background (`#1a1a2e`). Quotes displayed as glowing cards on a grid.
- Each card: quote text (large Georgia italic), speaker, year, emotion badge (color-coded), theme tags.
- **Emotion filter buttons** at top: Joy (amber), Pride (gold), Shame (deep red), Determination (steel blue), Love (rose), Resilience (teal), Uncertainty (grey). Clicking a filter:
  - Fades non-matching quotes to 0.15 opacity
  - Changes room background tint to match the emotion color
  - Shows count: "Showing 12 of 79 quotes"
- **Reset** button clears filters.
- Click a quote card → expand to modal with full context: linked milestone, speaker profile link, year in hero's journey, related quotes.

### Section 2: Voice Timeline
- Horizontal timeline below the quote wall showing writing evolution stats per year.
- Metrics: `avg_grade_level`, `avg_word_count`, `vocabulary_richness` from `writing_evolution.json`.
- Highlight the 2011 anomaly: grade level jumps from 20.35 → 51.5 with vocabulary richness increasing to 0.814. Callout: *"In 2011, the sentences got shorter but the words got bigger. Something changed."*
- Use a multi-line Chart.js chart (grade level on left Y axis, vocabulary richness on right Y axis, year on X).

### Section 3: Keyword River
- D3 stream graph showing TF-IDF keyword prevalence across years.
- Data: `year_keywords.json` — group top 10 keywords per year into flowing "streams."
- Hover a stream: highlight that keyword across all years, show tooltip with keyword + score.
- The river should show: "wrestling" as a constant wide stream, "surgery" as a spike in 2017, "travel" growing steadily, "love" appearing 2011 and dipping 2025.

### Room palette (vault.css):
```css
.room-vault { --room-bg: #1a1a2e; --room-text: #d4d0c8; --room-accent: #c9a84c; --room-panel: #252540; }
```

**After Phase 5: Deploy. Six rooms live.**

---

## Phase 6: Room 7 — The Dynasty + Cross-Room Wormholes

### Room 7: The Dynasty

**Goal:** The "what was built" room — career, awards, ECD dodgeball, traditions.

### Data sources:
- `career.json` — Career entries
- `awards_enriched.json` — 51 awards
- `awards_categories.json` — 10 categories
- `ecd_events.json` — ECD history
- `traditions.json` — 14 traditions
- `streaks.json` — 10 streaks

### Sections:

**The Staircase (Career):** CSS-rendered ascending staircase. Each step = a role. Width = tenure duration (years). Height = consistent step size. Labels: title, years, one-line milestone context. Annotation on the 7-year Coordinator plateau (2011-2018): *"Seven years learning. Then the climb began."*

**Trophy Case (Awards):** Dark wood-toned panel. Awards displayed as small trophy icons grouped by category. Click a category to expand and see all awards within it. The Janet Jackson dynasty gets a special "Dynasty" sub-section with context (explain what these awards are).

**The Dodgeball Dynasty (ECD):** Growth chart showing participants and funds raised over 18 years. Chart.js bar + line combo (bars = participants, line = funds raised). Annotation connecting ECD founding to post-mental-health-crisis recovery: *"Some people journal. Some people run. Tron started a dodgeball tournament."*

**Traditions Year-Wheel:** A D3 radial chart showing when each tradition occurs in the year and how long it's been running. 12 months around the wheel, traditions as arcs. Arc length = longevity in years. Creates a "how full is the calendar" visualization.

### Room palette (dynasty.css):
```css
.room-dynasty { --room-bg: #1a2e1a; --room-text: #d4dcd0; --room-accent: #c9a84c; --room-panel: #253025; }
```

---

### Cross-Room Wormholes (`js/wormholes.js`)

Implement after all rooms exist. Wormholes are contextual links between rooms.

**Data structure:**
```javascript
const WORMHOLES = [
    { from: { room: 'arc', element: '[data-stage="ordeal"]' },
      to: { room: 'comeback', section: 'spinal-surgery' },
      label: 'See the recovery pattern' },
    { from: { room: 'constellation', person: 'The Pops' },
      to: { room: 'arc', section: 'stage-1' },
      label: 'Father-son reconciliation begins here' },
    { from: { room: 'atlas', destination: 'Mediterranean' },
      to: { room: 'comeback', section: 'post-surgery' },
      label: 'This was the recovery trip' },
    { from: { room: 'records', streak: 'wrestlemania' },
      to: { room: 'comeback', section: 'spinal-surgery' },
      label: 'The surgery that broke the streak' },
    // ... more wormholes
];
```

**Rendering:** A small portal icon (🔗 or custom SVG) appears next to content that has a wormhole. Hover shows preview tooltip with the destination room name and label. Click navigates to the destination room with a URL hash (e.g., `comeback.html#spinal-surgery`).

**After Phase 6: Deploy. All 7 rooms live with cross-room connections.**

---

## Phase 7: Room 0 (Hidden) + Search + Polish

### Room 0: The Before

Hidden room. Not linked from lobby or navigation. Found by discovering 5 clues scattered across rooms.

**Clue locations:**
1. **The Arc**: In the "Ordinary World" stage, one milestone card has a barely-visible border glow (CSS `box-shadow` pulse animation at very low opacity)
2. **The Constellation**: One node that doesn't appear in any co-occurrences pulses differently (slower frequency)
3. **The Record Book**: The hit counter in the footer shows a different number than other rooms
4. **The Vault**: One quote card has a slightly different font-weight that's almost imperceptible
5. **The Atlas**: A pin exists for a location that's not in the travel data (a pre-2004 location)

**Tracking:** `js/room0.js` uses `localStorage` to track found clues. When all 5 found, a subtle animation on the lobby page reveals the link to `room0.html`.

**Room 0 content:** The pre-2004 origin story. Dark, minimal design (near-black `#0d0d0d` with a single warm light source). Contains:
- The car accident that started it all
- Early wrestling fandom (1997 first Survivor Series)
- The family dynamics before reconciliation
- Content sourced from pre-2004 references in milestones_enriched.json and medical_events.json
- New narrative content to be written (literary, reflective tone)

### Global Search Enhancement
After all rooms exist, enhance the Fuse.js search to index content across all rooms. Search results link directly to the relevant room + section with URL hash navigation.

### Polish Checklist:
- [ ] All rooms tested on mobile (responsive)
- [ ] All rooms tested offline (vendored libraries load)
- [ ] Cross-room wormholes all functional
- [ ] Page load performance under 3 seconds per room
- [ ] WCAG AA color contrast on all rooms
- [ ] Print stylesheets for The Arc and The Record Book
- [ ] Open Graph meta tags for social sharing (each room gets its own og:image and og:description)
- [ ] Favicon and touch icon
- [ ] 404 page styled in LiveJournal aesthetic
- [ ] `old-site/index.html` still accessible as `/old-site/` for nostalgia

**After Phase 7: Full site launch.**

---

## Room Palette Quick Reference

| Room | Background | Text | Accent | Panel | Mood |
|------|-----------|------|--------|-------|------|
| Lobby | `#e8e0d0` cream | `#2c2416` brown | `#c9a84c` gold | `#f5f0e6` off-white | nostalgic |
| The Arc | Shifts per stage | Shifts per stage | Stage-dependent | transparent | cinematic |
| Constellation | `#0a1628` navy | `#d0d8e4` light | `#4a90d9` blue | `#122240` dark | contemplative |
| Comeback Lab | `#f8f9fa` clinical | `#1a1a2e` dark | `#2e7d32` green | `#ffffff` white | hopeful |
| Record Book | `#f5efe0` parchment | `#2c1810` brown | `#8b6914` gold | `#faf5e8` cream | proud |
| Atlas | `#f0f4f8` light blue | `#1a2a3a` navy | `#1a5c8b` blue | `#ffffff` white | wandering |
| Vault | `#1a1a2e` charcoal | `#d4d0c8` warm grey | `#c9a84c` gold | `#252540` dark | intimate |
| Dynasty | `#1a2e1a` forest | `#d4dcd0` light green | `#c9a84c` gold | `#253025` dark | accomplished |
| Room 0 | `#0d0d0d` near-black | `#a09080` muted | `#c9a84c` gold | `#1a1a1a` dark | raw |

---

## Data File Reference (All Pre-Existing in `db/api/`)

| File | Records | Used In |
|------|---------|---------|
| `sentiment_timeline.json` | 23 years | Lobby seismograph, The Arc |
| `heros_journey_narrative.json` | 9 stages | The Arc |
| `milestones_enriched.json` | ~226 entries | The Arc, Constellation, Atlas, Dynasty |
| `turning_points.json` | 13 moments | The Arc, Comeback Lab |
| `quotes.json` | 79 quotes | The Arc, Vault, Constellation |
| `relationship_constellation.json` | 123 nodes, 39 links | Constellation |
| `co_occurrences.json` | 56 pairs | Constellation |
| `people_profiles.json` | 122 profiles | Constellation, Vault |
| `comeback_narrative.json` | 12 arcs | Comeback Lab |
| `medical_events.json` | 14 events | Comeback Lab, Atlas |
| `fun_facts.json` | 60 facts | Record Book |
| `streaks.json` | 10 streaks | Record Book, Dynasty |
| `traditions.json` | 14 traditions | Dynasty |
| `travel.json` | 34 entries | Atlas |
| `travel_sentiment_by_location.json` | — | Atlas |
| `location_frequency.json` | — | Atlas |
| `writing_evolution.json` | 21 years | Vault |
| `year_keywords.json` | 211 keywords | Vault |
| `emotion_distribution.json` | — | Vault |
| `awards_enriched.json` | 51 awards | Dynasty |
| `awards_categories.json` | 10 categories | Dynasty |
| `ecd_events.json` | — | Dynasty |
| `career.json` | — | Dynasty |
| `sports.json` | — | Record Book |
| `epic_numbers.json` | — | Record Book |

---

## What NOT to Do

- **Do NOT introduce npm, webpack, vite, or any build tooling.** This project stays as "open HTML in browser."
- **Do NOT use React, Vue, Svelte, or any JS framework.** Vanilla JS + D3 + Chart.js.
- **Do NOT add a backend or database server.** All data is static JSON served from `db/api/`.
- **Do NOT remove the LiveJournal aesthetic.** It evolves per room but the DNA (serif fonts, mood tags, warm tones, monospace stats) is always present.
- **Do NOT create more than 9 HTML pages total** (lobby + 7 rooms + Room 0). The architecture is rooms, not features.
- **Do NOT delete `old-site/` or `tron_timeline_dashboard.html`.** These are the backups.

---

*Implementation guide generated: February 8, 2026*
*Target: Claude Code Opus 4.6 — phase-in build, each phase deployable*
*Philosophy: Rooms, not features. Feeling, not data. Less is more.*
