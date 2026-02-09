// js/dynasty.js — Room 7: The Dynasty (Career, Awards, ECD, Traditions)
// Career staircase, trophy case, ECD dynasty sections, traditions grid

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

export async function initDynasty() {
    const data = await loadMultiple([
        'career.json',
        'awards_enriched.json',
        'awards_categories.json',
        'ecd_stats_dashboard.json',
        'ecd_community_narrative.json',
        'ecd_match_results.json',
        'traditions.json',
        'wwe_events.json'
    ]);

    renderStaircase(data.career || []);
    renderTrophyCase(data.awards_enriched || [], data.awards_categories || []);
    renderECDStats(data.ecd_stats_dashboard || {});
    renderCommunityArc(data.ecd_community_narrative || []);
    renderLeaderboard((data.ecd_stats_dashboard || {}).top_players || []);
    renderRivalries(data.ecd_match_results || []);
    renderWWETimeline(data.wwe_events || []);
    renderTraditions(data.traditions || []);
}

function renderStaircase(career) {
    const container = document.querySelector('.staircase-container');
    if (!container || !career.length) return;

    const positions = career.filter(c => c.type !== 'award');
    const sorted = [...positions].sort((a, b) => a.year - b.year);

    container.innerHTML = sorted.map(step => `
        <div class="staircase-step" style="margin-left: ${(step.career_level || 0) * 30}px;">
            <div class="staircase-step__level">${step.career_level || 0}</div>
            <div class="staircase-step__content">
                <div class="staircase-step__title">${step.title}</div>
                <div class="staircase-step__employer">${step.employer}</div>
                <div class="staircase-step__year">${step.year}</div>
                ${step.milestone ? `<div class="staircase-step__milestone">${step.milestone}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function renderTrophyCase(awards, categories) {
    const container = document.querySelector('.trophy-categories');
    if (!container) return;

    const grouped = {};
    awards.forEach(a => {
        const cat = a.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(a);
    });

    Object.values(grouped).forEach(arr => arr.sort((a, b) => (b.year || 0) - (a.year || 0)));
    const catNames = Object.keys(grouped).sort();

    container.addEventListener('click', (e) => {
        const header = e.target.closest('.trophy-category__header');
        if (header) header.parentElement.classList.toggle('open');
    });

    container.innerHTML = catNames.map(cat => {
        const items = grouped[cat];
        const displayName = cat.replace(/_/g, ' ');
        return `
            <div class="trophy-category">
                <div class="trophy-category__header">
                    <div>
                        <span class="trophy-category__name">${displayName}</span>
                        <span class="trophy-category__count">${items.length} award${items.length > 1 ? 's' : ''}</span>
                    </div>
                    <span class="trophy-category__toggle">&#9660;</span>
                </div>
                <div class="trophy-category__list">
                    ${items.map(a => `
                        <div class="trophy-item">
                            <span class="trophy-item__winner">${a.winner}</span>
                            <span class="trophy-item__year">${a.year || ''}</span>
                            ${a.note ? `<div class="trophy-item__note">${a.note}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// --- ECD SECTIONS ---

function renderECDStats(dashboard) {
    const container = document.querySelector('.ecd-stats-bar');
    if (!container) return;

    const players = dashboard.player_count || 0;
    const events = dashboard.event_count || 0;
    const raised = dashboard.fundraiser_total || 0;

    container.innerHTML = `
        <div class="ecd-stat"><span class="ecd-stat__value">${players}</span><span class="ecd-stat__label">Players</span></div>
        <div class="ecd-stat"><span class="ecd-stat__value">${events}</span><span class="ecd-stat__label">Events</span></div>
        <div class="ecd-stat"><span class="ecd-stat__value">20</span><span class="ecd-stat__label">Years</span></div>
        <div class="ecd-stat"><span class="ecd-stat__value">190</span><span class="ecd-stat__label">Peak Attendance</span></div>
        <div class="ecd-stat"><span class="ecd-stat__value">$${raised.toLocaleString()}</span><span class="ecd-stat__label">Raised</span></div>
    `;
}

function renderCommunityArc(narrative) {
    const container = document.querySelector('.ecd-community-arc');
    if (!container || !narrative.length) return;

    const eras = [
        {
            name: 'The Founding',
            years: '2005',
            players: 12,
            matches: 7,
            desc: 'Twelve pioneers. Seven matches. A community born from a simple idea: throw balls at your friends.'
        },
        {
            name: 'The Growth',
            years: '2006',
            players: 16,
            matches: 11,
            desc: 'Word spread. 51 events in one year. Peak attendance hit 190. The WrestleMania-style event names began.'
        },
        {
            name: 'The Golden Age',
            years: '2007\u20132008',
            players: 26,
            matches: 59,
            desc: '26 players, 59 matches, the most competitive era. Rivalries intensified. Nicknames were earned, not given.'
        },
        {
            name: 'The Revival',
            years: '2009\u20132010',
            players: 19,
            matches: 15,
            desc: '2009: the gap year. Two players remained. Then 2010 brought an 850% comeback \u2014 19 players returned for one last run.'
        },
        {
            name: 'Legacy Mode',
            years: '2011\u20132025',
            desc: 'The competition ended but the community didn\u2019t. Anniversary posts, retrospectives, and in 2025: the ProBowl raised $1,720 for Lauren & Emma.'
        }
    ];

    container.innerHTML = `
        <div class="ecd-arc-timeline">
            ${eras.map(era => `
                <div class="ecd-arc-card">
                    <div class="ecd-arc-card__header">
                        <span class="ecd-arc-card__name">${era.name}</span>
                        <span class="ecd-arc-card__years">${era.years}</span>
                    </div>
                    <div class="ecd-arc-card__desc">${era.desc}</div>
                    ${era.players || era.matches ? `
                        <div class="ecd-arc-card__stats">
                            ${era.players ? `<span>${era.players} players</span>` : ''}
                            ${era.matches ? `<span>${era.matches} matches</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('<div class="ecd-arc-arrow">\u2192</div>')}
        </div>
    `;
}

function renderLeaderboard(players) {
    const container = document.querySelector('.ecd-leaderboard');
    if (!container || !players.length) return;

    const top = players.slice(0, 20);

    container.innerHTML = `
        <div class="ecd-leaderboard-table">
            <div class="ecd-lb-header">
                <span class="ecd-lb-col ecd-lb-rank">#</span>
                <span class="ecd-lb-col ecd-lb-name">Player</span>
                <span class="ecd-lb-col ecd-lb-nickname">Alias</span>
                <span class="ecd-lb-col ecd-lb-record">W-L</span>
                <span class="ecd-lb-col ecd-lb-mentions">Mentions</span>
                <span class="ecd-lb-col ecd-lb-era">Era</span>
            </div>
            ${top.map((p, i) => {
                const bestNick = pickBestNickname(p.nicknames, p.name);
                const record = (p.wins || p.losses) ? `${p.wins || 0}-${p.losses || 0}` : '\u2014';
                return `
                    <div class="ecd-lb-row${i < 3 ? ' ecd-lb-row--top3' : ''}">
                        <span class="ecd-lb-col ecd-lb-rank">${i + 1}</span>
                        <span class="ecd-lb-col ecd-lb-name">${p.name}</span>
                        <span class="ecd-lb-col ecd-lb-nickname">${bestNick ? '\u201C' + bestNick + '\u201D' : ''}</span>
                        <span class="ecd-lb-col ecd-lb-record">${record}</span>
                        <span class="ecd-lb-col ecd-lb-mentions">${p.total_mentions.toLocaleString()}</span>
                        <span class="ecd-lb-col ecd-lb-era">${p.era_active || '\u2014'}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function pickBestNickname(raw, realName) {
    if (!raw) return '';
    try {
        const arr = JSON.parse(raw);
        // Prefer nicknames that are actual aliases (start with "the"/"The" or are clearly different from real name)
        const firstName = realName.split(' ')[0].toLowerCase();
        const lastName = realName.split(' ').pop().toLowerCase();
        const real = arr.filter(n => {
            const lower = n.toLowerCase();
            return lower !== firstName && lower !== lastName && !lower.includes(firstName + ' ') && lower !== realName.toLowerCase();
        });
        // Prefer "The X" style nicknames
        const titled = real.filter(n => n.startsWith('the ') || n.startsWith('The '));
        if (titled.length) return titled[0].replace(/^the /i, 'The ');
        return real.length ? real[0] : '';
    } catch {
        return '';
    }
}

function renderRivalries(matches) {
    const container = document.querySelector('.ecd-rivalries');
    if (!container || !matches.length) return;

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

    // Multi-match rivalries first, then notable single matches
    const multi = Object.values(h2h)
        .filter(r => r.total >= 2)
        .sort((a, b) => b.total - a.total);

    const singles = Object.values(h2h)
        .filter(r => r.total === 1 && r.scores.length)
        .sort((a, b) => {
            const aScore = a.scores[0].split('-').reduce((s, n) => s + parseInt(n) || 0, 0);
            const bScore = b.scores[0].split('-').reduce((s, n) => s + parseInt(n) || 0, 0);
            return bScore - aScore;
        });

    const all = [...multi.slice(0, 10), ...singles.slice(0, 5)];

    container.innerHTML = all.map(r => {
        const years = [...r.years].sort();
        const yearStr = years.length === 1 ? String(years[0]) : `${years[0]}\u2013${years[years.length - 1]}`;
        const p1w = r.records[r.p1];
        const p2w = r.records[r.p2];

        return `
            <div class="ecd-rivalry-card">
                <div class="ecd-rivalry-card__matchup">
                    <span class="${p1w >= p2w ? 'ecd-rivalry-winner' : ''}">${r.p1}</span>
                    <span class="ecd-rivalry-vs">${r.total > 1 ? 'vs' : 'def.'}</span>
                    <span class="${p2w > p1w ? 'ecd-rivalry-winner' : ''}">${r.p2}</span>
                </div>
                <div class="ecd-rivalry-card__details">
                    <span class="ecd-rivalry-record">${p1w}-${p2w}</span>
                    ${r.total > 1 ? `<span class="ecd-rivalry-count">${r.total} matches</span>` : ''}
                    ${r.scores.length === 1 ? `<span class="ecd-rivalry-score">${r.scores[0]}</span>` : ''}
                    <span class="ecd-rivalry-year">${yearStr}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderWWETimeline(events) {
    const container = document.querySelector('.wwe-timeline');
    if (!container || !events.length) return;

    const sorted = [...events].sort((a, b) => (a.year || 0) - (b.year || 0));

    container.innerHTML = sorted.map(e => {
        const hasCount = e.cumulative_events;
        return `
            <div class="wwe-event">
                <div class="wwe-event__year">${e.year}</div>
                <div class="wwe-event__content">
                    <div class="wwe-event__label">${e.label}</div>
                    ${e.note ? `<div class="wwe-event__note">${e.note}</div>` : ''}
                </div>
                ${hasCount ? `<div class="wwe-event__count">#${hasCount}</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderTraditions(traditions) {
    const grid = document.querySelector('.traditions-grid');
    if (!grid || !traditions.length) return;

    const sorted = [...traditions].sort((a, b) => (b.years || b.duration || 0) - (a.years || a.duration || 0));

    grid.innerHTML = sorted.map(t => {
        const name = t.name || t.tradition || 'Unknown';
        const startYear = t.start_year || t.year || '';
        const duration = t.years || t.duration || '';
        const status = t.status || (t.active !== false ? 'active' : 'ended');

        return `
            <div class="tradition-card">
                <div class="tradition-card__name">${name}</div>
                ${startYear ? `<div class="tradition-card__years">Since ${startYear}</div>` : ''}
                ${duration ? `<div class="tradition-card__duration">${duration} years${status === 'active' ? ' (active)' : ''}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Auto-init
initDynasty()
    .then(() => initWormholes('dynasty'))
    .then(() => plantClue('clue5', document.querySelector('.dynasty-callout')))
    .catch(() => {
        const el = document.querySelector('.staircase-container');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
