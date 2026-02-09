# CLAUDE.md — Project Context for AI Assistants

## Project Overview
This is **The Timeline of Tron**, a personal data autobiography spanning 22+ years (2004–2026). It has been rebuilt from a single-page LiveJournal-styled dashboard into a **multi-room interactive experience** — 8 themed rooms + a lobby, each offering a different lens on the same 22-year arc.

**The rebuild spec lives in `REBUILD_IDEAS_V2.md`.** That is the implementation guide. Read it before making structural changes.

## Current State

### V2 Rebuild — COMPLETE
All 8 phases are complete. The site is live and fully functional.

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 0 | Prep: backup old site, vendor libs, fix data issues | Complete |
| Phase 1 | Base CSS + shared nav + lobby page + placeholder rooms | Complete |
| Phase 2 | Room 1: The Arc (hero's journey + sentiment scroll) | Complete |
| Phase 3 | Room 2: The Constellation (D3 people graph) | Complete |
| Phase 4 | Room 3 (removed) + Room 4: Record Book | Complete |
| Phase 5 | Room 5: The Atlas (map) + Room 6: The Vault (quotes) | Complete |
| Phase 6 | Room 7: The Dynasty + cross-room wormholes | Complete |
| Phase 7 | Room 0 (hidden) + search + polish | Complete |
| Post-rebuild | Room 8: ECD (East Coast Dodgeball community) | Complete |

### Old Site (Pre-Rebuild)
The original single-page dashboard lives in `old-site/` after Phase 0 backup. The monolithic v1.0 backup is `tron_timeline_dashboard.html` (keep in root, never delete). `v2.html` is a standalone intermediate version (also kept as archive).

## Architecture

### Rooms
The site has 10 HTML pages: 1 lobby + 8 rooms + 1 hidden room.

| Page | Room | Mood | Music | Description |
|------|------|------|-------|-------------|
| `index.html` | Lobby | nostalgic | Janet Jackson — "All For You" | Hero, seismograph, room cards, friend voices |
| `arc.html` | The Arc | cinematic | Mumford & Sons — "The Cave" | Hero's journey in 9 stages, sentiment line |
| `constellation.html` | The Constellation | contemplative | Coldplay — "The Scientist" | D3 force graph of 164 people, era coloring |
| `records.html` | The Record Book | proud | Queen — "We Are the Champions" | Obsession index, sports gauges, comebacks, streaks |
| `atlas.html` | The Atlas | wandering | Fleetwood Mac — "Everywhere" | Leaflet map, travel eras, cruise streak, recovery stories |
| `vault.html` | The Vault | intimate | Bon Iver — "Skinny Love" | 79 quotes, voice evolution, then & now pairs, soundtrack |
| `dynasty.html` | The Dynasty | accomplished | Jay-Z — "Empire State of Mind" | Career staircase, trophy case, WWE timeline, traditions |
| `ecd.html` | ECD | competitive | Survivor — "Eye of the Tiger" | 128 players, 168 events, 21 years of dodgeball |
| `room0.html` | The Before | raw | Radiohead — "Everything In Its Right Place" | Hidden room, requires finding 7 clues across other rooms |

**Note**: There is no `comeback.html`. Comeback content lives inside `records.html`.

### File Structure
```
timeline-of-tron/
├── index.html                    # The Lobby
├── arc.html                      # Room 1: The Arc
├── constellation.html            # Room 2: The Constellation
├── records.html                  # Room 4: The Record Book (includes comebacks)
├── atlas.html                    # Room 5: The Atlas
├── vault.html                    # Room 6: The Vault
├── dynasty.html                  # Room 7: The Dynasty
├── ecd.html                      # Room 8: ECD (East Coast Dodgeball)
├── room0.html                    # Hidden Room: The Before
├── v2.html                       # Intermediate standalone version (archive)
├── css/
│   ├── base.css                  # Shared: variables, reset, typography, nav, footer (679 lines)
│   ├── lobby.css                 # Lobby styles (223 lines)
│   ├── arc.css                   # Room 1: stage palettes, scroll animations (836 lines)
│   ├── constellation.css         # Room 2: dark sky, star nodes, sidebar (1065 lines)
│   ├── records.css               # Room 4: warm wood, parchment, gauges (852 lines)
│   ├── atlas.css                 # Room 5: ocean blue, map styles (464 lines)
│   ├── vault.css                 # Room 6: charcoal, glowing quotes (1103 lines)
│   ├── dynasty.css               # Room 7: deep green, trophy gold (341 lines)
│   ├── ecd.css                   # Room 8: ECD community, player network (1025 lines)
│   └── room0.css                 # Room 0: near-black, minimal (172 lines)
├── js/
│   ├── data-loader.js            # Shared: fetch + cache JSON from db/api/ (exports loadData, loadMultiple)
│   ├── nav.js                    # Shared: LJ header, room nav, footer (exports initNav)
│   ├── search.js                 # Shared: Fuse.js global search across rooms
│   ├── wormholes.js              # Shared: cross-room contextual links + clue planting
│   ├── seismograph.js            # Lobby: animated sentiment canvas
│   ├── room0.js                  # Room 0: clue tracking (localStorage), 7 clues
│   ├── arc.js                    # Room 1: 9 hero's journey stages, sentiment line
│   ├── constellation.js          # Room 2: D3 force simulation, 164 people, era coloring
│   ├── records.js                # Room 4: obsession index, sports gauges, comebacks, intensity chart
│   ├── atlas.js                  # Room 5: Leaflet map, travel eras, cruise streak
│   ├── vault.js                  # Room 6: featured quote, year chapters, voice evolution, soundtrack
│   ├── dynasty.js                # Room 7: career staircase, trophy case, WWE, traditions
│   └── ecd.js                    # Room 8: 128 players, 171 events attended, D3 force bubbles, rivalries
├── lib/
│   ├── chart.js                  # Chart.js v4.5.1 (208KB, do NOT update without testing)
│   ├── d3.min.js                 # D3.js v7 (~280KB)
│   ├── d3-sankey.min.js          # D3 Sankey plugin v0.12.3 (~6KB)
│   ├── leaflet.js                # Leaflet.js v1.9.4 (~148KB)
│   ├── leaflet.css               # Leaflet styles (~15KB)
│   └── fuse.min.js               # Fuse.js v7.0.0 (~24KB)
├── db/
│   ├── tron.db                   # SQLite database (996KB, 44+ tables, source of truth)
│   ├── api/                      # 128+ JSON endpoints (exported from tron.db)
│   ├── viz/                      # 15 pre-generated visualization PNGs
│   └── raw_ecd_posts/            # 603 raw ECD post files
├── data/
│   ├── tron-content-db.json      # Master content database (89KB, 21 keys)
│   └── lj_comments_data.json     # Raw LiveJournal comments (40KB)
├── scripts/                      # 26 numbered data pipeline scripts + 2 export scripts
├── old-site/                     # Pre-rebuild backup of original dashboard
├── archive/                      # Original source documents
├── .claude/                      # Claude Code settings (permissions)
├── .gitignore                    # Ignores .DS_Store, SQLite WAL/SHM, *.pyc
├── CLAUDE.md                     # This file
├── README.md                     # User-facing documentation
├── REBUILD_IDEAS_V2.md           # Implementation guide (THE BUILD SPEC)
├── REBUILD_IDEAS.md              # V1 ideas (archived reference, not the active spec)
├── tron_timeline_dashboard.html  # Original monolithic backup (NEVER DELETE)
├── v2.html                       # Intermediate standalone version (KEEP)
├── ecd_scraper.py                # ECD LiveJournal scraper (multi-phase pipeline)
├── ecd_smart_parser.py           # 5-pass ECD post parser (52KB, largest script)
├── ecd_download_fast.py          # Multi-threaded ECD post downloader
├── enrich_constellation_data.py  # Constellation room data enrichment
└── scrape_sidebar_events.py      # LJ sidebar event extractor
```

### Script Loading (Per Room)
Each room HTML page loads:
1. Room-specific vendored libs in `<script>` tags (e.g., `lib/d3.min.js` for constellation, `lib/leaflet.js` for atlas)
2. Fuse.js for search: `lib/fuse.min.js`
3. ES module scripts: `js/nav.js`, `js/search.js`, room-specific JS (e.g., `js/arc.js`)

**All custom scripts use `type="module"`.** No global script order dependency.

## Live URL
- **Production**: https://njrun1804.github.io/miscProjects/timeline-of-tron/
- **GitHub Repo**: https://github.com/njrun1804/miscProjects

## Dependencies

### Vendored Libraries (in `lib/`)
| Library | Version | Size | Used In |
|---------|---------|------|---------|
| Chart.js | v4.5.1 | 208KB | Record Book, Dynasty, Atlas, Vault, Lobby, Constellation, ECD |
| D3.js | v7 | ~280KB | Constellation, ECD |
| D3 Sankey | v0.12.3 | ~6KB | (available, originally for Comeback Lab) |
| Leaflet.js | v1.9.4 | ~148KB | Atlas |
| Fuse.js | v7.0.0 | ~24KB | All rooms (global search) |

### External (CDN, with fallbacks)
- **Google Fonts**: Courier Prime, Georgia, Trebuchet MS — falls back to system fonts

### No Build Process
- No npm, no package.json, no webpack/vite
- Open any HTML file in browser to test
- Deploy by pushing to `main` branch (GitHub Pages auto-deploys)

## Data Layer

### JSON API Endpoints (`db/api/`)
All data is pre-exported as static JSON (128+ files, 6,800+ records, ~2.3MB total). The `data-loader.js` module fetches and caches these.

**Key files by room:**

| Room | Primary Data Files |
|------|--------------------|
| Lobby | `sentiment_timeline.json`, `lj_comments.json` |
| The Arc | `heros_journey_narrative.json`, `sentiment_timeline.json`, `turning_point_impact.json`, `year_summaries.json`, `life_chapters.json`, `epic_numbers.json` |
| Constellation | `relationship_constellation.json`, `people_profiles.json`, `people.json`, `person_arc.json`, `person_timelines.json`, `co_occurrences.json`, `life_chapters.json`, `temporal_network.json`, `people_highlights.json`, `song_person_map.json` |
| Record Book | `fun_facts.json`, `streaks.json`, `sports.json`, `epic_numbers.json`, `entertainment.json`, `year_intensity_breakdown.json`, `ecd_match_results.json`, `expanded_comebacks.json` |
| Atlas | `travel.json`, `medical_events.json`, `cruise_detail.json` |
| Vault | `quotes.json`, `song_person_map.json`, `writing_evolution.json`, `year_keywords.json`, `life_chapters.json`, `turning_points_detailed.json`, `insights_full.json`, `people_profiles.json` |
| Dynasty | `career.json`, `awards_enriched.json`, `awards_categories.json`, `traditions.json`, `wwe_events.json` |
| ECD | `ecd_stats_dashboard.json`, `ecd_sentiment_timeline.json`, `ecd_attendance_trends.json`, `ecd_community_narrative.json`, `ecd_player_network.json`, `ecd_players_full.json`, `ecd_match_results.json`, `ecd_rivalries.json`, `ecd_emotion_distribution.json`, `ecd_highlights.json`, `ecd_awards_full.json`, `ecd_fundraisers.json` |

**Full API index**: See `db/api/INDEX.md` for all 128+ endpoints with record counts, file sizes, and field documentation.

### Content Database (`data/`)
- **`tron-content-db.json`** (~89KB) — Master content reservoir with 21 top-level keys. Use to source new content without re-scraping.
- **`lj_comments_data.json`** (~40KB) — Raw LiveJournal comments.

### SQLite Database (`db/tron.db`)
- 44+ tables, 6,800+ records, 23 years of data (996KB)
- Source of truth — JSON exports derive from this
- **Known issues**: 2 sentiment mis-scores, 8 orphaned timeline_posts with NULL year

### Data Processing Pipeline (`scripts/`)
26 numbered Python scripts run in sequence to normalize, enrich, and derive data:

| Scripts | Purpose |
|---------|---------|
| 01–08 | Normalization: dates, player years, event linking, orphan cleanup, dedup, sentiment fixes, consolidation, indexes |
| 09–19 | Enrichment: player-year matrix, milestone-people links, travel-medical correlations, topic-person mapping, rivalry evolution, career chapters, quote attribution, year transitions, era detection, community narrative, parallel timelines |
| 20–26 | Analysis: turning points, intensity breakdown, hero's journey enrichment, sentiment calibration, people enrichment, comeback expansion, writing evolution |

**Export scripts**: `export_all_json.py` (93+ core exports) and `export_derived_json.py` (composite/joined exports).

### Root-Level Scrapers
| Script | Purpose |
|--------|---------|
| `ecd_scraper.py` | Multi-phase ECD LiveJournal scraper (IDs → download → sidebar → parse) |
| `ecd_smart_parser.py` | 5-pass iterative parser for ECD posts (52KB, largest script) |
| `ecd_download_fast.py` | Multi-threaded ECD post downloader |
| `enrich_constellation_data.py` | Constellation room data enrichment (fixes graph connectivity) |
| `scrape_sidebar_events.py` | LJ sidebar event extractor |

## Design System

### Room Palettes
Each room overrides CSS custom properties for its own emotional register:

| Room | `--room-bg` | `--room-text` | `--room-accent` | Mood |
|------|-------------|---------------|------------------|------|
| Lobby | `#e8e0d0` cream | `#2c2416` brown | `#c9a84c` gold | nostalgic |
| The Arc | Per-stage (see arc.css) | Per-stage | Per-stage | cinematic |
| Constellation | `#0a1628` navy | `#d0d8e4` light | `#4a90d9` blue | contemplative |
| Record Book | `#f5efe0` parchment | `#2c1810` brown | `#8b6914` gold | proud |
| Atlas | `#f0f4f8` light blue | `#1a2a3a` navy | `#1a5c8b` blue | wandering |
| Vault | `#1a1a2e` charcoal | `#d4d0c8` warm grey | `#c9a84c` gold | intimate |
| Dynasty | `#1a2e1a` forest | `#d4dcd0` light green | `#c9a84c` gold | accomplished |
| ECD | dark/competitive palette | light text | competitive accent | competitive |
| Room 0 | `#0d0d0d` near-black | `#a09080` muted | `#c9a84c` gold | raw |

### Typography
- **Body**: Georgia, serif
- **Monospace** (stats, years, headers): Courier Prime
- **Sans** (UI labels, nav): Trebuchet MS
- **Quotes**: Georgia italic, larger than body

### LiveJournal Signatures (Present on Every Page)
- **Mood indicator**: `Current Mood: [room-specific mood]` with emoji
- **Music tag**: `Current Music: [room-specific song]`
- **LJ-cut toggles**: `(expand — lj-cut)` for long content
- **Hit counter**: Retro digital counter in footer
- **Userpic**: "JT" monogram in header
- **Nav bar**: "Recent Entries | Archive | Friends | User Info | Memories"
- **Username**: J . T R O N O L O N E

### Design Philosophy
- LiveJournal DNA always present (serif fonts, mood tags, warm base tones, monospace stats)
- Each room adapts the palette to its emotional register
- Nostalgic but not ironic — sincere retro aesthetic
- Minimal border radius (2-3px), subtle shadows
- Charts styled to match room palette, not default Chart.js styling

## Common Tasks

### Adding or Modifying Room Content
1. Identify which room and which JS file handles the feature
2. Check which JSON data files the room loads (see table above)
3. Edit the room's JS module to add/modify the feature
4. If new data is needed, add JSON to `db/api/` and update `db/api/INDEX.md`
5. Test locally by opening the HTML file in a browser

### Adding Data
1. If modifying SQLite: edit `db/tron.db`, then re-export relevant JSON via `scripts/export_all_json.py`
2. If adding JSON directly: add to `db/api/`, update `db/api/INDEX.md`
3. Import in room JS via `data-loader.js`: `const data = await loadData('filename.json')`
4. For bulk loading: `const { file1, file2 } = await loadMultiple(['file1.json', 'file2.json'])`

### Adding Cross-Room Wormholes
1. Edit `js/wormholes.js` — add entry to `WORMHOLES` array
2. Specify `from` (room + element selector) and `to` (room + URL + hash)
3. Wormhole icons render automatically via the shared module

### Deploying
```bash
git add . && git commit -m "description" && git push origin main
```
GitHub Pages auto-deploys in 1-2 minutes.

## Important Rules

### DO NOT:
- Introduce npm, webpack, vite, or any build process
- Use React, Vue, Svelte, or any JS framework
- Add a backend server or API
- Remove the LiveJournal aesthetic DNA
- Delete `old-site/`, `tron_timeline_dashboard.html`, or `v2.html`
- Update Chart.js without thorough testing
- Use CDN links for JS libraries (keep everything vendored/offline-capable)

### DO:
- Read `REBUILD_IDEAS_V2.md` before making structural changes
- Use ES modules (`type="module"`) for all new JS
- Import data via `data-loader.js` (`loadData` / `loadMultiple`), not direct fetch calls
- Match room palette/mood in all visual elements
- Keep LiveJournal signatures on every page (mood, music, hit counter)
- Test in browser after changes (no build step!)
- Preserve the personal, nostalgic tone
- Update this file when adding new rooms, data files, or scripts

## Troubleshooting

### Data Not Loading
- Check browser console for fetch errors
- Verify `db/api/` JSON files exist and are valid JSON
- Check `data-loader.js` API_BASE path (`db/api/`) matches file structure
- For CORS issues in local dev: use `python -m http.server 8000`

### Charts Not Rendering
- Verify Chart.js loaded: `typeof Chart !== 'undefined'`
- Check canvas element exists in DOM before initialization
- Check room-specific JS runs after DOM is ready (module execution order handles this)

### D3 Visualizations Not Rendering
- Verify D3 loaded: `typeof d3 !== 'undefined'`
- Check SVG container has width/height set (D3 needs dimensions)
- For force simulations: ensure data has `id` fields on nodes matching link `source`/`target`

### GitHub Pages Not Updating
- Check GitHub Actions tab for build status
- Wait 1-2 minutes after push
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
- Verify `main` branch is set as Pages source

## Project History

### ECD Room Addition (Feb 9, 2026)
- Added Room 8: East Coast Dodgeball (ECD) — `ecd.html`, `css/ecd.css`, `js/ecd.js`
- 128 players, 168 events in database (171 attended by author), 21 years of community data
- D3 force-directed player network, emotion bubbles, rivalry head-to-heads
- Scraped 600+ ECD posts from LiveJournal via multi-phase pipeline
- 12 dedicated ECD JSON data files in `db/api/`

### Vault Enrichment (Feb 8, 2026)
- Rebuilt Vault page from flat quote grid into story-driven experience
- Added 8 features: featured quote, Fuse.js search, theme filters, year chapters with keywords, Then & Now quote pairs, Voice Evolution timeline, People Behind the Words, Soundtrack (6 songs)
- Enriched year headers with life chapter banners (19 chapters)
- Added color-coded turning point markers (13 turning points)
- Added "What the Archive Reveals" section (24 curated insights)

### V2 Rebuild (Feb 8, 2026)
- Transformed single-page dashboard into multi-room museum-like experience
- Created `REBUILD_IDEAS_V2.md` — implementation guide for 8-room architecture
- 8 phases executed to completion
- Each room = different lens on the same 22-year arc
- 26-step data processing pipeline built for enrichment
- 128+ JSON API endpoints exported from SQLite

### Version 2.2 (Feb 8, 2026)
- Created `data/tron-content-db.json` — comprehensive content database (89KB, 21 keys)
- Scraped all 30 LiveJournal posts, consolidated content from 3 sources
- Built initial 60+ JSON API endpoints in `db/api/`
- Enriched SQLite database to 44+ tables with sentiment analysis, hero's journey mapping, relationship network

### Version 2.0 (Feb 8, 2025)
- Refactored monolithic HTML into modular architecture
- Downloaded Chart.js locally for offline support
- Enabled GitHub Pages

### Version 1.0 (Jan 2025)
- Original single-file dashboard

## Personal Context

This is a deeply personal project tracking 22+ years of one person's life:
- Career: Intern → Executive Director (15 years)
- WWE: 91+ events, 29-year Survivor Series streak
- Travel: 20+ countries, 5 continents
- Sports: 93.9% table tennis win rate, 254 cornhole wins
- Medical: 14 events, 100% comeback rate, 7.1-month average recovery
- People: 164 documented relationships across the full arc
- ECD: 128 players, 171 events, 21 years of dodgeball community
- The obsessive precision of measurement IS the character trait — 8.6 lbs of shrimp, 4:10:18 PM CT, 218 ping pong rounds

**Tone**: Nostalgic, detailed, proud but self-aware. The data obsession is treated as a feature, not a bug.
**Aesthetic**: LiveJournal DNA (2004–2008 era) that evolves per room.
**Audience**: Personal reflection + sharing with friends + anyone who's ever kept a list too long.

---

*Last Updated: February 9, 2026*
*Active Spec: REBUILD_IDEAS_V2.md*

**Remember**: This isn't a dashboard — it's a 22-year autobiography told through eight rooms, each with its own mood, palette, and story to tell.
