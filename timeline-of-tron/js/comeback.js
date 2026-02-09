// js/comeback.js — Room 3: The Comeback Lab
// Story-driven comeback cards + pattern insights + medical timeline

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

const TYPE_COLORS = {
    'travel':             '#1a5c8b',
    'community creation': '#2e7d32',
    'physical + family':  '#8b6914',
    'adventure':          '#6a4b8b',
    'resilience':         '#5a5a6e',
    'fitness':            '#c47a8a'
};

const SEVERITY_COLORS = {
    'major':    '#c0392b',
    'moderate': '#d4880f',
    'minor':    '#7f8c8d'
};

const CATEGORY_LABELS = {
    'trauma':          'Trauma',
    'illness':         'Illness',
    'mental_health':   'Mental Health',
    'injury':          'Injury',
    'spinal':          'Spinal',
    'minor_procedure': 'Minor Procedure'
};

export async function initComeback() {
    const data = await loadMultiple([
        'medical_comeback_pairs.json',
        'medical_events.json'
    ]);

    const pairs = data.medical_comeback_pairs || [];
    const events = data.medical_events || [];

    if (!pairs.length && !events.length) return;

    renderHeadlineStat(pairs);
    renderComebackStories(pairs);
    renderPatternInsights(pairs);
    renderMedicalTimeline(events);
}

function renderHeadlineStat(pairs) {
    const el = document.querySelector('.comeback-hero__value--avg');
    if (!el) return;

    const withGap = pairs.filter(p => p.gap_months > 0);
    if (!withGap.length) { el.textContent = '0'; return; }

    const avg = withGap.reduce((s, p) => s + p.gap_months, 0) / withGap.length;
    el.textContent = avg.toFixed(1);
}

function renderComebackStories(pairs) {
    const container = document.querySelector('.comeback-stories');
    if (!container || !pairs.length) return;

    container.innerHTML = pairs.map(p => {
        const type = (p.comeback_type || 'resilience').toLowerCase();
        const color = TYPE_COLORS[type] || TYPE_COLORS['resilience'];
        const sevColor = SEVERITY_COLORS[p.severity] || SEVERITY_COLORS['moderate'];
        const gapLabel = p.gap_months === 0
            ? 'Immediate'
            : p.gap_months === 1 ? '1 month' : `${p.gap_months} months`;

        return `
            <div class="comeback-story" style="--type-color: ${color}">
                <div class="comeback-story__header">
                    <span class="comeback-story__year">${p.medical_year}</span>
                    <span class="comeback-story__severity" style="--sev-color: ${sevColor}" title="${p.severity}">${p.severity}</span>
                </div>
                <div class="comeback-story__crisis">${p.medical_event}</div>
                <div class="comeback-story__arrow">
                    <span class="comeback-story__arrow-line"></span>
                    <span class="comeback-story__gap">${gapLabel}</span>
                    <span class="comeback-story__arrow-line"></span>
                </div>
                <div class="comeback-story__recovery">${p.comeback_event}</div>
                <div class="comeback-story__footer">
                    <span class="comeback-story__type">${p.comeback_type}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderPatternInsights(pairs) {
    const container = document.querySelector('.pattern-insights');
    if (!container || !pairs.length) return;

    // Most common recovery type
    const typeCounts = {};
    pairs.forEach(p => {
        const t = p.comeback_type || 'resilience';
        typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

    // Average recovery
    const withGap = pairs.filter(p => p.gap_months > 0);
    const avgMonths = withGap.length
        ? (withGap.reduce((s, p) => s + p.gap_months, 0) / withGap.length).toFixed(1)
        : '0';

    // Longest comeback
    const longest = [...pairs].sort((a, b) => b.gap_months - a.gap_months)[0];

    // Fastest bounce (non-zero or instant)
    const fastest = [...pairs].sort((a, b) => a.gap_months - b.gap_months)[0];

    const insights = [
        {
            value: topType[0],
            label: '#1 Recovery Strategy',
            context: `${topType[1]} of ${pairs.length} comebacks`
        },
        {
            value: `${avgMonths}mo`,
            label: 'Average Recovery Time',
            context: `across ${withGap.length} timed recoveries`
        },
        {
            value: `${longest.gap_months}mo`,
            label: 'Longest Comeback Arc',
            context: `${longest.medical_year}: ${truncate(longest.medical_event, 40)}`
        },
        {
            value: fastest.gap_months === 0 ? 'Instant' : `${fastest.gap_months}mo`,
            label: 'Fastest Bounce Back',
            context: `${fastest.medical_year}: ${truncate(fastest.medical_event, 40)}`
        }
    ];

    container.innerHTML = insights.map(i => `
        <div class="pattern-card">
            <div class="pattern-card__value">${i.value}</div>
            <div class="pattern-card__label">${i.label}</div>
            <div class="pattern-card__context">${i.context}</div>
        </div>
    `).join('');
}

function renderMedicalTimeline(events) {
    const container = document.querySelector('.medical-timeline');
    if (!container || !events.length) return;

    const sorted = [...events].sort((a, b) => a.year - b.year);

    container.innerHTML = sorted.map(e => {
        const sevColor = SEVERITY_COLORS[e.severity] || SEVERITY_COLORS['moderate'];
        const catLabel = CATEGORY_LABELS[e.category] || e.category || '';

        return `
            <div class="timeline-item">
                <div class="timeline-item__dot" style="--dot-color: ${sevColor}"></div>
                <div class="timeline-item__content">
                    <div class="timeline-item__header">
                        <span class="timeline-item__year">${e.year}</span>
                        ${catLabel ? `<span class="timeline-item__category">${catLabel}</span>` : ''}
                        <span class="timeline-item__severity" style="color: ${sevColor}">${e.severity}</span>
                    </div>
                    <div class="timeline-item__event">${e.event}</div>
                    ${e.recovery_note ? `<div class="timeline-item__recovery">${e.recovery_note}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
}

// Auto-init
initComeback()
    .then(() => initWormholes('comeback'))
    .then(() => plantClue('clue3', document.querySelector('.comeback-callout')))
    .catch(() => {
        const el = document.querySelector('.comeback-stories');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
