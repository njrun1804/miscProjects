// =============================
// DATA ARRAYS FOR TRON TIMELINE DASHBOARD
// =============================

const TRAVEL_DATA = [
    { year: 2010, destination: "Arizona", highlight: "WrestleMania XXVI — 939 photos", scope: "Domestic", countries: null },
    { year: 2017, destination: "Alaska & Seattle", highlight: "Mendenhall Glacier cruise", scope: "Domestic", countries: null },
    { year: 2018, destination: "Slovenia, Italy, Greece, Malta, Croatia", highlight: "5 countries, 2 weeks — Mediterranean", scope: "International", countries: 5 },
    { year: 2019, destination: "Australia & New Zealand", highlight: '"The best, the longest, and the greatest"', scope: "International", countries: 2 },
    { year: 2020, destination: "Singapore, Thailand, Cambodia, Vietnam, Hong Kong", highlight: "17-day Asian expedition", scope: "International", countries: 5 },
    { year: 2021, destination: "Grand Canyon, Vegas, Utah, Colorado, Boston", highlight: "1,000+ photos in Utah alone", scope: "Domestic", countries: null },
    { year: 2023, destination: "Phoenix / Arizona", highlight: 'Super Bowl LVII — "most spectacular day"', scope: "Domestic", countries: null },
    { year: 2024, destination: "Portugal, Spain, Norway, Iceland, Toronto", highlight: "Multi-continent year", scope: "International", countries: 5 },
    { year: 2025, destination: "Midwest Road Trip", highlight: "4,000 mi — Rushmore, Devils Tower, Gateway Arch, Badlands", scope: "Domestic", countries: null },
    { year: 2026, destination: "Japan", highlight: "Booked!", scope: "International", countries: 1 }
];

const WWE_MILESTONES = [
    { year: 2004, label: "Timeline Begins", events: 10 },
    { year: 2007, label: "Early Era", events: 20 },
    { year: 2010, label: "WM XXVI", events: 35 },
    { year: 2014, label: "Undertaker Handshake at WM XXX", events: 50 },
    { year: 2016, label: "WM 32 — 100K+", events: 65 },
    { year: 2020, label: "90th Event (Mar 8)", events: 90 },
    { year: 2021, label: "91+ & Counting", events: 91 }
];

const CAREER_DATA = [
    { year: 2010, level: 1, title: "Intern" },
    { year: 2011, level: 2, title: "Life Enrichment Manager" },
    { year: 2018, level: 3, title: "Reminiscence Coordinator" },
    { year: 2020, level: 4, title: "Assisted Living Manager" },
    { year: 2021, level: 5, title: "Sr. Resident Care Coordinator" },
    { year: 2025, level: 6, title: "Executive Director" }
];

const SPORTS_RECORDS = [
    { sport: "Table Tennis", wins: 62, losses: 4, winRate: 93.9 },
    { sport: "Cornhole", wins: 254, losses: 98, winRate: 72.2 },
    { sport: "Famous Faces", wins: 9, losses: 11, winRate: 45.0 }
];

const EPIC_NUMBERS = [
    { label: "Bowling Games\n(1 day, 2007)", value: 27 },
    { label: "Ping Pong Rounds\n(1 match, 2021)", value: 218 },
    { label: "Cornholios\n(2016 season)", value: 38 },
    { label: "Blue Claws\n(1 trip)", value: 30 },
    { label: "Shrimp (lbs)\n(1 event, 2021)", value: 8.6 },
    { label: "Crab Meat (lbs)\n(1 event, 2021)", value: 7.3 }
];

const EPIC_NUMBERS_COLORS = ['#8b1a1a', '#1a4a8b', '#6b4a8b', '#4a6741', '#b8860b', '#c9a84c'];

const ECD_DATA = [
    { anniversary: "5th", year: 2012, participants: 20, raised: 0 },
    { anniversary: "10th", year: 2017, participants: 30, raised: 0 },
    { anniversary: "13th", year: 2020, participants: 35, raised: 0 },
    { anniversary: "15th", year: 2022, participants: 40, raised: 0 },
    { anniversary: "18th+", year: 2025, participants: 57, raised: 1700 }
];

const AWARDS_TIMELINE = [
    { year: "≤2014", artist: "Mariah Carey", wins: 1 },
    { year: "2015", artist: "Janet Jackson", wins: 1 },
    { year: "2016", artist: "Janet Jackson", wins: 2 },
    { year: "2017", artist: "Other", wins: 0 },
    { year: "2018", artist: "Janet Jackson", wins: 3 },
    { year: "2019", artist: "Janet Jackson", wins: 4 },
    { year: "2020", artist: "Other", wins: 0 },
    { year: "2021", artist: "Janet Jackson", wins: 5 }
];

function computeAwardsSummary() {
    var counts = {};
    AWARDS_TIMELINE.forEach(function(entry) {
        counts[entry.artist] = (counts[entry.artist] || 0) + 1;
    });
    var janet = counts['Janet Jackson'] || 0;
    var mariah = counts['Mariah Carey'] || 0;
    var other = counts['Other'] || 0;
    return {
        labels: ['Janet Jackson (' + janet + ')', 'Mariah Carey', 'Other'],
        data: [janet, mariah, other]
    };
}

const TRADITIONS_DATA = [
    { tradition: "WWE Events", years: 22, icon: "🤼" },
    { tradition: "ECD Dodgeball", years: 18, icon: "🔴" },
    { tradition: "Vermont Skiing", years: 15, icon: "⛷️" },
    { tradition: "January Ritual", years: 22, icon: "📅" },
    { tradition: "Annual Awards", years: 12, icon: "🏅" },
    { tradition: "Famous Faces", years: 10, icon: "🎲" }
];

// =============================
// COMPUTED DATA HELPERS
// =============================

// Generate stepped career data with intermediate points for plateau visualization
function computeCareerSteps() {
    var steps = [];
    for (var i = 0; i < CAREER_DATA.length; i++) {
        steps.push({ x: CAREER_DATA[i].year, y: CAREER_DATA[i].level });
        if (i < CAREER_DATA.length - 1) {
            steps.push({ x: CAREER_DATA[i + 1].year, y: CAREER_DATA[i].level });
        }
    }
    steps.push({ x: 2026, y: CAREER_DATA[CAREER_DATA.length - 1].level });
    return steps;
}

// Generate career plateau durations for labels
function computeCareerDurations() {
    return CAREER_DATA.map(function(c, idx) {
        var nextYear = (idx < CAREER_DATA.length - 1) ? CAREER_DATA[idx + 1].year : 2026;
        return (nextYear - c.year) + 'yr';
    });
}

// Transform TRAVEL_DATA into bubble chart format
function computeTravelBubbles() {
    return TRAVEL_DATA.map(function(t) {
        return {
            x: t.year,
            y: t.scope === 'International' ? 2 : 1,
            r: t.countries !== null ? Math.max(t.countries * 4, 8) : 6,
            label: t.destination,
            highlight: t.highlight,
            scope: t.scope,
            countries: t.countries
        };
    });
}

// Split AWARDS_TIMELINE into per-artist stacked bar arrays
function computeAwardsDynastyData() {
    var years = AWARDS_TIMELINE.map(function(a) { return a.year; });
    var janet = AWARDS_TIMELINE.map(function(a) {
        return a.artist === 'Janet Jackson' ? 1 : 0;
    });
    var mariah = AWARDS_TIMELINE.map(function(a) {
        return a.artist === 'Mariah Carey' ? 1 : 0;
    });
    var other = AWARDS_TIMELINE.map(function(a) {
        return a.artist === 'Other' ? 1 : 0;
    });
    return { years: years, janet: janet, mariah: mariah, other: other };
}

// Chart color palettes
const RETRO_COLORS = ['#8b1a1a', '#4a6741', '#1a4a8b', '#6b4a8b', '#b8860b', '#c9a84c', '#5c3d1a', '#8b5e2b'];
const RETRO_COLORS_ALPHA = RETRO_COLORS.map(c => c + '33');

// Shared chart styling constants
const CHART_STYLE = {
    titleFont: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' },
    titleColor: '#5c3d1a',
    titlePadding: { bottom: 12 },
    gridColor: 'rgba(196,184,160,0.3)',
    panelBg: '#f5f0e6',
    borderRadius: 2,
    colors: {
        green: '#4a6741',
        red: '#8b1a1a',
        blue: '#1a4a8b',
        purple: '#6b4a8b',
        gold: '#c9a84c',
        brown: '#b8860b',
        darkBrown: '#5c3d1a'
    }
};
