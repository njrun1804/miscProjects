// js/search.js — Global search across all rooms using Fuse.js
// Indexes key content from multiple data files, renders results linking to rooms

import { loadMultiple } from './data-loader.js';

let fuseInstance = null;
let searchIndex = [];
let indexBuilding = false;

export async function initSearch() {
    const input = document.querySelector('.room-nav-search input');
    const resultsEl = document.getElementById('searchResults');
    if (!input || !resultsEl) return;

    // Build index on focus — retry each time if not yet built
    input.addEventListener('focus', async () => {
        if (!fuseInstance && !indexBuilding) {
            await buildIndex();
        }
    });

    input.addEventListener('input', async () => {
        const query = input.value.trim();
        if (!query || query.length < 2) {
            resultsEl.innerHTML = '';
            resultsEl.style.display = 'none';
            return;
        }

        // If Fuse not ready yet, try building
        if (!fuseInstance && !indexBuilding) {
            await buildIndex();
        }
        if (!fuseInstance) return;

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

function waitForFuse(timeout = 5000) {
    return new Promise((resolve) => {
        if (typeof Fuse !== 'undefined') { resolve(true); return; }
        const start = Date.now();
        const check = setInterval(() => {
            if (typeof Fuse !== 'undefined') { clearInterval(check); resolve(true); }
            else if (Date.now() - start > timeout) { clearInterval(check); resolve(false); }
        }, 100);
    });
}

async function buildIndex() {
    indexBuilding = true;
    try {
        // Wait for Fuse.js to be available
        const fuseReady = await waitForFuse();
        if (!fuseReady) {
            console.warn('Search: Fuse.js not available');
            return;
        }

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
            const person = p.person || {};
            const highlight = p.highlights && p.highlights[0] ? p.highlights[0].highlight : '';
            const activeYears = person.active_years || '';
            searchIndex.push({
                title: person.name || '',
                context: highlight || activeYears,
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
        fuseInstance = new Fuse(searchIndex, {
            keys: ['title', 'context', 'room'],
            threshold: 0.35,
            includeScore: true,
            minMatchCharLength: 2
        });
    } catch (e) {
        console.warn('Search index build failed:', e);
    } finally {
        indexBuilding = false;
    }
}

// Auto-init after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initSearch());
} else {
    initSearch();
}
