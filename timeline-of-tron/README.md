# The Timeline of Tron

A 22-year personal data autobiography (2004-2026) built as a multi-room interactive experience with a retro LiveJournal aesthetic.

## Quick Start

Open `index.html` in a browser. No build step, no dependencies to install.

For local development with data loading:
```bash
python -m http.server 8000
```

## The Rooms

| Room | Page | Description |
|------|------|-------------|
| The Lobby | `index.html` | Hero section, seismograph, room cards, friend voices |
| The Arc | `arc.html` | Hero's journey in 9 stages with sentiment timeline |
| The Constellation | `constellation.html` | D3 force graph of 164 people across eras |
| The Record Book | `records.html` | Sports gauges, obsession index, comebacks, streaks |
| The Atlas | `atlas.html` | Leaflet map, travel eras, cruise streak, recovery stories |
| The Vault | `vault.html` | 79 quotes, voice evolution, then & now pairs, soundtrack |
| The Dynasty | `dynasty.html` | Career staircase, trophy case, WWE timeline, traditions |
| ECD | `ecd.html` | 128 players, 168 events, 21 years of dodgeball |
| The Before | `room0.html` | Hidden room — find 7 clues across other rooms to unlock |

## Architecture

- **Frontend**: Vanilla HTML/CSS/JS with ES modules — no frameworks, no build process
- **Data**: 54 static JSON files in `db/api/`, loaded via `js/data-loader.js`
- **Libraries**: Chart.js, D3.js, Leaflet, Fuse.js (all vendored in `lib/`)
- **Source of truth**: SQLite database (`db/tron.db`, 44+ tables)

## Project Structure

```
timeline-of-tron/
├── *.html              # 9 room pages + 1 monolithic backup
├── css/                # Per-room stylesheets + shared base.css
├── js/                 # Per-room modules + shared nav/search/wormholes
├── lib/                # Vendored libraries (Chart.js, D3, Leaflet, Fuse.js)
├── db/api/             # 54 JSON data endpoints
├── db/tron.db          # SQLite database (source of truth)
├── data/               # Master content DB + LJ comments
├── scripts/            # 26-step data pipeline + 2 export scripts
├── old-site/           # Pre-rebuild v1 backup
└── archive/            # Archived reports, temp scripts, unused JSON
```

## Deployment

Push to `main` — GitHub Pages auto-deploys in 1-2 minutes.

**Live**: https://njrun1804.github.io/miscProjects/timeline-of-tron/

## Statistics Highlights

- **22+ Years** of timelines (2004-2026)
- **164 People** documented across the full arc
- **91+ WWE Events** attended, 29-year Survivor Series streak
- **20+ Countries** visited across 5 continents
- **93.9% Win Rate** at table tennis
- **128 Players** in 21 years of East Coast Dodgeball
- **14 Medical Events**, 100% comeback rate

## Version History

- **V2 Rebuild** (Feb 2026): Multi-room museum experience, 8 themed rooms, 26-step data pipeline
- **v2.0** (Feb 2025): Modular refactor from monolithic HTML
- **v1.0** (Jan 2025): Original single-file dashboard

---

**Keep counting everything.**
