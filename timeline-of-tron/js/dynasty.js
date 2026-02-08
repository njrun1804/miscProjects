// js/dynasty.js — Room 7: The Dynasty (Career, Awards, ECD, Traditions)
// Career staircase, trophy case, ECD chart, traditions grid

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';

export async function initDynasty() {
    const data = await loadMultiple([
        'career.json',
        'awards_enriched.json',
        'awards_categories.json',
        'ecd_events.json',
        'traditions.json',
        'streaks.json'
    ]);

    renderStaircase(data.career || []);
    renderTrophyCase(data.awards_enriched || [], data.awards_categories || []);
    renderECD(data.ecd_events || []);
    renderTraditions(data.traditions || []);
}

function renderStaircase(career) {
    const container = document.querySelector('.staircase-container');
    if (!container || !career.length) return;

    const sorted = [...career].sort((a, b) => a.year - b.year);

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

    // Group awards by category
    const grouped = {};
    awards.forEach(a => {
        const cat = a.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(a);
    });

    // Sort each group by year descending
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

function renderECD(events) {
    const canvas = document.getElementById('ecdChart');
    if (!canvas || typeof Chart === 'undefined' || !events.length) return;

    // Extract yearly event counts from dates
    const yearCounts = {};
    events.forEach(e => {
        const year = e.year || (e.date ? parseInt(e.date.slice(0, 4)) : null);
        if (!year) return;
        yearCounts[year] = (yearCounts[year] || 0) + 1;
    });

    const years = Object.keys(yearCounts).sort();
    const counts = years.map(y => yearCounts[y]);

    // Running total
    let cumulative = 0;
    const running = counts.map(c => { cumulative += c; return cumulative; });

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Events per Year',
                    data: counts,
                    backgroundColor: 'rgba(201, 168, 76, 0.6)',
                    borderColor: '#c9a84c',
                    borderWidth: 1,
                    borderRadius: 2,
                    order: 2
                },
                {
                    label: 'Cumulative Events',
                    data: running,
                    type: 'line',
                    borderColor: '#7aaa7a',
                    backgroundColor: 'rgba(122, 170, 122, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#7aaa7a',
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#d4dcd0',
                        font: { family: "'Courier Prime', monospace", size: 11 }
                    }
                },
                title: {
                    display: true,
                    text: 'EastCoastDodgeball: The Dynasty',
                    color: '#d4dcd0',
                    font: { family: "'Courier Prime', monospace", size: 14 }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#8a9a8a', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(58,90,58,0.3)' }
                },
                y: {
                    position: 'left',
                    title: { display: true, text: 'Events/Year', color: '#c9a84c' },
                    ticks: { color: '#c9a84c', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(58,90,58,0.3)' }
                },
                y1: {
                    position: 'right',
                    title: { display: true, text: 'Cumulative', color: '#7aaa7a' },
                    ticks: { color: '#7aaa7a', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
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
    .catch(() => {
        const el = document.querySelector('.staircase-container');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
