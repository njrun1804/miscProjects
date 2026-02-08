# CLAUDE.md - Project Context for AI Assistants

## Project Overview
This is **The Timeline of Tron**, a personal statistics dashboard spanning 22 years (2004-2025). It's a LiveJournal-styled web application showcasing life milestones, statistics, and achievements.

## Architecture

### Modular Structure (v2.1)
Refactored from monolithic HTML → modular architecture → cleaned up code:

```
index.html          - Main entry point (load this)
css/styles.css      - All styling (organized with table of contents)
js/data.js          - Data arrays, constants, CHART_STYLE config, computed helpers
js/plugins.js       - Custom Chart.js plugins (centerText, barValue, milestoneLabels, steppedFillLabels)
js/charts.js        - Chart.js configurations (uses helpers, stores refs)
js/app.js           - Interactive functions + error handling
lib/chart.js        - Chart.js v4.5.1 (local)
data/               - Content database and scraped data (not served to site visitors)
archive/            - Original source files (Message_for_Tron.md, Timeline_of_Tron_By_The_Numbers.docx)
```

### Critical Load Order
Scripts MUST load in this order (already configured in index.html):
1. `lib/chart.js` - Chart.js library
2. `js/data.js` - Data must exist before charts reference it
3. `js/plugins.js` - Plugins must be registered before charts use them
4. `js/charts.js` - Charts need data + plugins to initialize
5. `js/app.js` - App logic depends on charts being initialized

**Breaking this order will cause errors!**

## Live URL
- **Production**: https://njrun1804.github.io/miscProjects/timeline-of-tron/
- **GitHub Repo**: https://github.com/njrun1804/miscProjects

## Dependencies

### External (CDN)
- **Google Fonts**: Courier Prime, Georgia, Trebuchet MS
  - Has fallback to system fonts
  - Only external dependency that requires internet

### Local (Vendored)
- **Chart.js v4.5.1**: Stored in `lib/chart.js` (204KB)
  - Downloaded from jsdelivr CDN
  - Works fully offline
  - Do NOT update without testing - v4.5.1 is stable

### None
- All CSS is inline in styles.css
- All JavaScript is local
- No npm/package.json needed
- No build process required

## Data Structure

### Key Data Arrays (js/data.js)
- `TRAVEL_DATA` - Travel destinations by year (`countries: null` for domestic)
- `WWE_MILESTONES` - Wrestling event attendance
- `CAREER_DATA` - Career progression timeline
- `SPORTS_RECORDS` - Competitive sports statistics
- `EPIC_NUMBERS` - Single-event records (colors in separate `EPIC_NUMBERS_COLORS`)
- `ECD_DATA` - East Coast Dodgeball history (array of objects with `anniversary`, `year`, `participants`, `raised`)
- `AWARDS_TIMELINE` - Annual awards tracking (use `computeAwardsSummary()` for chart data)
- `TRADITIONS_DATA` - Recurring life traditions

### Chart Infrastructure (js/data.js + js/charts.js)
- `CHART_STYLE` - Centralized chart styling (fonts, colors, grid) — edit this to restyle all charts
- `TronCharts` - Global registry of chart instances (access: `TronCharts.sports`, `.career`, etc.)
- `chartTitle(text)` - Helper for consistent chart titles
- `gridScale(opts)` / `hiddenGridScale(opts)` - Helpers for axis configuration
- `createChart(canvasId, config)` - Safe wrapper that handles missing DOM elements
- `destroyAllCharts()` - Destroys all chart instances for re-initialization

### Content Database (data/)
The `data/` directory contains a comprehensive content database scraped and consolidated from three sources: the LiveJournal blog (wwecoowner.livejournal.com), Message_for_Tron.md, and Timeline_of_Tron_By_The_Numbers.docx.

- **`tron-content-db.json`** (~89KB) - Master content database with 21 top-level keys:
  - `_meta` - Provenance and source tracking
  - `person` - Core biographical data (name, aliases, tagline)
  - `career` - 12 career entries (Intern → Executive Director)
  - `wwe` - 16 WWE milestones, venue stats, streak data
  - `travel` / `travel_stats` - 34 destinations, passport stats, country counts
  - `sports` - Table tennis, dodgeball, and other competitive records
  - `east_coast_dodgeball` - 19-year ECD history with fundraising totals
  - `people` - 79 mentioned people with context (plus Fab 4 group)
  - `awards` - Annual awards timeline
  - `comebacks` - Injury/comeback narratives
  - `traditions` - Recurring life traditions
  - `broadway_entertainment` - 17 shows/entertainment entries
  - `milestones_by_year` - 23 years of key milestones
  - `fun_facts` - 60 fun facts extracted from all sources
  - `locations_recurring` - 29 recurring locations with significance
  - `quotes` - 41 notable quotes with attribution
  - `yearly_timelines` - Year-by-year narrative summaries
  - `medical_history` - 13 medical events
  - `lj_comments` - Summary of LiveJournal comment activity

- **`lj_comments_data.json`** (~40KB) - Raw scraped LiveJournal comments with per-post breakdowns

This database is a content reservoir — use it to source new sections, enrich existing data arrays in `js/data.js`, or generate new visualizations without re-scraping.

### Archive (archive/)
Original source documents moved here after content was extracted into the database:
- `Message_for_Tron.md` - 149-line detailed analysis of the Timeline project
- `Timeline_of_Tron_By_The_Numbers.docx` - 18 structured data tables

### Adding New Data
1. Edit `js/data.js` to add/modify data arrays
2. If adding new charts, edit `js/charts.js`
3. If adding new HTML sections, edit `index.html`
4. Test locally by opening `index.html` in browser
5. Commit and push to GitHub (auto-deploys to GitHub Pages)
6. To source new content, check `data/tron-content-db.json` first

## Style Guide

### Color Palette (Retro LiveJournal Theme)
```css
--lj-bg: #e8e0d0           /* Warm cream background */
--lj-panel: #f5f0e6        /* Panel/card background */
--lj-header-bg: #4a6741    /* Forest green header */
--lj-accent: #8b1a1a       /* Red (WWE/sports) */
--lj-accent2: #1a4a8b      /* Blue (travel) */
--lj-gold: #c9a84c         /* Gold (milestones) */
```

### Typography
- **Body**: Georgia, serif (classic)
- **Monospace**: Courier Prime (stats, years)
- **Sans**: Trebuchet MS (headers, labels)

### Design Philosophy
- Nostalgic LiveJournal aesthetic (circa 2004-2008)
- Subtle textures and shadows
- Rounded corners: 2-3px (not modern large radii)
- Muted, earthy color palette

## Features

### Interactive Elements
1. **Section Filtering**: Click top navigation to filter sections
2. **Sortable Table**: Click travel table headers to sort
3. **Responsive Charts**: All charts adjust to screen size
4. **Hover States**: KPI cards and rows have hover effects

### Chart Types Used
- Line charts: Career progression, WWE timeline
- Bar charts: Sports records, epic numbers, travel scope
- Stacked bar: Win/loss records
- Doughnut: Awards distribution
- Combo bar+line: ECD growth

## Development Workflow

### Local Development
```bash
cd ~/Projects/miscProjects/timeline-of-tron
open index.html  # Opens in default browser
```

### Making Changes
1. Edit relevant files (css/js/index.html)
2. Refresh browser to test (no build step!)
3. Commit changes: `git add . && git commit -m "description"`
4. Push to GitHub: `git push origin main`
5. Changes auto-deploy to GitHub Pages (1-2 min delay)

### Git Workflow
- Branch: `main` (default)
- Auto-deploy: GitHub Pages builds on every push
- Backup: `tron_timeline_dashboard.html` (original monolithic version)

## Common Tasks

### Update Statistics
**File**: `js/data.js`
```javascript
// Example: Add new travel destination
{ year: 2027, destination: "Italy", highlight: "Description", scope: "International", countries: 1 }
```

### Add New Chart
1. Add data array to `js/data.js`
2. Add canvas element to `index.html`: `<canvas id="newChart"></canvas>`
3. Add chart config to `js/charts.js` inside `initializeCharts()`:
   ```javascript
   TronCharts.newChart = createChart('newChartId', {
       type: 'bar',
       data: { ... },
       options: {
           responsive: true,
           plugins: { title: chartTitle('My Chart Title') },
           scales: { y: gridScale(), x: hiddenGridScale() }
       }
   });
   ```
4. Use `CHART_STYLE.colors.*` for colors, `CHART_STYLE.borderRadius` for bar radius

### Modify Styling
**File**: `css/styles.css`
- Use CSS variables for colors (defined in `:root`)
- Use font variables: `--font-body`, `--font-mono`, `--font-sans`
- Maintain retro LiveJournal aesthetic
- Test responsive design (mobile breakpoint: 768px)
- Reusable CSS classes for content blocks:
  - `.callout-box` + `.callout-box--gold/--red/--purple` for highlight boxes
  - `.badge` + `.badge--red/--blue` and `.badge--outline` for tags
  - `.section-label` for uppercase category headings
  - `.tradition-item` for list items in grids
  - `.sidebar-content` for chart companion panels

### Add New Section
1. Add HTML in `index.html` with `data-section="name"` attribute
2. Add filter button: `<button class="lj-filter-btn" data-section="name">Label</button>`
3. Section auto-filters — buttons are bound via `addEventListener` in `app.js`

## Important Notes

### DO NOT:
- ❌ Break the script load order (will break charts)
- ❌ Update Chart.js without thorough testing
- ❌ Remove `tron_timeline_dashboard.html` (it's the backup)
- ❌ Use external JS CDNs (keep offline-capable)
- ❌ Modernize the design (nostalgic aesthetic is intentional)

### DO:
- ✅ Keep the LiveJournal retro aesthetic
- ✅ Test in browser after changes
- ✅ Maintain data arrays in chronological order
- ✅ Use existing color variables for consistency
- ✅ Write descriptive commit messages
- ✅ Preserve the personal, nostalgic tone

## Troubleshooting

### Charts Not Rendering
- Check browser console for errors
- Verify load order in index.html
- Ensure data arrays exist before charts initialize
- Check Chart.js loaded: `typeof Chart !== 'undefined'`

### Styles Not Applying
- Check `css/styles.css` linked correctly in `<head>`
- Verify CSS variables defined in `:root`
- Clear browser cache

### GitHub Pages Not Updating
- Check GitHub Actions tab for build status
- Wait 1-2 minutes after push
- Verify `main` branch is set as Pages source
- Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)

## Project History

### Version 2.2 (Feb 8, 2026)
- Created `data/tron-content-db.json` — comprehensive content database (89KB, 21 top-level keys)
- Scraped all 30 LiveJournal posts from wwecoowner.livejournal.com (22 timeline + 8 non-timeline)
- Scraped LiveJournal comments into `data/lj_comments_data.json`
- Consolidated content from Message_for_Tron.md and Timeline_of_Tron_By_The_Numbers.docx
- Extracted: 79 people, 41 quotes, 60 fun facts, 34 travel entries, 29 locations, 17 entertainment entries
- Archived original source files to `archive/`

### Version 2.1 (Feb 8, 2026)
- Code cleanup: eliminated chart config duplication, extracted CSS classes from inline styles
- Added `CHART_STYLE` constants, `TronCharts` registry, chart helper functions
- Restructured `ECD_DATA` to array of objects, separated `EPIC_NUMBERS_COLORS`
- Added `computeAwardsSummary()` to replace hardcoded chart data
- Moved event handlers from HTML onclick to JS addEventListener
- Added error guards and `destroyAllCharts()` lifecycle utility
- CSS: font variables, callout/badge/tradition component classes, organized with TOC

### Version 2.0 (Feb 8, 2025)
- Refactored monolithic HTML into modular architecture
- Downloaded Chart.js locally for offline support
- Created comprehensive README.md
- Enabled GitHub Pages
- Created CLAUDE.md for AI context

### Version 1.0 (Jan 2025)
- Original single-file dashboard
- CDN-based Chart.js
- All code in one HTML file

## Personal Context

This is a deeply personal project tracking:
- Career progression (Intern → Executive Director)
- WWE event attendance (91+ events, 25-year streak)
- Travel adventures (20+ countries)
- Sports achievements (93.9% table tennis win rate)
- Life milestones and comeback stories

**Tone**: Nostalgic, detailed, numbers-focused, proud but humble
**Aesthetic**: Early 2000s web (LiveJournal/blog era)
**Audience**: Personal reflection + sharing with friends

## Contact & Attribution

This is a personal project. When making changes, preserve:
- The nostalgic LiveJournal aesthetic
- The detailed statistical tracking
- The personal narrative voice
- Attribution to original structure

---

*Generated on: Feb 8, 2025*
*Last Updated: Feb 8, 2026*

**Remember**: This isn't just a dashboard—it's a 22-year life story told through statistics.
