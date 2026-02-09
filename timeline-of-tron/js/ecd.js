// js/ecd.js — East Coast Dodgeball (Redesigned)
// 128 players. 222 events. 21 years. The community page.
// Resilient loading, animated counters, scroll reveals, D3 force bubbles.

import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

const API = 'db/api/';

// ═══════════════════════════════════════
//  RESILIENT DATA LOADING
// ═══════════════════════════════════════

async function loadSafe(filename) {
    try {
        const resp = await fetch(API + filename, { cache: 'no-cache' });
        if (!resp.ok) throw new Error(resp.status);
        return await resp.json();
    } catch (e) {
        console.warn(`[ECD] Could not load ${filename}:`, e.message);
        return null;
    }
}

// ═══════════════════════════════════════
//  SCROLL REVEAL (IntersectionObserver)
// ═══════════════════════════════════════

function initScrollReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => observer.observe(el));
}

// ═══════════════════════════════════════
//  ANIMATED COUNTERS
// ═══════════════════════════════════════

function animateCounters() {
    const els = document.querySelectorAll('[data-count-to]');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseFloat(el.dataset.countTo);
                const prefix = el.dataset.countPrefix || '';
                const suffix = el.dataset.countSuffix || '';
                const duration = 1200;
                const start = performance.now();

                function tick(now) {
                    const elapsed = now - start;
                    const progress = Math.min(elapsed / duration, 1);
                    // Ease-out cubic
                    const eased = 1 - Math.pow(1 - progress, 3);
                    const current = Math.round(target * eased);
                    el.textContent = prefix + current.toLocaleString() + suffix;
                    if (progress < 1) requestAnimationFrame(tick);
                }
                requestAnimationFrame(tick);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    els.forEach(el => observer.observe(el));

    // Immediately check elements already in viewport
    els.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
            observer.unobserve(el);
            // Trigger animation directly
            const target = parseFloat(el.dataset.countTo);
            const prefix = el.dataset.countPrefix || '';
            const suffix = el.dataset.countSuffix || '';
            const duration = 1200;
            const start = performance.now();
            function tick(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(target * eased);
                el.textContent = prefix + current.toLocaleString() + suffix;
                if (progress < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        }
    });
}

// ═══════════════════════════════════════
//  INIT
// ═══════════════════════════════════════

async function initECD() {
    // Load all data files independently (no single-point-of-failure)
    const [
        dashboard, sentiment, attendance,
        network, playersAll, matches, rivalries,
        emotions, highlights, awards, narrative
    ] = await Promise.all([
        loadSafe('ecd_stats_dashboard.json'),
        loadSafe('ecd_sentiment_timeline.json'),
        loadSafe('ecd_attendance_trends.json'),
        loadSafe('ecd_player_network.json'),
        loadSafe('ecd_players_full.json'),
        loadSafe('ecd_match_results.json'),
        loadSafe('ecd_rivalries.json'),
        loadSafe('ecd_emotion_distribution.json'),
        loadSafe('ecd_highlights.json'),
        loadSafe('ecd_awards.json'),
        loadSafe('ecd_community_narrative.json')
    ]);

    // Each section renders independently
    renderHeroStats(dashboard, playersAll, matches);
    renderHeartbeat(sentiment, dashboard?.attendance_trends || attendance);
    renderEraCards(narrative);
    renderPlayerNetwork(network, playersAll, dashboard?.top_players);
    renderLeaderboard(dashboard?.top_players);
    renderRivalries(matches, rivalries);
    renderEmotions(emotions, highlights);
    renderLegacy(awards);

    // Boot scroll reveals & counters
    initScrollReveal();
    animateCounters();
}

// ═══════════════════════════════════════
//  SECTION 1: HERO STATS
// ═══════════════════════════════════════

function renderHeroStats(dashboard, playersAll, matches) {
    const container = document.querySelector('.ecd-hero-stats');
    if (!container) return;

    const d = dashboard || {};
    
    // Calculate post_count from players
    const postCount = (playersAll || []).reduce((sum, p) => sum + (p.post_count || 0), 0) || 527;
    
    // Calculate match_count from matches array
    const matchCount = (matches || []).length || 91;
    
    const stats = [
        { value: d.player_count || 128, label: 'Players' },
        { value: d.event_count || 222, label: 'Events' },
        { value: 21, label: 'Years' },
        { value: postCount, label: 'Posts' },
        { value: matchCount, label: 'Matches' }
    ];

    container.innerHTML = stats.map(s => `
        <div class="ecd-hero-stat">
            <span class="ecd-hero-stat__value" data-count-to="${s.value}" data-count-prefix="${s.prefix || ''}" data-count-suffix="${s.suffix || ''}">0</span>
            <span class="ecd-hero-stat__label">${s.label}</span>
        </div>
    `).join('');
}


// ═══════════════════════════════════════
//  SECTION 2: RISE AND FALL
// ═══════════════════════════════════════

function renderHeartbeat(sentiment, attendance) {
    const canvas = document.getElementById('heartbeatChart');
    if (!canvas || !sentiment?.length) return;

    const years = sentiment.map(s => s.year);
    const attMap = {};
    (attendance || []).forEach(a => { attMap[a.year] = a; });

    const sentimentData = years.map(y => {
        const s = sentiment.find(r => r.year === y);
        return s ? +(s.avg_sentiment * 100).toFixed(1) : null;
    });

    const eventsData = years.map(y => {
        const a = attMap[y];
        return a ? (a.event_count || a.events || 0) : 0;
    });

    // Era background bands
    const eraBands = [
        { start: 2005, end: 2006, color: 'rgba(74, 158, 107, 0.10)', label: 'Founding' },
        { start: 2007, end: 2008, color: 'rgba(232, 93, 58, 0.08)', label: 'Golden Age' },
        { start: 2009, end: 2009, color: 'rgba(139, 74, 107, 0.18)', label: 'Collapse' },
        { start: 2010, end: 2013, color: 'rgba(212, 169, 76, 0.08)', label: 'Revival' },
        { start: 2014, end: 2026, color: 'rgba(106, 141, 170, 0.05)', label: 'Legacy' }
    ];

    // Custom plugins
    const eraBandPlugin = {
        id: 'eraBands',
        beforeDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;
            eraBands.forEach(band => {
                const x1 = scales.x.getPixelForValue(String(band.start));
                const x2 = scales.x.getPixelForValue(String(band.end));
                if (x1 == null || x2 == null) return;
                ctx.save();
                ctx.fillStyle = band.color;
                ctx.fillRect(x1, chartArea.top, x2 - x1, chartArea.bottom - chartArea.top);
                ctx.restore();
            });
        }
    };

    const eraLabelPlugin = {
        id: 'eraLabels',
        afterDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;
            ctx.save();
            ctx.font = '9px "Courier Prime", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(138, 123, 110, 0.5)';
            eraBands.forEach(band => {
                const x1 = scales.x.getPixelForValue(String(band.start));
                const x2 = scales.x.getPixelForValue(String(band.end));
                const xMid = (x1 + x2) / 2;
                ctx.fillText(band.label, xMid, chartArea.top + 14);
            });
            ctx.restore();
        }
    };

    // Key moment annotation
    const annotationPlugin = {
        id: 'keyMoments',
        afterDraw(chart) {
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;
            const moments = [
                { year: 2009, label: 'THE COLLAPSE', color: '#8b4a6b' },
                { year: 2010, label: 'RESURRECTION', color: '#4a9e6b' }
            ];
            ctx.save();
            moments.forEach(m => {
                const x = scales.x.getPixelForValue(String(m.year));
                if (x == null) return;
                // Vertical dashed line
                ctx.beginPath();
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = m.color;
                ctx.lineWidth = 1;
                ctx.moveTo(x, chartArea.top);
                ctx.lineTo(x, chartArea.bottom);
                ctx.stroke();
                // Label
                ctx.setLineDash([]);
                ctx.font = 'bold 8px "Courier Prime", monospace';
                ctx.fillStyle = m.color;
                ctx.textAlign = 'center';
                ctx.fillText(m.label, x, chartArea.bottom + 26);
            });
            ctx.restore();
        }
    };

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: years.map(String),
            datasets: [
                {
                    label: 'Sentiment',
                    data: sentimentData,
                    yAxisID: 'y',
                    borderColor: '#e85d3a',
                    backgroundColor: 'rgba(232, 93, 58, 0.08)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#e85d3a',
                    pointBorderColor: '#110e16',
                    pointBorderWidth: 2,
                    borderWidth: 2.5
                },
                {
                    label: 'Events per year',
                    data: eventsData,
                    yAxisID: 'y1',
                    borderColor: '#6a8daa',
                    backgroundColor: 'rgba(106, 141, 170, 0.06)',
                    fill: false,
                    tension: 0.35,
                    pointRadius: 2,
                    borderWidth: 1.5,
                    borderDash: [5, 3]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: '#8a7b6e', font: { family: 'Courier Prime, monospace', size: 11 }, padding: 20 }
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 14, 22, 0.95)',
                    titleColor: '#e85d3a',
                    bodyColor: '#e0d8cc',
                    borderColor: '#2e2538',
                    borderWidth: 1,
                    titleFont: { family: 'Courier Prime, monospace', weight: 'bold' },
                    bodyFont: { family: 'Georgia, serif', size: 12 },
                    padding: 12,
                    cornerRadius: 3
                }
            },
            scales: {
                x: {
                    ticks: { color: '#8a7b6e', font: { family: 'Courier Prime, monospace', size: 10 }, maxRotation: 45 },
                    grid: { color: 'rgba(46, 37, 56, 0.15)' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Sentiment %', color: '#e85d3a', font: { family: 'Courier Prime, monospace', size: 11 } },
                    ticks: { color: '#e85d3a', font: { family: 'Courier Prime, monospace', size: 10 } },
                    grid: { color: 'rgba(46, 37, 56, 0.12)' },
                    min: 0,
                    max: 100
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Events', color: '#6a8daa', font: { family: 'Courier Prime, monospace', size: 11 } },
                    ticks: { color: '#6a8daa', font: { family: 'Courier Prime, monospace', size: 10 } },
                    grid: { drawOnChartArea: false }
                }
            }
        },
        plugins: [eraBandPlugin, eraLabelPlugin, annotationPlugin]
    });
}

function renderEraCards(narrative) {
    const container = document.querySelector('.era-cards');
    if (!container || !narrative?.length) return;

    const eras = [
        { name: 'The Founding', years: '2005', data: narrative.filter(n => n.year === 2005), colorVar: '--era-founding' },
        { name: 'The Growth', years: '2006', data: narrative.filter(n => n.year === 2006), colorVar: '--era-golden' },
        { name: 'Golden Age', years: '2007\u20132008', data: narrative.filter(n => n.year >= 2007 && n.year <= 2008), colorVar: '--era-golden' },
        { name: 'The Collapse', years: '2009', data: narrative.filter(n => n.year === 2009), isCollapse: true, colorVar: '--era-collapse' },
        { name: 'Resurrection', years: '2010', data: narrative.filter(n => n.year === 2010), isBoom: true, colorVar: '--era-founding' },
        { name: 'Legacy Mode', years: '2011\u20132025', data: narrative.filter(n => n.year >= 2011), colorVar: '--era-legacy' }
    ];

    container.innerHTML = eras.map(era => {
        const combined = era.data.reduce((acc, d) => {
            acc.players = Math.max(acc.players, d.active_players || 0);
            acc.matches += d.matches_count || 0;
            acc.events += d.events_count || 0;
            acc.posts += d.posts_count || 0;
            acc.newPlayers += d.new_players || 0;
            acc.returning += d.returning_players || 0;
            if (d.retention_rate) acc.retention = d.retention_rate;
            return acc;
        }, { players: 0, matches: 0, events: 0, posts: 0, newPlayers: 0, returning: 0, growth: null, retention: null });

        // Calculate era-wide growth from first to last year
        if (era.data.length > 0) {
            const sorted = [...era.data].sort((a, b) => a.year - b.year);
            const firstPlayers = sorted[0].active_players || 0;
            const lastPlayers = sorted[sorted.length - 1].active_players || 0;

            if (sorted.length === 1) {
                // Single year: use that year's growth_rate
                combined.growth = sorted[0].growth_rate || null;
            } else if (firstPlayers > 0) {
                // Multi-year: compute from first to last year's active_players
                combined.growth = ((lastPlayers - firstPlayers) / firstPlayers * 100);
            }
        }

        const growthClass = combined.growth > 0 ? 'era-card__metric--growth' : (combined.growth < 0 ? 'era-card__metric--decline' : '');
        const cardClass = era.isCollapse ? ' era-card--collapse' : (era.isBoom ? ' era-card--boom' : '');

        let desc = '';
        if (era.isCollapse) {
            desc = `Only ${combined.players} players remained. ${combined.posts} posts. The gap year.`;
        } else if (era.isBoom) {
            desc = `${combined.players} players returned. +850% growth. 100% retention. The resurrection.`;
        } else if (era.name === 'Legacy Mode') {
            desc = `The competition faded but the community endured. Anniversary events, retrospectives, and the 2025 ProBowl.`;
        } else {
            desc = `${combined.players} players, ${combined.matches} matches, ${combined.posts} posts.`;
        }

        return `
            <div class="era-card${cardClass}">
                <div class="era-card__header">
                    <span class="era-card__name">${era.name}</span>
                    <span class="era-card__years">${era.years}</span>
                </div>
                <div class="era-card__desc">${desc}</div>
                <div class="era-card__metrics">
                    ${combined.players ? `<span>${combined.players} players</span>` : ''}
                    ${combined.growth !== null ? `<span class="${growthClass}">${combined.growth > 0 ? '+' : ''}${Math.round(combined.growth)}%</span>` : ''}
                    ${combined.retention ? `<span>${Math.round(combined.retention)}% retention</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ═══════════════════════════════════════
//  SECTION 3: THE 128 — PLAYER NETWORK
// ═══════════════════════════════════════

function renderPlayerNetwork(network, playersAll, topPlayers) {
    const container = document.querySelector('.player-network-wrap');
    if (!container || !network?.nodes || !network?.links) return;

    const validNames = new Set((playersAll || []).map(p => p.name));

    // Mentions & era lookups
    const mentionMap = {};
    const eraMap = {};
    (topPlayers || []).forEach(p => { mentionMap[p.name] = p.total_mentions || 0; });
    (playersAll || []).forEach(p => {
        if (!mentionMap[p.name]) mentionMap[p.name] = p.total_mentions || 0;
        eraMap[p.name] = p.era_active || null;
    });

    // Filter valid nodes and links
    const nodes = network.nodes.filter(n => validNames.has(n.name));
    const nodeNames = new Set(nodes.map(n => n.name));

    const links = network.links
        .map(l => ({
            source: typeof l.source === 'object' ? l.source.name : (network.nodes.find(n => n.id === l.source) || {}).name,
            target: typeof l.target === 'object' ? l.target.name : (network.nodes.find(n => n.id === l.target) || {}).name,
            value: l.value || 1
        }))
        .filter(l => l.source && l.target && nodeNames.has(l.source) && nodeNames.has(l.target));

    const width = container.clientWidth || 900;
    const height = 520;

    // Era colors
    const ERA_COLORS = {
        founding: '#4a9e6b',
        golden: '#e85d3a',
        collapse: '#8b4a6b',
        revival: '#d4a94c',
        legacy: '#6a8daa',
        unknown: '#5a4a6a'
    };

    function eraColor(name) {
        const era = eraMap[name] || '';
        if (era.startsWith('2005')) return ERA_COLORS.founding;
        if (era.includes('2006') || era.includes('2007') || era.includes('2008')) return ERA_COLORS.golden;
        if (era.includes('2009') || era.includes('2010')) return ERA_COLORS.revival;
        if (era.includes('2011') || era.includes('201') || era.includes('202')) return ERA_COLORS.legacy;
        return ERA_COLORS.unknown;
    }

    const maxMentions = Math.max(...nodes.map(n => mentionMap[n.name] || 1));
    function nodeRadius(name) {
        const m = mentionMap[name] || 1;
        return 3 + (m / maxMentions) * 22;
    }

    // Render legend
    const legendEl = document.getElementById('networkLegend');
    if (legendEl) {
        legendEl.innerHTML = [
            { label: 'Founding (2005)', color: ERA_COLORS.founding },
            { label: 'Golden Age', color: ERA_COLORS.golden },
            { label: 'Revival', color: ERA_COLORS.revival },
            { label: 'Legacy Era', color: ERA_COLORS.legacy }
        ].map(l => `
            <div class="network-legend__item">
                <span class="network-legend__dot" style="background:${l.color}"></span>
                ${l.label}
            </div>
        `).join('');
    }

    // Build SVG
    const svg = d3.select(container)
        .insert('svg', ':first-child')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    // Glow filter
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'nodeGlow');
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const merge = filter.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.name).distance(55).strength(0.3))
        .force('charge', d3.forceManyBody().strength(-70))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => nodeRadius(d.name) + 2));

    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', 'rgba(46, 37, 56, 0.35)')
        .attr('stroke-width', 0.8);

    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => nodeRadius(d.name))
        .attr('fill', d => eraColor(d.name))
        .attr('stroke', 'rgba(17, 14, 22, 0.6)')
        .attr('stroke-width', 1)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', function () {
            d3.select(this).attr('filter', 'url(#nodeGlow)').attr('opacity', 1);
        })
        .on('mouseout', function () {
            d3.select(this).attr('filter', null).attr('opacity', 0.85);
        })
        .call(d3.drag()
            .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
        );

    // Labels for top nodes
    const labelThreshold = maxMentions * 0.12;
    const label = svg.append('g')
        .selectAll('text')
        .data(nodes.filter(n => (mentionMap[n.name] || 0) > labelThreshold))
        .join('text')
        .text(d => d.name.split(' ').pop())
        .attr('font-size', 10)
        .attr('font-family', 'Courier Prime, monospace')
        .attr('fill', '#e0d8cc')
        .attr('text-anchor', 'middle')
        .attr('dy', d => -(nodeRadius(d.name) + 5))
        .style('pointer-events', 'none')
        .style('text-shadow', '0 0 4px rgba(17,14,22,0.8)');

    // Tooltip
    const tooltip = document.getElementById('networkTooltip');
    const playerLookup = {};
    (playersAll || []).forEach(p => { playerLookup[p.name] = p; });

    node.on('mouseover', (event, d) => {
        const p = playerLookup[d.name] || {};
        const nick = pickBestNickname(p.nicknames, d.name);
        const record = (p.wins || p.losses) ? `${p.wins || 0}-${p.losses || 0}` : '';
        tooltip.innerHTML = `
            <div class="tooltip-name">${d.name}</div>
            ${nick ? `<div class="tooltip-alias">\u201C${nick}\u201D</div>` : ''}
            <div class="tooltip-stats">
                ${record ? `W-L: ${record}<br>` : ''}
                Mentions: ${(mentionMap[d.name] || 0).toLocaleString()}
                ${p.era_active ? `<br>Era: ${p.era_active}` : ''}
            </div>
        `;
        tooltip.classList.add('visible');
    });

    node.on('mousemove', (event) => {
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (event.clientX - rect.left + 14) + 'px';
        tooltip.style.top = (event.clientY - rect.top - 12) + 'px';
    });

    node.on('mouseout', () => { tooltip.classList.remove('visible'); });

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        node
            .attr('cx', d => d.x = Math.max(12, Math.min(width - 12, d.x)))
            .attr('cy', d => d.y = Math.max(12, Math.min(height - 12, d.y)));
        label
            .attr('x', d => d.x)
            .attr('y', d => d.y);
    });
}

function pickBestNickname(raw, realName) {
    if (!raw) return '';
    try {
        const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!Array.isArray(arr)) return '';
        const firstName = realName.split(' ')[0].toLowerCase();
        const lastName = realName.split(' ').pop().toLowerCase();
        const real = arr.filter(n => {
            const lower = n.toLowerCase();
            return lower !== firstName && lower !== lastName && !lower.includes(firstName + ' ') && lower !== realName.toLowerCase();
        });
        const titled = real.filter(n => n.startsWith('the ') || n.startsWith('The '));
        if (titled.length) return titled[0].replace(/^the /i, 'The ');
        return real.length ? real[0] : '';
    } catch {
        return '';
    }
}

// ═══════════════════════════════════════
//  SECTION 3B: LEADERBOARD
// ═══════════════════════════════════════

function renderLeaderboard(players) {
    const container = document.querySelector('.ecd-leaderboard');
    if (!container || !players?.length) return;

    const top = players.slice(0, 20);

    container.innerHTML = `
        <div class="ecd-leaderboard-table">
            <div class="ecd-lb-header">
                <span class="ecd-lb-rank">#</span>
                <span class="ecd-lb-name">Player</span>
                <span class="ecd-lb-nickname">Alias</span>
                <span class="ecd-lb-record">W-L</span>
                <span class="ecd-lb-mentions">Mentions</span>
                <span class="ecd-lb-era">Era</span>
            </div>
            ${top.map((p, i) => {
                const bestNick = pickBestNickname(p.nicknames, p.name);
                const w = p.wins || 0;
                const l = p.losses || 0;
                const total = w + l;
                const record = total ? `${w}-${l}` : '\u2014';
                const winPct = total ? ((w / total) * 100) : 0;
                const lossPct = total ? ((l / total) * 100) : 0;

                const medal = i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : '';

                return `
                    <div class="ecd-lb-row${i < 3 ? ' ecd-lb-row--top3' : ''}">
                        <span class="ecd-lb-rank">${medal || (i + 1)}</span>
                        <span class="ecd-lb-name">${p.name}</span>
                        <span class="ecd-lb-nickname">${bestNick ? '\u201C' + bestNick + '\u201D' : ''}</span>
                        <span class="ecd-lb-record">
                            ${record}
                            ${total ? `<div class="ecd-lb-record-bar"><div class="ecd-lb-record-bar__win" style="width:${winPct}%"></div><div class="ecd-lb-record-bar__loss" style="width:${lossPct}%"></div></div>` : ''}
                        </span>
                        <span class="ecd-lb-mentions">${p.total_mentions.toLocaleString()}</span>
                        <span class="ecd-lb-era">${p.era_active || '\u2014'}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ═══════════════════════════════════════
//  SECTION 4: RIVALRIES
// ═══════════════════════════════════════

function renderRivalries(matches, rivalriesData) {
    const container = document.querySelector('.rivalry-grid');
    if (!container || !matches?.length) return;

    // Context snippets from rivalries
    const snippetMap = {};
    (rivalriesData || []).forEach(r => {
        if (r.context_snippets) {
            let snippets = r.context_snippets;
            try { if (typeof snippets === 'string') snippets = JSON.parse(snippets); } catch {}
            if (Array.isArray(snippets) && snippets.length) {
                const key = [r.player1, r.player2].sort().join('|');
                snippetMap[key] = snippets[0];
            }
        }
    });

    // Build head-to-head records
    const h2h = {};
    matches.forEach(m => {
        const pair = [m.winner, m.loser].sort();
        const key = pair.join(' | ');
        if (!h2h[key]) {
            h2h[key] = { p1: pair[0], p2: pair[1], records: {}, total: 0, years: new Set(), scores: [] };
            h2h[key].records[pair[0]] = 0;
            h2h[key].records[pair[1]] = 0;
        }
        h2h[key].records[m.winner]++;
        h2h[key].total++;
        if (m.year) h2h[key].years.add(m.year);
        if (m.score) h2h[key].scores.push(m.score);
    });

    const multi = Object.values(h2h)
        .filter(r => r.total >= 2)
        .sort((a, b) => b.total - a.total);

    const singles = Object.values(h2h)
        .filter(r => r.total === 1 && r.scores.length)
        .sort((a, b) => {
            const aScore = a.scores[0].split('-').reduce((s, n) => s + (parseInt(n) || 0), 0);
            const bScore = b.scores[0].split('-').reduce((s, n) => s + (parseInt(n) || 0), 0);
            return bScore - aScore;
        });

    const all = [...multi.slice(0, 12), ...singles.slice(0, 6)];

    container.innerHTML = all.map(r => {
        const years = [...r.years].sort();
        const yearStr = years.length === 1 ? String(years[0]) : `${years[0]}\u2013${years[years.length - 1]}`;
        const p1w = r.records[r.p1];
        const p2w = r.records[r.p2];
        const total = p1w + p2w;
        const p1pct = total ? (p1w / total * 100) : 50;
        const p2pct = total ? (p2w / total * 100) : 50;

        const snippetKey = [r.p1, r.p2].sort().join('|');
        const snippet = snippetMap[snippetKey] || '';
        // Clean snippet
        const cleanSnippet = snippet.replace(/^["'\u201C\u201D]+|["'\u201C\u201D]+$/g, '').slice(0, 200);

        return `
            <div class="rivalry-card">
                <div class="rivalry-card__matchup">
                    <span class="${p1w >= p2w ? 'rivalry-winner' : ''}">${r.p1}</span>
                    <span class="rivalry-vs">${r.total > 1 ? 'VS' : 'DEF.'}</span>
                    <span class="${p2w > p1w ? 'rivalry-winner' : ''}">${r.p2}</span>
                </div>
                <div class="rivalry-card__bar">
                    <div class="rivalry-bar__p1" style="width:${p1pct}%"></div>
                    <div class="rivalry-bar__p2" style="width:${p2pct}%"></div>
                </div>
                <div class="rivalry-card__record">
                    <span class="rivalry-record-value">${p1w}-${p2w}</span>
                    ${r.total > 1 ? `<span class="rivalry-detail">${r.total} matches</span>` : ''}
                    ${r.scores.length === 1 ? `<span class="rivalry-detail">${r.scores[0]}</span>` : ''}
                    <span class="rivalry-detail">${yearStr}</span>
                </div>
                ${cleanSnippet ? `<div class="rivalry-card__snippet">${cleanSnippet}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ═══════════════════════════════════════
//  SECTION 5: EMOTIONAL ARCHIVE
// ═══════════════════════════════════════

function renderEmotions(emotions, highlights) {
    if (!emotions?.length) return;

    // Hero insight
    const bittersweet = emotions.find(e => {
        const parsed = typeof e.emotion === 'string' ? e.emotion : JSON.stringify(e.emotion);
        return parsed.includes('sadness') && parsed.includes('joy') && parsed.includes('nostalgia') && !parsed.includes('pride') && !parsed.includes('tension');
    });

    const insightEl = document.querySelector('.emotion-insight');
    if (insightEl && bittersweet) {
        insightEl.innerHTML = `
            <span class="emotion-insight__number">${(bittersweet.avg_sentiment * 100).toFixed(0)}%</span>
            <span class="emotion-insight__label">Positivity score for posts tagged sadness + joy + nostalgia</span>
            <span class="emotion-insight__sub">The most positive posts aren't victories. They're bittersweet reflections on what was built.</span>
        `;
    }

    // D3 Force-directed emotion bubbles
    renderEmotionBubbles(emotions);

    // Greatest Hits
    renderHighlights(highlights);
}

function renderEmotionBubbles(emotions) {
    const container = document.getElementById('emotionBubbles');
    if (!container) return;

    // Filter meaningful emotions
    const filtered = emotions.filter(e => {
        const parsed = typeof e.emotion === 'string' ? e.emotion : JSON.stringify(e.emotion);
        return e.count >= 4 && parsed !== '[]';
    }).slice(0, 20);

    if (!filtered.length) return;

    const width = container.clientWidth || 700;
    const height = 340;

    // Scale radius by count
    const maxCount = Math.max(...filtered.map(e => e.count));
    function radius(count) { return 22 + (count / maxCount) * 45; }

    function sentColor(s) {
        if (s >= 0.7) return '#4a9e6b';
        if (s >= 0.5) return '#6a8daa';
        if (s >= 0.35) return '#d4a94c';
        return '#8b4a6b';
    }

    function labelText(e) {
        try {
            const arr = JSON.parse(e.emotion);
            return arr.join(' + ');
        } catch {
            return String(e.emotion);
        }
    }

    const bubbleData = filtered.map(e => ({
        ...e,
        r: radius(e.count),
        color: sentColor(e.avg_sentiment),
        label: labelText(e)
    }));

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    // Tooltip group
    const tooltipG = svg.append('g').style('pointer-events', 'none');

    const simulation = d3.forceSimulation(bubbleData)
        .force('charge', d3.forceManyBody().strength(5))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.r + 3).strength(0.8));

    const groups = svg.selectAll('g.bubble')
        .data(bubbleData)
        .join('g')
        .attr('class', 'emotion-bubble-node');

    groups.append('circle')
        .attr('r', d => d.r)
        .attr('fill', d => d.color)
        .attr('opacity', 0.75)
        .attr('stroke', d => d.color)
        .attr('stroke-opacity', 0.3)
        .attr('stroke-width', 2);

    // Count text
    groups.append('text')
        .text(d => d.count)
        .attr('text-anchor', 'middle')
        .attr('dy', d => d.r > 35 ? '-0.2em' : '0.35em')
        .attr('fill', '#fff')
        .attr('font-family', 'Courier Prime, monospace')
        .attr('font-weight', '700')
        .attr('font-size', d => Math.max(11, d.r * 0.4));

    // Label text (only on large bubbles)
    groups.filter(d => d.r > 35)
        .append('text')
        .text(d => {
            const l = d.label;
            return l.length > 18 ? l.slice(0, 16) + '\u2026' : l;
        })
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .attr('fill', 'rgba(255,255,255,0.7)')
        .attr('font-family', 'Courier Prime, monospace')
        .attr('font-size', 8);

    // Tooltip on hover
    groups.on('mouseover', function (event, d) {
        d3.select(this).select('circle').attr('opacity', 1);
        const sentPct = (d.avg_sentiment * 100).toFixed(0);
        tooltipG.selectAll('*').remove();
        const bg = tooltipG.append('rect')
            .attr('fill', 'rgba(17,14,22,0.92)')
            .attr('stroke', '#2e2538')
            .attr('rx', 3);
        const txt = tooltipG.append('text')
            .attr('fill', '#e0d8cc')
            .attr('font-family', 'Courier Prime, monospace')
            .attr('font-size', 11);
        txt.append('tspan').attr('x', 0).attr('dy', 0).attr('font-weight', 'bold').attr('fill', '#e85d3a').text(d.label);
        txt.append('tspan').attr('x', 0).attr('dy', '1.4em').text(`${d.count} posts \u00B7 ${sentPct}% positive`);
        const bbox = txt.node().getBBox();
        bg.attr('x', bbox.x - 8).attr('y', bbox.y - 6).attr('width', bbox.width + 16).attr('height', bbox.height + 12);
        tooltipG.attr('transform', `translate(${d.x + d.r + 10}, ${d.y - 10})`).attr('opacity', 1);
    });

    groups.on('mouseout', function () {
        d3.select(this).select('circle').attr('opacity', 0.75);
        tooltipG.attr('opacity', 0);
    });

    simulation.on('tick', () => {
        groups.attr('transform', d => {
            d.x = Math.max(d.r, Math.min(width - d.r, d.x));
            d.y = Math.max(d.r, Math.min(height - d.r, d.y));
            return `translate(${d.x},${d.y})`;
        });
    });
}

function renderHighlights(highlights) {
    const hlEl = document.querySelector('.highlights-list');
    if (!hlEl || !highlights?.length) return;

    const sorted = [...highlights].sort((a, b) => (b.year || 0) - (a.year || 0));

    const sentimentDot = (label) => {
        const color = label === 'positive' ? '#4a9e6b' : label === 'negative' ? '#8b4a6b' : '#d4a94c';
        return `<span class="highlight-card__sentiment" style="background:${color}" title="${label}"></span>`;
    };

    hlEl.innerHTML = sorted.slice(0, 24).map(h => `
        <div class="highlight-card">
            <span class="highlight-card__year">${h.year || ''}</span>
            <div class="highlight-card__content">
                <div class="highlight-card__title">${h.title}</div>
                <div class="highlight-card__meta">
                    ${h.era || ''} ${h.post_type ? '/ ' + h.post_type.replace(/_/g, ' ') : ''}
                    
                </div>
            </div>
        </div>
    `).join('');
}

// ═══════════════════════════════════════
//  SECTION 6: LEGACY
// ═══════════════════════════════════════

function renderLegacy(awards) {
    const container = document.querySelector('.legacy-grid');
    if (!container) return;

    // Deduplicate
    const seen = new Set();
    const uniqueAwards = (awards || []).filter(a => {
        const key = (a.award_type + '|' + a.recipient).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Group awards
    const groups = [
        { title: 'Hall of Fame', items: uniqueAwards.filter(a => a.award_type === 'Hall of Fame'), isHof: true },
        { title: 'ECD Elite', items: uniqueAwards.filter(a => a.award_type === 'ECD Elite Inductee') },
        { title: 'Rimshot Champions', items: uniqueAwards.filter(a => a.award_type === 'Rimshot Champion' || a.award_type === 'Rimshot Contest Champion') },
        { title: 'Hit The Human', items: uniqueAwards.filter(a => a.award_type === 'Hit The Human Champion') },
        { title: 'Special Awards', items: uniqueAwards.filter(a => a.award_type && a.award_type.includes('Events Award')) },
        { title: 'In Remembrance', items: uniqueAwards.filter(a => a.award_type === 'In Remembrance'), isRemembrance: true }
    ].filter(g => g.items.length > 0);

    function awardItem(a, isHof, isRemembrance) {
        const yearStr = a.year || (a.date ? a.date.split('-')[0] : '');
        const classes = [
            'legacy-item',
            isHof ? 'legacy-item--hof' : '',
            isRemembrance ? 'legacy-item--remembrance' : ''
        ].filter(Boolean).join(' ');

        return `
            <div class="${classes}">
                <div class="legacy-item__name">${a.recipient}</div>
                <div class="legacy-item__type">${a.award_type}${yearStr ? ' · ' + yearStr : ''}</div>
                ${a.context && !a.context.startsWith('From sidebar') ? `<div class="legacy-item__context">${a.context.slice(0, 120)}</div>` : ''}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="legacy-panel">
            <h3>Hall of Fame & Awards</h3>
            ${groups.map(g => `
                <div class="legacy-award-group">
                    <div class="legacy-award-group__title">${g.title}</div>
                    ${g.items.map(a => awardItem(a, g.isHof, g.isRemembrance)).join('')}
                </div>
            `).join('')}
        </div>
    `;
}

// ═══ BOOT ═══
initECD();
