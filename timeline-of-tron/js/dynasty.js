// js/dynasty.js — Room 7: The Dynasty (Career, Awards, WWE, Traditions)
// Career staircase, trophy case, wrestling timeline, traditions grid

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

export async function initDynasty() {
    const data = await loadMultiple([
        'career.json',
        'awards_enriched.json',
        'awards_categories.json',
        'traditions.json',
        'wwe_events.json'
    ]);

    renderStaircase(data.career || []);
    renderTrophyCase(data.awards_enriched || [], data.awards_categories || []);
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
    .then(() => plantClue('clue4', document.querySelector('.dynasty-callout')))
    .catch(() => {
        const el = document.querySelector('.staircase-container');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
