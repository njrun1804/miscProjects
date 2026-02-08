// js/search.js — Global search across all rooms using Fuse.js
// Indexes key content from multiple data files, renders results linking to rooms

import { loadMultiple } from './data-loader.js';

let fuseInstance = null;
let searchIndex = [];

export async function initSearch() {
    const input = document.querySelector('.room-nav-search input');
    const resultsEl = document.getElementById('searchResults');
    if (!input || !resultsEl) return;

    // Build index on first focus (lazy load)
    input.addEventListener('focus', async () => {
        if (!fuseInstance) {
            await buildIndex();
        }
    }, { once: true });

    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (!query || query.length < 2 || !fuseInstance) {
            resultsEl.innerHTML = '';
            resultsEl.style.display = 'none';
            return;
        }

        const results = fuseInstance.search(query, { limit: 8 });
        if (!results.length) {
            resultsEl.innerHTML = '<div class="search-no-results">No results found</div>';
            resultsEl.style.display = 'block';
            return;
        }

        resultsEl.innerHTML = results.map(r => {
            const item = r.item;
            return `
                <a href="${item.url}" class="search-result">
                    <span class="search-result__room">${item.room}</span>
                    <span class="search-result__title">${item.title}</span>
                    <span class="search-result__context">${item.context}</span>
                </a>
            `;
        }).join('');
        resultsEl.style.display = 'block';
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.room-nav-search')) {
            resultsEl.style.display = 'none';
        }
    });
}

async function buildIndex() {
    try {
        const data = await loadMultiple([
            'milestones_enriched.json',
            'quotes.json',
            'people_profiles.json',
            'fun_facts.json',
            'travel.json',
            'career.json'
        ]);

        // Milestones → The Arc
        const milestones = data.milestones_enriched || [];
        milestones.forEach(m => {
            searchIndex.push({
                title: m.milestone || m.title || '',
                context: `${m.year || ''} — ${m.heros_journey_stage || ''}`,
                room: 'The Arc',
                url: 'arc.html'
            });
        });

        // Quotes → The Vault
        const quotes = data.quotes || [];
        quotes.forEach(q => {
            const text = q.quote || '';
            searchIndex.push({
                title: text.length > 80 ? text.slice(0, 80) + '...' : text,
                context: `${q.year || ''} — ${q.emotion || ''}`,
                room: 'The Vault',
                url: 'vault.html'
            });
        });

        // People → The Constellation
        const people = data.people_profiles || [];
        people.forEach(p => {
            searchIndex.push({
                title: p.name || '',
                context: p.highlight || `${p.first_year || ''}–${p.last_year || ''}`,
                room: 'Constellation',
                url: 'constellation.html'
            });
        });

        // Fun facts → Record Book
        const facts = data.fun_facts || [];
        facts.forEach(f => {
            searchIndex.push({
                title: f.fact || f.stat || f.description || '',
                context: f.category || '',
                room: 'Record Book',
                url: 'records.html'
            });
        });

        // Travel → The Atlas
        const travel = data.travel || [];
        travel.forEach(t => {
            searchIndex.push({
                title: t.destination || '',
                context: `${t.year || ''} — ${t.scope || ''}`,
                room: 'The Atlas',
                url: 'atlas.html'
            });
        });

        // Career → The Dynasty
        const career = data.career || [];
        career.forEach(c => {
            searchIndex.push({
                title: `${c.title} at ${c.employer}`,
                context: `${c.year || ''}`,
                room: 'The Dynasty',
                url: 'dynasty.html'
            });
        });

        // Build Fuse instance
        if (typeof Fuse !== 'undefined') {
            fuseInstance = new Fuse(searchIndex, {
                keys: ['title', 'context', 'room'],
                threshold: 0.35,
                includeScore: true,
                minMatchCharLength: 2
            });
        }
    } catch (e) {
        console.warn('Search index build failed:', e);
    }
}

// Auto-init
initSearch();
