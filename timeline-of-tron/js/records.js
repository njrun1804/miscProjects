// js/records.js — Room 4: The Record Book
// Obsession Index, Sports Gauges, Streak Tracker, Record Wall

import { loadMultiple } from './data-loader.js';

export async function initRecords() {
    const data = await loadMultiple([
        'fun_facts.json',
        'streaks.json',
        'sports.json',
        'epic_numbers.json'
    ]);

    renderObsessionIndex(data.epic_numbers);
    renderSportsGauges(data.sports);
    renderStreakTracker(data.streaks);
    renderRecordWall(data.fun_facts);
}

function renderObsessionIndex(epicNumbers) {
    const grid = document.querySelector('.obsession-grid');
    if (!grid) return;

    const items = Array.isArray(epicNumbers) ? epicNumbers : [];

    // Precision-tracked stats with their measurement type
    const obsessions = items.map(item => ({
        value: item.value + (item.unit ? ' ' + item.unit : ''),
        label: item.stat,
        precision: item.unit || 'count',
        context: item.context
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

    // Use known records if data doesn't have them
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
                    backgroundColor: ['#8b6914', 'rgba(212,200,168,0.3)'],
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

                    // Win rate
                    ctx.font = "bold 24px 'Courier Prime', monospace";
                    ctx.fillStyle = '#2c1810';
                    ctx.fillText(`${rate}%`, width / 2, height - 30);

                    // Record
                    ctx.font = "12px 'Courier Prime', monospace";
                    ctx.fillStyle = '#6b5840';
                    ctx.fillText(`${wins}W – ${losses}L`, width / 2, height - 12);

                    ctx.restore();
                }
            }]
        });
    });
}

function renderStreakTracker(streaks) {
    const canvas = document.getElementById('streakChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const items = Array.isArray(streaks) ? streaks : [];
    if (!items.length) return;

    const labels = items.map(s => s.name || s.streak || s.tradition || 'Unknown');
    const durations = items.map(s => s.years || s.duration || s.count || 0);
    const colors = items.map(s =>
        (s.status === 'broken' || s.active === false) ? '#8b1a1a' : '#4a6741'
    );

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Duration (years)',
                data: durations,
                backgroundColor: colors,
                borderRadius: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Streak Tracker (green = active, red = broken)',
                    color: '#2c1810',
                    font: { family: "'Courier Prime', monospace", size: 13 }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#6b5840', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(212,200,168,0.3)' },
                    title: { display: true, text: 'Years', color: '#6b5840' }
                },
                y: {
                    ticks: { color: '#2c1810', font: { family: "'Courier Prime', monospace", size: 11 } },
                    grid: { display: false }
                }
            }
        }
    });
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
initRecords();
