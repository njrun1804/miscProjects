// js/ecd.js — East Coast Dodgeball
// 128 players. 168 events. 20 years. The community page.

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

async function initECD() {
    const data = await loadMultiple([
        'ecd_stats_dashboard.json',
        'ecd_sentiment_timeline.json',
        'ecd_attendance_trends.json',
        'ecd_community_narrative.json',
        'ecd_player_network.json',
        'ecd_players_full.json',
        'ecd_match_results.json',
        'ecd_rivalries.json',
        'ecd_emotion_distribution.json',
        'ecd_highlights.json',
        'ecd_awards_full.json',
        'ecd_fundraisers.json'
    ]);

    const dashboard = data.ecd_stats_dashboard || {};
    renderHeroStats(dashboard);
    renderHeartbeat(
        data.ecd_sentiment_timeline || [],
        (dashboard.attendance_trends || data.ecd_attendance_trends || []),
        data.ecd_community_narrative || []
    );
    renderPlayerNetwork(data.ecd_player_network || {}, data.ecd_players_full || [], dashboard.top_players || []);
    renderLeaderboard(dashboard.top_players || []);
    renderRivalries(data.ecd_match_results || [], data.ecd_rivalries || []);
    renderEmotions(data.ecd_emotion_distribution || [], data.ecd_highlights || []);
    renderLegacy(data.ecd_awards_full || [], data.ecd_fundraisers || []);
}

// ─── Section 1: Hero Stats ───

function renderHeroStats(dashboard) {
    const container = document.querySelector('.ecd-hero-stats');
    if (!container) return;

    const stats = [
        { value: dashboard.player_count || 128, label: 'Players' },
        { value: dashboard.event_count || 168, label: 'Events' },
        { value: '20', label: 'Years' },
        { value: '553', label: 'Posts' },
        { value: '350+', label: 'Matches' },
        { value: '$' + ((dashboard.fundraiser_total || 1847).toLocaleString()), label: 'Raised' }
    ];

    container.innerHTML = stats.map(s => `
        <div class="ecd-hero-stat">
            <span class="ecd-hero-stat__value">${s.value}</span>
            <span class="ecd-hero-stat__label">${s.label}</span>
        </div>
    `).join('');
}

// ─── Section 2: Rise and Fall (Heartbeat) ───

function renderHeartbeat(sentiment, attendance, narrative) {
    const canvas = document.getElementById('heartbeatChart');
    if (!canvas || !sentiment.length) return;

    // Build aligned data
    const years = sentiment.map(s => s.year);

    // Attendance keyed by year for lookup
    const attMap = {};
    attendance.forEach(a => { attMap[a.year] = a; });

    const sentimentData = years.map(y => {
        const s = sentiment.find(r => r.year === y);
        return s ? +(s.avg_sentiment * 100).toFixed(1) : null;
    });

    const eventsData = years.map(y => {
        const a = attMap[y];
        return a ? a.event_count : 0;
    });

    // Era background bands
    const eraBands = [
        { start: 2005, end: 2006, color: 'rgba(74, 158, 107, 0.08)', label: 'Founding' },
        { start: 2007, end: 2008, color: 'rgba(232, 93, 58, 0.08)', label: 'Golden Age' },
        { start: 2009, end: 2009, color: 'rgba(90, 74, 106, 0.15)', label: 'Collapse' },
        { start: 2010, end: 2013, color: 'rgba(240, 160, 48, 0.08)', label: 'Revival' },
        { start: 2014, end: 2025, color: 'rgba(122, 154, 186, 0.05)', label: 'Legacy' }
    ];

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
                    backgroundColor: 'rgba(232, 93, 58, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#e85d3a',
                    borderWidth: 2
                },
                {
                    label: 'Events',
                    data: eventsData,
                    yAxisID: 'y1',
                    borderColor: '#7a9aba',
                    backgroundColor: 'rgba(122, 154, 186, 0.1)',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 2,
                    borderWidth: 1.5,
                    borderDash: [4, 2]
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: { color: '#9a8a7a', font: { family: 'Courier Prime, monospace', size: 11 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(26, 21, 32, 0.95)',
                    titleColor: '#e85d3a',
                    bodyColor: '#e0d8cc',
                    titleFont: { family: 'Courier Prime, monospace' },
                    bodyFont: { family: 'Georgia, serif', size: 12 }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#9a8a7a', font: { family: 'Courier Prime, monospace', size: 10 }, maxRotation: 45 },
                    grid: { color: 'rgba(61, 47, 74, 0.2)' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Sentiment %', color: '#e85d3a', font: { family: 'Courier Prime, monospace', size: 11 } },
                    ticks: { color: '#e85d3a', font: { family: 'Courier Prime, monospace', size: 10 } },
                    grid: { color: 'rgba(61, 47, 74, 0.15)' },
                    min: 0,
                    max: 100
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Events', color: '#7a9aba', font: { family: 'Courier Prime, monospace', size: 11 } },
                    ticks: { color: '#7a9aba', font: { family: 'Courier Prime, monospace', size: 10 } },
                    grid: { drawOnChartArea: false }
                }
            }
        },
        plugins: [eraBandPlugin]
    });

    // Era narrative cards
    renderEraCards(narrative);
}

function renderEraCards(narrative) {
    const container = document.querySelector('.era-cards');
    if (!container || !narrative.length) return;

    // Group into meaningful eras (skip quiet years)
    const eras = [
        { name: 'The Founding', years: '2005', data: narrative.filter(n => n.year === 2005) },
        { name: 'The Growth', years: '2006', data: narrative.filter(n => n.year === 2006) },
        { name: 'The Golden Age', years: '2007–2008', data: narrative.filter(n => n.year >= 2007 && n.year <= 2008) },
        { name: 'The Collapse', years: '2009', data: narrative.filter(n => n.year === 2009), isCollapse: true },
        { name: 'The Resurrection', years: '2010', data: narrative.filter(n => n.year === 2010), isBoom: true },
        { name: 'Legacy Mode', years: '2011–2025', data: narrative.filter(n => n.year >= 2011) }
    ];

    container.innerHTML = eras.map(era => {
        const combined = era.data.reduce((acc, d) => {
            acc.players = Math.max(acc.players, d.active_players || 0);
            acc.matches += d.matches_count || 0;
            acc.events += d.events_count || 0;
            acc.posts += d.posts_count || 0;
            acc.newPlayers += d.new_players || 0;
            acc.returning += d.returning_players || 0;
            if (d.growth_rate && d.growth_rate !== 0) acc.growth = d.growth_rate;
            if (d.retention_rate) acc.retention = d.retention_rate;
            return acc;
        }, { players: 0, matches: 0, events: 0, posts: 0, newPlayers: 0, returning: 0, growth: null, retention: null });

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
    }).join('<div class="era-arrow">\u2192</div>');
}

// ─── Section 3: The 128 (Player Network) ───

function renderPlayerNetwork(network, playersAll, topPlayers) {
    const container = document.querySelector('.player-network-wrap');
    if (!container || !network.nodes || !network.links) return;

    // Build valid player name set from the full roster
    const validNames = new Set(playersAll.map(p => p.name));

    // Build mentions lookup from top players + full roster
    const mentionMap = {};
    topPlayers.forEach(p => { mentionMap[p.name] = p.total_mentions || 0; });
    playersAll.forEach(p => { if (!mentionMap[p.name]) mentionMap[p.name] = p.total_mentions || 0; });

    // Build era lookup
    const eraMap = {};
    playersAll.forEach(p => { eraMap[p.name] = p.era_active || null; });

    // Filter to valid player nodes
    const nodes = network.nodes.filter(n => validNames.has(n.name));
    const nodeNames = new Set(nodes.map(n => n.name));

    // Filter links to valid pairs
    const links = network.links
        .map(l => ({
            source: typeof l.source === 'object' ? l.source.name : (network.nodes.find(n => n.id === l.source) || {}).name,
            target: typeof l.target === 'object' ? l.target.name : (network.nodes.find(n => n.id === l.target) || {}).name,
            value: l.value || 1
        }))
        .filter(l => l.source && l.target && nodeNames.has(l.source) && nodeNames.has(l.target));

    const width = container.clientWidth || 900;
    const height = 500;

    // Color by era
    function eraColor(name) {
        const era = eraMap[name] || '';
        if (era.startsWith('2005')) return '#4a9e6b';
        if (era.includes('2006') || era.includes('2007') || era.includes('2008')) return '#e85d3a';
        if (era.includes('2009') || era.includes('2010')) return '#f0a030';
        if (era.includes('2011') || era.includes('2012') || era.includes('201')) return '#7a9aba';
        return '#9a8a7a';
    }

    // Node size by mentions (scaled)
    const maxMentions = Math.max(...nodes.map(n => mentionMap[n.name] || 1));
    function nodeRadius(name) {
        const mentions = mentionMap[name] || 1;
        return 4 + (mentions / maxMentions) * 20;
    }

    const svg = d3.select(container)
        .insert('svg', ':first-child')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.name).distance(60))
        .force('charge', d3.forceManyBody().strength(-80))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => nodeRadius(d.name) + 2));

    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', 'rgba(61, 47, 74, 0.4)')
        .attr('stroke-width', 1);

    const node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => nodeRadius(d.name))
        .attr('fill', d => eraColor(d.name))
        .attr('stroke', 'rgba(26, 21, 32, 0.8)')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .call(d3.drag()
            .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
            .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
            .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
        );

    // Labels for top nodes
    const labelThreshold = maxMentions * 0.15;
    const label = svg.append('g')
        .selectAll('text')
        .data(nodes.filter(n => (mentionMap[n.name] || 0) > labelThreshold))
        .join('text')
        .text(d => d.name.split(' ').pop())
        .attr('font-size', 10)
        .attr('font-family', 'Courier Prime, monospace')
        .attr('fill', '#e0d8cc')
        .attr('text-anchor', 'middle')
        .attr('dy', d => -(nodeRadius(d.name) + 4))
        .style('pointer-events', 'none');

    // Tooltip
    const tooltip = document.getElementById('networkTooltip');
    const playerLookup = {};
    playersAll.forEach(p => { playerLookup[p.name] = p; });

    node.on('mouseover', (event, d) => {
        const p = playerLookup[d.name] || {};
        const nick = pickBestNickname(p.nicknames, d.name);
        const record = (p.wins || p.losses) ? `${p.wins || 0}-${p.losses || 0}` : '';
        tooltip.innerHTML = `
            <div class="tooltip-name">${d.name}</div>
            ${nick ? `<div class="tooltip-alias">"${nick}"</div>` : ''}
            <div class="tooltip-stats">
                ${record ? `W-L: ${record}<br>` : ''}
                Mentions: ${(mentionMap[d.name] || 0).toLocaleString()}<br>
                ${p.era_active ? `Era: ${p.era_active}` : ''}
            </div>
        `;
        tooltip.classList.add('visible');
    });

    node.on('mousemove', (event) => {
        const rect = container.getBoundingClientRect();
        tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
        tooltip.style.top = (event.clientY - rect.top - 10) + 'px';
    });

    node.on('mouseout', () => { tooltip.classList.remove('visible'); });

    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        node
            .attr('cx', d => d.x = Math.max(10, Math.min(width - 10, d.x)))
            .attr('cy', d => d.y = Math.max(10, Math.min(height - 10, d.y)));
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

// ─── Section 3b: Leaderboard ───

function renderLeaderboard(players) {
    const container = document.querySelector('.ecd-leaderboard');
    if (!container || !players.length) return;

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
                const record = (p.wins || p.losses) ? `${p.wins || 0}-${p.losses || 0}` : '\u2014';
                return `
                    <div class="ecd-lb-row${i < 3 ? ' ecd-lb-row--top3' : ''}">
                        <span class="ecd-lb-rank">${i + 1}</span>
                        <span class="ecd-lb-name">${p.name}</span>
                        <span class="ecd-lb-nickname">${bestNick ? '\u201C' + bestNick + '\u201D' : ''}</span>
                        <span class="ecd-lb-record">${record}</span>
                        <span class="ecd-lb-mentions">${p.total_mentions.toLocaleString()}</span>
                        <span class="ecd-lb-era">${p.era_active || '\u2014'}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ─── Section 4: Rivalries ───

function renderRivalries(matches, rivalriesData) {
    const container = document.querySelector('.rivalry-grid');
    if (!container || !matches.length) return;

    // Build context snippet lookup from rivalries data
    const snippetMap = {};
    rivalriesData.forEach(r => {
        if (r.context_snippets && r.context_snippets.length) {
            const key = [r.player1, r.player2].sort().join('|');
            snippetMap[key] = r.context_snippets[0];
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

    // Multi-match rivalries first, then notable singles
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

        // Look up context snippet
        const snippetKey = [r.p1, r.p2].sort().join('|');
        const snippet = snippetMap[snippetKey] || '';

        return `
            <div class="rivalry-card">
                <div class="rivalry-card__matchup">
                    <span class="${p1w >= p2w ? 'rivalry-winner' : ''}">${r.p1}</span>
                    <span class="rivalry-vs">${r.total > 1 ? 'vs' : 'def.'}</span>
                    <span class="${p2w > p1w ? 'rivalry-winner' : ''}">${r.p2}</span>
                </div>
                <div class="rivalry-card__record">
                    <span class="rivalry-record-value">${p1w}-${p2w}</span>
                    ${r.total > 1 ? `<span class="rivalry-detail">${r.total} matches</span>` : ''}
                    ${r.scores.length === 1 ? `<span class="rivalry-detail">${r.scores[0]}</span>` : ''}
                    <span class="rivalry-detail">${yearStr}</span>
                </div>
                ${snippet ? `<div class="rivalry-card__snippet">${snippet}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ─── Section 5: Emotional Archive ───

function renderEmotions(emotions, highlights) {
    if (!emotions.length) return;

    // Hero insight: find the bittersweet combo
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

    // Emotion bubbles
    const bubblesEl = document.querySelector('.emotion-bubbles');
    if (bubblesEl) {
        // Filter to entries with at least 5 posts and actual emotions
        const filtered = emotions.filter(e => {
            const parsed = typeof e.emotion === 'string' ? e.emotion : JSON.stringify(e.emotion);
            return e.count >= 5 && parsed !== '[]';
        }).slice(0, 15);

        // Color by avg sentiment
        function sentColor(s) {
            if (s >= 0.7) return '#4a9e6b';
            if (s >= 0.5) return '#7a9aba';
            if (s >= 0.3) return '#c9a84c';
            return '#bf6a6a';
        }

        bubblesEl.innerHTML = filtered.map(e => {
            let label;
            try {
                const arr = JSON.parse(e.emotion);
                label = arr.join(' + ');
            } catch {
                label = String(e.emotion);
            }
            const size = 50 + (e.count / 55) * 60;
            return `
                <div class="emotion-bubble" style="width:${size}px; height:${size}px; background:${sentColor(e.avg_sentiment)};" title="${label}: ${e.count} posts, ${(e.avg_sentiment * 100).toFixed(0)}% positive">
                    <span class="emotion-bubble__count">${e.count}</span>
                    <span class="emotion-bubble__label">${label}</span>
                </div>
            `;
        }).join('');
    }

    // Greatest Hits
    const hlEl = document.querySelector('.highlights-list');
    if (hlEl && highlights.length) {
        const sorted = [...highlights].sort((a, b) => (b.year || 0) - (a.year || 0));
        hlEl.innerHTML = sorted.slice(0, 24).map(h => `
            <div class="highlight-card">
                <span class="highlight-card__year">${h.year || ''}</span>
                <div class="highlight-card__content">
                    <div class="highlight-card__title">${h.title}</div>
                    <div class="highlight-card__meta">${h.era || ''} ${h.post_type ? '/ ' + h.post_type.replace(/_/g, ' ') : ''}</div>
                </div>
            </div>
        `).join('');
    }
}

// ─── Section 6: Legacy ───

function renderLegacy(awards, fundraisers) {
    const container = document.querySelector('.legacy-grid');
    if (!container) return;

    // Deduplicate awards (some appear twice with different casing)
    const seen = new Set();
    const uniqueAwards = awards.filter(a => {
        const key = (a.award_type + '|' + a.recipient).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Group awards by type
    const hof = uniqueAwards.filter(a => a.award_type === 'Hall of Fame');
    const elite = uniqueAwards.filter(a => a.award_type === 'ECD Elite Inductee');
    const rimshot = uniqueAwards.filter(a => a.award_type === 'Rimshot Champion' || a.award_type === 'Rimshot Contest Champion');
    const hitHuman = uniqueAwards.filter(a => a.award_type === 'Hit The Human Champion');
    const special = uniqueAwards.filter(a => a.award_type === '200 Events Award');
    const remembrance = uniqueAwards.filter(a => a.award_type === 'In Remembrance');

    function awardItem(a) {
        const yearStr = a.year || (a.date ? a.date.split('-')[0] : '');
        return `
            <div class="legacy-item${a.award_type === 'In Remembrance' ? ' legacy-item--remembrance' : ''}">
                <div class="legacy-item__name">${a.recipient}</div>
                <div class="legacy-item__type">${a.award_type}${yearStr ? ' \u00B7 ' + yearStr : ''}</div>
                ${a.context && !a.context.startsWith('From sidebar') ? `<div class="legacy-item__context">${a.context.slice(0, 120)}</div>` : ''}
            </div>
        `;
    }

    // Sort fundraisers by amount
    const sortedFundraisers = [...fundraisers].sort((a, b) => (b.amount || 0) - (a.amount || 0));

    container.innerHTML = `
        <div class="legacy-panel">
            <h3>Hall of Fame & Awards</h3>
            ${hof.map(awardItem).join('')}
            ${elite.length ? '<hr style="border-color: rgba(61,47,74,0.3); margin: 12px 0;">' + elite.map(awardItem).join('') : ''}
            ${rimshot.length ? '<hr style="border-color: rgba(61,47,74,0.3); margin: 12px 0;">' + rimshot.map(awardItem).join('') : ''}
            ${hitHuman.length ? hitHuman.map(awardItem).join('') : ''}
            ${special.length ? special.map(awardItem).join('') : ''}
            ${remembrance.length ? remembrance.map(awardItem).join('') : ''}
        </div>
        <div class="legacy-panel">
            <h3>Giving Back</h3>
            ${sortedFundraisers.map(f => {
                const isHero = f.amount >= 1000;
                return `
                    <div class="fundraiser-item">
                        <span class="fundraiser-amount${isHero ? ' fundraiser-amount--hero' : ''}">$${(f.amount || 0).toLocaleString()}</span>
                        <div class="fundraiser-detail">
                            <div class="fundraiser-event">${f.event_name || 'ECD Event'}</div>
                            <div class="fundraiser-year">${f.year || (f.date ? f.date.split('-')[0] : '')}</div>
                            ${f.beneficiary ? `<div class="fundraiser-beneficiary">For ${f.beneficiary}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
            <div style="margin-top: var(--space-lg); text-align: center; font-family: var(--font-mono); font-size: 1.4rem; color: var(--room-accent); font-weight: 700;">
                $${((fundraisers.reduce((s, f) => s + (f.amount || 0), 0))).toLocaleString()} total raised
            </div>
        </div>
    `;
}

// ─── Auto-init ───

initECD()
    .then(() => initWormholes('ecd'))
    .then(() => plantClue('clue8', document.querySelector('.ecd-callout')))
    .catch(err => {
        console.error('ECD init error:', err);
        const el = document.querySelector('.ecd-hero-stats');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
