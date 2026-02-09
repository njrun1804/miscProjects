// js/vault.js — Room 6: The Vault (Quotes + Soundtrack)
// Quote wall with emotion filters, song-person connections

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';

export async function initVault() {
    const data = await loadMultiple([
        'quotes.json',
        'song_person_map.json',
        'emotion_distribution.json'
    ]);

    const quotes = data.quotes || [];
    const songs = data.song_person_map || [];

    renderFilters(quotes);
    renderQuoteWall(quotes);
    renderSoundtrack(songs);
}

function renderFilters(quotes) {
    const container = document.querySelector('.vault-filters');
    if (!container) return;

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

function renderSoundtrack(songs) {
    const grid = document.querySelector('.vault-soundtrack-grid');
    if (!grid || !songs.length) return;

    const sorted = [...songs].sort((a, b) => (a.year_of_connection || 0) - (b.year_of_connection || 0));

    grid.innerHTML = sorted.map(s => `
        <div class="vault-song-card">
            <div class="vault-song-card__song">${s.song}</div>
            <div class="vault-song-card__artist">${s.artist}</div>
            <div class="vault-song-card__person">${s.person}</div>
            <div class="vault-song-card__story">${s.story}</div>
            <div class="vault-song-card__year">${s.year_of_connection || ''}</div>
        </div>
    `).join('');
}

// Auto-init
initVault()
    .then(() => initWormholes('vault'))
    .catch(() => {
        const el = document.querySelector('.vault-quote-wall');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
