// js/vault.js — Room 6: The Vault (Quotes + Writing Evolution + Keyword River)
// Quote wall with emotion filters, voice timeline, keyword visualization

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';

export async function initVault() {
    const data = await loadMultiple([
        'quotes.json',
        'writing_evolution.json',
        'year_keywords.json',
        'emotion_distribution.json'
    ]);

    const quotes = data.quotes || [];
    const writing = data.writing_evolution || [];
    const keywords = data.year_keywords || [];
    const emotions = data.emotion_distribution || {};

    renderFilters(quotes);
    renderQuoteWall(quotes);
    renderVoiceTimeline(writing);
    renderKeywordCloud(keywords);
}

function renderFilters(quotes) {
    const container = document.querySelector('.vault-filters');
    if (!container) return;

    // Get unique emotions
    const emotionCounts = {};
    quotes.forEach(q => {
        const e = q.emotion || 'neutral';
        emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });

    const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);

    container.innerHTML = `
        <button class="vault-filter active" data-emotion="all">All (${quotes.length})</button>
        ${sorted.map(([emotion, count]) =>
            `<button class="vault-filter" data-emotion="${emotion}">${emotion} (${count})</button>`
        ).join('')}
    `;

    const countEl = document.querySelector('.vault-filter-count');

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.vault-filter');
        if (!btn) return;

        container.querySelectorAll('.vault-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const emotion = btn.dataset.emotion;
        const cards = document.querySelectorAll('.vault-quote-card');
        let shown = 0;

        cards.forEach(card => {
            if (emotion === 'all' || card.dataset.emotion === emotion) {
                card.classList.remove('dimmed');
                shown++;
            } else {
                card.classList.add('dimmed');
            }
        });

        if (countEl) {
            countEl.textContent = emotion === 'all' ? '' : `Showing ${shown} of ${quotes.length} quotes`;
        }
    });
}

function renderQuoteWall(quotes) {
    const wall = document.querySelector('.vault-quote-wall');
    if (!wall) return;

    const sorted = [...quotes].sort((a, b) => (a.year || 0) - (b.year || 0));

    wall.innerHTML = sorted.map(q => {
        const emotion = q.emotion || 'neutral';
        const text = q.quote || '';
        const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text;

        return `
            <div class="vault-quote-card" data-emotion="${emotion}" data-year="${q.year || ''}">
                <div class="vault-quote-card__text">&ldquo;${truncated}&rdquo;</div>
                <div class="vault-quote-card__meta">
                    <span class="vault-quote-card__context">${q.context || ''}</span>
                    <span class="vault-quote-card__year">${q.year || ''}</span>
                    <span class="vault-quote-card__emotion emotion--${emotion}">${emotion}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderVoiceTimeline(writing) {
    const canvas = document.getElementById('voiceChart');
    if (!canvas || typeof Chart === 'undefined' || !writing.length) return;

    const years = writing.map(w => w.year);
    const gradeLevel = writing.map(w => w.avg_grade_level || 0);
    const richness = writing.map(w => w.vocabulary_richness || 0);
    const wordCount = writing.map(w => w.total_words || 0);

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Grade Level',
                    data: gradeLevel,
                    borderColor: '#c9a84c',
                    backgroundColor: 'rgba(201, 168, 76, 0.1)',
                    yAxisID: 'y',
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#c9a84c'
                },
                {
                    label: 'Vocabulary Richness',
                    data: richness,
                    borderColor: '#6a8fb0',
                    backgroundColor: 'rgba(106, 143, 176, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#6a8fb0'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: {
                        color: '#d4d0c8',
                        font: { family: "'Courier Prime', monospace", size: 11 }
                    }
                },
                title: {
                    display: true,
                    text: 'The Evolving Voice',
                    color: '#d4d0c8',
                    font: { family: "'Courier Prime', monospace", size: 14 }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#8a8a9a', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(58,58,90,0.3)' }
                },
                y: {
                    type: 'linear',
                    position: 'left',
                    title: { display: true, text: 'Grade Level', color: '#c9a84c' },
                    ticks: { color: '#c9a84c', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(58,58,90,0.3)' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Vocabulary Richness', color: '#6a8fb0' },
                    ticks: { color: '#6a8fb0', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { drawOnChartArea: false },
                    min: 0, max: 1
                }
            }
        }
    });
}

function renderKeywordCloud(keywords) {
    const container = document.querySelector('.vault-keyword-river');
    if (!container || !keywords.length) return;

    // Group keywords by year, pick top 8 per year
    const byYear = {};
    keywords.forEach(k => {
        if (!byYear[k.year]) byYear[k.year] = [];
        byYear[k.year].push(k);
    });

    const years = Object.keys(byYear).sort();

    // Render as a flowing tag grid instead of D3 stream (simpler, no d3-shape needed)
    let html = '<div style="display:flex; flex-direction:column; gap:12px;">';

    years.forEach(year => {
        const top = byYear[year]
            .sort((a, b) => b.tfidf_score - a.tfidf_score)
            .slice(0, 8);

        html += `
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-family:var(--font-mono); font-size:12px; color:var(--room-accent); min-width:40px; font-weight:700;">${year}</span>
                ${top.map(k => {
                    const size = 10 + k.tfidf_score * 14;
                    const opacity = 0.5 + k.tfidf_score * 0.5;
                    return `<span style="font-family:var(--font-sans); font-size:${size}px; color:var(--room-text); opacity:${opacity}; padding:2px 6px; background:rgba(201,168,76,${k.tfidf_score * 0.2}); border-radius:3px;">${k.keyword}</span>`;
                }).join('')}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Auto-init
initVault().then(() => initWormholes('vault'));
