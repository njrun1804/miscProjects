// =============================
// DATA ARRAYS FOR TRON TIMELINE DASHBOARD
// =============================

const TRAVEL_DATA = [
    { year: 2010, destination: "Arizona", highlight: "WrestleMania XXVI — 939 photos", scope: "Domestic", countries: 0 },
    { year: 2017, destination: "Alaska & Seattle", highlight: "Mendenhall Glacier cruise", scope: "Domestic", countries: 0 },
    { year: 2018, destination: "Slovenia, Italy, Greece, Malta, Croatia", highlight: "5 countries, 2 weeks — Mediterranean", scope: "International", countries: 5 },
    { year: 2019, destination: "Australia & New Zealand", highlight: '"The best, the longest, and the greatest"', scope: "International", countries: 2 },
    { year: 2020, destination: "Singapore, Thailand, Cambodia, Vietnam, Hong Kong", highlight: "17-day Asian expedition", scope: "International", countries: 5 },
    { year: 2021, destination: "Grand Canyon, Vegas, Utah, Colorado, Boston", highlight: "1,000+ photos in Utah alone", scope: "Domestic", countries: 0 },
    { year: 2023, destination: "Phoenix / Arizona", highlight: 'Super Bowl LVII — "most spectacular day"', scope: "Domestic", countries: 0 },
    { year: 2024, destination: "Portugal, Spain, Norway, Iceland, Toronto", highlight: "Multi-continent year", scope: "International", countries: 5 },
    { year: 2025, destination: "Midwest Road Trip", highlight: "4,000 mi — Rushmore, Devils Tower, Gateway Arch, Badlands", scope: "Domestic", countries: 0 },
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
    { label: "Bowling Games\n(1 day, 2007)", value: 27, color: "#8b1a1a" },
    { label: "Ping Pong Rounds\n(1 match, 2021)", value: 218, color: "#1a4a8b" },
    { label: "Cornholios\n(2016 season)", value: 38, color: "#6b4a8b" },
    { label: "Blue Claws\n(1 trip)", value: 30, color: "#4a6741" },
    { label: "Shrimp (lbs)\n(1 event, 2021)", value: 8.6, color: "#b8860b" },
    { label: "Crab Meat (lbs)\n(1 event, 2021)", value: 7.3, color: "#c9a84c" }
];

const ECD_DATA = {
    labels: ["5th", "10th", "13th", "15th", "18th+"],
    milestoneYears: [2012, 2017, 2020, 2022, 2025],
    participants: [20, 30, 35, 40, 57],
    raised: [0, 0, 0, 0, 1700]
};

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

const TRADITIONS_DATA = [
    { tradition: "WWE Events", years: 22, icon: "🤼" },
    { tradition: "ECD Dodgeball", years: 18, icon: "🔴" },
    { tradition: "Vermont Skiing", years: 15, icon: "⛷️" },
    { tradition: "January Ritual", years: 22, icon: "📅" },
    { tradition: "Annual Awards", years: 12, icon: "🏅" },
    { tradition: "Famous Faces", years: 10, icon: "🎲" }
];

// Chart color palettes
const RETRO_COLORS = ['#8b1a1a', '#4a6741', '#1a4a8b', '#6b4a8b', '#b8860b', '#c9a84c', '#5c3d1a', '#8b5e2b'];
const RETRO_COLORS_ALPHA = RETRO_COLORS.map(c => c + '33');
