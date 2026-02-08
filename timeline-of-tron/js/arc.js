// js/arc.js — Room 1: The Arc (Hero's Journey + Emotional Timeline)
// Scroll-driven narrative through 9 hero's journey stages

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';

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

export async function initArc() {
    const data = await loadMultiple([
        'heros_journey_narrative.json',
        'sentiment_timeline.json',
        'turning_points.json'
    ]);

    const stages = data.heros_journey_narrative;
    const sentiment = data.sentiment_timeline;

    renderStages(stages);
    initSentimentLine(sentiment);
    initChapterNav(stages);
    initScrollObserver();
}

function renderStages(stages) {
    const main = document.querySelector('.arc-stages');
    if (!main) return;

    stages.forEach((stage, i) => {
        const slug = STAGE_SLUGS[i] || stage.stage.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const section = document.createElement('section');
        section.className = 'arc-stage';
        section.dataset.stage = slug;
        section.id = `stage-${i + 1}`;

        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

        // Build milestones HTML (limit to 5 most significant)
        const topMilestones = stage.milestones
            .filter(m => m.sentiment !== 0)
            .sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment))
            .slice(0, 5);

        // If fewer than 3 with sentiment, pad with first milestones
        if (topMilestones.length < 3) {
            const remaining = stage.milestones
                .filter(m => !topMilestones.includes(m))
                .slice(0, 5 - topMilestones.length);
            topMilestones.push(...remaining);
        }

        const milestonesHTML = topMilestones.map(m => `
            <div class="milestone-card">
                <span class="milestone-card__year">${m.year}</span>
                <p class="milestone-card__text">${m.milestone}</p>
            </div>
        `).join('');

        // Build turning points HTML
        const turningPointsHTML = stage.turning_points.map(tp => `
            <div class="turning-point turning-point--${tp.type}">
                <span class="turning-point__diamond"></span>
                <span>${tp.year}: ${tp.event}</span>
            </div>
        `).join('');

        // Pick best quote
        const bestQuote = stage.quotes[0];
        const quoteHTML = bestQuote ? `
            <blockquote class="stage-quote">
                &ldquo;${bestQuote.quote}&rdquo;
            </blockquote>
        ` : '';

        // People
        const peopleHTML = stage.people_active.slice(0, 8).map(p =>
            `<span class="stage-person">${p}</span>`
        ).join('');

        // Special callout for stage 4 (Tests, Allies — 2009-2011)
        let calloutHTML = '';
        if (i === 3) {
            calloutHTML = `
                <div class="arc-callout">
                    2009 wasn't the happiest year. It was the most alive. Sentiment score: 0.076. But emotional range: &minus;0.751 to +0.91.
                    The greatest years aren't the calmest.
                </div>
            `;
        }

        section.innerHTML = `
            <div class="stage-content">
                <span class="stage-number">${romanNumerals[i]}</span>
                <h2 class="stage-title">${stage.stage}</h2>
                <p class="stage-years">${stage.year_start}${stage.year_end !== stage.year_start ? '–' + stage.year_end : ''}</p>
                <p class="stage-prose">${stage.description}</p>
                ${calloutHTML}
                <div class="stage-milestones">${milestonesHTML}</div>
                ${turningPointsHTML ? `<div class="stage-turning-points">${turningPointsHTML}</div>` : ''}
                ${quoteHTML}
                <div class="stage-people">${peopleHTML}</div>
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

        // Offset x by sentiment (-1 to 1 → -20 to +20)
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
                // Diamond for turning points
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

    // Store draw function for observer to call
    window.__arcSentimentDraw = draw;
    draw(0);
}

function initChapterNav(stages) {
    const nav = document.querySelector('.arc-chapter-nav');
    if (!nav) return;

    stages.forEach((stage, i) => {
        const dot = document.createElement('button');
        dot.className = 'chapter-dot';
        dot.title = stage.stage;
        dot.setAttribute('aria-label', `Jump to ${stage.stage}`);
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

                // Animate milestones
                entry.target.querySelectorAll('.milestone-card').forEach((card, cardIdx) => {
                    setTimeout(() => card.classList.add('visible'), cardIdx * 100);
                });

                // Animate quotes
                entry.target.querySelectorAll('.stage-quote').forEach(q => {
                    q.classList.add('visible');
                });
            }
        });
    }, {
        threshold: 0.35
    });

    stages.forEach(stage => observer.observe(stage));
}

// Auto-init
initArc().then(() => initWormholes('arc'));
