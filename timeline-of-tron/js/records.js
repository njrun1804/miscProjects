// js/records.js — Room 4: The Record Book (Enhanced)
// Obsession Index, Sports Gauges, Athletic Archives, Rivals, Streaks,
// Life Intensity, Comebacks, Entertainment, Record Wall

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

export async function initRecords() {
    const data = await loadMultiple([
        'fun_facts.json',
        'streaks.json',
        'sports.json',
        'epic_numbers.json',
        'entertainment.json',
        'year_intensity_breakdown.json',
        'ecd_match_results.json',
        'expanded_comebacks.json'
    ]);

    renderObsessionIndex(data.epic_numbers);
    renderSportsGauges(data.sports);
    renderAthleticArchives(data.sports);
    renderRivals(data.ecd_match_results);
    renderStreakStories(data.streaks);
    renderIntensityChart(data.year_intensity_breakdown);
    renderComebacks(data.expanded_comebacks);
    renderEntertainment(data.entertainment);
    renderRecordWall(data.fun_facts);
}

/* ============================
   OBSESSION INDEX
   ============================ */
function renderObsessionIndex(epicNumbers) {
    const grid = document.querySelector('.obsession-grid');
    if (!grid) return;

    const items = Array.isArray(epicNumbers) ? epicNumbers : [];

    const obsessions = items.map(item => ({
        value: item.value + (item.unit ? ' ' + item.unit : ''),
        label: item.stat,
        precision: item.unit || 'count',
        context: item.year || item.note || ''
    }));

    grid.innerHTML = obsessions.map(o => `
        <div class="obsession-card">
            <div class="obsession-value">${o.value}</div>
            <div class="obsession-label">${o.label}</div>
            <div class="obsession-precision">${o.context}</div>
        </div>
    `).join('');
}

/* ============================
   WIN RATES (FIXED)
   ============================ */
function renderSportsGauges(sports) {
    const sportsData = Array.isArray(sports) ? sports : [];
    const grid = document.querySelector('.gauges-grid');
    if (!grid) return;

    // Group flat stat rows by sport name
    const grouped = {};
    sportsData.forEach(row => {
        if (!grouped[row.sport]) grouped[row.sport] = {};
        if (row.stat_type === 'wins') grouped[row.sport].wins = parseInt(row.stat_value) || 0;
        if (row.stat_type === 'losses') grouped[row.sport].losses = parseInt(row.stat_value) || 0;
        if (row.stat_type === 'win_rate') grouped[row.sport].winRate = parseFloat(row.stat_value) || 0;
    });

    // Only show sports with full W/L/Rate data
    const records = Object.entries(grouped)
        .filter(([, stats]) => stats.wins !== undefined && stats.losses !== undefined && stats.winRate !== undefined)
        .map(([sport, stats]) => ({ sport, ...stats }));

    if (!records.length) return;

    // Build gauge canvases dynamically
    grid.innerHTML = records.map((rec, i) => `
        <div class="gauge-wrap">
            <canvas id="gauge${i}"></canvas>
            <div class="gauge-label">${rec.sport}</div>
            <div class="gauge-record">${rec.wins}W \u2013 ${rec.losses}L</div>
        </div>
    `).join('');

    records.forEach((rec, i) => {
        const canvas = document.getElementById(`gauge${i}`);
        if (!canvas || typeof Chart === 'undefined') return;

        const accentColor = rec.winRate >= 70 ? '#4a6741' : rec.winRate >= 50 ? '#8b6914' : '#8b1a1a';

        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Wins', 'Losses'],
                datasets: [{
                    data: [rec.winRate, 100 - rec.winRate],
                    backgroundColor: [accentColor, 'rgba(180,168,140,0.3)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                rotation: -90,
                circumference: 180,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            },
            plugins: [{
                id: 'gaugeText',
                afterDraw(chart) {
                    const { ctx, width, height } = chart;
                    ctx.save();
                    ctx.textAlign = 'center';

                    ctx.font = "bold 28px 'Courier Prime', monospace";
                    ctx.fillStyle = '#2c1810';
                    ctx.fillText(`${rec.winRate}%`, width / 2, height - 24);

                    ctx.font = "12px 'Courier Prime', monospace";
                    ctx.fillStyle = '#6b5840';
                    ctx.fillText(`${rec.wins}W \u2013 ${rec.losses}L`, width / 2, height - 8);

                    ctx.restore();
                }
            }]
        });
    });
}

/* ============================
   ATHLETIC ARCHIVES
   ============================ */
function renderAthleticArchives(sports) {
    const grid = document.querySelector('.archives-grid');
    if (!grid) return;

    const sportsData = Array.isArray(sports) ? sports : [];

    // Group by sport, collect stories/notes
    const grouped = {};
    sportsData.forEach(row => {
        if (!grouped[row.sport]) grouped[row.sport] = { stats: {}, notes: [], years: [] };
        if (row.stat_type === 'note' && (row.note || row.stat_value)) {
            const text = row.note || row.stat_value;
            if (text.trim()) grouped[row.sport].notes.push({ text, year: row.year });
        }
        if (row.stat_type === 'result') {
            const text = row.stat_value + (row.note ? ' \u2014 ' + row.note : '');
            grouped[row.sport].notes.push({ text, year: row.year });
        }
        if (row.stat_type === 'jumps') {
            grouped[row.sport].notes.push({
                text: row.stat_value + ' jumps' + (row.note ? ' \u2014 ' + row.note : ''),
                year: row.year
            });
        }
        if (['wins', 'losses', 'win_rate'].includes(row.stat_type)) {
            grouped[row.sport].stats[row.stat_type] = row.stat_value;
        }
        if (row.year) grouped[row.sport].years.push(row.year);
    });

    // Only sports with stories
    const archives = Object.entries(grouped)
        .filter(([, data]) => data.notes.length > 0)
        .sort((a, b) => b[1].notes.length - a[1].notes.length);

    if (!archives.length) return;

    const sportIcons = {
        'Tennis': '\uD83C\uDFBE',
        'Volleyball': '\uD83C\uDFD0',
        'Dodgeball': '\uD83C\uDFAF',
        'Badminton': '\uD83C\uDFF8',
        'Bowling': '\uD83C\uDFB3',
        'Cornhole': '\uD83C\uDF3D',
        'Skydiving': '\uD83E\uDE82',
        'Kickball': '\u26BD',
        'Pickleball': '\uD83C\uDFD3',
        'Five Boro Bike Tour': '\uD83D\uDEB4',
        'Crabbing': '\uD83E\uDD80',
        'Table Tennis': '\uD83C\uDFD3',
        'Famous Faces Game': '\uD83C\uDFAD'
    };

    grid.innerHTML = archives.map(([sport, data]) => {
        const icon = sportIcons[sport] || '\uD83C\uDFC6';
        const yearRange = data.years.length
            ? `${Math.min(...data.years)}\u2013${Math.max(...data.years)}`
            : '';
        const statsLine = data.stats.wins
            ? `${data.stats.wins}W \u2013 ${data.stats.losses}L (${data.stats.win_rate}%)`
            : '';

        return `
            <div class="archive-card">
                <div class="archive-card__header">
                    <span class="archive-card__icon">${icon}</span>
                    <div class="archive-card__title-block">
                        <div class="archive-card__sport">${sport}</div>
                        ${yearRange ? `<div class="archive-card__years">${yearRange}</div>` : ''}
                        ${statsLine ? `<div class="archive-card__record">${statsLine}</div>` : ''}
                    </div>
                </div>
                <div class="archive-card__stories">
                    ${data.notes.map(n => `
                        <div class="archive-card__story">
                            ${n.year ? `<span class="archive-card__story-year">${n.year}</span>` : ''}
                            <span class="archive-card__story-text">${n.text}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

/* ============================
   THE RIVALS (ECD Head-to-Head)
   ============================ */
function renderRivals(matchResults) {
    const grid = document.querySelector('.rivals-grid');
    if (!grid) return;

    const matches = Array.isArray(matchResults) ? matchResults : [];
    if (!matches.length) return;

    // Build head-to-head records
    const h2h = {};
    matches.forEach(m => {
        if (!m.winner || !m.loser) return;
        const sorted = [m.winner, m.loser].sort();
        const pair = sorted.join(' vs ');
        if (!h2h[pair]) h2h[pair] = { p1: sorted[0], p2: sorted[1], p1wins: 0, p2wins: 0, matches: [], years: [] };
        if (m.winner === h2h[pair].p1) h2h[pair].p1wins++;
        else h2h[pair].p2wins++;
        h2h[pair].matches.push(m);
        if (m.year) h2h[pair].years.push(m.year);
    });

    // Rivalries with 2+ matches
    const rivalries = Object.values(h2h)
        .filter(r => (r.p1wins + r.p2wins) >= 2)
        .sort((a, b) => (b.p1wins + b.p2wins) - (a.p1wins + a.p2wins));

    // All-time leaderboard
    const leaderboard = {};
    matches.forEach(m => {
        if (!m.winner || !m.loser) return;
        if (!leaderboard[m.winner]) leaderboard[m.winner] = { wins: 0, losses: 0 };
        if (!leaderboard[m.loser]) leaderboard[m.loser] = { wins: 0, losses: 0 };
        leaderboard[m.winner].wins++;
        leaderboard[m.loser].losses++;
    });

    const leaders = Object.entries(leaderboard)
        .map(([name, stats]) => ({
            name,
            ...stats,
            total: stats.wins + stats.losses,
            rate: Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
        }))
        .filter(p => p.total >= 3)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10);

    // Find biggest blowout and closest match
    const scored = matches.filter(m => m.score_winner != null && m.score_loser != null);
    const blowouts = [...scored].sort((a, b) => (b.score_winner - b.score_loser) - (a.score_winner - a.score_loser)).slice(0, 3);
    const thrillers = [...scored].sort((a, b) => Math.abs(a.score_winner - a.score_loser) - Math.abs(b.score_winner - b.score_loser)).slice(0, 3);

    grid.innerHTML = `
        <div class="rivals-columns">
            <div class="rivals-leaderboard">
                <h3>All-Time Leaderboard</h3>
                <div class="leaderboard-list">
                    ${leaders.map((p, i) => `
                        <div class="leaderboard-row">
                            <span class="leaderboard-rank">${i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : '#' + (i + 1)}</span>
                            <span class="leaderboard-name">${p.name}</span>
                            <span class="leaderboard-record">${p.wins}W\u2013${p.losses}L</span>
                            <span class="leaderboard-rate">${p.rate}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="rivals-highlights">
                <h3>Biggest Blowouts</h3>
                ${blowouts.map(m => `
                    <div class="highlight-match highlight-match--blowout">
                        <span class="highlight-match__winner">${m.winner}</span>
                        <span class="highlight-match__score">${m.score}</span>
                        <span class="highlight-match__loser">${m.loser}</span>
                        ${m.year ? `<span class="highlight-match__year">${m.year}</span>` : ''}
                    </div>
                `).join('')}
                <h3 style="margin-top:16px;">Closest Matches</h3>
                ${thrillers.map(m => `
                    <div class="highlight-match highlight-match--thriller">
                        <span class="highlight-match__winner">${m.winner}</span>
                        <span class="highlight-match__score">${m.score}</span>
                        <span class="highlight-match__loser">${m.loser}</span>
                        ${m.year ? `<span class="highlight-match__year">${m.year}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="rivals-matchups">
            <h3>Head-to-Head Records</h3>
            <div class="matchups-list">
                ${rivalries.map(r => {
                    const total = r.p1wins + r.p2wins;
                    const p1pct = Math.round((r.p1wins / total) * 100);
                    const yearRange = r.years.length
                        ? `${Math.min(...r.years)}\u2013${Math.max(...r.years)}`
                        : '';
                    const isDomination = r.p1wins === 0 || r.p2wins === 0;
                    return `
                        <div class="matchup-card ${isDomination ? 'matchup-card--sweep' : ''}">
                            <div class="matchup-players">
                                <span class="matchup-p ${r.p1wins > r.p2wins ? 'matchup-winner' : ''}">${r.p1} <strong>${r.p1wins}</strong></span>
                                <span class="matchup-vs">vs</span>
                                <span class="matchup-p ${r.p2wins > r.p1wins ? 'matchup-winner' : ''}">${r.p2} <strong>${r.p2wins}</strong></span>
                            </div>
                            <div class="matchup-bar">
                                <div class="matchup-bar__fill" style="width:${p1pct}%"></div>
                            </div>
                            <div class="matchup-meta">
                                <span>${total} match${total > 1 ? 'es' : ''}</span>
                                ${yearRange ? `<span>${yearRange}</span>` : ''}
                                ${isDomination ? '<span class="matchup-tag">SWEEP</span>' : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/* ============================
   STREAK STORIES
   ============================ */
function renderStreakStories(streaks) {
    const container = document.querySelector('.streak-stories');
    if (!container) return;

    const items = Array.isArray(streaks) ? streaks : [];
    if (!items.length) return;

    const sorted = [...items].sort((a, b) => (b.length || 0) - (a.length || 0));

    container.innerHTML = sorted.map(s => {
        const name = s.description || s.name || s.streak || 'Unknown';
        const len = s.length || s.years || s.duration || 0;
        const active = s.still_active === 1 || s.active === true;
        const start = s.start_year || '';
        const end = s.end_year || '';
        const category = s.category || '';
        const yearRange = start ? `${start}\u2013${active ? 'present' : end}` : '';

        return `
            <div class="streak-card ${active ? 'streak-card--active' : 'streak-card--broken'}">
                <div class="streak-card__duration">${len}<span class="streak-card__unit"> yrs</span></div>
                <div class="streak-card__info">
                    <div class="streak-card__name">${name}</div>
                    <div class="streak-card__meta">
                        <span class="streak-card__years">${yearRange}</span>
                        <span class="streak-card__status">${active ? 'ACTIVE' : 'BROKEN'}</span>
                        <span class="streak-card__category">${category}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/* ============================
   LIFE INTENSITY MAP
   ============================ */
function renderIntensityChart(intensityData) {
    const canvas = document.getElementById('intensityChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const data = Array.isArray(intensityData) ? intensityData : [];
    if (!data.length) return;

    const sorted = [...data].sort((a, b) => a.year - b.year);
    const years = sorted.map(d => d.year);

    const domains = [
        { key: 'career_intensity', label: 'Career', color: '#4a6741' },
        { key: 'travel_intensity', label: 'Travel', color: '#1a5c8b' },
        { key: 'health_intensity', label: 'Health', color: '#8b1a1a' },
        { key: 'social_intensity', label: 'Social', color: '#6b4a8b' },
        { key: 'ecd_intensity', label: 'ECD', color: '#d4930a' },
        { key: 'creative_intensity', label: 'Creative', color: '#c9a84c' }
    ];

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: years,
            datasets: domains.map(d => ({
                label: d.label,
                data: sorted.map(row => row[d.key] || 0),
                backgroundColor: d.color,
                borderWidth: 0,
                borderRadius: 1
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    stacked: true,
                    ticks: {
                        font: { family: "'Courier Prime', monospace", size: 10 },
                        color: '#6b5840',
                        maxRotation: 45
                    },
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    title: { display: true, text: 'Intensity Score', font: { family: "'Courier Prime', monospace", size: 11 }, color: '#6b5840' },
                    ticks: {
                        font: { family: "'Courier Prime', monospace", size: 10 },
                        color: '#6b5840'
                    },
                    grid: { color: 'rgba(180,168,140,0.25)' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: "'Courier Prime', monospace", size: 11 },
                        color: '#2c1810',
                        usePointStyle: true,
                        pointStyle: 'rectRounded',
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(44,24,16,0.95)',
                    titleFont: { family: "'Courier Prime', monospace", size: 13, weight: 'bold' },
                    bodyFont: { family: "'Courier Prime', monospace", size: 11 },
                    padding: 12,
                    cornerRadius: 3,
                    callbacks: {
                        afterBody(items) {
                            const yearIdx = items[0].dataIndex;
                            const row = sorted[yearIdx];
                            return [
                                '',
                                `Total: ${row.total_intensity.toFixed(1)}`,
                                `Dominant: ${row.dominant_domain}`
                            ];
                        }
                    }
                }
            }
        }
    });
}

/* ============================
   COMEBACKS
   ============================ */
function renderComebacks(comebacks) {
    const grid = document.querySelector('.comebacks-grid');
    if (!grid) return;

    const items = Array.isArray(comebacks) ? comebacks : [];
    if (!items.length) return;

    // Deduplicate: keep highest intensity_shift per unique crisis
    const seen = new Map();
    items.forEach(c => {
        const key = `${c.crisis_year}-${(c.crisis_event || '').substring(0, 40)}`;
        if (!seen.has(key) || c.intensity_shift > seen.get(key).intensity_shift) {
            seen.set(key, c);
        }
    });

    const best = [...seen.values()]
        .sort((a, b) => b.intensity_shift - a.intensity_shift)
        .slice(0, 8);

    const typeIcons = {
        'medical': '\u2695\uFE0F',
        'career_setback': '\uD83D\uDCBC',
        'relationship': '\u2764\uFE0F',
        'social': '\uD83E\uDD1D',
        'travel': '\u2708\uFE0F'
    };

    grid.innerHTML = best.map(c => {
        const icon = typeIcons[c.comeback_type] || '\uD83D\uDD25';
        const shift = c.intensity_shift.toFixed(1);
        const crisisShort = (c.crisis_event || '').length > 80
            ? (c.crisis_event || '').substring(0, 77) + '...'
            : c.crisis_event || '';
        const recoveryShort = (c.recovery_event || '').length > 80
            ? (c.recovery_event || '').substring(0, 77) + '...'
            : c.recovery_event || '';

        return `
            <div class="comeback-card">
                <div class="comeback-card__icon">${icon}</div>
                <div class="comeback-card__content">
                    <div class="comeback-card__crisis">
                        <span class="comeback-card__year">${c.crisis_year}</span>
                        <span class="comeback-card__event">${crisisShort}</span>
                    </div>
                    <div class="comeback-card__arrow">
                        <span class="comeback-card__gap">${c.gap_months} months</span>
                        <span class="comeback-card__arrow-icon">\u2193</span>
                    </div>
                    <div class="comeback-card__recovery">
                        <span class="comeback-card__year">${c.recovery_year}</span>
                        <span class="comeback-card__event">${recoveryShort}</span>
                    </div>
                    <div class="comeback-card__shift">+${shift} intensity shift</div>
                </div>
            </div>
        `;
    }).join('');
}

/* ============================
   ENTERTAINMENT
   ============================ */
function renderEntertainment(entertainment) {
    const grid = document.querySelector('.entertainment-grid');
    if (!grid) return;

    const items = Array.isArray(entertainment) ? entertainment : [];
    if (!items.length) return;

    const typeIcons = {
        'concert': '\u266B',
        'broadway': '\u2605',
        'sporting event': '\u26BD',
        'activity': '\u26A1',
        'appearance': '\uD83D\uDCF7'
    };

    const sorted = [...items].sort((a, b) => (a.year || 0) - (b.year || 0));

    grid.innerHTML = sorted.map(e => {
        const icon = typeIcons[e.event_type] || '\u2606';
        const type = e.event_type || '';
        return `
            <div class="entertainment-card" data-type="${type}">
                <div class="entertainment-card__icon">${icon}</div>
                <div class="entertainment-card__info">
                    <div class="entertainment-card__name">${e.show_name}</div>
                    <div class="entertainment-card__meta">
                        <span class="entertainment-card__year">${e.year}</span>
                        <span class="entertainment-card__type">${type}</span>
                    </div>
                    ${e.note ? `<div class="entertainment-card__note">${e.note}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/* ============================
   RECORD WALL
   ============================ */
function renderRecordWall(funFacts) {
    const grid = document.querySelector('.record-wall-grid');
    if (!grid) return;

    const facts = Array.isArray(funFacts) ? funFacts : [];

    grid.innerHTML = facts.map(f => {
        const stat = f.fact || f.stat || f.description || '';
        const year = f.year || '';
        const category = f.category || '';
        return `
            <div class="record-card">
                <div class="record-card__stat">${stat}</div>
                ${year ? `<div class="record-card__year">${year}</div>` : ''}
                ${category ? `<div class="record-card__context">${category}</div>` : ''}
            </div>
        `;
    }).join('');
}

/* ============================
   AUTO-INIT
   ============================ */
initRecords()
    .then(() => initWormholes('records'))
    .then(() => plantClue('clue3', document.querySelector('.record-card')))
    .catch(err => {
        console.error('Records init error:', err);
        const el = document.querySelector('.obsession-grid');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
