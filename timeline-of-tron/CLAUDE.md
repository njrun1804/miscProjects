# CLAUDE.md - Project Context for AI Assistants

## Project Overview
This is **The Timeline of Tron**, a personal data autobiography spanning 22+ years (2004-2026). It is being rebuilt from a single-page LiveJournal-styled dashboard into a **multi-room interactive experience** — 7 themed rooms + a lobby, each offering a different lens on the same 22-year arc.

**The rebuild spec lives in `REBUILD_IDEAS_V2.md`.** That is the implementation guide. Read it before making changes.

## Current State

### V2 Rebuild (In Progress)
The site is being rebuilt per `REBUILD_IDEAS_V2.md`. The architecture is:
- **9 HTML pages total**: `index.html` (lobby) + 7 room pages + `room0.html` (hidden)
- **Shared design system**: `css/base.css` with per-room overrides
- **Shared JS modules**: `data-loader.js`, `nav.js`, `wormholes.js`
- **Per-room JS**: `arc.js`, `constellation.js`, `comeback.js`, `records.js`, `atlas.js`, `vault.js`, `dynasty.js`, `room0.js`
- **Data layer**: All 60+ JSON endpoints in `db/api/` consumed via `data-loader.js`
- **Libraries**: Chart.js v4.5.1, D3.js v7, D3 Sankey, Leaflet.js, Fuse.js — all vendored in `lib/`

### Build Phases (from REBUILD_IDEAS_V2.md)
| Phase | Scope | Status |
|-------|-------|--------|
| Phase 0 | Prep: backup old site, vendor libs, fix data issues | Complete |
| Phase 1 | Base CSS + shared nav + lobby page + placeholder rooms | Complete |
| Phase 2 | Room 1: The Arc (hero's journey + sentiment scroll) | Complete |
| Phase 3 | Room 2: The Constellation (D3 people graph) | Complete |
| Phase 4 | Room 3: Comeback Lab + Room 4: Record Book | Complete |
| Phase 5 | Room 5: The Atlas (map) + Room 6: The Vault (quotes) | Complete |
| Phase 6 | Room 7: The Dynasty + cross-room wormholes | Complete |
| Phase 7 | Room 0 (hidden) + search + polish | Complete |

**Always check the phase status above before building. Update it after completing a phase.**

### Old Site (Pre-Rebuild)
The original single-page dashboard lives in `old-site/` after Phase 0 backup. The monolithic v1.0 backup is `tron_timeline_dashboard.html` (keep in root, never delete).

## Architecture

### Target File Structure (V2)
```
timeline-of-tron/
├── index.html                    # The Lobby
├── arc.html                      # Room 1: The Arc
├── constellation.html            # Room 2: The Constellation
├── comeback.html                 # Room 3: The Comeback Lab
├── records.html                  # Room 4: The Record Book
├── atlas.html                    # Room 5: The Atlas
├── vault.html                    # Room 6: The Vault
├── dynasty.html                  # Room 7: The Dynasty
├── room0.html                    # Hidden Room: The Before
├── css/
│   ├── base.css                  # Shared: variables, reset, typography, nav, footer
│   ├── lobby.css                 # Lobby styles
│   ├── arc.css                   # Room 1: stage palettes, scroll animations
│   ├── constellation.css         # Room 2: dark sky, star nodes
│   ├── comeback.css              # Room 3: clinical + recovery colors
│   ├── records.css               # Room 4: warm wood, parchment
│   ├── atlas.css                 # Room 5: ocean blue, map
│   ├── vault.css                 # Room 6: charcoal, glowing quotes
│   ├── dynasty.css               # Room 7: deep green, trophy gold
│   └── room0.css                 # Room 0: near-black
├── js/
│   ├── data-loader.js            # Shared: fetch + cache JSON from db/api/
│   ├── nav.js                    # Shared: LJ header, room nav, search, footer
│   ├── wormholes.js              # Shared: cross-room contextual links
│   ├── seismograph.js            # Lobby: animated sentiment line
│   ├── arc.js                    # Room 1: IntersectionObserver scroll, sentiment line
│   ├── constellation.js          # Room 2: D3 force simulation
│   ├── comeback.js               # Room 3: D3 Sankey, recovery clock
│   ├── records.js                # Room 4: Chart.js gauges, streak bars
│   ├── atlas.js                  # Room 5: Leaflet map + markers
│   ├── vault.js                  # Room 6: quote grid, D3 stream graph
│   ├── dynasty.js                # Room 7: staircase, trophies, ECD chart, year-wheel
│   └── room0.js                  # Room 0: clue tracking (localStorage)
├── lib/
│   ├── chart.js                  # Chart.js v4.5.1 (existing, do NOT update)
│   ├── d3.min.js                 # D3.js v7 (vendor)
│   ├── d3-sankey.min.js          # D3 Sankey plugin (vendor)
│   ├── leaflet.js                # Leaflet.js v1.9 (vendor)
│   ├── leaflet.css               # Leaflet styles (vendor)
│   └── fuse.min.js               # Fuse.js v7 (vendor)
├── db/
│   ├── tron.db                   # SQLite database (44 tables, source of truth)
│   ├── api/                      # 60+ JSON endpoints (exported from tron.db)
│   └── viz/                      # Pre-generated visualization PNGs
├── data/
│   ├── tron-content-db.json      # Master content database (89KB, 21 keys)
│   └── lj_comments_data.json     # Raw LiveJournal comments (40KB)
├── old-site/                     # Pre-rebuild backup of original dashboard
├── archive/                      # Original source documents
├── CLAUDE.md                     # This file
├── README.md                     # User-facing documentation
├── REBUILD_IDEAS_V2.md           # Implementation guide (THE BUILD SPEC)
├── REBUILD_IDEAS.md              # V1 ideas (archived reference, not the active spec)
└── tron_timeline_dashboard.html  # Original monolithic backup (NEVER DELETE)
```

### Script Loading (Per Room)
Each room HTML page loads:
1. Room-specific vendored libs (e.g., `lib/d3.min.js` for constellation)
2. `js/data-loader.js` (ES module)
3. `js/nav.js` (ES module — injects header/footer)
4. Room-specific JS (ES module — e.g., `js/arc.js`)

**All scripts use `type="module"`.** No global script order dependency like the old site.

## Live URL
- **Production**: https://njrun1804.github.io/miscProjects/timeline-of-tron/
- **GitHub Repo**: https://github.com/njrun1804/miscProjects

## Dependencies

### Vendored Libraries (in `lib/`)
| Library | Version | Size | Used In |
|---------|---------|------|---------|
| Chart.js | v4.5.1 | 204KB | Record Book, Dynasty, Atlas, Vault, Lobby |
| D3.js | v7 | ~280KB | Constellation, Comeback Lab, Vault, Dynasty |
| D3 Sankey | v0.12.3 | ~15KB | Comeback Lab |
| Leaflet.js | v1.9.4 | ~170KB | Atlas |
| Fuse.js | v7.0.0 | ~25KB | Lobby (search), all rooms |

### External (CDN, with fallbacks)
- **Google Fonts**: Courier Prime, Georgia, Trebuchet MS — falls back to system fonts

### No Build Process
- No npm, no package.json, no webpack/vite
- Open any HTML file in browser to test
- Deploy by pushing to `main` branch (GitHub Pages auto-deploys)

## Data Layer

### JSON API Endpoints (`db/api/`)
All data is pre-exported as static JSON. The `data-loader.js` module fetches and caches these.

**Key files by room:**

| Room | Primary Data Files |
|------|--------------------|
| Lobby | `sentiment_timeline.json` |
| The Arc | `heros_journey_narrative.json`, `sentiment_timeline.json`, `turning_points.json`, `quotes.json`, `milestones_enriched.json` |
| Constellation | `relationship_constellation.json`, `co_occurrences.json`, `people_profiles.json`, `quotes.json` |
| Comeback Lab | `comeback_narrative.json`, `medical_events.json`, `turning_points.json`, `sentiment_timeline.json` |
| Record Book | `fun_facts.json`, `streaks.json`, `traditions.json`, `sports.json`, `epic_numbers.json` |
| Atlas | `travel.json`, `travel_sentiment_by_location.json`, `medical_events.json`, `location_frequency.json` |
| Vault | `quotes.json`, `writing_evolution.json`, `year_keywords.json`, `emotion_distribution.json` |
| Dynasty | `career.json`, `awards_enriched.json`, `awards_categories.json`, `ecd_events.json`, `traditions.json`, `streaks.json` |

**Full API index**: See `db/api/INDEX.md` for all 60+ endpoints.

### Content Database (`data/`)
- **`tron-content-db.json`** (~89KB) — Master content reservoir with 21 top-level keys. Use to source new content without re-scraping.
- **`lj_comments_data.json`** (~40KB) — Raw LiveJournal comments.

### SQLite Database (`db/tron.db`)
- 44 tables, ~2,500+ records, 23 years of data
- Source of truth — JSON exports derive from this
- **Known issues**: Zero indexes (add before any query optimization), 2 sentiment mis-scores, 8 orphaned timeline_posts with NULL year

## Design System

### Room Palettes
Each room overrides CSS custom properties for its own emotional register:

| Room | `--room-bg` | `--room-text` | `--room-accent` | Mood |
|------|-------------|---------------|------------------|------|
| Lobby | `#e8e0d0` cream | `#2c2416` brown | `#c9a84c` gold | nostalgic |
| The Arc | Per-stage (see arc.css) | Per-stage | Per-stage | cinematic |
| Constellation | `#0a1628` navy | `#d0d8e4` light | `#4a90d9` blue | contemplative |
| Comeback Lab | `#f8f9fa` clinical | `#1a1a2e` dark | `#2e7d32` green | hopeful |
| Record Book | `#f5efe0` parchment | `#2c1810` brown | `#8b6914` gold | proud |
| Atlas | `#f0f4f8` light blue | `#1a2a3a` navy | `#1a5c8b` blue | wandering |
| Vault | `#1a1a2e` charcoal | `#d4d0c8` warm grey | `#c9a84c` gold | intimate |
| Dynasty | `#1a2e1a` forest | `#d4dcd0` light green | `#c9a84c` gold | accomplished |
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
- **Userpic**: Small avatar in header
- **Nav bar**: "Recent Entries | Archive | Friends | User Info | Memories"

### Design Philosophy
- LiveJournal DNA always present (serif fonts, mood tags, warm base tones, monospace stats)
- Each room adapts the palette to its emotional register
- Nostalgic but not ironic — sincere retro aesthetic
- Minimal border radius (2-3px), subtle shadows
- Charts styled to match room palette, not default Chart.js styling

## Common Tasks

### Implementing a New Room
1. Read the room spec in `REBUILD_IDEAS_V2.md`
2. Create `[room].html` following the shared HTML template pattern
3. Create `css/[room].css` with room-specific palette overrides
4. Create `js/[room].js` as ES module
5. Import from `data-loader.js` for data, `nav.js` for shared UI
6. Add the room to `js/nav.js` room list
7. Test locally by opening the HTML file
8. Update Phase status table in this file

### Adding Data
1. If modifying SQLite: edit `db/tron.db`, then re-export relevant JSON to `db/api/`
2. If adding JSON directly: add to `db/api/`, update `db/api/INDEX.md`
3. Import in room JS via `data-loader.js`: `const data = await loadData('filename.json')`

### Adding Cross-Room Wormholes
1. Edit `js/wormholes.js` — add entry to `WORMHOLES` array
2. Specify `from` (room + element selector) and `to` (room + section hash)
3. Wormhole icons render automatically via the shared module

### Deploying
```bash
git add . && git commit -m "description" && git push origin main
```
GitHub Pages auto-deploys in 1-2 minutes.

## Important Rules

### DO NOT:
- ❌ Introduce npm, webpack, vite, or any build process
- ❌ Use React, Vue, Svelte, or any JS framework
- ❌ Add a backend server or API
- ❌ Create more than 9 HTML pages (lobby + 7 rooms + Room 0)
- ❌ Remove the LiveJournal aesthetic DNA
- ❌ Delete `old-site/` or `tron_timeline_dashboard.html`
- ❌ Update Chart.js without thorough testing
- ❌ Use CDN links for JS libraries (keep everything vendored/offline-capable)

### DO:
- ✅ Read `REBUILD_IDEAS_V2.md` before starting any phase
- ✅ Build phases in order (Phase 0 → 1 → 2 → ... → 7)
- ✅ Deploy after each phase (each phase is self-contained)
- ✅ Use ES modules (`type="module"`) for all new JS
- ✅ Import data via `data-loader.js`, not direct fetch calls
- ✅ Match room palette/mood in all visual elements
- ✅ Keep LiveJournal signatures on every page (mood, music, hit counter)
- ✅ Test in browser after changes (no build step!)
- ✅ Update Phase status table in this file after completing each phase
- ✅ Preserve the personal, nostalgic tone

## Troubleshooting

### Data Not Loading
- Check browser console for fetch errors
- Verify `db/api/` JSON files exist and are valid JSON
- Check `data-loader.js` API_BASE path matches file structure
- For CORS issues in local dev: use `python -m http.server 8000`

### Charts Not Rendering
- Verify Chart.js loaded: `typeof Chart !== 'undefined'`
- Check canvas element exists in DOM before initialization
- Check room-specific JS runs after DOM is ready (`DOMContentLoaded` or module execution order)

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

### V2 Rebuild (Feb 8, 2026 → In Progress)
- Created `REBUILD_IDEAS_V2.md` — implementation guide for 7-room architecture
- Vision: transform single-page dashboard into museum-like multi-room experience
- Each room = different lens on the same 22-year arc
- Target: ~16 weeks across 8 phases

### Version 2.2 (Feb 8, 2026)
- Created `data/tron-content-db.json` — comprehensive content database (89KB, 21 keys)
- Scraped all 30 LiveJournal posts, consolidated content from 3 sources
- Built 60+ JSON API endpoints in `db/api/`
- Enriched SQLite database to 44 tables with sentiment analysis, hero's journey mapping, relationship network

### Version 2.1 (Feb 8, 2026)
- Code cleanup: modular JS architecture, CHART_STYLE constants, TronCharts registry
- CSS: font variables, component classes, organized with TOC

### Version 2.0 (Feb 8, 2025)
- Refactored monolithic HTML into modular architecture
- Downloaded Chart.js locally for offline support
- Enabled GitHub Pages

### Version 1.0 (Jan 2025)
- Original single-file dashboard

## Personal Context

This is a deeply personal project tracking 22+ years of one person's life:
- Career: Intern → Executive Director (15 years)
- WWE: 91+ events, 25-year Survivor Series streak
- Travel: 20+ countries, 5 continents
- Sports: 93.9% table tennis win rate, 254 cornhole wins
- Medical: 14 events, 100% comeback rate, 7.1-month average recovery
- People: 124 documented relationships across the full arc
- The obsessive precision of measurement IS the character trait — 8.6 lbs of shrimp, 4:10:18 PM CT, 218 ping pong rounds

**Tone**: Nostalgic, detailed, proud but self-aware. The data obsession is treated as a feature, not a bug.
**Aesthetic**: LiveJournal DNA (2004-2008 era) that evolves per room.
**Audience**: Personal reflection + sharing with friends + anyone who's ever kept a list too long.

---

*Last Updated: February 8, 2026*
*Active Spec: REBUILD_IDEAS_V2.md*

**Remember**: This isn't a dashboard — it's a 22-year autobiography told through seven rooms, each with its own mood, palette, and story to tell.
