// js/arc.js — Room 1: The Arc (Redesigned)
// Emotional "year in the life" narrative through 9 hero's journey stages
// Loads richer data: year themes, life chapters, epic numbers, callouts

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

const STAGE_SLUGS = [
    'ordinary-world', 'call-to-adventure', 'crossing-threshold',
    'tests-allies', 'approach-cave', 'ordeal',
    'road-back', 'resurrection', 'return-elixir'
];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

const CATEGORY_ICONS = {
    travel: '\u2708', wwe: '\u{1F93C}', career: '\u{1F4C8}', health: '\u{1F3E5}',
    ecd: '\u{1F534}', family: '\u{1F468}\u200D\u{1F469}\u200D\u{1F466}', relationship: '\u{1F49B}',
    entertainment: '\u{1F3AD}', sports: '\u{1F3D3}', education: '\u{1F393}',
    music_awards: '\u{1F3B5}', vehicle: '\u{1F697}', social: '\u{1F389}',
    personal: '\u{1F4DD}', writing: '\u270D', other: '\u25C6'
};

// (Emotion color map removed — quotes no longer display emotion labels)

const DOMAIN_COLORS = {
    health: '#c0392b', family: '#8b6914', identity: '#6a4b8b',
    relationship: '#d4a24e', community: '#2e7d32'
};

// ─── INIT ─────────────────────────────────────────────────────────
export async function initArc() {
    const data = await loadMultiple([
        'heros_journey_narrative.json',
        'sentiment_timeline.json',
        'turning_point_impact.json',
        'year_summaries.json',
        'life_chapters.json',
        'epic_numbers.json'
    ]);

    const maps = buildMaps(data);
    renderStages(data.heros_journey_narrative, maps);
    initSentimentLine(data.sentiment_timeline);
    initChapterNav(data.heros_journey_narrative);
    initScrollObserver();
}

function buildMaps(data) {
    const yearSummary = {};
    (data.year_summaries || []).forEach(y => { yearSummary[y.year] = y; });

    const epicNumbers = {};
    (data.epic_numbers || []).forEach(e => {
        if (!e.year) return;
        if (!epicNumbers[e.year]) epicNumbers[e.year] = [];
        epicNumbers[e.year].push(e);
    });

    const impactMap = {};
    (data.turning_point_impact || []).forEach(tp => {
        if (!impactMap[tp.turning_point_year]) impactMap[tp.turning_point_year] = [];
        impactMap[tp.turning_point_year].push(tp);
    });

    return {
        yearSummary,
        epicNumbers,
        lifeChapters: data.life_chapters || [],
        impactMap
    };
}

function parseYears(yearsStr) {
    if (!yearsStr) return [];
    try {
        const parsed = JSON.parse(yearsStr);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        const match = yearsStr.match(/(\d{4})/g);
        return match ? [...new Set(match.map(Number))] : [];
    }
}

// ─── RENDER ALL STAGES ────────────────────────────────────────────
function renderStages(stages, maps) {
    const main = document.querySelector('.arc-stages');
    if (!main) return;

    stages.forEach((entry, i) => {
        const s = entry.stage;
        const slug = STAGE_SLUGS[i];
        const years = parseYears(s.years);

        // Gather contextual data
        const yearThemes = years.map(y => maps.yearSummary[y]).filter(Boolean);
        const chapters = maps.lifeChapters.filter(ch =>
            years.some(y => y >= ch.start_year && y <= ch.end_year)
        );
        const uniqueChapters = [...new Map(chapters.map(c => [c.chapter_number, c])).values()];
        const epicNums = years.flatMap(y => maps.epicNumbers[y] || []);
        const milestones = entry.milestones || [];
        const quotes = selectQuotes(entry.quotes || [], 4);
        const turningPoints = entry.turning_points || [];
        const people = (entry.people || [])
            .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
            .slice(0, 10);

        const section = document.createElement('section');
        section.className = 'arc-stage';
        section.dataset.stage = slug;
        section.id = `stage-${i + 1}`;

        const callout = generateCallout(s, i, yearThemes);

        section.innerHTML = `
            ${heroHTML(i, s, years, yearThemes)}
            <div class="stage-body">
                ${chapterBannerHTML(uniqueChapters)}
                ${narrativeHTML(s)}
                ${callout ? `<div class="arc-callout anim-target"><p>${callout}</p></div>` : ''}
                ${turningPointsHTML(turningPoints, maps.impactMap)}
                ${quotesHTML(quotes)}
                ${timelineHTML(milestones)}
                ${epicNumbersHTML(epicNums)}
                ${peopleHTML(people)}
            </div>
        `;

        main.appendChild(section);
    });
}

// ─── HERO ─────────────────────────────────────────────────────────
function heroHTML(i, s, years, yearThemes) {
    const yearRange = years.length > 1
        ? `${years[0]}\u2013${years[years.length - 1]}`
        : `${years[0]}`;

    const themesBlock = yearThemes.map(yt => `
        <div class="year-theme">
            <span class="year-theme__year">${yt.year}</span>
            <span class="year-theme__text">${yt.year_theme}</span>
        </div>
    `).join('');

    return `
        <div class="stage-hero">
            <span class="stage-number">${ROMAN[i]}</span>
            <h2 class="stage-title">${s.stage}</h2>
            <p class="stage-years">${yearRange}</p>
            ${themesBlock ? `<div class="stage-year-themes">${themesBlock}</div>` : ''}
            <div class="stage-pulse">
                <div class="pulse-metric">
                    <span class="pulse-value">${s.milestone_count}</span>
                    <span class="pulse-label">milestones</span>
                </div>
                <div class="pulse-metric">
                    <span class="pulse-value">${s.people_active_count}</span>
                    <span class="pulse-label">people</span>
                </div>
                ${s.quote_count > 0 ? `
                <div class="pulse-metric">
                    <span class="pulse-value">${s.quote_count}</span>
                    <span class="pulse-label">quotes</span>
                </div>` : ''}
            </div>
            <div class="hero-scroll-hint">\u2193</div>
        </div>
    `;
}

// ─── CHAPTER BANNER ───────────────────────────────────────────────
function chapterBannerHTML(chapters) {
    if (!chapters.length) return '';
    return chapters.map(ch => {
        const mainTheme = (ch.theme || '').split('|')[0].trim();
        return `
            <div class="stage-chapter-banner anim-target">
                <span class="chapter-badge">Ch. ${ch.chapter_number}</span>
                <span class="chapter-theme">${mainTheme}</span>
            </div>
        `;
    }).join('');
}

// ─── NARRATIVE ────────────────────────────────────────────────────
function narrativeHTML(s) {
    return `
        <div class="stage-narrative anim-target">
            <p class="stage-prose">${s.description}</p>
            ${s.career_milestones ? `<p class="stage-career-context">${s.career_milestones}</p>` : ''}
        </div>
    `;
}

// ─── CALLOUT GENERATOR ────────────────────────────────────────────
function generateCallout(s, i, yearThemes) {
    const callouts = [
        // 0 — Ordinary World
        `A car accident that left him afraid to drive. A family that fell apart. A 20-year-old with shingles and the beginning of something called EastCoastDodgeball. Not every foundation is built on steady ground\u2009\u2014\u2009some are built while everything underneath is shaking.`,
        // 1 — Call to Adventure
        `Twenty-seven bowling games in a single day. A surprise 50th for his father. Dodgeball hit triple digits. Everything he\u2019d been quietly building since 2004 caught fire all at once\u2009\u2014\u2009and he couldn\u2019t look away.`,
        // 2 — Crossing the Threshold
        `The year he came out. The year the 723-day relationship ended. Liberation Day. He wrote \u201CYeah I Said It\u201D and, for the first time, said exactly what he meant. There\u2019s a reason this stage is called the threshold\u2009\u2014\u2009once you cross, you can\u2019t go back.`,
        // 3 — Tests, Allies & Enemies
        `2009 wasn\u2019t the happiest year. It was the most alive. Skydiving at 10,000 feet, first concert ever at MSG, ECD retired after 171 events. Then graduation, a torn labrum, a career at Sunrise, and the Ro(b)mantic Era beginning on January 1st at Ocean Bay Diner. Three years of becoming someone new.`,
        // 4 — Approach to Inmost Cave
        `The Influlist. Merrie Melodies. He started naming things\u2009\u2014\u2009mapping where he came from, crediting who shaped him. The first cruise. DODGEBOWL 200. Grandma Theresa\u2019s passing. He was going deeper, and the writing was getting more intentional.`,
        // 5 — The Ordeal
        `He shook The Undertaker\u2019s hand at 4:10:18 PM on April 5th\u2009\u2014\u2009a 20-year dream fulfilled through five friends who made it happen. He turned 30. He\u2019d achieved everything he\u2019d set out to do. And the question nobody prepares you for: now what?`,
        // 6 — The Road Back
        `Quieter years on the outside. Cruises, table tennis records, Janet Jackson\u2019s dynasty. But 2017 ended with 14 staples in his spine and a body that finally said stop. Sometimes the road back isn\u2019t a road at all\u2009\u2014\u2009it\u2019s a hospital bed on December 15th.`,
        // 7 — Resurrection
        `Post-surgery, he went to the Mediterranean. Then Australia and New Zealand for 19 days\u2009\u2014\u2009\u201Cthe best, the longest, and the greatest.\u201D He became Uncle John. COVID forced a universal pause, but the muscle gain comeback and a 4th skydive said everything about who he was on the other side.`,
        // 8 — Return with the Elixir
        `The Grand Canyon. The Super Bowl. A 4,000-mile road trip across 16 states. Executive Director. Twenty-two years of documenting a life, and the timeline keeps going. Japan is booked. The elixir was never a destination\u2009\u2014\u2009it was the practice of paying attention.`
    ];
    return callouts[i] || null;
}

// ─── TURNING POINTS ───────────────────────────────────────────────
function turningPointsHTML(turningPoints, impactMap) {
    if (!turningPoints.length) return '';

    const cards = turningPoints.map(tp => {
        const impact = findImpact(impactMap, tp.year, tp.event);
        const domainColor = DOMAIN_COLORS[tp.domain] || '#888';
        let recoveryTag = '';
        if (impact && impact.recovery_months) {
            recoveryTag = `<span class="tp-recovery">${impact.recovery_months}mo recovery</span>`;
        }

        return `
            <div class="tp-card tp-card--${tp.type}">
                <div class="tp-marker"></div>
                <div class="tp-content">
                    <div class="tp-header">
                        <span class="tp-year">${tp.year}</span>
                        <span class="tp-domain" style="background:${domainColor}">${tp.domain}</span>
                        ${recoveryTag}
                    </div>
                    <p class="tp-event">${tp.event}</p>
                    ${tp.from_state && tp.to_state ? `
                    <div class="tp-transition">
                        <span class="tp-from">${tp.from_state}</span>
                        <span class="tp-arrow">\u2192</span>
                        <span class="tp-to">${tp.to_state}</span>
                    </div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `<div class="stage-drama anim-target">${cards}</div>`;
}

function findImpact(impactMap, year, event) {
    const entries = impactMap[year];
    if (!entries) return null;
    const prefix = event.slice(0, 20).toLowerCase();
    return entries.find(e => e.event.slice(0, 20).toLowerCase() === prefix) || entries[0];
}

// ─── QUOTES ───────────────────────────────────────────────────────
function quotesHTML(quotes) {
    if (!quotes.length) return '';

    const blocks = quotes.map(q => {
        return `
            <blockquote class="arc-quote">
                <p>\u201C${q.quote}\u201D</p>
                ${q.context ? `<footer><span class="quote-context">${q.context}</span></footer>` : ''}
            </blockquote>
        `;
    }).join('');

    return `<div class="stage-quotes anim-target">${blocks}</div>`;
}

function selectQuotes(quotes, max) {
    if (!quotes || !quotes.length) return [];
    if (quotes.length <= max) return quotes;

    const selected = [];
    const sorted = [...quotes].sort((a, b) => (b.sentiment_score || 0) - (a.sentiment_score || 0));
    selected.push(sorted[0]);

    const mostRaw = sorted[sorted.length - 1];
    if (mostRaw !== selected[0]) selected.push(mostRaw);

    const usedEmotions = new Set(selected.map(q => q.emotion));
    const different = quotes.find(q => !usedEmotions.has(q.emotion) && !selected.includes(q));
    if (different && selected.length < max) selected.push(different);

    while (selected.length < max) {
        const next = quotes.find(q => !selected.includes(q));
        if (!next) break;
        selected.push(next);
    }
    return selected.slice(0, max);
}

// ─── DATE EXTRACTION ─────────────────────────────────────────────
const MONTH_ORDER = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
const FULL_TO_SHORT = { January:'Jan',February:'Feb',March:'Mar',April:'Apr',May:'May',June:'Jun',July:'Jul',August:'Aug',September:'Sep',October:'Oct',November:'Nov',December:'Dec' };

function extractDate(text) {
    if (!text) return null;
    const abbr = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
    const full = 'January|February|March|April|May|June|July|August|September|October|November|December';

    // 1. "Mon DD-DD" range within a month (e.g., "Sep 25-27", "Jan 6-9")
    const rangeRe = new RegExp(`\\b((?:${abbr})\\s+\\d{1,2})\\s*[-\u2013]\\s*(\\d{1,2})\\b`);
    const rangeMatch = text.match(rangeRe);
    if (rangeMatch) {
        const mon = rangeMatch[1].slice(0, 3);
        return { label: `${rangeMatch[1]}\u2013${rangeMatch[2]}`, month: MONTH_ORDER[mon], day: parseInt(rangeMatch[1].match(/\d+/)[0]) };
    }

    // 2. "Mon DD" — abbreviated month + day (e.g., "Jul 29", "Oct 29 Philadelphia")
    const singleRe = new RegExp(`\\b((?:${abbr})\\s+\\d{1,2})\\b`);
    const singleMatch = text.match(singleRe);
    if (singleMatch) {
        const mon = singleMatch[1].slice(0, 3);
        return { label: singleMatch[1], month: MONTH_ORDER[mon], day: parseInt(singleMatch[1].match(/\d+$/)[0]) };
    }

    // 3. Full month name + day (e.g., "March 2006" — but only if day present)
    const fullDayRe = new RegExp(`\\b(${full})\\s+(\\d{1,2})\\b`);
    const fullDayMatch = text.match(fullDayRe);
    if (fullDayMatch) {
        const short = FULL_TO_SHORT[fullDayMatch[1]];
        return { label: `${short} ${fullDayMatch[2]}`, month: MONTH_ORDER[short], day: parseInt(fullDayMatch[2]) };
    }

    // 4. Abbreviated month alone in parens (e.g., "(Jan)", "(Nov)")
    const abbrAloneRe = new RegExp(`\\(\\s*(${abbr})\\s*\\)`);
    const abbrAloneMatch = text.match(abbrAloneRe);
    if (abbrAloneMatch) {
        return { label: abbrAloneMatch[1], month: MONTH_ORDER[abbrAloneMatch[1]], day: 1 };
    }

    // 5. Full month name alone (e.g., "(February)", "(October)", "(winter)" excluded)
    const fullAloneRe = new RegExp(`\\b(${full})\\b`);
    const fullAloneMatch = text.match(fullAloneRe);
    if (fullAloneMatch) {
        const short = FULL_TO_SHORT[fullAloneMatch[1]];
        return { label: short, month: MONTH_ORDER[short], day: 1 };
    }

    // 6. "Mon-Mon" range across months (e.g., "Feb-Apr", "Jan-Feb")
    const crossMonthRe = new RegExp(`\\b(${abbr})\\s*[-\u2013]\\s*(${abbr})\\b`);
    const crossMonthMatch = text.match(crossMonthRe);
    if (crossMonthMatch) {
        return { label: `${crossMonthMatch[1]}\u2013${crossMonthMatch[2]}`, month: MONTH_ORDER[crossMonthMatch[1]], day: 1 };
    }

    // 7. Season ranges first (e.g., "summer–fall") — must check before single season
    const SEASON_MONTHS = { spring: 4, summer: 7, fall: 10, winter: 1 };
    const seasonRangeRe = /\b(spring|summer|fall|winter)\s*[–-]\s*(spring|summer|fall|winter)\b/i;
    const seasonRangeMatch = text.match(seasonRangeRe);
    if (seasonRangeMatch) {
        const s1 = seasonRangeMatch[1].toLowerCase();
        const s2 = seasonRangeMatch[2].toLowerCase();
        return { label: `${s1}\u2013${s2}`, month: SEASON_MONTHS[s1], day: 1 };
    }

    // 8. Single season (e.g., "(spring)", "(summer)", "(fall)")
    const seasonRe = /\b(spring|summer|fall|winter)\b/i;
    const seasonMatch = text.match(seasonRe);
    if (seasonMatch) {
        const s = seasonMatch[1].toLowerCase();
        return { label: s, month: SEASON_MONTHS[s], day: 1 };
    }

    return null;
}

function chronoSort(a, b) {
    if (a.year !== b.year) return a.year - b.year;
    const da = extractDate(a.milestone);
    const db = extractDate(b.milestone);
    if (da && db) {
        if (da.month !== db.month) return da.month - db.month;
        return da.day - db.day;
    }
    if (da) return -1;
    if (db) return 1;
    return 0;
}

// ─── MILESTONE TIMELINE ──────────────────────────────────────────
function timelineHTML(milestones) {
    if (!milestones.length) return '';

    const sorted = [...milestones].sort(chronoSort);

    const display = selectMilestones(sorted, 12);

    let lastLabel = '';
    const entries = display.map(m => {
        const icon = CATEGORY_ICONS[m.category] || CATEGORY_ICONS.other;
        const parsed = extractDate(m.milestone);
        let dateLabel;
        if (parsed) {
            dateLabel = parsed.label;
        } else {
            dateLabel = String(m.year);
        }
        // Suppress repeated identical labels
        const showLabel = dateLabel !== lastLabel;
        lastLabel = dateLabel;

        return `
            <div class="tl-entry">
                <span class="tl-year">${showLabel ? dateLabel : ''}</span>
                <span class="tl-dot"></span>
                <div class="tl-body">
                    <span class="tl-icon">${icon}</span>
                    <p class="tl-text">${m.milestone}</p>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="stage-timeline anim-target">
            <h3 class="section-label">what happened</h3>
            ${entries}
        </div>
    `;
}

function selectMilestones(milestones, max) {
    if (milestones.length <= max) return milestones;

    // Select first occurrence per year (already sorted by date in timelineHTML)
    const bySentiment = milestones;

    const selected = [];
    const yearsCovered = new Set();

    // One per year, most emotional first
    for (const m of bySentiment) {
        if (!yearsCovered.has(m.year) && selected.length < max) {
            selected.push(m);
            yearsCovered.add(m.year);
        }
    }
    // Fill remaining
    for (const m of bySentiment) {
        if (!selected.includes(m) && selected.length < max) {
            selected.push(m);
        }
    }
    return selected.sort(chronoSort);
}

// ─── EPIC NUMBERS ─────────────────────────────────────────────────
function epicNumbersHTML(epicNums) {
    if (!epicNums.length) return '';

    const cards = epicNums.map(e => `
        <div class="epic-card">
            <span class="epic-value">${e.value}</span>
            <span class="epic-stat">${e.stat.toLowerCase()}</span>
            ${e.year ? `<span class="epic-year">${e.year}</span>` : ''}
        </div>
    `).join('');

    return `<div class="stage-epic anim-target">${cards}</div>`;
}

// ─── PEOPLE ───────────────────────────────────────────────────────
function peopleHTML(people) {
    if (!people.length) return '';

    const tags = people.map(p => {
        const cat = p.category || 'friend';
        const imp = p.importance_score || 0;
        const cls = imp > 100 ? 'cast-person--major' : imp > 20 ? 'cast-person--mid' : '';
        return `<span class="cast-person ${cls}" data-category="${cat}" title="${p.relation || ''}">${p.name}</span>`;
    }).join('');

    return `
        <div class="stage-cast anim-target">
            <h3 class="section-label">who was there</h3>
            <div class="cast-tags">${tags}</div>
        </div>
    `;
}

// ─── SENTIMENT LINE ───────────────────────────────────────────────
function initSentimentLine(sentimentData) {
    const canvas = document.getElementById('sentimentLine');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const sorted = [...sentimentData].sort((a, b) => a.year - b.year);

    function draw(activeStageIndex) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const pad = { top: 50, bottom: 50 };
        const plotH = h - pad.top - pad.bottom;

        ctx.clearRect(0, 0, w, h);

        const points = sorted.map((d, idx) => ({
            x: w / 2 + d.avg_sentiment * (w * 0.35),
            y: pad.top + (idx / (sorted.length - 1)) * plotH,
            sentiment: d.avg_sentiment,
            year: d.year,
            isTurningPoint: d.is_turning_point,
            turningPointType: d.turning_point_type
        }));

        // Gradient line
        for (let i = 0; i < points.length - 1; i++) {
            const p = points[i];
            const next = points[i + 1];
            const alpha = 0.35 + Math.abs(p.sentiment) * 1.8;
            ctx.strokeStyle = p.sentiment >= 0
                ? `rgba(74,103,65,${Math.min(alpha, 0.9)})`
                : `rgba(139,26,26,${Math.min(alpha, 0.9)})`;
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
        }

        // Dots
        points.forEach(p => {
            if (p.isTurningPoint) {
                ctx.fillStyle = p.turningPointType === 'redemptive' ? '#4a6741' :
                    p.turningPointType === 'contaminated' ? '#8b1a1a' : '#c9a84c';
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-4, -4, 8, 8);
                ctx.restore();
            } else {
                ctx.fillStyle = p.sentiment >= 0 ? 'rgba(74,103,65,0.6)' : 'rgba(139,26,26,0.6)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Year labels
        ctx.font = '9px "Courier Prime", monospace';
        ctx.textAlign = 'center';
        points.forEach(p => {
            if (p.year % 5 === 0 || p.isTurningPoint) {
                ctx.fillStyle = 'rgba(200,190,170,0.5)';
                ctx.fillText(p.year, w / 2, p.y - 10);
            }
        });

        // Active highlight
        if (activeStageIndex !== undefined && activeStageIndex >= 0) {
            const stageYears = [2004, 2007, 2008, 2009, 2012, 2014, 2015, 2018, 2021];
            const targetYear = stageYears[activeStageIndex] || 2004;
            const targetPoint = points.find(p => p.year === targetYear) || points[0];

            ctx.fillStyle = '#c9a84c';
            ctx.beginPath();
            ctx.arc(targetPoint.x, targetPoint.y, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(201,168,76,0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, targetPoint.y);
            ctx.lineTo(w, targetPoint.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    window.__arcSentimentDraw = draw;
    draw(0);
}

// ─── CHAPTER NAV ──────────────────────────────────────────────────
function initChapterNav(stages) {
    const nav = document.querySelector('.arc-chapter-nav');
    if (!nav) return;

    stages.forEach((entry, i) => {
        const dot = document.createElement('button');
        dot.className = 'chapter-dot';
        dot.title = entry.stage.stage;
        dot.setAttribute('aria-label', `Jump to ${entry.stage.stage}`);
        if (i === 0) dot.classList.add('active');

        dot.addEventListener('click', () => {
            const target = document.getElementById(`stage-${i + 1}`);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });

        nav.appendChild(dot);
    });
}

// ─── SCROLL OBSERVER ──────────────────────────────────────────────
function initScrollObserver() {
    const stages = document.querySelectorAll('.arc-stage');
    const dots = document.querySelectorAll('.chapter-dot');

    // Stage-level observer (chapter nav + sentiment line + year theme reveal)
    const stageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const idx = Array.from(stages).indexOf(entry.target);
                dots.forEach((d, i) => d.classList.toggle('active', i === idx));
                if (window.__arcSentimentDraw) window.__arcSentimentDraw(idx);

                // Reveal year themes inside this stage's hero
                entry.target.querySelectorAll('.year-theme:not(.visible)').forEach((yt, i) => {
                    setTimeout(() => yt.classList.add('visible'), 300 + i * 150);
                });
            }
        });
    }, { threshold: 0.15 });

    // Element-level observer (staggered animations)
    const animObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Stagger child elements
                const items = entry.target.querySelectorAll(
                    '.tl-entry, .tp-card, .arc-quote, .epic-card, .cast-person, .year-theme'
                );
                items.forEach((item, idx) => {
                    setTimeout(() => item.classList.add('visible'), idx * 80);
                });
            }
        });
    }, { threshold: 0.1 });

    stages.forEach(stage => {
        stageObserver.observe(stage);
        stage.querySelectorAll('.anim-target').forEach(el => animObserver.observe(el));
    });

    // Animate first hero immediately
    const firstHero = document.querySelector('.stage-hero');
    if (firstHero) firstHero.classList.add('visible');

    // Animate year themes in first hero
    document.querySelectorAll('#stage-1 .year-theme').forEach((yt, idx) => {
        setTimeout(() => yt.classList.add('visible'), 400 + idx * 150);
    });
}

// ─── AUTO INIT ────────────────────────────────────────────────────
initArc()
    .then(() => initWormholes('arc'))
    .then(() => plantClue('clue1', document.querySelector('.arc-stage:last-child')))
    .catch(err => {
        console.error('Arc init failed:', err);
        const el = document.querySelector('.arc-stages');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
