# The Timeline of Tron — A 22-Year Statistical Almanac

A retro LiveJournal-styled dashboard showcasing 22 years of life statistics (2004–2025) with interactive charts and visualizations.

## 🚀 Quick Start

Simply open `index.html` in your browser to view the dashboard.

## 📁 Project Structure

```
miscProjects/
├── index.html                          # Main HTML file (modular version)
├── tron_timeline_dashboard.html        # Original single-file version (backup)
├── css/
│   └── styles.css                      # All CSS styles (505 lines)
├── js/
│   ├── data.js                         # Data arrays (81 lines)
│   ├── charts.js                       # Chart.js configurations (306 lines)
│   └── app.js                          # Interactive functions (85 lines)
└── lib/
    └── chart.js                        # Chart.js library v4.5.1 (local copy)
```

## ✨ Features

- **LiveJournal-Inspired Design**: Retro aesthetic with vintage styling
- **Interactive Charts**: Powered by Chart.js
  - Sports records (stacked bar)
  - Career progression (line chart)
  - WWE events timeline
  - Travel scope by year
  - Awards distribution (doughnut)
  - Traditions longevity
- **Sortable Travel Table**: Click column headers to sort
- **Section Filtering**: Jump to specific sections (Stats, Career, WWE, Travel, etc.)
- **Responsive Design**: Works on desktop and mobile

## 📊 Data Categories

- **Stats**: KPIs, sports records, epic single-event numbers
- **Career**: 15-year progression from Intern to Executive Director
- **WWE**: 91+ events attended, 29 consecutive Survivor Series years
- **Travel**: 20+ countries across 5 continents
- **Cast**: Recurring characters and lifers
- **Awards**: Music Artist and Comedian of the Year traditions
- **Comebacks**: Resilience arcs (2017–2024)

## 🛠️ Technical Details

### Dependencies
- **Chart.js v4.5.1**: Local copy in `lib/chart.js` (no CDN required)
- **Google Fonts**: Courier Prime, Georgia, Trebuchet MS (via CDN)

### Load Order
Scripts must load in this specific order:
1. `lib/chart.js` (Chart.js library)
2. `js/data.js` (data arrays)
3. `js/charts.js` (chart configurations)
4. `js/app.js` (interactive functions)

### Offline Support
The dashboard works fully offline thanks to:
- Local Chart.js copy (no external JS dependencies)
- Embedded CSS styles
- Inline SVG background patterns

Only Google Fonts require an internet connection (with system font fallbacks).

## 🎨 Color Palette

The retro LiveJournal theme uses:
- **Background**: `#e8e0d0` (warm cream)
- **Panels**: `#f5f0e6` (off-white)
- **Header**: `#4a6741` (forest green)
- **Accent Red**: `#8b1a1a` (WWE/sports)
- **Accent Blue**: `#1a4a8b` (travel)
- **Gold**: `#c9a84c` (milestones)

## 📝 Editing Data

To update statistics or add new data:

1. **Edit Data**: Modify `js/data.js` to update stats, travel destinations, or career milestones
2. **Edit Charts**: Adjust chart configurations in `js/charts.js`
3. **Edit Styles**: Customize appearance in `css/styles.css`
4. **Edit Content**: Update HTML structure in `index.html`

## 🌐 Deployment

### GitHub Pages
1. Push to GitHub
2. Enable GitHub Pages in repository settings
3. Set source to `main` branch
4. Access at: `https://[username].github.io/miscProjects/`

### Local Server
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server
```

## 🏆 Statistics Highlights

- **22+ Years** of Timelines
- **91+ WWE Events** Attended
- **20+ Countries** Visited
- **93.9% Win Rate** at Table Tennis
- **254+ Cornhole Games** Won
- **21+ Years** of East Coast Dodgeball
- **5 Career Promotions** (Intern → Executive Director)

## 📜 Version History

- **v2.0** (2025-02-08): Modular refactor - Separated into CSS/JS modules
- **v1.0** (2025-01-XX): Initial single-file dashboard

## 📄 License

Personal project - All rights reserved

---

**Keep counting everything, John.**

*This dashboard has outlived MySpace, Vine, Google+, and Friendster — just like the Timelines themselves.*
