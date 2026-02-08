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
    { stat: "Bowling Games", value: 27, unit: "", context: "1 day \u00b7 2007" },
    { stat: "Ping Pong Rounds", value: 218, unit: "", context: "1 match \u00b7 2021" },
    { stat: "Cornholios", value: 38, unit: "", context: "2016 season" },
    { stat: "Blue Claws Games", value: 30, unit: "", context: "1 trip" },
    { stat: "Shrimp Consumed", value: 8.6, unit: "lbs", context: "1 event \u00b7 2021" },
    { stat: "Crab Meat", value: 7.3, unit: "lbs", context: "1 event \u00b7 2021" }
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

// =============================
// FAKE LJ COMMENTS (per section)
// =============================
const SECTION_COMMENTS = {
    stats: [
        { name: "VW", date: "1/07/26 08:12 pm", text: "218 rounds of ping pong in one match?? I was THERE and I still don't believe it." },
        { name: "wwecoowner", date: "1/07/26 08:14 pm", text: "the notebook doesn't lie, ValPal.", isOP: true },
        { name: "Dan Spengeman", date: "1/07/26 08:30 pm", text: "8.6 lbs of shrimp is not a stat. it's a cry for help." },
        { name: "wwecoowner", date: "1/07/26 08:31 pm", text: "it's called dedication. look it up.", isOP: true },
        { name: "Lauren W.", date: "1/07/26 09:01 pm", text: "Zero regrets is WILD and also clearly wrong" },
        { name: "RL", date: "1/07/26 09:15 pm", text: "93.9% table tennis win rate but conveniently leaves out who he ducked" },
        { name: "wwecoowner", date: "1/07/26 09:16 pm", text: "i ducked nobody. the record speaks for itself.", isOP: true }
    ],
    greatest: [
        { name: "Rupert", date: "1/07/26 08:45 pm", text: "The Famous Faces 45% win rate is generous. I've watched you lose." },
        { name: "wwecoowner", date: "1/07/26 08:47 pm", text: "we don't talk about famous faces.", isOP: true },
        { name: "Diana", date: "1/07/26 09:02 pm", text: "cornholios is not a real word and I will die on this hill" }
    ],
    career: [
        { name: "Ma", date: "1/07/26 07:30 pm", text: "So proud of you, John. Executive Director!!! Love, Ma" },
        { name: "wwecoowner", date: "1/07/26 07:32 pm", text: "thanks Ma. you know you don't have to sign your comments right?", isOP: true },
        { name: "The Pops", date: "1/07/26 07:45 pm", text: "Intern to ED in 15 years. Not bad, kid. Not bad at all." },
        { name: "Michael", date: "1/07/26 08:00 pm", text: "congrats bro. Julian says hi. Lawrence says nothing because he's 4." }
    ],
    wwe: [
        { name: "RL", date: "1/07/26 08:00 pm", text: "17 events together and you still haven't bought me a beer" },
        { name: "wwecoowner", date: "1/07/26 08:02 pm", text: "18 if you count the parking lot tailgate. and you owe ME a beer.", isOP: true },
        { name: "VW", date: "1/07/26 08:20 pm", text: "25 consecutive Survivor Series years is actually insane. do you have a problem?" },
        { name: "wwecoowner", date: "1/07/26 08:21 pm", text: "it's called a STREAK, Valerie. and yes probably.", isOP: true },
        { name: "Dan Spengeman", date: "1/07/26 09:00 pm", text: "you shook the Undertaker's hand and your entire personality became this" },
        { name: "JesseKay Paz", date: "1/07/26 09:30 pm", text: "91+ events and counting!! When's 100?? I want an invite!!" }
    ],
    travel: [
        { name: "VW", date: "1/07/26 08:15 pm", text: "JAPAN 2026!!! finally!!!" },
        { name: "wwecoowner", date: "1/07/26 08:16 pm", text: "booked and locked. the suitcase is already packed.", isOP: true },
        { name: "Ryan", date: "1/07/26 08:45 pm", text: "1,000 photos in Utah ALONE? bro they have deserts not content" },
        { name: "wwecoowner", date: "1/07/26 08:46 pm", text: "you clearly haven't seen Arches at sunset.", isOP: true },
        { name: "Lauren W.", date: "1/07/26 09:10 pm", text: "\"the best, the longest, and the greatest\" is a lot of confidence for someone who got a kidney stone that year" }
    ],
    cast: [
        { name: "VW", date: "1/07/26 07:00 pm", text: "\"appears across virtually every Timeline\" — yeah because someone keeps DOCUMENTING everything" },
        { name: "wwecoowner", date: "1/07/26 07:02 pm", text: "you're welcome for the immortality.", isOP: true },
        { name: "Dan Spengeman", date: "1/07/26 07:15 pm", text: "\"Comedian of the Year\" is my greatest achievement and I have a real job" },
        { name: "Kevin", date: "1/07/26 07:30 pm", text: "our entire relationship documented from an outside perspective is either sweet or a federal offense" },
        { name: "Leah", date: "1/07/26 07:31 pm", text: "both. it's both." },
        { name: "RL", date: "1/07/26 08:00 pm", text: "\"The Wrestling Co-Pilot\" is going on my gravestone" }
    ],
    awards: [
        { name: "Dan Spengeman", date: "1/07/26 09:00 pm", text: "The Pops won Comedian of the Year ONE TIME and you gave the dynasty to ME? respect." },
        { name: "The Pops", date: "1/07/26 09:05 pm", text: "I was robbed." },
        { name: "wwecoowner", date: "1/07/26 09:06 pm", text: "the committee has spoken, Darrell.", isOP: true },
        { name: "Lauren W.", date: "1/07/26 09:20 pm", text: "2-time winner here. just saying." },
        { name: "VW", date: "1/07/26 09:30 pm", text: "Janet Jackson winning 5 times tells you everything about John's personality" }
    ],
    comebacks: [
        { name: "Ma", date: "1/07/26 07:00 pm", text: "The surgery section still makes me cry. Love you, John." },
        { name: "wwecoowner", date: "1/07/26 07:02 pm", text: "Ma, I literally woke up and booked a Mediterranean cruise. I'm fine.", isOP: true },
        { name: "VW", date: "1/07/26 07:15 pm", text: "\"that's a movie pitch\" is CORRECT and I want producer credit" },
        { name: "RL", date: "1/07/26 07:30 pm", text: "from spinal surgery to engagement ring in 4 months. absolute psychopath behavior." },
        { name: "Juan", date: "1/07/26 08:00 pm", text: "kidney stones AND family loss in the same year and you went to FOUR COUNTRIES? I can't even go to the gym after a bad Monday" }
    ],
    ecd: [
        { name: "Diana", date: "1/07/26 08:00 pm", text: "57 people at one dodgeball event is honestly alarming" },
        { name: "wwecoowner", date: "1/07/26 08:02 pm", text: "it's called COMMUNITY, Diana.", isOP: true },
        { name: "Ryan", date: "1/07/26 08:15 pm", text: "the Brown brothers were definitely on something at the last one" },
        { name: "Lauren W.", date: "1/07/26 08:30 pm", text: "\"it deserves its own documentary\" — I wasn't kidding" }
    ],
    traditions: [
        { name: "VW", date: "1/07/26 09:00 pm", text: "the fact that \"January Publishing Ritual\" is a tradition tells you everything" },
        { name: "Dan Spengeman", date: "1/07/26 09:15 pm", text: "Famous Faces having only 10 years tracked is because he keeps losing and wants to forget" },
        { name: "wwecoowner", date: "1/07/26 09:16 pm", text: "the record is the record. next question.", isOP: true }
    ]
};

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
