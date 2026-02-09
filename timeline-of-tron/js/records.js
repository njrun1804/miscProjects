// js/records.js — Room 4: The Record Book
// Obsession Index, Sports Gauges, Streak Stories, Entertainment, Record Wall

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

export async function initRecords() {
    const data = await loadMultiple([
        'fun_facts.json',
        'streaks.json',
        'sports.json',
        'epic_numbers.json',
        'entertainment.json'
    ]);

    renderObsessionIndex(data.epic_numbers);
    renderSportsGauges(data.sports);
    renderStreakStories(data.streaks);
    renderEntertainment(data.entertainment);
    renderRecordWall(data.fun_facts);
}

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

function renderSportsGauges(sports) {
    const sportsData = Array.isArray(sports) ? sports : [];

    const records = sportsData.length ? sportsData : [
        { sport: 'Table Tennis', wins: 62, losses: 4, winRate: 93.9 },
        { sport: 'Cornhole', wins: 254, losses: 98, winRate: 72.2 },
        { sport: 'Famous Faces', wins: 9, losses: 11, winRate: 45.0 }
    ];

    records.forEach((rec, i) => {
        const canvas = document.getElementById(`gauge${i}`);
        if (!canvas || typeof Chart === 'undefined') return;

        const rate = rec.winRate || rec.win_rate || 0;
        const wins = rec.wins || 0;
        const losses = rec.losses || 0;

        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Wins', 'Losses'],
                datasets: [{
                    data: [rate, 100 - rate],
                    backgroundColor: ['#8b6914', 'rgba(180,168,140,0.5)'],
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

                    ctx.font = "bold 24px 'Courier Prime', monospace";
                    ctx.fillStyle = '#2c1810';
                    ctx.fillText(`${rate}%`, width / 2, height - 30);

                    ctx.font = "12px 'Courier Prime', monospace";
                    ctx.fillStyle = '#6b5840';
                    ctx.fillText(`${wins}W – ${losses}L`, width / 2, height - 12);

                    ctx.restore();
                }
            }]
        });
    });
}

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
        const yearRange = start ? `${start}–${active ? 'present' : end}` : '';

        return `
            <div class="streak-card ${active ? 'streak-card--active' : 'streak-card--broken'}">
                <div class="streak-card__duration">${len}<span class="streak-card__unit">${len === 62 ? ' wins' : ' yrs'}</span></div>
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
        'appearance': '\u{1F4F7}'
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

// Auto-init
initRecords()
    .then(() => initWormholes('records'))
    .then(() => plantClue('clue4', document.querySelector('.record-card')))
    .catch(() => {
        const el = document.querySelector('.obsession-grid');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
