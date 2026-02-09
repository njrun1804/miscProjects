// js/vault.js — Room 6: The Vault (Quotes + Soundtrack)
// Featured quote, year chapters, voice evolution, quote pairs, people, search, soundtrack

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

// Curated quote pairs: thematic echoes across years
const QUOTE_PAIRS = [
    {
        label: 'On Recording Everything',
        earlyId: 47, // "half of these entries don't make any sense"
        lateId: 8,   // "you're welcome for the immortality"
    },
    {
        label: 'On the Greatest Year',
        earlyId: 12, // "2007 was undoubtedly the most colorful"
        lateId: 34,  // "best. longest. most. greatest."
    },
    {
        label: 'On Regret',
        earlyId: 77, // "regret ever regretting"
        lateId: 20,  // "0 = Regrets"
    },
    {
        label: 'On Saying What You Mean',
        earlyId: 46, // "I cannot and will not pass any negative sanction..."
        lateId: 10,  // "the record is the record. next question."
    },
    {
        label: 'On Identity',
        earlyId: 78, // "Inner joy. Endless privilege..." (2008, weeks before coming out)
        lateId: 21,  // "In love, and unashamed by it" (2011)
    },
    {
        label: 'On the Adventure',
        earlyId: 18, // "Walk the plank, take the jump..."
        lateId: 2,   // "the best, the longest, and the greatest"
    },
];

// Voice evolution narrative annotations (hand-written context for key years)
const VOICE_NOTES = {
    2007: 'The beginning. Long sentences, trying to sound important. The writer is discovering his voice.',
    2008: 'The breakthrough year. Grade level drops by half — the voice gets direct, honest, real. 345 words of pure feeling.',
    2009: 'Peak emotional range. Heaven and hell in the same year. The writer earns his confidence.',
    2013: 'The return of ambition. Longer quotes, bigger claims. Thematic coherence peaks.',
    2014: 'The simplest writing yet. Short, punchy, no pretense. Grade level 7.8 — a child could understand it.',
    2017: 'Post-surgery clarity. Vocabulary richness soars. Fewer words, chosen more carefully.',
    2020: 'Pandemic precision. The highest quote density — more worth saying per word than ever.',
    2021: 'The quipmaster era. Average 7 words per quote. Every sentence is a punchline or a thesis.',
};

export async function initVault() {
    const data = await loadMultiple([
        'quotes.json',
        'song_person_map.json',
        'writing_evolution.json',
        'year_keywords.json',
        'life_chapters.json',
        'turning_points_detailed.json',
        'insights_full.json',
        'people_profiles.json'
    ]);

    const quotes = data.quotes || [];
    const songs = data.song_person_map || [];
    const evolution = data.writing_evolution || [];
    const keywords = data.year_keywords || [];
    const chapters = data.life_chapters || [];
    const turningPoints = data.turning_points_detailed || [];
    const insights = data.insights_full || [];
    const profiles = data.people_profiles || [];

    renderFeaturedQuote(quotes);
    initSearch(quotes);
    renderFilters(quotes);
    renderQuoteWall(quotes, keywords, chapters, turningPoints);
    renderPairs(quotes);
    renderEvolution(evolution);
    renderPeople(quotes, profiles);
    renderInsights(insights);
    renderSoundtrack(songs);
}

// ── Featured Quote (cinematic hero, random on load) ──

function renderFeaturedQuote(quotes) {
    const container = document.querySelector('.vault-featured');
    if (!container) return;

    // Pick from quotes with substantial text (>30 chars)
    const candidates = quotes.filter(q => q.quote && q.quote.length > 30);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (!pick) return;

    container.innerHTML = `
        <div class="vault-featured__card">
            <div class="vault-featured__quote">&ldquo;${pick.quote}&rdquo;</div>
            <div class="vault-featured__meta">
                <span class="vault-featured__context">${pick.context || ''}</span>
                <span class="vault-featured__year">${pick.year || ''}</span>
            </div>
        </div>
    `;
}

// ── Search (Fuse.js) ──

function initSearch(quotes) {
    const input = document.querySelector('.vault-search');
    const countEl = document.querySelector('.vault-search-count');
    if (!input) return;

    const fuse = new Fuse(quotes, {
        keys: ['quote', 'context'],
        threshold: 0.35,
        ignoreLocation: true,
    });

    let searchActive = false;

    input.addEventListener('input', () => {
        const query = input.value.trim();
        const cards = document.querySelectorAll('.vault-quote-card');
        const yearHeaders = document.querySelectorAll('.vault-year-chapter');

        if (!query) {
            searchActive = false;
            cards.forEach(c => c.classList.remove('dimmed', 'search-match'));
            yearHeaders.forEach(h => h.classList.remove('dimmed'));
            if (countEl) countEl.textContent = '';
            return;
        }

        searchActive = true;
        const results = fuse.search(query);
        const matchIds = new Set(results.map(r => String(r.item.id)));

        cards.forEach(card => {
            if (matchIds.has(card.dataset.id)) {
                card.classList.remove('dimmed');
                card.classList.add('search-match');
            } else {
                card.classList.add('dimmed');
                card.classList.remove('search-match');
            }
        });

        // Dim year headers that have no visible cards
        yearHeaders.forEach(header => {
            const year = header.dataset.year;
            const yearCards = document.querySelectorAll(`.vault-quote-card[data-year="${year}"]`);
            const anyVisible = [...yearCards].some(c => !c.classList.contains('dimmed'));
            header.classList.toggle('dimmed', !anyVisible);
        });

        if (countEl) {
            countEl.textContent = results.length ? `${results.length} match${results.length !== 1 ? 'es' : ''}` : 'No matches';
        }
    });
}

// ── Theme Filters ──

function renderFilters(quotes) {
    const container = document.querySelector('.vault-filters');
    if (!container) return;

    const themeCounts = {};
    quotes.forEach(q => {
        const t = q.theme || 'other';
        themeCounts[t] = (themeCounts[t] || 0) + 1;
    });

    const sorted = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]);

    container.innerHTML = `
        <button class="vault-filter active" data-theme="all">All (${quotes.length})</button>
        ${sorted.map(([theme, count]) =>
            `<button class="vault-filter" data-theme="${theme}">${theme} (${count})</button>`
        ).join('')}
    `;

    const countEl = document.querySelector('.vault-filter-count');

    container.addEventListener('click', (e) => {
        const btn = e.target.closest('.vault-filter');
        if (!btn) return;

        container.querySelectorAll('.vault-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const theme = btn.dataset.theme;
        const cards = document.querySelectorAll('.vault-quote-card');
        const yearHeaders = document.querySelectorAll('.vault-year-chapter');
        let shown = 0;

        cards.forEach(card => {
            if (theme === 'all' || card.dataset.theme === theme) {
                card.classList.remove('dimmed');
                shown++;
            } else {
                card.classList.add('dimmed');
            }
        });

        // Dim year headers with no visible cards
        yearHeaders.forEach(header => {
            const year = header.dataset.year;
            const yearCards = document.querySelectorAll(`.vault-quote-card[data-year="${year}"]`);
            const anyVisible = [...yearCards].some(c => !c.classList.contains('dimmed'));
            header.classList.toggle('dimmed', !anyVisible);
        });

        if (countEl) {
            countEl.textContent = theme === 'all' ? '' : `Showing ${shown} of ${quotes.length} quotes`;
        }
    });
}

// ── Quote Wall: Year Chapters ──

function renderQuoteWall(quotes, keywords, chapters, turningPoints) {
    const wall = document.querySelector('.vault-quote-wall');
    if (!wall) return;

    const sorted = [...quotes].sort((a, b) => (a.year || 0) - (b.year || 0));

    // Build keyword lookup
    const kwMap = {};
    keywords.forEach(k => {
        const raw = (k.keywords || '').split(', ');
        const clean = raw
            .filter(w => w.length > 2 && !/^\d+$/.test(w))
            .slice(0, 4);
        kwMap[k.year] = clean;
    });

    // Build chapter lookup: year → chapter info
    const chapterMap = {};
    chapters.forEach(ch => {
        let years;
        try { years = JSON.parse(ch.years); } catch { years = []; }
        if (Array.isArray(years)) {
            years.forEach(y => { chapterMap[y] = ch; });
        }
    });

    // Build turning point lookup: year → array of turning points
    const tpMap = {};
    turningPoints.forEach(tp => {
        const y = tp.turning_point_year;
        if (!tpMap[y]) tpMap[y] = [];
        tpMap[y].push(tp);
    });

    // Track which chapters we've already rendered a banner for
    const renderedChapters = new Set();

    // Group by year
    const byYear = {};
    sorted.forEach(q => {
        const y = q.year || 'Unknown';
        if (!byYear[y]) byYear[y] = [];
        byYear[y].push(q);
    });

    const TYPE_ICONS = { redemptive: '&#9650;', contaminated: '&#9660;', stable: '&#9670;' };

    let html = '';
    for (const [year, yearQuotes] of Object.entries(byYear)) {
        const kw = kwMap[year] || [];
        const kwHtml = kw.length
            ? `<span class="vault-year-keywords">${kw.join(' / ')}</span>`
            : '';

        // Chapter banner (only on first year of each chapter)
        const ch = chapterMap[year];
        let chapterHtml = '';
        if (ch && !renderedChapters.has(ch.chapter_number)) {
            renderedChapters.add(ch.chapter_number);
            // Extract short theme (before the first |)
            const shortTheme = (ch.theme || '').split('|')[0].trim();
            chapterHtml = `
                <div class="vault-chapter-banner">
                    <span class="vault-chapter-label">Chapter ${ch.chapter_number}</span>
                    <span class="vault-chapter-theme">${shortTheme}</span>
                </div>
            `;
        }

        // Turning point markers for this year
        const tps = tpMap[year] || [];
        let tpHtml = '';
        if (tps.length) {
            tpHtml = tps.map(tp => {
                const icon = TYPE_ICONS[tp.type] || '&#9679;';
                return `<span class="vault-tp-marker vault-tp--${tp.type}" title="${tp.event}">${icon} ${tp.event}</span>`;
            }).join('');
            tpHtml = `<div class="vault-tp-row">${tpHtml}</div>`;
        }

        html += `
            <div class="vault-year-chapter" data-year="${year}">
                ${chapterHtml}
                <div class="vault-year-header">
                    <span class="vault-year-number">${year}</span>
                    ${kwHtml}
                    <span class="vault-year-count">${yearQuotes.length} quote${yearQuotes.length !== 1 ? 's' : ''}</span>
                </div>
                ${tpHtml}
            </div>
        `;

        html += yearQuotes.map(q => {
            const theme = q.theme || 'other';
            const text = q.quote || '';

            return `
                <div class="vault-quote-card" data-theme="${theme}" data-year="${q.year || ''}" data-id="${q.id}">
                    <div class="vault-quote-card__text">&ldquo;${text}&rdquo;</div>
                    <div class="vault-quote-card__meta">
                        <span class="vault-quote-card__context">${q.context || ''}</span>
                        <span class="vault-quote-card__year">${q.year || ''}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    wall.innerHTML = html;
}

// ── Then & Now: Quote Pairs ──

function renderPairs(quotes) {
    const grid = document.querySelector('.vault-pairs-grid');
    if (!grid) return;

    const quoteMap = {};
    quotes.forEach(q => { quoteMap[q.id] = q; });

    grid.innerHTML = QUOTE_PAIRS.map(pair => {
        const early = quoteMap[pair.earlyId];
        const late = quoteMap[pair.lateId];
        if (!early || !late) return '';

        const gap = (late.year || 0) - (early.year || 0);

        return `
            <div class="vault-pair">
                <div class="vault-pair__label">${pair.label}</div>
                <div class="vault-pair__cards">
                    <div class="vault-pair__card vault-pair__card--then">
                        <div class="vault-pair__year">${early.year}</div>
                        <div class="vault-pair__quote">&ldquo;${early.quote}&rdquo;</div>
                        <div class="vault-pair__context">${early.context || ''}</div>
                    </div>
                    <div class="vault-pair__arrow">${gap} years</div>
                    <div class="vault-pair__card vault-pair__card--now">
                        <div class="vault-pair__year">${late.year}</div>
                        <div class="vault-pair__quote">&ldquo;${late.quote}&rdquo;</div>
                        <div class="vault-pair__context">${late.context || ''}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ── Voice Evolution ──

function renderEvolution(evolution) {
    const container = document.querySelector('.vault-evolution-timeline');
    if (!container) return;

    // Only show years that have quotes (non-zero total_words) and meaningful data
    const meaningful = evolution.filter(e => e.total_words >= 30);

    // Find max values for scaling bars
    const maxWords = Math.max(...meaningful.map(e => e.total_words));
    const maxRange = Math.max(...meaningful.map(e => e.emotional_range || 0));

    container.innerHTML = meaningful.map(e => {
        const note = VOICE_NOTES[e.year] || '';
        const wordsWidth = Math.round((e.total_words / maxWords) * 100);
        const rangeWidth = Math.round(((e.emotional_range || 0) / maxRange) * 100);
        const richness = Math.round((e.vocabulary_richness || 0) * 100);

        return `
            <div class="vault-evo-row${note ? ' vault-evo-row--notable' : ''}">
                <div class="vault-evo-year">${e.year}</div>
                <div class="vault-evo-stats">
                    <div class="vault-evo-stat">
                        <span class="vault-evo-label">Words</span>
                        <div class="vault-evo-bar"><div class="vault-evo-bar__fill vault-evo-bar--words" style="width:${wordsWidth}%"></div></div>
                        <span class="vault-evo-value">${e.total_words}</span>
                    </div>
                    <div class="vault-evo-stat">
                        <span class="vault-evo-label">Emotional Range</span>
                        <div class="vault-evo-bar"><div class="vault-evo-bar__fill vault-evo-bar--range" style="width:${rangeWidth}%"></div></div>
                        <span class="vault-evo-value">${(e.emotional_range || 0).toFixed(1)}</span>
                    </div>
                    <div class="vault-evo-stat">
                        <span class="vault-evo-label">Vocabulary</span>
                        <div class="vault-evo-bar"><div class="vault-evo-bar__fill vault-evo-bar--vocab" style="width:${richness}%"></div></div>
                        <span class="vault-evo-value">${richness}%</span>
                    </div>
                </div>
                ${note ? `<div class="vault-evo-note">${note}</div>` : ''}
            </div>
        `;
    }).join('');
}

// ── People Behind the Words ──

// Alias map: alternate name forms → canonical profile name
const NAME_ALIASES = {
    'James Butler': 'Jim Butler',
    'Jim Butler': 'Jim Butler',
    'Pam D': 'Pam',
    'Kevin Megill': 'Kevin Megill (KMJ)',
    'KMJ': 'Kevin Megill (KMJ)',
    'Leah N': 'Kevin & Leah (KMJ & LN)',
    'Kevin & Leah': 'Kevin & Leah (KMJ & LN)',
    'Ryan Letsche': 'Ryan Letsche',
    'RL': 'RL (Letsche)',
    'RyGuy': 'Ryan Letsche',
    'Tim M': 'Tim Moore',
    'Edwards': 'Edwards',
    'C. Adams': 'Chris Adams',
    'Mike Lanza': 'Chef Lanza',
    'Danny Sponge': 'Dan Spengeman',
    'Spengeman': 'Dan Spengeman',
    'ValPal': 'Valerie Winston (ValPal)',
    'Valerie': 'Valerie Winston (ValPal)',
    'Lauren Winston': 'Lauren Winston',
    'Rupert': 'Rupert',
    'Rob': 'Rob',
    'Michael': 'Michael',
    'Ma': 'Ma',
    'The Pops': 'The Pops',
    'Diana DiBuccio': 'Diana DiBuccio',
    'Phil Campanella': 'Phil Campanella',
    'Jackie T': 'Jackie Amorino',
    'Matt': 'Matt (introduced Jul 3, 2019)',
    'Theresa Lee': 'Grandma Theresa',
    'melsa': 'Melissa Kerr',
    'The Undertaker': 'The Undertaker',
    'George Michael': 'George Michael',
    'Juan': 'Juan Londono (Muffin Man)',
    'Julian': 'Julian',
    'Grammy Nancy': 'Grammy Nancy',
    'Grammy': 'Grammy Nancy',
    'Megan': 'Megan',
    'Grace': 'Grace',
    'Shane': 'Shane',
    'Alison': 'Alison Bertsch',
};

// Category display config
const CATEGORY_CONFIG = {
    family:       { label: 'Family',       color: '#c9a84c' },
    partner:      { label: 'Partner',      color: '#c07070' },
    inner_circle: { label: 'Inner Circle', color: '#6a8fb0' },
    ecd_player:   { label: 'ECD',          color: '#7ab07a' },
    other:        { label: 'Friend',       color: '#8a8a9a' },
};

// Event type colors for mini-timeline dots
const EVENT_TYPE_COLORS = {
    wwe:       '#c9a84c',
    social:    '#6a8fb0',
    travel:    '#7ab07a',
    milestone: '#c07070',
    award:     '#d4a24e',
    ecd:       '#8a7ab0',
};

function renderPeople(quotes, profiles) {
    const grid = document.querySelector('.vault-people-grid');
    if (!grid) return;

    // Build profile lookup: canonical name → profile entry
    const profileMap = {};
    if (Array.isArray(profiles)) {
        profiles.forEach(entry => {
            if (entry?.person?.name) {
                profileMap[entry.person.name] = entry;
            }
        });
    }

    // Scan all quotes for people mentions
    const quoteMentions = {}; // canonical name → [quote objects]
    const SEARCH_NAMES = Object.keys(NAME_ALIASES);

    quotes.forEach(q => {
        const haystack = `${q.quote || ''} ${q.context || ''}`;
        for (const alias of SEARCH_NAMES) {
            if (haystack.includes(alias)) {
                const canonical = NAME_ALIASES[alias];
                if (!quoteMentions[canonical]) quoteMentions[canonical] = [];
                if (!quoteMentions[canonical].some(existing => existing.id === q.id)) {
                    quoteMentions[canonical].push(q);
                }
            }
        }
    });

    // Also scan for profile names directly (catches names not in alias map)
    quotes.forEach(q => {
        const haystack = `${q.quote || ''} ${q.context || ''}`;
        Object.keys(profileMap).forEach(name => {
            if (name.length > 3 && haystack.includes(name)) {
                if (!quoteMentions[name]) quoteMentions[name] = [];
                if (!quoteMentions[name].some(existing => existing.id === q.id)) {
                    quoteMentions[name].push(q);
                }
            }
        });
    });

    // ── Build the three tiers ──

    // Tier 1: Featured — family + partner with rich profiles (importance > 25)
    const tier1Names = ['Ma', 'The Pops', 'Rob', 'Michael'];

    // Tier 2: Quoted — people who appear in vault quotes and have profiles
    // Tier 3: The Unquoted — high-importance people who never appear in vault quotes

    const tier1 = [];
    const tier2 = [];
    const tier3 = [];
    const usedNames = new Set();

    // Build tier 1
    tier1Names.forEach(name => {
        const profile = profileMap[name];
        if (profile) {
            tier1.push({ profile, quoteCount: (quoteMentions[name] || []).length, quotes: quoteMentions[name] || [] });
            usedNames.add(name);
        }
    });

    // Build tier 2: quoted people with profiles, sorted by importance
    Object.entries(quoteMentions).forEach(([name, qs]) => {
        if (usedNames.has(name)) return;
        const profile = profileMap[name];
        if (profile && profile.person) {
            tier2.push({ profile, quoteCount: qs.length, quotes: qs });
            usedNames.add(name);
        }
    });
    tier2.sort((a, b) => (b.profile.person.importance_score || 0) - (a.profile.person.importance_score || 0));

    // Build tier 3: unquoted people with importance > 5 or rich profiles
    Object.entries(profileMap).forEach(([name, entry]) => {
        if (usedNames.has(name)) return;
        const p = entry.person || {};
        const richness = (entry.highlights || []).length + (entry.timeline_events || []).length;
        if ((p.importance_score || 0) >= 10 || richness >= 3) {
            tier3.push({ profile: entry, quoteCount: 0, quotes: [] });
            usedNames.add(name);
        }
    });
    tier3.sort((a, b) => (b.profile.person.importance_score || 0) - (a.profile.person.importance_score || 0));

    // ── Render ──
    let html = '';

    // Tier 1: Featured people — large cards
    if (tier1.length) {
        html += '<div class="vault-people-tier vault-people-tier--featured">';
        html += tier1.map(item => renderFeaturedPersonCard(item)).join('');
        html += '</div>';
    }

    // Tier 2: Quoted people — medium cards
    if (tier2.length) {
        html += `<div class="vault-people-tier-label">Also in the Vault</div>`;
        html += '<div class="vault-people-tier vault-people-tier--quoted">';
        html += tier2.map(item => renderQuotedPersonCard(item)).join('');
        html += '</div>';
    }

    // Tier 3: The Unquoted — special section
    if (tier3.length) {
        html += `
            <div class="vault-people-unquoted">
                <div class="vault-people-unquoted__label">The Unquoted</div>
                <div class="vault-people-unquoted__note">Some people are so woven into the fabric that the fabric forgets to name them.</div>
                <div class="vault-people-tier vault-people-tier--unquoted">
                    ${tier3.map(item => renderUnquotedPersonCard(item)).join('')}
                </div>
            </div>
        `;
    }

    grid.innerHTML = html;
}

function renderFeaturedPersonCard(item) {
    const p = item.profile.person || {};
    const events = item.profile.timeline_events || [];
    const highlights = item.profile.highlights || [];
    const coOccurrences = item.profile.co_occurrences || [];
    const cat = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.other;
    const maxImportance = 257; // Ma's score — the ceiling

    // Year range from timeline events
    const eventYears = events.map(e => e.year).filter(Boolean).sort((a, b) => a - b);
    const yearRange = eventYears.length > 1
        ? `${eventYears[0]}–${eventYears[eventYears.length - 1]}`
        : p.active_years || '';

    // Importance bar width (percentage of max)
    const importancePct = Math.min(((p.importance_score || 0) / maxImportance) * 100, 100);

    // Build mini-timeline: dots by year, colored by event type
    const miniTimeline = buildMiniTimeline(events);

    // Best highlight
    const bestHighlight = highlights.length > 0
        ? highlights.reduce((best, h) => (h.vader_compound || 0) > (best.vader_compound || 0) ? h : best, highlights[0])
        : null;

    // Sample quote from vault
    const sampleQuote = item.quotes.length > 0
        ? item.quotes.reduce((best, q) => (q.quote || '').length > (best.quote || '').length ? q : best, item.quotes[0])
        : null;

    // Connection text
    const connection = p.connection || p.relation || '';

    return `
        <div class="vault-person-card vault-person-card--featured">
            <div class="vault-person-card__header">
                <div class="vault-person-card__name">${p.name}</div>
                <span class="vault-person-card__category" style="background: ${cat.color}20; color: ${cat.color}; border-color: ${cat.color}40">${cat.label}${p.relation ? ' &middot; ' + p.relation : ''}</span>
            </div>
            ${connection && connection !== p.relation ? `<div class="vault-person-card__connection">${connection}</div>` : ''}
            <div class="vault-person-card__importance">
                <div class="vault-person-card__importance-bar">
                    <div class="vault-person-card__importance-fill" style="width: ${importancePct}%"></div>
                </div>
                <span class="vault-person-card__importance-score">${Math.round(p.importance_score || 0)}</span>
            </div>
            ${yearRange ? `<div class="vault-person-card__years">${yearRange}</div>` : ''}
            ${miniTimeline}
            ${bestHighlight ? `<div class="vault-person-card__highlight">${bestHighlight.highlight}</div>` : ''}
            ${sampleQuote ? `
                <div class="vault-person-card__quote">
                    &ldquo;${sampleQuote.quote.length > 120 ? sampleQuote.quote.slice(0, 120) + '...' : sampleQuote.quote}&rdquo;
                    <span class="vault-person-card__quote-year">${sampleQuote.year}</span>
                </div>
            ` : ''}
            <div class="vault-person-card__stats">
                ${item.quoteCount > 0 ? `<span class="vault-person-card__stat">${item.quoteCount} vault quote${item.quoteCount !== 1 ? 's' : ''}</span>` : ''}
                ${events.length > 0 ? `<span class="vault-person-card__stat">${events.length} timeline event${events.length !== 1 ? 's' : ''}</span>` : ''}
                ${coOccurrences.length > 0 ? `<span class="vault-person-card__stat">${coOccurrences.length} connection${coOccurrences.length !== 1 ? 's' : ''}</span>` : ''}
            </div>
        </div>
    `;
}

function renderQuotedPersonCard(item) {
    const p = item.profile.person || {};
    const highlights = item.profile.highlights || [];
    const events = item.profile.timeline_events || [];
    const cat = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.other;
    const maxImportance = 257;
    const importancePct = Math.min(((p.importance_score || 0) / maxImportance) * 100, 100);

    const bestHighlight = highlights.length > 0 ? highlights[0] : null;
    const sampleQuote = item.quotes.length > 0 ? item.quotes[0] : null;
    const yearRange = p.active_years || '';

    return `
        <div class="vault-person-card vault-person-card--quoted">
            <div class="vault-person-card__header">
                <div class="vault-person-card__name">${p.name}</div>
                <span class="vault-person-card__category" style="background: ${cat.color}20; color: ${cat.color}; border-color: ${cat.color}40">${cat.label}</span>
            </div>
            ${p.connection ? `<div class="vault-person-card__connection">${p.connection}</div>` : ''}
            <div class="vault-person-card__importance">
                <div class="vault-person-card__importance-bar">
                    <div class="vault-person-card__importance-fill" style="width: ${importancePct}%"></div>
                </div>
                <span class="vault-person-card__importance-score">${Math.round(p.importance_score || 0)}</span>
            </div>
            ${yearRange ? `<div class="vault-person-card__years">${yearRange}</div>` : ''}
            ${bestHighlight ? `<div class="vault-person-card__highlight">${bestHighlight.highlight}</div>` : ''}
            ${sampleQuote ? `
                <div class="vault-person-card__quote">
                    &ldquo;${sampleQuote.quote.length > 80 ? sampleQuote.quote.slice(0, 80) + '...' : sampleQuote.quote}&rdquo;
                    <span class="vault-person-card__quote-year">${sampleQuote.year}</span>
                </div>
            ` : ''}
            <div class="vault-person-card__stats">
                <span class="vault-person-card__stat">${item.quoteCount} quote${item.quoteCount !== 1 ? 's' : ''}</span>
                ${events.length > 0 ? `<span class="vault-person-card__stat">${events.length} event${events.length !== 1 ? 's' : ''}</span>` : ''}
            </div>
        </div>
    `;
}

function renderUnquotedPersonCard(item) {
    const p = item.profile.person || {};
    const highlights = item.profile.highlights || [];
    const events = item.profile.timeline_events || [];
    const cat = CATEGORY_CONFIG[p.category] || CATEGORY_CONFIG.other;

    const bestHighlight = highlights.length > 0 ? highlights[0] : null;
    const yearRange = p.active_years || '';

    return `
        <div class="vault-person-card vault-person-card--unquoted">
            <div class="vault-person-card__header">
                <div class="vault-person-card__name">${p.name}</div>
                <span class="vault-person-card__category" style="background: ${cat.color}20; color: ${cat.color}; border-color: ${cat.color}40">${cat.label}${p.relation ? ' &middot; ' + p.relation : ''}</span>
            </div>
            ${yearRange ? `<div class="vault-person-card__years">${yearRange}</div>` : ''}
            ${bestHighlight ? `<div class="vault-person-card__highlight">${bestHighlight.highlight}</div>` : ''}
            <div class="vault-person-card__stats">
                <span class="vault-person-card__stat">importance: ${Math.round(p.importance_score || 0)}</span>
                ${events.length > 0 ? `<span class="vault-person-card__stat">${events.length} event${events.length !== 1 ? 's' : ''}</span>` : ''}
                ${highlights.length > 0 ? `<span class="vault-person-card__stat">${highlights.length} highlight${highlights.length !== 1 ? 's' : ''}</span>` : ''}
            </div>
        </div>
    `;
}

function buildMiniTimeline(events) {
    if (!events.length) return '';

    const years = events.map(e => e.year).filter(Boolean);
    if (!years.length) return '';

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const span = maxYear - minYear || 1;

    // Group events by year for dot sizing
    const byYear = {};
    events.forEach(e => {
        if (!e.year) return;
        if (!byYear[e.year]) byYear[e.year] = [];
        byYear[e.year].push(e);
    });

    const dots = Object.entries(byYear).map(([year, yearEvents]) => {
        const pct = ((year - minYear) / span) * 100;
        const primaryType = yearEvents[0].event_type || 'social';
        const color = EVENT_TYPE_COLORS[primaryType] || '#8a8a9a';
        const size = Math.min(4 + yearEvents.length * 2, 10);
        const title = yearEvents.map(e => `${e.year}: ${e.event_description}`).join('\n');

        return `<div class="vault-timeline-dot" style="left:${pct}%; width:${size}px; height:${size}px; background:${color}" title="${title.replace(/"/g, '&quot;')}"></div>`;
    }).join('');

    return `
        <div class="vault-person-card__timeline">
            <span class="vault-timeline-year">${minYear}</span>
            <div class="vault-timeline-track">${dots}</div>
            <span class="vault-timeline-year">${maxYear}</span>
        </div>
    `;
}

// ── What the Archive Reveals ──

function renderInsights(insights) {
    const grid = document.querySelector('.vault-insights-grid');
    if (!grid || !insights.length) return;

    // Curate the most interesting categories
    const FEATURED_CATEGORIES = [
        'narrative', 'origin', 'counter_narrative', 'deep_dive',
        'writing', 'health', 'relationships', 'patterns'
    ];

    const featured = insights
        .filter(i => FEATURED_CATEGORIES.includes(i.category))
        .sort((a, b) => (a.sort_order || 99) - (b.sort_order || 99))
        .slice(0, 12);

    if (!featured.length) return;

    const CATEGORY_LABELS = {
        narrative: 'Narrative',
        origin: 'Origin Story',
        counter_narrative: 'Counter-Narrative',
        deep_dive: 'Deep Dive',
        writing: 'Writing',
        health: 'Health',
        relationships: 'Relationships',
        patterns: 'Patterns',
    };

    grid.innerHTML = featured.map(insight => {
        const cat = CATEGORY_LABELS[insight.category] || insight.category;
        // Clean detail: if it's JSON stringified, just show the plain detail text
        let detail = insight.detail || '';
        if (detail.startsWith('{')) {
            try {
                const obj = JSON.parse(detail);
                detail = Object.entries(obj)
                    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
                    .join('. ');
            } catch { /* leave as-is */ }
        }
        // Truncate long details
        if (detail.length > 200) detail = detail.slice(0, 200) + '...';

        return `
            <div class="vault-insight-card">
                <span class="vault-insight-cat">${cat}</span>
                <div class="vault-insight-title">${insight.title}</div>
                <div class="vault-insight-value">${insight.value}</div>
                <div class="vault-insight-detail">${detail}</div>
            </div>
        `;
    }).join('');
}

// ── Soundtrack ──

function renderSoundtrack(songs) {
    const grid = document.querySelector('.vault-soundtrack-grid');
    if (!grid || !songs.length) return;

    const sorted = [...songs].sort((a, b) => (a.year_of_connection || 0) - (b.year_of_connection || 0));

    grid.innerHTML = sorted.map((s, i) => `
        <div class="vault-song-card">
            <div class="vault-song-card__number">${i + 1}</div>
            <div class="vault-song-card__song">${s.song}</div>
            <div class="vault-song-card__artist">${s.artist}</div>
            <div class="vault-song-card__divider"></div>
            <div class="vault-song-card__person">${s.person}</div>
            <div class="vault-song-card__story">${s.story}</div>
            <div class="vault-song-card__year">${s.year_of_connection || ''}</div>
        </div>
    `).join('');
}

// Auto-init
initVault()
    .then(() => initWormholes('vault'))
    .then(() => plantClue('clue6', document.querySelector('.vault-featured')))
    .catch(() => {
        const el = document.querySelector('.vault-quote-wall');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
