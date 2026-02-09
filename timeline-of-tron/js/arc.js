// js/arc.js — Room 1: The Arc (Hero's Journey + Emotional Timeline)
// Scroll-driven narrative through 9 hero's journey stages

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

const STAGE_SLUGS = [
    'ordinary-world',
    'call-to-adventure',
    'crossing-threshold',
    'tests-allies',
    'approach-cave',
    'ordeal',
    'road-back',
    'resurrection',
    'return-elixir'
];

const CATEGORY_ICONS = {
    travel: '\u2708',
    wwe: '\u{1F93C}',
    career: '\u{1F4C8}',
    health: '\u{1F3E5}',
    ecd: '\u{1F534}',
    family: '\u{1F468}\u200D\u{1F469}\u200D\u{1F466}',
    relationship: '\u{1F49B}',
    entertainment: '\u{1F3AD}',
    sports: '\u{1F3D3}',
    education: '\u{1F393}',
    music_awards: '\u{1F3B5}',
    vehicle: '\u{1F697}',
    social: '\u{1F389}',
    personal: '\u{1F4DD}',
    writing: '\u270D',
    other: '\u25C6'
};

const DOMAIN_COLORS = {
    health: '#c0392b',
    family: '#8b6914',
    identity: '#6a4b8b',
    relationship: '#d4a24e',
    community: '#2e7d32'
};

const EMOTION_COLORS = {
    joy: '#4a6741',
    pride: '#c9a84c',
    love: '#d4a24e',
    sadness: '#5a5a6e',
    anger: '#8b1a1a',
    nostalgia: '#6a4b8b',
    neutral: '#888',
    humor: '#2e7d32',
    defiance: '#c0392b',
    fear: '#4a2d6b',
    determination: '#1a5c8b',
    gratitude: '#4a6741',
    reflection: '#5a5a6e'
};

export async function initArc() {
    const data = await loadMultiple([
        'heros_journey_narrative.json',
        'sentiment_timeline.json',
        'turning_points.json',
        'turning_point_impact.json'
    ]);

    const stages = data.heros_journey_narrative;
    const sentiment = data.sentiment_timeline;

    // Build impact lookup by year
    const impactMap = {};
    (data.turning_point_impact || []).forEach(tp => {
        const key = `${tp.turning_point_year}_${tp.event.slice(0, 25)}`;
        if (!impactMap[tp.turning_point_year]) impactMap[tp.turning_point_year] = [];
        impactMap[tp.turning_point_year].push(tp);
    });

    renderStages(stages, impactMap);
    initSentimentLine(sentiment);
    initChapterNav(stages);
    initScrollObserver();
}

function findImpact(impactMap, year, event) {
    const entries = impactMap[year];
    if (!entries) return null;
    // Match by first 20 chars of event text
    const prefix = event.slice(0, 20).toLowerCase();
    return entries.find(e => e.event.slice(0, 20).toLowerCase() === prefix) || entries[0];
}

function generateCallout(stageInfo, i) {
    // Special case: stage 3 (Tests, Allies — 2009-2011)
    if (i === 3) {
        return '2009 wasn\u2019t the happiest year. It was the most alive. Sentiment score: 0.076. But emotional range: \u2212\u20090.751 to +0.91. The greatest years aren\u2019t the calmest.';
    }
    // Negative sentiment but high intensity
    if (stageInfo.avg_sentiment < -0.1 && stageInfo.intensity_score > 8) {
        return `Sentiment: ${stageInfo.avg_sentiment.toFixed(3)}. Intensity: ${stageInfo.intensity_score.toFixed(1)}. Not every foundation is built on happiness.`;
    }
    // Highest positive sentiment
    if (stageInfo.avg_sentiment > 0.18) {
        return `The most documented year was also the most joyful. Average sentiment: +${stageInfo.avg_sentiment.toFixed(3)}. Peak vulnerability follows peak joy.`;
    }
    // Many milestones in short span
    const span = stageInfo.year_end - stageInfo.year_start + 1;
    if (stageInfo.milestone_count >= 25 && span <= 2) {
        return `${stageInfo.milestone_count} milestones in ${span} year${span > 1 ? 's' : ''}. Life was happening fast.`;
    }
    return null;
}

function selectQuotes(quotes, max) {
    if (!quotes || quotes.length === 0) return [];
    if (quotes.length <= max) return quotes;

    const selected = [];
    // Most positive
    const sorted = [...quotes].sort((a, b) => (b.sentiment_score || 0) - (a.sentiment_score || 0));
    selected.push(sorted[0]);

    // Most raw/intense (most negative)
    const mostRaw = sorted[sorted.length - 1];
    if (mostRaw !== selected[0]) selected.push(mostRaw);

    // Different emotion from first two
    const usedEmotions = new Set(selected.map(q => q.emotion));
    const different = quotes.find(q => !usedEmotions.has(q.emotion) && !selected.includes(q));
    if (different && selected.length < max) selected.push(different);

    // Fill remaining
    while (selected.length < max) {
        const next = quotes.find(q => !selected.includes(q));
        if (!next) break;
        selected.push(next);
    }

    return selected.slice(0, max);
}

function renderStages(stages, impactMap) {
    const main = document.querySelector('.arc-stages');
    if (!main) return;

    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

    stages.forEach((entry, i) => {
        // Destructure the nested data structure
        const stageInfo = entry.stage;
        const milestones = entry.milestones || [];
        const quotes = entry.quotes || [];
        const turningPoints = entry.turning_points || [];
        const people = entry.people || [];
        const careerMilestones = entry.career_milestones || [];
        const eras = entry.eras || [];

        const slug = STAGE_SLUGS[i] || stageInfo.stage.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const section = document.createElement('section');
        section.className = 'arc-stage';
        section.dataset.stage = slug;
        section.id = `stage-${i + 1}`;

        // --- Stats bar ---
        const sentimentClass = stageInfo.avg_sentiment >= 0 ? 'stage-stat--positive' : 'stage-stat--negative';
        const sentimentPrefix = stageInfo.avg_sentiment >= 0 ? '+' : '';
        const statsBarHTML = `
            <div class="stage-stats-bar">
                <div class="stage-stat">
                    <span class="stage-stat__value">${stageInfo.milestone_count}</span>
                    <span class="stage-stat__label">milestones</span>
                </div>
                <div class="stage-stat">
                    <span class="stage-stat__value">${stageInfo.people_active_count}</span>
                    <span class="stage-stat__label">people</span>
                </div>
                <div class="stage-stat ${sentimentClass}">
                    <span class="stage-stat__value">${sentimentPrefix}${stageInfo.avg_sentiment.toFixed(2)}</span>
                    <span class="stage-stat__label">sentiment</span>
                </div>
                <div class="stage-stat">
                    <span class="stage-stat__value">${stageInfo.intensity_score.toFixed(1)}</span>
                    <span class="stage-stat__label">intensity</span>
                </div>
                ${stageInfo.quote_count > 0 ? `
                <div class="stage-stat">
                    <span class="stage-stat__value">${stageInfo.quote_count}</span>
                    <span class="stage-stat__label">quotes</span>
                </div>` : ''}
            </div>
        `;

        // --- Career & era context ---
        const careerTitles = stageInfo.career_milestones || '';
        const eraNames = eras.length > 0
            ? [...new Set(eras.map(e => e.era_name))].slice(0, 2).join(' \u2192 ')
            : '';
        const contextHTML = (careerTitles || eraNames) ? `
            <div class="stage-context">
                ${careerTitles ? `<span class="stage-context__career">${careerTitles}</span>` : ''}
                ${eraNames ? `<span class="stage-context__era">${eraNames}</span>` : ''}
            </div>
        ` : '';

        // --- Milestones (limit to 7, pick most significant) ---
        const topMilestones = milestones
            .filter(m => m.vader_compound !== 0)
            .sort((a, b) => Math.abs(b.vader_compound) - Math.abs(a.vader_compound))
            .slice(0, 7);

        if (topMilestones.length < 3) {
            const remaining = milestones
                .filter(m => !topMilestones.includes(m))
                .slice(0, 7 - topMilestones.length);
            topMilestones.push(...remaining);
        }

        const milestonesHTML = topMilestones.slice(0, 7).map(m => `
            <div class="milestone-card">
                <div class="milestone-card__header">
                    <span class="milestone-card__category">${CATEGORY_ICONS[m.category] || CATEGORY_ICONS.other}</span>
                    <span class="milestone-card__year">${m.year}</span>
                </div>
                <p class="milestone-card__text">${m.milestone}</p>
            </div>
        `).join('');

        // --- Turning points with impact data ---
        const turningPointsHTML = turningPoints.map(tp => {
            const impact = findImpact(impactMap, tp.year, tp.event);
            const domainColor = DOMAIN_COLORS[tp.domain] || '#888';
            const shockPct = impact ? Math.min((impact.shock_magnitude / 2.5) * 100, 100) : 0;

            let impactHTML = '';
            if (impact) {
                impactHTML = `
                    <div class="turning-point__impact">
                        <span class="turning-point__domain" style="background: ${domainColor}; color: #fff">${tp.domain}</span>
                        <span class="turning-point__recovery">${impact.recovery_months}mo recovery</span>
                    </div>
                    <div class="turning-point__from-to">${tp.from_state} \u2192 ${tp.to_state}</div>
                    <div class="turning-point__shock-bar" style="--shock-pct: ${shockPct.toFixed(0)}%"></div>
                `;
            } else {
                impactHTML = tp.from_state && tp.to_state ? `
                    <div class="turning-point__impact">
                        <span class="turning-point__domain" style="background: ${domainColor}; color: #fff">${tp.domain}</span>
                    </div>
                    <div class="turning-point__from-to">${tp.from_state} \u2192 ${tp.to_state}</div>
                ` : '';
            }

            return `
                <div class="turning-point turning-point--${tp.type}">
                    <div class="turning-point__header">
                        <span class="turning-point__diamond"></span>
                        <span class="turning-point__event">${tp.year}: ${tp.event}</span>
                    </div>
                    ${impactHTML}
                </div>
            `;
        }).join('');

        // --- People tags ---
        const topPeople = [...people]
            .sort((a, b) => (b.importance_score || 0) - (a.importance_score || 0))
            .slice(0, 8);

        const peopleHTML = topPeople.length > 0 ? `
            <div class="stage-people">
                ${topPeople.map(p => `
                    <span class="stage-person" data-category="${p.category || 'friend'}" title="${p.relation || ''}">${p.name}</span>
                `).join('')}
            </div>
        ` : '';

        // --- Quotes (up to 3 with emotion + context) ---
        const selectedQuotes = selectQuotes(quotes, 3);
        const quotesHTML = selectedQuotes.length > 0 ? `
            <div class="stage-quotes">
                ${selectedQuotes.map(q => {
                    const emotionColor = EMOTION_COLORS[q.emotion] || EMOTION_COLORS.neutral;
                    return `
                        <blockquote class="stage-quote">
                            <p>&ldquo;${q.quote}&rdquo;</p>
                            <footer class="stage-quote__meta">
                                ${q.emotion ? `<span class="stage-quote__emotion" style="background: ${emotionColor}; color: #fff">${q.emotion}</span>` : ''}
                                ${q.context ? `<span class="stage-quote__context">${q.context}</span>` : ''}
                            </footer>
                        </blockquote>
                    `;
                }).join('')}
            </div>
        ` : '';

        // --- Callout ---
        const calloutText = generateCallout(stageInfo, i);
        const calloutHTML = calloutText ? `
            <div class="arc-callout">${calloutText}</div>
        ` : '';

        // --- Assemble stage ---
        section.innerHTML = `
            <div class="stage-content">
                <span class="stage-number">${romanNumerals[i]}</span>
                <h2 class="stage-title">${stageInfo.stage}</h2>
                <p class="stage-years">${stageInfo.year_start}${stageInfo.year_end !== stageInfo.year_start ? '\u2013' + stageInfo.year_end : ''}</p>
                <p class="stage-prose">${stageInfo.description}</p>
                ${statsBarHTML}
                ${contextHTML}
                ${calloutHTML}
                <div class="stage-milestones">${milestonesHTML}</div>
                ${turningPointsHTML ? `<div class="stage-turning-points">${turningPointsHTML}</div>` : ''}
                ${peopleHTML}
                ${quotesHTML}
            </div>
        `;

        main.appendChild(section);
    });
}

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
        const padding = { top: 40, bottom: 40, left: 10, right: 10 };
        const plotH = h - padding.top - padding.bottom;

        ctx.clearRect(0, 0, w, h);

        // Draw sentiment line vertically
        const points = sorted.map((d, idx) => ({
            x: w / 2,
            y: padding.top + (idx / (sorted.length - 1)) * plotH,
            sentiment: d.avg_sentiment,
            year: d.year,
            isTurningPoint: d.is_turning_point,
            turningPointType: d.turning_point_type
        }));

        // Offset x by sentiment (-1 to 1 -> -20 to +20)
        points.forEach(p => {
            p.x = w / 2 + p.sentiment * 20;
        });

        // Draw line
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.6)';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw dots
        points.forEach((p, idx) => {
            if (p.isTurningPoint) {
                ctx.fillStyle = p.turningPointType === 'redemptive' ? '#4a6741' :
                    p.turningPointType === 'contaminated' ? '#8b1a1a' : '#c9a84c';
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-4, -4, 8, 8);
                ctx.restore();
            } else {
                ctx.fillStyle = p.sentiment >= 0 ? 'rgba(74,103,65,0.5)' : 'rgba(139,26,26,0.5)';
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Highlight active position
        if (activeStageIndex !== undefined && activeStageIndex >= 0) {
            const stageYears = [2004, 2007, 2008, 2009, 2012, 2014, 2015, 2018, 2021];
            const targetYear = stageYears[activeStageIndex] || 2004;
            const targetPoint = points.find(p => p.year === targetYear) || points[0];

            ctx.fillStyle = '#c9a84c';
            ctx.beginPath();
            ctx.arc(targetPoint.x, targetPoint.y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(201,168,76,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, targetPoint.y);
            ctx.lineTo(w, targetPoint.y);
            ctx.stroke();
        }
    }

    window.__arcSentimentDraw = draw;
    draw(0);
}

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

function initScrollObserver() {
    const stages = document.querySelectorAll('.arc-stage');
    const dots = document.querySelectorAll('.chapter-dot');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const idx = Array.from(stages).indexOf(entry.target);

                // Update chapter dots
                dots.forEach((d, i) => d.classList.toggle('active', i === idx));

                // Update sentiment line
                if (window.__arcSentimentDraw) {
                    window.__arcSentimentDraw(idx);
                }

                // Animate stats bar
                entry.target.querySelectorAll('.stage-stats-bar').forEach(bar => bar.classList.add('visible'));

                // Animate milestones
                entry.target.querySelectorAll('.milestone-card').forEach((card, cardIdx) => {
                    setTimeout(() => card.classList.add('visible'), cardIdx * 100);
                });

                // Animate people tags
                entry.target.querySelectorAll('.stage-person').forEach((p, pIdx) => {
                    setTimeout(() => p.classList.add('visible'), pIdx * 60);
                });

                // Animate quotes
                entry.target.querySelectorAll('.stage-quote').forEach((q, qIdx) => {
                    setTimeout(() => q.classList.add('visible'), qIdx * 200);
                });
            }
        });
    }, {
        threshold: 0.25
    });

    stages.forEach(stage => observer.observe(stage));
}

// Auto-init
initArc()
    .then(() => initWormholes('arc'))
    .then(() => plantClue('clue1', document.querySelector('.arc-stage:last-child')))
    .catch(() => {
        const el = document.querySelector('.arc-stages');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
