# CLAUDE.md - Project Context for AI Assistants

## Project Overview
This is **The Timeline of Tron**, a personal statistics dashboard spanning 22 years (2004-2025). It's a LiveJournal-styled web application showcasing life milestones, statistics, and achievements.

## Architecture

### Modular Structure (v2.0)
The project was refactored from a monolithic HTML file into a modular architecture:

```
index.html          - Main entry point (load this)
css/styles.css      - All styling (505 lines)
js/data.js          - Data arrays and constants
js/charts.js        - Chart.js configurations
js/app.js           - Interactive functions
lib/chart.js        - Chart.js v4.5.1 (local)
```

### Critical Load Order
Scripts MUST load in this order (already configured in index.html):
1. `lib/chart.js` - Chart.js library
2. `js/data.js` - Data must exist before charts reference it
3. `js/charts.js` - Charts need data to initialize
4. `js/app.js` - App logic depends on charts being initialized

**Breaking this order will cause errors!**

## Live URL
- **Production**: https://njrun1804.github.io/miscProjects/
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
- `TRAVEL_DATA` - Travel destinations by year
- `WWE_MILESTONES` - Wrestling event attendance
- `CAREER_DATA` - Career progression timeline
- `SPORTS_RECORDS` - Competitive sports statistics
- `EPIC_NUMBERS` - Single-event records
- `ECD_DATA` - East Coast Dodgeball history
- `AWARDS_TIMELINE` - Annual awards tracking
- `TRADITIONS_DATA` - Recurring life traditions

### Adding New Data
1. Edit `js/data.js` to add/modify data arrays
2. If adding new charts, edit `js/charts.js`
3. If adding new HTML sections, edit `index.html`
4. Test locally by opening `index.html` in browser
5. Commit and push to GitHub (auto-deploys to GitHub Pages)

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
cd ~/Projects/miscProjects
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
3. Add chart config to `js/charts.js` inside `initializeCharts()`
4. Follow existing chart patterns

### Modify Styling
**File**: `css/styles.css`
- Use CSS variables for colors (defined in `:root`)
- Maintain retro LiveJournal aesthetic
- Test responsive design (mobile breakpoint: 768px)

### Add New Section
1. Add HTML in `index.html` with `data-section="name"` attribute
2. Add filter button in nav bar
3. Section will auto-filter with existing `showSection()` function

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
*Last Updated: Feb 8, 2025*

**Remember**: This isn't just a dashboard—it's a 22-year life story told through statistics.
