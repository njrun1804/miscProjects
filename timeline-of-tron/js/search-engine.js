// js/search-engine.js — Unified search engine for The Timeline of Tron
// Replaces search.js with: expanded index, rich results, autocorrect,
// keyboard navigation, ARIA accessibility, and a discovery panel.

import { loadMultiple } from './data-loader.js';
import { getAliases } from './name-resolver.js';
import { buildDictionary, suggestCorrection } from './search-spellchecker.js';

let fuseInstance = null;
let searchIndex = [];
let indexBuilding = false;
let discoveryItems = []; // Subset for random exploration

// ── Type metadata (icons + labels) ─────────────────────────────────

const TYPE_META = {
    milestone:     { icon: '\u{1F4D6}', label: 'Milestone' },
    person:        { icon: '\u2728',     label: 'Person' },
    quote:         { icon: '\u{1F4AC}', label: 'Quote' },
    travel:        { icon: '\u{1F5FA}\uFE0F', label: 'Travel' },
    career:        { icon: '\u{1F454}', label: 'Career' },
    award:         { icon: '\u{1F3C6}', label: 'Award' },
    tradition:     { icon: '\u{1F3AA}', label: 'Tradition' },
    entertainment: { icon: '\u{1F3AD}', label: 'Entertainment' },
    comeback:      { icon: '\u{1F525}', label: 'Comeback' },
    medical:       { icon: '\u{1F3E5}', label: 'Medical' },
    location:      { icon: '\u{1F4CD}', label: 'Location' },
    funfact:       { icon: '\u{1F4CA}', label: 'Record' },
};

// ── Initialization ─────────────────────────────────────────────────

export async function initSearch() {
    const input = document.querySelector('.lj-search input');
    const resultsEl = document.getElementById('searchResults');
    if (!input || !resultsEl) return;

    // Build index on focus (lazy)
    input.addEventListener('focus', async () => {
        if (!fuseInstance && !indexBuilding) {
            await buildIndex();
        }
        // Show discovery panel when input is empty
        if (!input.value.trim() && fuseInstance) {
            showDiscoveryPanel(resultsEl);
        }
    });

    // Live search on input
    input.addEventListener('input', () => {
        handleSearch(input, resultsEl);
    });

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        handleKeyboard(e, input, resultsEl);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lj-search')) {
            resultsEl.style.display = 'none';
            resultsEl.removeAttribute('aria-expanded');
        }
    });

    // ARIA setup
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', 'searchResults');
    resultsEl.setAttribute('role', 'listbox');
}

// ── Search Handler ─────────────────────────────────────────────────

async function handleSearch(input, resultsEl) {
    const query = input.value.trim();

    if (!query || query.length < 2) {
        if (!query && fuseInstance) {
            showDiscoveryPanel(resultsEl);
        } else {
            resultsEl.innerHTML = '';
            resultsEl.style.display = 'none';
            input.setAttribute('aria-expanded', 'false');
        }
        return;
    }

    // Ensure index is built
    if (!fuseInstance && !indexBuilding) {
        await buildIndex();
    }
    if (!fuseInstance) return;

    const results = fuseInstance.search(query, { limit: 10 });

    if (!results.length) {
        // Try autocorrect
        const correction = suggestCorrection(query);
        if (correction) {
            resultsEl.innerHTML = `
                <div class="search-suggestion">
                    Did you mean:
                    <a href="javascript:void(0)" class="search-suggestion__link"
                       data-correction="${escapeAttr(correction.term)}">
                        ${escapeHtml(correction.term)}
                    </a>?
                </div>`;
            // Wire up click
            const link = resultsEl.querySelector('.search-suggestion__link');
            if (link) {
                link.addEventListener('click', () => {
                    input.value = correction.term;
                    input.dispatchEvent(new Event('input'));
                });
            }
        } else {
            resultsEl.innerHTML = '<div class="search-no-results">No results found</div>';
        }
        resultsEl.style.display = 'block';
        input.setAttribute('aria-expanded', 'true');
        return;
    }

    resultsEl.innerHTML = results.map((r, i) => {
        const item = r.item;
        const meta = TYPE_META[item.type] || { icon: '', label: '' };
        const snippet = item.snippet ? `<span class="search-result__snippet">${escapeHtml(item.snippet)}</span>` : '';
        const tags = (item.tags || []).slice(0, 3).map(t =>
            `<span class="search-result__tag">${escapeHtml(t)}</span>`
        ).join('');

        return `
            <a href="${item.url}" class="search-result search-result--${item.type}"
               role="option" id="search-opt-${i}" aria-selected="false">
                <span class="search-result__icon" aria-hidden="true">${meta.icon}</span>
                <span class="search-result__body">
                    <span class="search-result__room">${escapeHtml(item.room)}</span>
                    <span class="search-result__title">${escapeHtml(item.title)}</span>
                    <span class="search-result__context">${escapeHtml(item.context)}</span>
                    ${snippet}
                    ${tags ? `<span class="search-result__tags">${tags}</span>` : ''}
                </span>
            </a>
        `;
    }).join('');

    resultsEl.style.display = 'block';
    input.setAttribute('aria-expanded', 'true');
}

// ── Keyboard Navigation ────────────────────────────────────────────

function handleKeyboard(e, input, resultsEl) {
    const items = resultsEl.querySelectorAll('.search-result[role="option"]');
    if (!items.length && e.key !== 'Escape') return;

    const current = resultsEl.querySelector('.search-result.focused');
    let idx = current ? [...items].indexOf(current) : -1;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (current) current.classList.remove('focused');
            idx = (idx + 1) % items.length;
            items[idx].classList.add('focused');
            items[idx].scrollIntoView({ block: 'nearest' });
            input.setAttribute('aria-activedescendant', items[idx].id);
            break;

        case 'ArrowUp':
            e.preventDefault();
            if (current) current.classList.remove('focused');
            idx = idx <= 0 ? items.length - 1 : idx - 1;
            items[idx].classList.add('focused');
            items[idx].scrollIntoView({ block: 'nearest' });
            input.setAttribute('aria-activedescendant', items[idx].id);
            break;

        case 'Enter':
            e.preventDefault();
            if (current) {
                window.location.href = current.href;
            } else if (items.length) {
                window.location.href = items[0].href;
            }
            break;

        case 'Escape':
            e.preventDefault();
            resultsEl.style.display = 'none';
            input.setAttribute('aria-expanded', 'false');
            input.removeAttribute('aria-activedescendant');
            break;
    }
}

// ── Discovery Panel (empty-state) ──────────────────────────────────

function showDiscoveryPanel(resultsEl) {
    if (!discoveryItems.length) return;

    // Pick a random memory weighted by importance
    const random = pickWeightedRandom(discoveryItems);
    const meta = TYPE_META[random.type] || { icon: '', label: '' };

    // Top 5 most-documented entities
    const top5 = [...searchIndex]
        .sort((a, b) => (b.importance || 0) - (a.importance || 0))
        .slice(0, 5);

    resultsEl.innerHTML = `
        <div class="search-discovery">
            <div class="search-discovery__random">
                <div class="search-discovery__header">
                    <span class="search-discovery__label">Random Memory</span>
                    <button class="search-discovery__refresh" aria-label="Show another random memory"
                            title="Another one">&circlearrowright;</button>
                </div>
                <a href="${random.url}" class="search-discovery__item">
                    <span class="search-result__icon" aria-hidden="true">${meta.icon}</span>
                    <span class="search-discovery__title">${escapeHtml(random.title)}</span>
                    <span class="search-discovery__context">${escapeHtml(random.context)}</span>
                </a>
            </div>
            <div class="search-discovery__top">
                <span class="search-discovery__label">Most Documented</span>
                ${top5.map(item => {
                    const m = TYPE_META[item.type] || { icon: '', label: '' };
                    return `<a href="${item.url}" class="search-discovery__top-item">
                        <span aria-hidden="true">${m.icon}</span> ${escapeHtml(item.title)}
                    </a>`;
                }).join('')}
            </div>
        </div>
    `;
    resultsEl.style.display = 'block';

    // Wire refresh button
    const refreshBtn = resultsEl.querySelector('.search-discovery__refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showDiscoveryPanel(resultsEl);
        });
    }
}

function pickWeightedRandom(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.importance || 1), 0);
    let r = Math.random() * totalWeight;
    for (const item of items) {
        r -= (item.importance || 1);
        if (r <= 0) return item;
    }
    return items[items.length - 1];
}

// ── Index Builder ──────────────────────────────────────────────────

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
            'career.json',
            'traditions.json',
            'entertainment.json',
            'awards_enriched.json',
            'comebacks.json',
            'medical_events.json',
            'locations.json'
        ]);

        // ── Milestones → The Arc ──
        const milestones = data.milestones_enriched || [];
        milestones.forEach(m => {
            searchIndex.push({
                type: 'milestone',
                title: m.milestone || m.title || '',
                context: `${m.year || ''} — ${m.heros_journey_stage || ''}`,
                snippet: m.significance || '',
                room: 'The Arc',
                url: 'arc.html',
                tags: [m.heros_journey_stage, m.category, String(m.year)].filter(Boolean),
                aliases: [],
                importance: m.importance_score || 5,
                year: m.year || 0
            });
        });

        // ── Quotes → The Vault ──
        const quotes = data.quotes || [];
        quotes.forEach(q => {
            const text = q.quote || '';
            searchIndex.push({
                type: 'quote',
                title: text.length > 90 ? text.slice(0, 90) + '\u2026' : text,
                context: `${q.year || ''} — ${q.emotion || ''}`,
                snippet: q.context || '',
                room: 'The Vault',
                url: 'vault.html',
                tags: [q.theme, q.emotion, String(q.year)].filter(Boolean),
                aliases: [],
                importance: 4,
                year: q.year || 0
            });
        });

        // ── People → Constellation ──
        const people = data.people_profiles || [];
        people.forEach(p => {
            const person = p.person || {};
            const name = person.name || '';
            const highlight = p.highlights && p.highlights[0] ? p.highlights[0].highlight : '';
            const activeYears = person.active_years || '';
            const aliases = getAliases(name);
            searchIndex.push({
                type: 'person',
                title: name,
                context: highlight || activeYears,
                snippet: person.relation || person.connection || '',
                room: 'Constellation',
                url: 'constellation.html',
                tags: [person.category, ...aliases.slice(0, 2)].filter(Boolean),
                aliases,
                importance: (person.importance_score || 0) + (p.highlights?.length || 0),
                year: 0
            });
        });

        // ── Fun Facts → Record Book ──
        const facts = data.fun_facts || [];
        facts.forEach(f => {
            searchIndex.push({
                type: 'funfact',
                title: f.fact || f.stat || f.description || '',
                context: f.category || '',
                snippet: '',
                room: 'Record Book',
                url: 'records.html',
                tags: [f.category].filter(Boolean),
                aliases: [],
                importance: 3,
                year: 0
            });
        });

        // ── Travel → The Atlas ──
        const travel = data.travel || [];
        travel.forEach(t => {
            searchIndex.push({
                type: 'travel',
                title: t.destination || '',
                context: `${t.year || ''} — ${t.scope || ''}`,
                snippet: t.highlight || '',
                room: 'The Atlas',
                url: 'atlas.html',
                tags: [t.scope, t.trip_type, String(t.year)].filter(Boolean),
                aliases: [],
                importance: 5,
                year: t.year || 0
            });
        });

        // ── Career → The Dynasty ──
        const career = data.career || [];
        career.forEach(c => {
            searchIndex.push({
                type: 'career',
                title: `${c.title || ''} at ${c.employer || ''}`,
                context: `${c.year || ''}`,
                snippet: c.milestone || '',
                room: 'The Dynasty',
                url: 'dynasty.html',
                tags: [c.employer, String(c.year)].filter(Boolean),
                aliases: [],
                importance: 6,
                year: c.year || 0
            });
        });

        // ── NEW: Traditions ──
        const traditions = data.traditions || [];
        traditions.forEach(t => {
            searchIndex.push({
                type: 'tradition',
                title: t.tradition || '',
                context: `${t.years_active || ''} years`,
                snippet: t.description || '',
                room: 'Record Book',
                url: 'records.html',
                tags: ['tradition'],
                aliases: [],
                importance: 5,
                year: 0
            });
        });

        // ── NEW: Entertainment (Broadway / Concerts) ──
        const entertainment = data.entertainment || [];
        entertainment.forEach(e => {
            searchIndex.push({
                type: 'entertainment',
                title: e.show_name || e.show || '',
                context: `${e.year || ''} — ${e.event_type || ''}`,
                snippet: e.note || '',
                room: 'Record Book',
                url: 'records.html',
                tags: [e.event_type, String(e.year)].filter(Boolean),
                aliases: [],
                importance: 3,
                year: e.year || 0
            });
        });

        // ── NEW: Awards ──
        const awards = data.awards_enriched || [];
        awards.forEach(a => {
            if (!a.winner) return; // Skip empty winners
            const catLabel = (a.category || '').replace(/_/g, ' ');
            searchIndex.push({
                type: 'award',
                title: `${a.winner} — ${catLabel}`,
                context: `${a.year || ''}`,
                snippet: a.note || '',
                room: 'Record Book',
                url: 'records.html',
                tags: [catLabel, a.winner, String(a.year)].filter(Boolean),
                aliases: [],
                importance: 3,
                year: a.year || 0
            });
        });

        // ── NEW: Comebacks ──
        const comebacks = data.comebacks || [];
        comebacks.forEach(c => {
            searchIndex.push({
                type: 'comeback',
                title: c.challenge || '',
                context: `${c.year || ''} — Comeback`,
                snippet: c.comeback || '',
                room: 'The Arc',
                url: 'arc.html',
                tags: ['comeback', 'resilience', String(c.year)].filter(Boolean),
                aliases: [],
                importance: 7,
                year: c.year || 0
            });
        });

        // ── NEW: Medical Events ──
        const medical = data.medical_events || [];
        medical.forEach(m => {
            searchIndex.push({
                type: 'medical',
                title: m.event || '',
                context: `${m.year || ''} — ${m.category || ''}`,
                snippet: m.recovery_note || '',
                room: 'The Arc',
                url: 'arc.html',
                tags: [m.category, m.severity, String(m.year)].filter(Boolean),
                aliases: [],
                importance: m.severity === 'major' ? 6 : 3,
                year: m.year || 0
            });
        });

        // ── NEW: Recurring Locations ──
        const locations = data.locations || [];
        locations.forEach(loc => {
            searchIndex.push({
                type: 'location',
                title: loc.name || '',
                context: loc.location_type || '',
                snippet: loc.note || '',
                room: 'The Atlas',
                url: 'atlas.html',
                tags: [loc.location_type].filter(Boolean),
                aliases: [],
                importance: 4,
                year: 0
            });
        });

        // Build discovery subset (items with high importance or rich data)
        discoveryItems = searchIndex.filter(item => item.importance >= 4);

        // Build spellcheck dictionary from index
        buildDictionary(searchIndex);

        // Build Fuse instance with weighted keys
        fuseInstance = new Fuse(searchIndex, {
            keys: [
                { name: 'title',   weight: 10 },
                { name: 'aliases', weight: 8 },
                { name: 'tags',    weight: 5 },
                { name: 'context', weight: 3 },
                { name: 'snippet', weight: 2 }
            ],
            threshold: 0.4,
            ignoreLocation: true,
            includeScore: true,
            minMatchCharLength: 2
        });

        console.log(`Search: indexed ${searchIndex.length} items across ${Object.keys(TYPE_META).length} types`);
    } catch (e) {
        console.warn('Search index build failed:', e);
    } finally {
        indexBuilding = false;
    }
}

// ── Utility ────────────────────────────────────────────────────────

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Public API (for Vault/Constellation to reuse spellchecker) ─────

export { suggestCorrection } from './search-spellchecker.js';
export function getSearchIndex() { return searchIndex; }
export function isIndexReady() { return !!fuseInstance; }

// ── Auto-init ──────────────────────────────────────────────────────
// NOTE: Do not auto-init here. The search input is rendered by nav.js
// (initNav), which runs AFTER this module's top-level code executes.
// Each page must call initSearch() explicitly after initNav().
