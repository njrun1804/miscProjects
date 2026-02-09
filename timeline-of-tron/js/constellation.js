// js/constellation.js — Room 2: The Constellation (People + Relationships)
// D3 force graph with advanced graph analytics: PageRank, community detection,
// betweenness centrality, relationship decay, and temporal evolution

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';
import {
    computePageRank,
    computeBetweenness,
    computeClusteringCoeff,
    detectCommunities,
    computeRelationshipStrength,
    computeNetworkHealth,
    computePersonScores,
    computeTemporalEvolution
} from './graph-analytics.js';

const ERA_COLORS = {
    early: '#4a90d9',    // 2004-2008: blue
    growth: '#4a6741',   // 2009-2012: green
    peak: '#6b4a8b',     // 2013-2016: purple
    mature: '#c9a84c'    // 2017+: gold
};

const ERA_LABELS = {
    early: '2004–2008',
    growth: '2009–2012',
    peak: '2013–2016',
    mature: '2017+'
};

function getEraColor(firstYear) {
    if (!firstYear || firstYear <= 2008) return ERA_COLORS.early;
    if (firstYear <= 2012) return ERA_COLORS.growth;
    if (firstYear <= 2016) return ERA_COLORS.peak;
    return ERA_COLORS.mature;
}

function getEraKey(firstYear) {
    if (!firstYear || firstYear <= 2008) return 'early';
    if (firstYear <= 2012) return 'growth';
    if (firstYear <= 2016) return 'peak';
    return 'mature';
}

// Build a name→profile lookup from the people_profiles array
function buildProfileMap(profilesArray) {
    const map = {};
    if (!Array.isArray(profilesArray)) return map;
    profilesArray.forEach(entry => {
        const name = entry?.person?.name;
        if (name) {
            map[name] = {
                basic: entry.person,
                highlights: entry.highlights || [],
                timeline: entry.timeline_events || [],
                co_occurrences: entry.co_occurrences || [],
                connections: [],
                awards: [],
                songs: [],
                lj_comments: []
            };
        }
    });
    return map;
}

// Build a name→people record lookup from people.json array
function buildPeopleMap(peopleArray) {
    const map = {};
    if (!Array.isArray(peopleArray)) return map;
    peopleArray.forEach(p => {
        if (p.name) map[p.name] = p;
    });
    return map;
}

// Build a name→arc record lookup from person_arc.json array
function buildArcMap(arcArray) {
    const map = {};
    if (!Array.isArray(arcArray)) return map;
    arcArray.forEach(a => {
        if (a.person) map[a.person] = a;
    });
    return map;
}

// Compute how much content a person actually has
function getDataRichness(name, profile) {
    if (!profile) return { total: 0, timeline: 0, highlights: 0, awards: 0, connections: 0, coOccurrences: 0, songs: 0, ljComments: 0 };
    const timeline = profile.timeline?.length || 0;
    const highlights = profile.highlights?.length || 0;
    const awards = profile.awards?.length || 0;
    const connections = profile.connections?.length || 0;
    const coOccurrences = profile.co_occurrences?.length || 0;
    const songs = profile.songs?.length || 0;
    const ljComments = profile.lj_comments?.length || 0;
    return {
        total: timeline + highlights + awards + connections + coOccurrences + songs + ljComments,
        timeline, highlights, awards, connections, coOccurrences, songs, ljComments
    };
}

// Build a human-readable summary of what content exists ("49 events, 6 awards")
function richnessSummary(r) {
    const parts = [];
    if (r.timeline) parts.push(`${r.timeline} event${r.timeline > 1 ? 's' : ''}`);
    if (r.highlights) parts.push(`${r.highlights} highlight${r.highlights > 1 ? 's' : ''}`);
    if (r.awards) parts.push(`${r.awards} award${r.awards > 1 ? 's' : ''}`);
    if (r.songs) parts.push(`${r.songs} song${r.songs > 1 ? 's' : ''}`);
    if (r.coOccurrences) parts.push(`${r.coOccurrences} shared moment${r.coOccurrences > 1 ? 's' : ''}`);
    return parts.join(', ');
}

// Format award category names nicely
function formatAwardCategory(cat) {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Parse "2005-2021" into { first: 2005, last: 2021 }
function parseActiveYears(str) {
    if (!str) return null;
    const m = str.match(/(\d{4})\s*-\s*(\d{4})/);
    if (m) return { first: parseInt(m[1]), last: parseInt(m[2]) };
    const single = str.match(/(\d{4})/);
    if (single) return { first: parseInt(single[1]), last: parseInt(single[1]) };
    return null;
}

// Module-level refs so features can cross-communicate
let allNodes = [];
let allLinks = [];
let svgNode = null;
let svgLink = null;
let simulation = null;
let profilesData = {};
let peopleData = {};
let arcData = {};
let coOccurrencesData = [];
let ecdPlayersData = {};
let ecdAwardsData = [];
let ecdPlayerNetworkData = { nodes: [], links: [] };
let songsByPerson = {};
let lifeChaptersData = [];

// ─── Advanced Analytics Results ──────────────────────────────────
let analyticsPageRank = new Map();
let analyticsBetweenness = new Map();
let analyticsClustering = new Map();
let analyticsCommunities = { communities: new Map(), modularity: 0, communityColors: new Map() };
let analyticsRelStrength = new Map();
let analyticsNetworkHealth = {};
let analyticsPersonScores = new Map();
let analyticsTemporalEvolution = [];
let analyticsReady = false;

// Build a name→ECD player lookup (case-insensitive matching for awards)
function buildEcdPlayerMap(playersArray) {
    const map = {};
    if (!Array.isArray(playersArray)) return map;
    playersArray.forEach(p => {
        if (p.name) map[p.name] = p;
    });
    return map;
}

// Build a name→songs lookup from song_person_map.json
function buildSongPersonMap(songArray) {
    const map = {};
    if (!Array.isArray(songArray)) return map;
    songArray.forEach(s => {
        if (!s.person) return;
        if (!map[s.person]) map[s.person] = [];
        map[s.person].push(s);
    });
    return map;
}

export async function initConstellation() {
    // Core data (required)
    const data = await loadMultiple([
        'relationship_constellation.json',
        'people_profiles.json',
        'people.json',
        'person_arc.json',
        'person_timelines.json',
        'co_occurrences.json',
        'life_chapters.json',
        'temporal_network.json'
    ]);
    // Optional enrichment data — don't block page if missing
    try {
        const extras = await loadMultiple(['people_highlights.json', 'ecd_players.json', 'ecd_awards_v2.json', 'song_person_map.json', 'ecd_player_network.json']);
        data.people_highlights = extras.people_highlights;
        data.ecd_players = extras.ecd_players;
        data.ecd_awards_v2 = extras.ecd_awards_v2;
        data.song_person_map = extras.song_person_map;
        data.ecd_player_network = extras.ecd_player_network;
    } catch (_) { /* enrichment data unavailable — page still works */ }

    const constellation = data.relationship_constellation;
    profilesData = buildProfileMap(data.people_profiles);
    peopleData = buildPeopleMap(data.people);
    arcData = buildArcMap(data.person_arc);
    coOccurrencesData = data.co_occurrences || [];
    ecdPlayersData = buildEcdPlayerMap(data.ecd_players);
    ecdAwardsData = data.ecd_awards_v2 || [];
    ecdPlayerNetworkData = data.ecd_player_network || { nodes: [], links: [] };
    lifeChaptersData = data.life_chapters || [];
    songsByPerson = buildSongPersonMap(data.song_person_map);

    // Enrich profiles with person_timelines data for people who have events there
    // but not in people_profiles (covers more people)
    const personTimelines = data.person_timelines || [];
    personTimelines.forEach(evt => {
        const name = evt.person_name;
        if (!name) return;
        if (!profilesData[name]) {
            profilesData[name] = {
                basic: peopleData[name] || { name },
                highlights: [],
                timeline: [],
                co_occurrences: [],
                connections: [],
                awards: [],
                songs: [],
                lj_comments: []
            };
        }
        // Avoid duplicates by checking if this event is already present
        const existing = profilesData[name].timeline;
        const isDupe = existing.some(e =>
            e.year === evt.year && (e.event_description || e.event || '') === (evt.event_description || '')
        );
        if (!isDupe) {
            existing.push({
                year: evt.year,
                event: evt.event_description,
                event_type: evt.event_type
            });
        }
    });

    // Enrich profiles with people_highlights data
    const peopleHighlights = data.people_highlights || [];
    peopleHighlights.forEach(h => {
        // Match by person_id to people.json
        const person = (data.people || []).find(p => p.id === h.person_id);
        if (!person) return;
        const name = person.name;
        if (!profilesData[name]) {
            profilesData[name] = {
                basic: peopleData[name] || { name },
                highlights: [],
                timeline: [],
                co_occurrences: [],
                connections: [],
                awards: [],
                songs: [],
                lj_comments: []
            };
        }
        const existing = profilesData[name].highlights;
        const isDupe = existing.some(e =>
            (e.highlight || e.text || '') === h.highlight
        );
        if (!isDupe) {
            existing.push(h);
        }
    });

    if (!constellation || !constellation.nodes) return;

    // ─── Run Advanced Graph Analytics ────────────────────────────────
    try {
        const arcArr = Array.isArray(data.person_arc) ? data.person_arc : [];
        // Normalize arc data to have .name field
        const normalizedArc = arcArr.map(a => ({ ...a, name: a.person || a.name }));

        // Build co-occurrence count map: "nameA|nameB" → count
        const coOccMap = new Map();
        (coOccurrencesData || []).forEach(co => {
            if (!co.person_a || !co.person_b) return;
            const [a, b] = co.person_a < co.person_b
                ? [co.person_a, co.person_b] : [co.person_b, co.person_a];
            const key = `${a}|${b}`;
            coOccMap.set(key, (coOccMap.get(key) || 0) + (co.co_occurrence_count || 1));
        });

        // Minimal node list for analytics (just need .name)
        const analyticsNodes = [
            { name: 'John Tronolone' },
            ...constellation.nodes.map(n => ({ name: n.name }))
        ];
        // Minimal link list (string source/target)
        const analyticsLinks = [
            ...(constellation.links || []).map(l => ({
                source: l.source, target: l.target, weight: l.weight || 1
            })),
            ...(coOccurrencesData || []).filter(co => co.person_a && co.person_b).map(co => ({
                source: co.person_a, target: co.person_b,
                weight: Math.min(co.co_occurrence_count || 1, 3)
            })),
            ...(ecdPlayerNetworkData.links || []).map(l => ({
                source: l.source, target: l.target, weight: l.weight || 1
            }))
        ];

        analyticsPageRank = computePageRank(analyticsNodes, analyticsLinks);
        analyticsBetweenness = computeBetweenness(analyticsNodes, analyticsLinks);
        analyticsClustering = computeClusteringCoeff(analyticsNodes, analyticsLinks);
        analyticsCommunities = detectCommunities(analyticsNodes, analyticsLinks);
        analyticsRelStrength = computeRelationshipStrength(
            analyticsNodes, analyticsLinks, coOccMap, normalizedArc
        );
        analyticsNetworkHealth = computeNetworkHealth(
            analyticsNodes, analyticsLinks, normalizedArc
        );
        analyticsPersonScores = computePersonScores(
            analyticsNodes, analyticsLinks,
            analyticsPageRank, analyticsBetweenness, analyticsClustering,
            normalizedArc
        );
        analyticsTemporalEvolution = computeTemporalEvolution(
            analyticsNodes, normalizedArc
        );
        analyticsReady = true;
        console.log('[Constellation] Advanced analytics computed:', {
            pageRankNodes: analyticsPageRank.size,
            communities: new Set(analyticsCommunities.communities.values()).size,
            modularity: analyticsCommunities.modularity.toFixed(3),
            networkHealth: analyticsNetworkHealth
        });
    } catch (e) {
        console.warn('[Constellation] Analytics computation failed, falling back to basic mode:', e);
        analyticsReady = false;
    }

    renderFeaturedCards(constellation.nodes, profilesData);
    renderFiltersAndLegend(constellation.nodes);
    renderChapterTimeline(lifeChaptersData);
    renderStatsBar(constellation);
    renderForceGraph(constellation, profilesData, coOccurrencesData);
    initSearchAutocomplete(constellation.nodes, profilesData);
    renderNetworkChart(data.temporal_network, data.person_arc);
    renderNetworkInsights(data.temporal_network, constellation, data.person_arc);

    // ─── Advanced Analytics Sections ─────────────────────────────────
    if (analyticsReady) {
        renderNetworkHealthDashboard();
        renderAdvancedMetrics(constellation);
        renderCommunityCards();
        renderDiversityChart();
    }
}

// Get the best first_year for a person by merging all sources
function getBestFirstYear(node) {
    const name = node.name;
    const arc = arcData[name];
    const person = peopleData[name];
    const profile = profilesData[name];

    // Try arc data first (most reliable for timeline mentions)
    if (arc?.first_year && arc.first_year > 1900) return arc.first_year;
    // Try people.json active_years
    if (person?.active_years) {
        const parsed = parseActiveYears(person.active_years);
        if (parsed) return parsed.first;
    }
    // Try the constellation node itself (but skip 0 and birth_years like 1957)
    if (node.first_year && node.first_year >= 2000) return node.first_year;
    // Try profile basic
    if (profile?.basic?.active_years) {
        const parsed = parseActiveYears(profile.basic.active_years);
        if (parsed) return parsed.first;
    }
    return null;
}

function getBestLastYear(node) {
    const name = node.name;
    const arc = arcData[name];
    const person = peopleData[name];
    if (arc?.last_year && arc.last_year > 1900) return arc.last_year;
    if (person?.active_years) {
        const parsed = parseActiveYears(person.active_years);
        if (parsed) return parsed.last;
    }
    return null;
}

function getBestRelation(node) {
    const name = node.name;
    const person = peopleData[name];
    const profile = profilesData[name];
    return person?.relation || profile?.basic?.relation || node.relation || '';
}

function getBestConnection(node) {
    const name = node.name;
    const person = peopleData[name];
    return person?.connection || '';
}

// ─── Featured People Cards ───────────────────────────────────────
// Only feature people who will deliver a rewarding click.
// Dynamically selected by data richness, not a hardcoded list.

function renderFeaturedCards(nodes, profiles) {
    const mount = document.getElementById('featuredMount');
    if (!mount) return;

    // Score every person by data richness
    const scored = nodes.map(n => {
        const profile = profiles[n.name];
        const r = getDataRichness(n.name, profile);
        const person = peopleData[n.name];
        const ecdP = ecdPlayersData[n.name];
        // Boost score with importance_score, connection text, and ECD mentions
        const importanceBoost = Math.min((n.importance_score || 0) / 50, 3);
        const connectionBoost = person?.connection ? 2 : 0;
        const ecdBoost = ecdP ? Math.min(ecdP.total_mentions / 200, 3) : 0;
        return { node: n, profile, richness: r, score: r.total + importanceBoost + connectionBoost + ecdBoost };
    }).filter(s => s.score >= 3) // People with real content or significance
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    if (!scored.length) return;

    const cards = scored.map(({ node: n, profile, richness }) => {
        const relation = getBestRelation(n);
        const firstYear = getBestFirstYear(n);
        const lastYear = getBestLastYear(n);
        const yearSpan = firstYear && lastYear ? `${firstYear}–${lastYear}` :
                         firstYear ? `Since ${firstYear}` : '';
        const color = getEraColor(firstYear);
        const summary = richnessSummary(richness);
        const connection = getBestConnection(n);
        const connectionSnippet = connection ? connection.split('.')[0].split(';')[0] : '';

        return `<button class="featured-card" data-name="${n.name}" style="--card-accent: ${color}">
            <span class="featured-dot" style="background: ${color}"></span>
            <span class="featured-name">${n.name}</span>
            <span class="featured-relation">${relation || connectionSnippet}</span>
            <span class="featured-years">${yearSpan}</span>
            ${summary ? `<span class="featured-depth">${summary}</span>` : ''}
        </button>`;
    });

    mount.innerHTML = `
        <div class="featured-header">Start here — people with the richest stories</div>
        <div class="featured-row">${cards.join('')}</div>
    `;

    mount.querySelectorAll('.featured-card').forEach(card => {
        card.addEventListener('click', () => {
            focusNodeByName(card.dataset.name);
            document.getElementById('constellationMount')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

// ─── Category Filters + Era Legend ───────────────────────────────

function renderFiltersAndLegend(nodes) {
    const mount = document.getElementById('filtersMount');
    if (!mount) return;

    const cats = {};
    nodes.forEach(n => {
        const cat = n.category || 'other';
        cats[cat] = (cats[cat] || 0) + 1;
    });

    const categoryOrder = ['family', 'inner_circle', 'ecd_player', 'partner', 'other'];
    const categoryLabels = { family: 'Family', inner_circle: 'Inner Circle', ecd_player: 'ECD', partner: 'Partner', other: 'Others' };

    const filterBtns = categoryOrder
        .filter(c => cats[c])
        .map(c => `<button class="filter-pill" data-cat="${c}">${categoryLabels[c] || c} <span class="filter-count">${cats[c]}</span></button>`);

    const CAT_LEGEND = [
        { color: '#4a90d9', label: 'Inner Circle' },
        { color: '#4a6741', label: 'Family' },
        { color: '#6b4a8b', label: 'ECD Community' },
        { color: '#7a8fa6', label: 'Extended Network' }
    ];
    const legendItems = CAT_LEGEND.map(({ color, label }) =>
        `<span class="legend-item"><span class="legend-dot" style="background: ${color}"></span>${label}</span>`
    );

    mount.innerHTML = `
        <div class="filter-row">
            <button class="filter-pill active" data-cat="all">All <span class="filter-count">${nodes.length}</span></button>
            ${filterBtns.join('')}
        </div>
        <div class="era-legend">${legendItems.join('')}</div>
    `;

    mount.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            mount.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilter(btn.dataset.cat);
        });
    });
}

function applyFilter(cat) {
    if (!svgNode || !svgLink) return;
    if (cat === 'all') {
        svgNode.transition().duration(300)
            .attr('opacity', d => d.hasContent ? 1 : 0.35);
        svgLink.transition().duration(300)
            .attr('opacity', d => d.isHub ? 0.12 : 0.35);
    } else {
        svgNode.transition().duration(300)
            .attr('opacity', d => (d.category === cat || d.id === 'john') ? 1 : 0.08);
        svgLink.transition().duration(300)
            .attr('opacity', l => {
                const s = typeof l.source === 'object' ? l.source : allNodes.find(n => n.name === l.source);
                const t = typeof l.target === 'object' ? l.target : allNodes.find(n => n.name === l.target);
                return (s?.category === cat || t?.category === cat) ? 0.6 : 0.03;
            });
    }
}

// ─── Life Chapter Timeline ────────────────────────────────────────

function renderChapterTimeline(chapters) {
    const mount = document.getElementById('chapterMount');
    if (!mount || !chapters.length) return;

    // Parse key_people from JSON strings
    const parsed = chapters.map(ch => {
        let keyPeople = [];
        try {
            keyPeople = typeof ch.key_people === 'string' ? JSON.parse(ch.key_people) : (ch.key_people || []);
        } catch (_) { /* ignore */ }
        // Extract short theme (first segment before the pipe or dash)
        const shortTheme = (ch.theme || '').split('—')[0].split('|')[0].trim();
        return { ...ch, keyPeople, shortTheme };
    });

    const pills = parsed.map((ch, i) => {
        const yearLabel = ch.start_year === ch.end_year ? `${ch.start_year}` : `${ch.start_year}–${ch.end_year}`;
        return `<button class="chapter-pill" data-idx="${i}" title="${ch.theme}">
            <span class="chapter-pill-years">${yearLabel}</span>
            <span class="chapter-pill-theme">${ch.shortTheme}</span>
        </button>`;
    });

    mount.innerHTML = `
        <div class="chapter-strip-label">Life Chapters</div>
        <div class="chapter-strip">
            <button class="chapter-pill active" data-idx="all">
                <span class="chapter-pill-years">All</span>
                <span class="chapter-pill-theme">Full timeline</span>
            </button>
            ${pills.join('')}
        </div>
    `;

    mount.querySelectorAll('.chapter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            mount.querySelectorAll('.chapter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const idx = btn.dataset.idx;
            if (idx === 'all') {
                clearChapterOverlay();
                resetGraphOpacity();
            } else {
                applyChapterFilter(parsed[parseInt(idx)]);
            }
        });
    });
}

function applyChapterFilter(chapter) {
    if (!svgNode || !svgLink) return;

    const startY = chapter.start_year;
    const endY = chapter.end_year;
    const keyNames = new Set(chapter.keyPeople || []);

    svgNode.transition().duration(400)
        .attr('opacity', d => {
            if (d.id === 'john') return 1;
            const first = d.firstYear;
            const last = d.lastYear || first;
            if (!first) return 0.06;
            // Active if their span overlaps the chapter years
            const overlaps = first <= endY && (last || first) >= startY;
            return overlaps ? 1 : 0.06;
        })
        .attr('stroke-width', d => {
            if (keyNames.has(d.name)) return 3;
            return d.hasContent ? 1.5 : 0.5;
        });

    svgLink.transition().duration(400)
        .attr('opacity', l => {
            const src = typeof l.source === 'object' ? l.source : allNodes.find(n => n.name === l.source);
            const tgt = typeof l.target === 'object' ? l.target : allNodes.find(n => n.name === l.target);
            const srcFirst = src?.firstYear;
            const srcLast = src?.lastYear || srcFirst;
            const tgtFirst = tgt?.firstYear;
            const tgtLast = tgt?.lastYear || tgtFirst;
            const srcOverlaps = srcFirst && srcFirst <= endY && (srcLast || srcFirst) >= startY;
            const tgtOverlaps = tgtFirst && tgtFirst <= endY && (tgtLast || tgtFirst) >= startY;
            return (srcOverlaps && tgtOverlaps) ? 0.5 : 0.03;
        });

    // Show chapter theme overlay on the graph
    showChapterOverlay(chapter);
}

function showChapterOverlay(chapter) {
    const container = document.getElementById('constellationMount');
    if (!container) return;
    clearChapterOverlay();
    const overlay = document.createElement('div');
    overlay.className = 'chapter-overlay';
    overlay.textContent = chapter.shortTheme || chapter.theme?.split('—')[0]?.split('|')[0]?.trim() || '';
    container.appendChild(overlay);
}

function clearChapterOverlay() {
    document.querySelectorAll('.chapter-overlay').forEach(el => el.remove());
}

// ─── Stats Bar ───────────────────────────────────────────────────

function renderStatsBar(constellation) {
    const mount = document.getElementById('statsMount');
    if (!mount) return;
    const nodeCount = constellation.nodes.length + 1;
    const linkCount = (constellation.links || []).length;
    const peopleTotalInDb = Object.keys(peopleData).length || nodeCount;
    const withStories = Object.values(profilesData).filter(p =>
        (p.timeline?.length || 0) + (p.highlights?.length || 0) + (p.co_occurrences?.length || 0) > 0
    ).length;
    mount.innerHTML = `<span>${peopleTotalInDb} people</span> · <span>${linkCount} connections</span> · <span>${withStories} with stories</span> · <span>22 years</span>`;
}

// ─── Search Autocomplete ─────────────────────────────────────────

function initSearchAutocomplete(nodes, profiles) {
    const wrapper = document.querySelector('.constellation-search');
    const input = wrapper?.querySelector('input');
    if (!wrapper || !input) return;

    // Build searchable list with enriched data
    const searchList = nodes.map(n => {
        const profile = profiles[n.name];
        const r = getDataRichness(n.name, profile);
        const relation = getBestRelation(n);
        const connection = getBestConnection(n);
        return {
            name: n.name,
            relation,
            connection,
            category: n.category || '',
            richness: r.total + (n.importance_score || 0) / 10
        };
    }).sort((a, b) => b.richness - a.richness);

    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    dropdown.style.display = 'none';
    wrapper.appendChild(dropdown);

    input.addEventListener('input', () => {
        const q = input.value.toLowerCase().trim();
        if (!q) {
            dropdown.style.display = 'none';
            resetGraphOpacity();
            return;
        }

        const matches = searchList
            .filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.relation.toLowerCase().includes(q) ||
                p.connection.toLowerCase().includes(q)
            )
            .slice(0, 8);

        if (!matches.length) {
            dropdown.innerHTML = '<div class="search-no-results">No matches</div>';
            dropdown.style.display = 'block';
            if (svgNode) svgNode.attr('opacity', d => (d.name || '').toLowerCase().includes(q) ? 1 : 0.1);
            return;
        }

        dropdown.innerHTML = matches.map(m => {
            const subtitle = m.relation || (m.connection ? m.connection.split('.')[0].split(';')[0] : '') || m.category;
            return `<button class="search-result" data-name="${m.name}">
                <span class="search-result-name">${highlightMatch(m.name, q)}</span>
                <span class="search-result-meta">${subtitle}</span>
            </button>`;
        }).join('');
        dropdown.style.display = 'block';

        if (svgNode) {
            svgNode.attr('opacity', d =>
                (d.name || '').toLowerCase().includes(q) ? 1 : 0.1
            );
        }

        dropdown.querySelectorAll('.search-result').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = btn.dataset.name;
                dropdown.style.display = 'none';
                focusNodeByName(btn.dataset.name);
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) dropdown.style.display = 'none';
    });

    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.search-result');
        const active = dropdown.querySelector('.search-result.active');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!active && items.length) items[0].classList.add('active');
            else if (active?.nextElementSibling) {
                active.classList.remove('active');
                active.nextElementSibling.classList.add('active');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (active?.previousElementSibling) {
                active.classList.remove('active');
                active.previousElementSibling.classList.add('active');
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const sel = dropdown.querySelector('.search-result.active') || dropdown.querySelector('.search-result');
            if (sel) {
                input.value = sel.dataset.name;
                dropdown.style.display = 'none';
                focusNodeByName(sel.dataset.name);
            }
        } else if (e.key === 'Escape') {
            dropdown.style.display = 'none';
            input.blur();
        }
    });
}

function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + query.length) + '</mark>' + text.slice(idx + query.length);
}

// ─── Focus a node by name ────────────────────────────────────────

function focusNodeByName(name) {
    if (!svgNode || !svgLink) return;
    const targetNode = allNodes.find(n => n.name === name);
    if (!targetNode) return;

    const connected = new Set();
    allLinks.forEach(l => {
        const srcName = typeof l.source === 'object' ? l.source.name : l.source;
        const tgtName = typeof l.target === 'object' ? l.target.name : l.target;
        if (srcName === targetNode.name) connected.add(tgtName);
        if (tgtName === targetNode.name) connected.add(srcName);
    });
    connected.add(targetNode.name);

    svgNode.transition().duration(300)
        .attr('opacity', n => connected.has(n.name) ? 1 : 0.1);
    svgLink.transition().duration(300)
        .attr('opacity', l => {
            const srcName = typeof l.source === 'object' ? l.source.name : l.source;
            const tgtName = typeof l.target === 'object' ? l.target.name : l.target;
            return (srcName === targetNode.name || tgtName === targetNode.name) ? 0.6 : 0.05;
        });

    showPersonPanel(targetNode);
}

function resetGraphOpacity() {
    if (svgNode) svgNode.transition().duration(300).attr('opacity', d => d.hasContent ? 1 : 0.35);
    if (svgLink) svgLink.transition().duration(300).attr('opacity', d => d.isHub ? 0.12 : 0.35);
}

// ─── Radial Network Graph ────────────────────────────────────────
// Structured radial layout: John at center, people arranged in concentric
// rings by importance, within angular sectors by relationship category.
// Merges constellation, co-occurrence, and ECD player network links.

function renderForceGraph(constellation, profiles, coOccurrences) {
    const container = document.getElementById('constellationMount');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) * 0.44;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    const tooltip = d3.select(container)
        .append('div')
        .attr('class', 'constellation-tooltip')
        .style('display', 'none');

    // ── Display category: regroup for meaningful visual clusters ──
    const CAT_COLORS = {
        core: '#4a90d9', family: '#4a6741',
        ecd: '#6b4a8b', other: '#7a8fa6', self: '#c9a84c'
    };

    function getDisplayCat(n) {
        if (n.category === 'inner_circle' || n.category === 'partner') return 'core';
        if (n.category === 'family') return 'family';
        if (n.category === 'ecd_player' || ecdPlayersData[n.name]) return 'ecd';
        return 'other';
    }

    // ── Build enriched nodes ──
    const nodes = constellation.nodes
        .filter(n => n.name !== 'John Tronolone')
        .map(n => {
            const profile = profiles[n.name];
            const r = getDataRichness(n.name, profile);
            const person = peopleData[n.name];
            const arc = arcData[n.name];
            const firstYear = getBestFirstYear(n);
            const lastYear = getBestLastYear(n);
            const relation = getBestRelation(n);
            const connection = getBestConnection(n);
            const totalMentions = arc?.total_mentions || 0;
            const importanceScore = n.importance_score || person?.importance_score || 0;
            const ecdPlayer = ecdPlayersData[n.name];
            const ecdMentions = ecdPlayer?.total_mentions || 0;
            const hasContent = r.total > 0 || !!connection || importanceScore >= 10 || ecdMentions > 0;
            const baseRadius = Math.sqrt(Math.max(importanceScore, 1)) * 1.2 + 3;
            const mentionBoost = Math.sqrt(totalMentions) * 0.5;
            const ecdBoost = Math.sqrt(ecdMentions) * 0.15;
            const nodeRadius = hasContent
                ? Math.max(baseRadius + mentionBoost + ecdBoost, 5)
                : Math.max(baseRadius * 0.5, 2.5);
            const displayCat = getDisplayCat(n);

            // Analytics-enhanced sizing
            const personScore = analyticsPersonScores.get(n.name);
            const prBoost = analyticsReady && personScore
                ? personScore.socialGravity * 8 : 0;
            const analyticsRadius = hasContent
                ? Math.max(baseRadius + mentionBoost + ecdBoost + prBoost, 5)
                : Math.max(baseRadius * 0.5, 2.5);

            // Community assignment
            const communityId = analyticsCommunities.communities.get(n.name);
            const communityColor = analyticsCommunities.communityColors.get(communityId);

            return {
                ...n, name: n.name,
                radius: Math.min(analyticsRadius, 24),
                color: CAT_COLORS[displayCat] || CAT_COLORS.other,
                communityColor: communityColor || null,
                communityId: communityId ?? -1,
                richness: r, hasContent, relation, connection,
                firstYear, lastYear, totalMentions, importanceScore,
                peakYear: arc?.peak_year || person?.peak_year || null,
                activeYears: person?.active_years || '',
                dominantTopic: person?.dominant_topic || '',
                displayCat,
                pageRank: analyticsPageRank.get(n.name) || 0,
                betweenness: analyticsBetweenness.get(n.name) || 0,
                clusteringCoeff: analyticsClustering.get(n.name) || 0,
                socialGravity: personScore?.socialGravity || 0,
                percentile: personScore?.percentile || 0
            };
        });

    // Center node
    nodes.unshift({
        id: 'john', name: 'John Tronolone', category: 'self',
        radius: 18, color: CAT_COLORS.self,
        richness: { total: 999 }, hasContent: true,
        relation: '', connection: '',
        firstYear: 2004, lastYear: 2026,
        totalMentions: 999, importanceScore: 999,
        peakYear: null, activeYears: '2004-2026',
        dominantTopic: '', displayCat: 'self'
    });

    // ── Build merged links (constellation + co-occurrence + ECD network) ──
    const linkSet = new Set();
    const links = [];
    const nodeNames = new Set(nodes.map(n => n.name));

    function addLink(src, tgt, weight, type) {
        if (!nodeNames.has(src) || !nodeNames.has(tgt)) return;
        if (src === tgt) return;
        const key = [src, tgt].sort().join('|');
        if (linkSet.has(key)) return;
        linkSet.add(key);
        links.push({
            source: src, target: tgt, weight: weight || 1, type,
            isHub: src === 'John Tronolone' || tgt === 'John Tronolone',
            fromCoOccurrence: type === 'co_occurrence',
            fromEcd: type === 'ecd'
        });
    }

    (constellation.links || []).forEach(l =>
        addLink(l.source, l.target, l.weight || 1, 'constellation'));
    (coOccurrences || []).forEach(co =>
        addLink(co.person_a, co.person_b,
            Math.min(co.co_occurrence_count || 1, 3), 'co_occurrence'));
    (ecdPlayerNetworkData.links || []).forEach(l =>
        addLink(l.source, l.target, l.weight || 1, 'ecd'));

    // Resolve link names → node objects
    const nodeByName = {};
    nodes.forEach(n => nodeByName[n.name] = n);
    links.forEach(l => {
        if (typeof l.source === 'string') l.source = nodeByName[l.source] || l.source;
        if (typeof l.target === 'string') l.target = nodeByName[l.target] || l.target;
    });

    allNodes = nodes;
    allLinks = links;

    // ── Peer degree (for layout) ──
    const peerDegree = {};
    links.forEach(l => {
        if (l.isHub) return;
        const s = typeof l.source === 'object' ? l.source.name : l.source;
        const t = typeof l.target === 'object' ? l.target.name : l.target;
        peerDegree[s] = (peerDegree[s] || 0) + 1;
        peerDegree[t] = (peerDegree[t] || 0) + 1;
    });

    // ── Radial layout: sectors + importance rings ──
    // Sectors: angles in SVG degrees (0°=right, 90°=down, 270°=up)
    const SECTORS = {
        core:   { start: 240, end: 300, labelAngle: 270, label: 'INNER CIRCLE' },
        family: { start: 308, end: 353, labelAngle: 330, label: 'FAMILY' },
        ecd:    { start: 1, end: 130, labelAngle: 65, label: 'ECD COMMUNITY' },
        other:  { start: 138, end: 232, labelAngle: 185, label: 'EXTENDED NETWORK' }
    };

    function getTargetRadius(importance, hasPeers) {
        if (importance > 50) return maxR * 0.15;
        if (importance > 25) return maxR * 0.32;
        if (importance > 10) return maxR * 0.50;
        if (importance > 5 || hasPeers) return maxR * 0.68;
        return maxR * 0.88;
    }

    // Group by display category, sorted by importance
    const catGroups = { core: [], family: [], ecd: [], other: [] };
    nodes.forEach(n => {
        if (n.id === 'john') return;
        if (catGroups[n.displayCat]) catGroups[n.displayCat].push(n);
    });
    Object.values(catGroups).forEach(g =>
        g.sort((a, b) => b.importanceScore - a.importanceScore));

    // Center-out ordering: most important at sector center, less important at edges
    function centerOutOrder(arr) {
        const result = new Array(arr.length);
        let left = Math.floor(arr.length / 2) - 1;
        let right = Math.floor(arr.length / 2);
        for (let i = 0; i < arr.length; i++) {
            if (i % 2 === 0) { result[right] = arr[i]; right++; }
            else { result[left] = arr[i]; left--; }
        }
        return result;
    }

    // Assign radial positions
    Object.entries(catGroups).forEach(([cat, group]) => {
        const sector = SECTORS[cat];
        if (!sector || !group.length) return;
        const ordered = centerOutOrder(group);
        const startRad = sector.start * Math.PI / 180;
        const endRad = sector.end * Math.PI / 180;

        ordered.forEach((n, i) => {
            const t = group.length > 1 ? (i + 0.5) / group.length : 0.5;
            const angle = startRad + (endRad - startRad) * t;
            const hasPeers = (peerDegree[n.name] || 0) > 0;
            const targetR = getTargetRadius(n.importanceScore, hasPeers);
            // Slight jitter to prevent perfect overlap
            const jr = (Math.random() - 0.5) * maxR * 0.04;
            const ja = (Math.random() - 0.5) * 0.02;
            n.targetAngle = angle + ja;
            n.targetRadius = targetR + jr;
            n.targetX = cx + n.targetRadius * Math.cos(n.targetAngle);
            n.targetY = cy + n.targetRadius * Math.sin(n.targetAngle);
            n.x = n.targetX;
            n.y = n.targetY;
        });
    });

    // Fix John at center
    const john = nodes.find(n => n.id === 'john');
    if (john) {
        john.x = cx; john.y = cy;
        john.fx = cx; john.fy = cy;
        john.targetX = cx; john.targetY = cy;
    }

    // ── SVG: Ring guides ──
    const ringFracs = [0.15, 0.32, 0.50, 0.68, 0.88];
    svg.append('g').attr('class', 'ring-guides')
        .selectAll('circle').data(ringFracs).join('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', f => maxR * f)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(30,58,95,0.12)')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '4,8');

    // ── SVG: Center glow ──
    const defs = svg.append('defs');
    const grad = defs.append('radialGradient').attr('id', 'centerGlow');
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(201,168,76,0.06)');
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(201,168,76,0)');
    svg.append('circle').attr('cx', cx).attr('cy', cy)
        .attr('r', maxR * 0.3).attr('fill', 'url(#centerGlow)');

    // ── SVG: Sector separator lines ──
    const separatorAngles = [240, 300, 308, 353, 1, 130, 138, 232];
    svg.append('g').attr('class', 'sector-lines')
        .selectAll('line').data(separatorAngles).join('line')
        .attr('x1', d => cx + maxR * 0.08 * Math.cos(d * Math.PI / 180))
        .attr('y1', d => cy + maxR * 0.08 * Math.sin(d * Math.PI / 180))
        .attr('x2', d => cx + maxR * 0.96 * Math.cos(d * Math.PI / 180))
        .attr('y2', d => cy + maxR * 0.96 * Math.sin(d * Math.PI / 180))
        .attr('stroke', 'rgba(30,58,95,0.07)')
        .attr('stroke-width', 0.5);

    // ── SVG: Sector labels ──
    const sectorLabelData = Object.entries(SECTORS).map(([cat, s]) => ({
        ...s, cat, color: CAT_COLORS[cat] || '#7a8fa6'
    }));
    svg.append('g').attr('class', 'sector-labels')
        .selectAll('text').data(sectorLabelData).join('text')
        .attr('x', d => cx + (maxR + 18) * Math.cos(d.labelAngle * Math.PI / 180))
        .attr('y', d => cy + (maxR + 18) * Math.sin(d.labelAngle * Math.PI / 180))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', d => d.color)
        .attr('font-family', "'Trebuchet MS', sans-serif")
        .attr('font-size', 9)
        .attr('letter-spacing', '1.5px')
        .attr('opacity', 0.5)
        .text(d => d.label);

    // ── SVG: Links (all as <path> — curves for peers, straight for hub) ──
    function linkCurve(d) {
        const sx = d.source.x, sy = d.source.y;
        const tx = d.target.x, ty = d.target.y;
        if (d.isHub) return `M${sx},${sy} L${tx},${ty}`;
        const dx = tx - sx, dy = ty - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return `M${sx},${sy} L${tx},${ty}`;
        const mx = (sx + tx) / 2, my = (sy + ty) / 2;
        const nx = -dy / dist, ny = dx / dist;
        const toCx = cx - mx, toCy = cy - my;
        const dot = nx * toCx + ny * toCy;
        const sign = dot > 0 ? 1 : -1;
        const bow = Math.min(dist * 0.15, 30);
        const cpx = mx + nx * bow * sign;
        const cpy = my + ny * bow * sign;
        return `M${sx},${sy} Q${cpx},${cpy} ${tx},${ty}`;
    }

    svgLink = svg.append('g')
        .selectAll('path')
        .data(links)
        .join('path')
        .attr('d', linkCurve)
        .attr('fill', 'none')
        .attr('stroke', d => {
            if (d.isHub) return 'rgba(201,168,76,0.04)';
            if (d.fromEcd) return 'rgba(107,74,139,0.2)';
            if (d.fromCoOccurrence) return 'rgba(201,168,76,0.18)';
            return 'rgba(255,255,255,0.2)';
        })
        .attr('stroke-width', d => d.isHub ? 0.3 : Math.min(d.weight || 1, 2.5))
        .attr('stroke-dasharray', d =>
            d.fromCoOccurrence ? '3,3' : d.fromEcd ? '2,3' : 'none')
        .attr('opacity', d => d.isHub ? 0.12 : 0.35)
        .attr('pointer-events', d => d.isHub ? 'none' : 'stroke')
        .attr('cursor', d => d.isHub ? 'default' : 'pointer');

    // Edge hover + click
    svgLink
        .on('mouseover', function(event, d) {
            if (d.isHub) return;
            d3.select(this)
                .attr('stroke-width', Math.max(d.weight || 1, 2.5))
                .attr('stroke', 'rgba(201,168,76,0.6)')
                .attr('opacity', 0.8);
        })
        .on('mouseout', function(event, d) {
            d3.select(this)
                .attr('stroke-width', d.isHub ? 0.3 : Math.min(d.weight || 1, 2.5))
                .attr('stroke', d.isHub ? 'rgba(201,168,76,0.04)' :
                    d.fromEcd ? 'rgba(107,74,139,0.2)' :
                    d.fromCoOccurrence ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.2)')
                .attr('opacity', d.isHub ? 0.12 : 0.35);
        })
        .on('click', function(event, d) {
            if (d.isHub) return;
            event.stopPropagation();
            showEdgePanel(d, event);
        });

    // ── SVG: Community glow halos (behind nodes) ──
    if (analyticsReady) {
        svg.append('g').attr('class', 'community-halos')
            .selectAll('circle').data(nodes.filter(n => n.percentile >= 75 && n.id !== 'john'))
            .join('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.radius + 6)
            .attr('fill', 'none')
            .attr('stroke', d => d.communityColor || d.color)
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.2)
            .attr('stroke-dasharray', '2,3')
            .attr('pointer-events', 'none');
    }

    // ── SVG: Nodes ──
    svgNode = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', d => d.radius)
        .attr('fill', d => d.color)
        .attr('stroke', d => {
            if (d.percentile >= 90) return 'rgba(201,168,76,0.7)';
            if (d.hasContent) return 'rgba(255,255,255,0.45)';
            return 'rgba(255,255,255,0.1)';
        })
        .attr('stroke-width', d => {
            if (d.percentile >= 90) return 2.5;
            if (d.hasContent) return 1.5;
            return 0.5;
        })
        .attr('opacity', d => d.hasContent ? 1 : 0.3)
        .attr('cursor', 'pointer')
        .attr('class', d => {
            if (d.percentile >= 90) return 'node-hub';
            if (d.percentile >= 70) return 'node-important';
            return '';
        })
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // ── SVG: Name labels for important people ──
    const labelThreshold = 25;
    const labeledNodes = nodes.filter(n =>
        n.importanceScore > labelThreshold || n.id === 'john');
    const svgLabels = svg.append('g').attr('class', 'node-labels')
        .selectAll('text').data(labeledNodes).join('text')
        .attr('x', d => d.x)
        .attr('y', d => d.y - d.radius - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', d => d.color)
        .attr('font-family', "'Courier Prime', monospace")
        .attr('font-size', d => d.id === 'john' ? 11 : 9)
        .attr('opacity', 0.75)
        .attr('pointer-events', 'none')
        .text(d => d.name);

    // ── Hover tooltip ──
    svgNode.on('mouseover', (event, d) => {
        const relation = d.relation;
        const yearSpan = d.firstYear && d.lastYear ? `${d.firstYear}–${d.lastYear}` :
                         d.firstYear ? `Since ${d.firstYear}` : '';
        const parts = [`<strong>${d.name}</strong>`];
        if (relation) parts.push(relation);
        if (d.connection) {
            const snippet = d.connection.split('.')[0].split(';')[0];
            if (snippet && snippet !== relation)
                parts.push(`<span class="tooltip-connection">${snippet}</span>`);
        }
        if (yearSpan) parts.push(yearSpan);
        const peers = peerDegree[d.name] || 0;
        if (peers > 0 && d.id !== 'john')
            parts.push(`<span class="tooltip-richness">${peers} connection${peers > 1 ? 's' : ''}</span>`);
        if (d.importanceScore > 0 && d.id !== 'john')
            parts.push(`<span class="tooltip-richness">Importance: ${Math.round(d.importanceScore)}</span>`);
        const ecdP = ecdPlayersData[d.name];
        if (ecdP) {
            const w = ecdP.wins || 0, l = ecdP.losses || 0;
            const rec = (w + l > 0) ? ` ${w}W–${l}L` : '';
            parts.push(`<span class="tooltip-richness">ECD: ${ecdP.total_mentions.toLocaleString()} mentions${rec}</span>`);
        }
        const summary = richnessSummary(d.richness);
        if (summary) parts.push(`<span class="tooltip-richness">${summary}</span>`);
        // Analytics metrics in tooltip
        if (analyticsReady && d.id !== 'john') {
            if (d.pageRank > 0.01)
                parts.push(`<span class="tooltip-richness">PageRank: ${(d.pageRank * 100).toFixed(1)}%</span>`);
            if (d.betweenness > 0.01)
                parts.push(`<span class="tooltip-richness">Bridge Score: ${(d.betweenness * 100).toFixed(1)}%</span>`);
            if (d.percentile > 0)
                parts.push(`<span class="tooltip-richness">Top ${100 - d.percentile}% · Social Gravity: ${(d.socialGravity * 100).toFixed(0)}</span>`);
        }
        tooltip
            .style('display', 'block')
            .style('left', (event.offsetX + 12) + 'px')
            .style('top', (event.offsetY - 10) + 'px')
            .html(parts.join('<br>'));
    })
    .on('mouseout', () => tooltip.style('display', 'none'));

    // Click node → focus + sidebar
    svgNode.on('click', (event, d) => {
        event.stopPropagation();
        focusNodeByName(d.name);
    });

    // Background click → reset
    svg.on('click', () => {
        resetGraphOpacity();
        closeSidebar();
        closeEdgePanel();
    });

    // ── Simulation: minimal, just for collision + drag snap-back ──
    function forceTarget(strength) {
        let simNodes;
        function force(alpha) {
            simNodes.forEach(n => {
                if (n.fx != null || !n.targetX) return;
                n.vx += (n.targetX - n.x) * strength * alpha;
                n.vy += (n.targetY - n.y) * strength * alpha;
            });
        }
        force.initialize = (n) => simNodes = n;
        return force;
    }

    simulation = d3.forceSimulation(nodes)
        .force('target', forceTarget(0.4))
        .force('collide', d3.forceCollide(d => d.radius + 1.5))
        .alpha(0.3)
        .alphaDecay(0.04)
        .on('tick', () => {
            svgNode.attr('cx', d => d.x).attr('cy', d => d.y);
            svgLink.attr('d', linkCurve);
            svgLabels.attr('x', d => d.x).attr('y', d => d.y - d.radius - 5);
        });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.2).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        if (d.id !== 'john') { d.fx = null; d.fy = null; }
    }
}

// ─── Edge Panel ("Story of Us") ─────────────────────────────────
// Floating panel that appears when clicking a link between two people.

function showEdgePanel(link, event) {
    const panel = document.getElementById('edgePanel');
    if (!panel) return;

    const nameA = typeof link.source === 'object' ? link.source.name : link.source;
    const nameB = typeof link.target === 'object' ? link.target.name : link.target;

    // Shared co-occurrence moments
    const sharedMoments = coOccurrencesData.filter(co =>
        co.context && (
            (co.person_a === nameA && co.person_b === nameB) ||
            (co.person_a === nameB && co.person_b === nameA)
        )
    );

    // Shared timeline years
    const profileA = profilesData[nameA];
    const profileB = profilesData[nameB];
    const yearsA = new Set((profileA?.timeline || []).map(e => e.year).filter(Boolean));
    const yearsB = new Set((profileB?.timeline || []).map(e => e.year).filter(Boolean));
    const sharedYears = [...yearsA].filter(y => yearsB.has(y)).sort();

    // Mutual connections (excluding John and each other)
    const connsA = new Set();
    const connsB = new Set();
    allLinks.forEach(l => {
        const src = typeof l.source === 'object' ? l.source.name : l.source;
        const tgt = typeof l.target === 'object' ? l.target.name : l.target;
        if (src === nameA && tgt !== nameB && tgt !== 'John Tronolone') connsA.add(tgt);
        if (tgt === nameA && src !== nameB && src !== 'John Tronolone') connsA.add(src);
        if (src === nameB && tgt !== nameA && tgt !== 'John Tronolone') connsB.add(tgt);
        if (tgt === nameB && src !== nameA && src !== 'John Tronolone') connsB.add(src);
    });
    const mutuals = [...connsA].filter(c => connsB.has(c));

    // Build panel HTML
    let html = `<button class="edge-panel-close">&times;</button>`;
    html += `<div class="edge-panel-header">${nameA}<span class="edge-panel-ampersand">&</span>${nameB}</div>`;

    if (sharedMoments.length) {
        html += `<div class="edge-panel-section">Shared Moments</div>`;
        html += sharedMoments.map(co =>
            `<div class="edge-panel-moment"><span class="edge-panel-moment-year">${co.year}</span>${co.context}</div>`
        ).join('');
    }

    if (sharedYears.length) {
        html += `<div class="edge-panel-section">Both Active In</div>`;
        html += `<div class="edge-panel-years-overlap">${sharedYears.join(', ')}</div>`;
    }

    if (mutuals.length) {
        html += `<div class="edge-panel-section">Mutual Friends (${mutuals.length})</div>`;
        html += `<div class="edge-panel-mutuals">${mutuals.slice(0, 8).map(m =>
            `<button class="connection-tag" data-name="${m}">${m}</button>`
        ).join('')}</div>`;
    }

    if (!sharedMoments.length && !sharedYears.length && !mutuals.length) {
        html += `<div class="edge-panel-moment" style="color:var(--lj-text-secondary);font-style:italic">Connected in the constellation, but their shared story hasn't been documented yet.</div>`;
    }

    // Analytics: Relationship Strength
    if (analyticsReady) {
        const [sA, sB] = nameA < nameB ? [nameA, nameB] : [nameB, nameA];
        const relKey = `${sA}|${sB}`;
        const relStr = analyticsRelStrength.get(relKey);
        const scoreA = analyticsPersonScores.get(nameA);
        const scoreB = analyticsPersonScores.get(nameB);

        html += `<div class="edge-strength-section">`;
        html += `<div class="edge-strength-label">Relationship Analytics</div>`;
        html += `<div class="edge-strength-grid">`;
        if (relStr) {
            const classification = relStr.strength > 2 ? 'Strong' :
                relStr.strength > 1 ? 'Moderate' :
                relStr.strength > 0.3 ? 'Weak' : 'Dormant';
            const classColor = relStr.strength > 2 ? '#4a90d9' :
                relStr.strength > 1 ? '#c9a84c' :
                relStr.strength > 0.3 ? '#7a8fa6' : '#b45050';
            html += `<div class="edge-stat"><span class="edge-stat-label">Strength</span><span class="edge-stat-value" style="color:${classColor}">${relStr.strength.toFixed(2)}</span></div>`;
            html += `<div class="edge-stat"><span class="edge-stat-label">Class</span><span class="edge-stat-value" style="color:${classColor}">${classification}</span></div>`;
            html += `<div class="edge-stat"><span class="edge-stat-label">Recency</span><span class="edge-stat-value">${(relStr.recency * 100).toFixed(0)}%</span></div>`;
            html += `<div class="edge-stat"><span class="edge-stat-label">Mutual Ties</span><span class="edge-stat-value">${relStr.mutualCount}</span></div>`;
        }
        if (scoreA && scoreB) {
            html += `<div class="edge-stat"><span class="edge-stat-label">${nameA.split(' ')[0]} Rank</span><span class="edge-stat-value">Top ${100 - scoreA.percentile}%</span></div>`;
            html += `<div class="edge-stat"><span class="edge-stat-label">${nameB.split(' ')[0]} Rank</span><span class="edge-stat-value">Top ${100 - scoreB.percentile}%</span></div>`;
        }
        html += `</div></div>`;
    }

    // View full profile buttons
    html += `<div style="display:flex;gap:6px;margin-top:12px">`;
    html += `<button class="edge-panel-view-btn" data-name="${nameA}">${nameA}</button>`;
    html += `<button class="edge-panel-view-btn" data-name="${nameB}">${nameB}</button>`;
    html += `</div>`;

    panel.innerHTML = html;
    panel.classList.add('open');

    // Position near the edge midpoint
    const container = document.getElementById('constellationMount');
    const rect = container?.getBoundingClientRect();
    const srcNode = typeof link.source === 'object' ? link.source : allNodes.find(n => n.name === link.source);
    const tgtNode = typeof link.target === 'object' ? link.target : allNodes.find(n => n.name === link.target);
    if (srcNode && tgtNode && rect) {
        const midX = (srcNode.x + tgtNode.x) / 2;
        const midY = (srcNode.y + tgtNode.y) / 2;
        // Keep panel in bounds
        const panelW = 320;
        const panelH = 300;
        const left = Math.max(8, Math.min(midX - panelW / 2, rect.width - panelW - 8));
        const top = Math.max(8, Math.min(midY - panelH / 2, rect.height - panelH - 8));
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }

    // Wire up close button
    panel.querySelector('.edge-panel-close')?.addEventListener('click', closeEdgePanel);

    // Wire up view buttons to open full sidebar
    panel.querySelectorAll('.edge-panel-view-btn, .connection-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeEdgePanel();
            focusNodeByName(btn.dataset.name);
        });
    });
}

function closeEdgePanel() {
    const panel = document.getElementById('edgePanel');
    if (panel) panel.classList.remove('open');
}

// Close edge panel on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeEdgePanel();
});

// ─── Person Panel (Sidebar) ─────────────────────────────────────
// Smart sidebar: only shows sections that have data. Adapts to what exists.

function showPersonPanel(d) {
    const sidebar = document.getElementById('personPanel');
    if (!sidebar) return;

    const profile = profilesData[d.name] || null;
    const person = peopleData[d.name] || null;
    const arc = arcData[d.name] || null;
    const r = getDataRichness(d.name, profile);

    // Find connections from graph links
    const connected = [];
    allLinks.forEach(l => {
        const srcName = typeof l.source === 'object' ? l.source.name : l.source;
        const tgtName = typeof l.target === 'object' ? l.target.name : l.target;
        if (srcName === d.name) {
            const target = allNodes.find(n => n.name === tgtName);
            if (target && target.name !== d.name) connected.push(target.name);
        }
        if (tgtName === d.name) {
            const source = allNodes.find(n => n.name === srcName);
            if (source && source.name !== d.name) connected.push(source.name);
        }
    });

    // Build the sidebar HTML dynamically
    const relation = d.relation || getBestRelation(d);
    const connection = d.connection || getBestConnection(d);
    const category = d.category || person?.category || '';
    const firstYear = d.firstYear || getBestFirstYear(d);
    const lastYear = d.lastYear || getBestLastYear(d);
    const yearText = firstYear && lastYear ? `${firstYear} – ${lastYear}` :
                     firstYear ? `Since ${firstYear}` : '';
    const peakYear = d.peakYear || arc?.peak_year || person?.peak_year;
    const totalMentions = d.totalMentions || arc?.total_mentions || 0;
    const importanceScore = d.importanceScore || person?.importance_score || 0;

    let html = `<button class="sidebar-close">&times;</button>`;
    html += `<h2 class="person-name">${d.name}</h2>`;
    if (relation) html += `<p class="person-relation-tag">${relation}</p>`;
    else if (category && category !== 'other') html += `<p class="person-relation-tag">${formatAwardCategory(category)}</p>`;

    // Connection description — the story of this person
    if (connection) {
        html += `<p class="person-connection-desc">${connection}</p>`;
    }

    // Song memory anchor — vivid musical connection
    // Fuzzy match: "Valerie Winston" matches "Valerie Winston (ValPal)", etc.
    const personSongs = songsByPerson[d.name] || Object.entries(songsByPerson).reduce((found, [key, songs]) => {
        if (!found.length && (d.name.startsWith(key) || key.startsWith(d.name))) return songs;
        return found;
    }, []);
    if (personSongs?.length) {
        personSongs.forEach(s => {
            html += `<div class="song-anchor">
                <div class="song-anchor-header">&#9835; Memory Anchor</div>
                <div class="song-anchor-title">"${s.song}" by ${s.artist}</div>
                <div class="song-anchor-story">${s.story}</div>
                <div class="song-anchor-year">${s.year_of_connection}</div>
            </div>`;
        });
    }

    // Meta stats row
    const metaParts = [];
    if (yearText) metaParts.push(yearText);
    if (peakYear) metaParts.push(`Peak: ${peakYear}`);
    if (totalMentions > 0 && d.id !== 'john') metaParts.push(`${totalMentions} mention${totalMentions !== 1 ? 's' : ''}`);
    if (importanceScore > 0 && d.id !== 'john') metaParts.push(`Score: ${Math.round(importanceScore)}`);
    if (metaParts.length) {
        html += `<div class="person-meta-row">${metaParts.join(' · ')}</div>`;
    }

    // ─── Analytics: Score Donut + Percentile Badge ────────────────
    if (analyticsReady && d.id !== 'john') {
        const personScore = analyticsPersonScores.get(d.name);
        if (personScore) {
            const pct = personScore.percentile;
            const gravity = (personScore.socialGravity * 100).toFixed(0);
            const tierClass = pct >= 90 ? 'top-10' : pct >= 75 ? 'top-25' : pct >= 50 ? 'top-50' : 'bottom-half';
            const tierLabel = pct >= 90 ? 'Inner Constellation' : pct >= 75 ? 'Close Orbit' : pct >= 50 ? 'Mid Orbit' : 'Outer Ring';

            // Score donut
            const circumference = 2 * Math.PI * 24;
            const dashOffset = circumference * (1 - personScore.socialGravity);
            const donutColor = pct >= 90 ? '#c9a84c' : pct >= 75 ? '#4a90d9' : pct >= 50 ? '#6b4a8b' : '#7a8fa6';

            html += `<div class="score-donut-section">
                <svg class="score-donut-svg" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(30,58,95,0.3)" stroke-width="4" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="${donutColor}" stroke-width="4"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                        stroke-linecap="round" />
                </svg>
                <div class="score-donut-text">
                    <div class="score-donut-value">${gravity}</div>
                    <div class="score-donut-label">Social Gravity Score</div>
                    <div class="score-donut-rank">${tierLabel} · Top ${100 - pct}%</div>
                </div>
            </div>`;

            // Percentile badge
            html += `<span class="percentile-badge ${tierClass}">${tierLabel}</span>`;
        }
    }

    // ─── Analytics: Social DNA Radar ──────────────────────────────
    if (analyticsReady && d.id !== 'john') {
        const personScore = analyticsPersonScores.get(d.name);
        if (personScore) {
            html += `<div class="social-dna-section">
                <div class="social-dna-title">Social DNA</div>
                <canvas class="social-dna-canvas" id="dnaCanvas-${d.name.replace(/[^a-zA-Z0-9]/g, '_')}" width="240" height="240"></canvas>
                <div class="social-dna-labels">
                    <span class="dna-label">PageRank: <span class="dna-value">${(personScore.pageRank * 100).toFixed(1)}</span></span>
                    <span class="dna-label">Bridge: <span class="dna-value">${(personScore.betweenness * 100).toFixed(1)}</span></span>
                    <span class="dna-label">Clique: <span class="dna-value">${(personScore.clustering * 100).toFixed(1)}</span></span>
                    <span class="dna-label">Activity: <span class="dna-value">${(personScore.mentions * 100).toFixed(1)}</span></span>
                    <span class="dna-label">Longevity: <span class="dna-value">${(personScore.span * 100).toFixed(1)}</span></span>
                </div>
            </div>`;
        }
    }

    // ─── Analytics: Activity Sparkline ────────────────────────────
    if (d.id !== 'john' && (profile?.timeline?.length || arc?.first_year)) {
        const sparkFirstYear = firstYear || 2004;
        const sparkLastYear = lastYear || 2026;
        html += `<div class="sparkline-section">
            <div class="sparkline-label">Activity Over Time</div>
            <div class="sparkline-container">
                <canvas class="sparkline-canvas" id="sparkline-${d.name.replace(/[^a-zA-Z0-9]/g, '_')}" width="340" height="48"></canvas>
            </div>
            <div class="sparkline-range">
                <span>${sparkFirstYear}</span>
                <span>${sparkLastYear}</span>
            </div>
        </div>`;
    }

    // Connections with mutual friend counts
    if (connected.length) {
        // Build connection set for selected person (excluding hub to John)
        const myConnSet = new Set(connected);

        // Compute mutual count for each connection
        const connWithMutuals = connected.map(c => {
            const theirConns = new Set();
            allLinks.forEach(l => {
                const src = typeof l.source === 'object' ? l.source.name : l.source;
                const tgt = typeof l.target === 'object' ? l.target.name : l.target;
                if (src === c && tgt !== d.name && tgt !== 'John Tronolone') theirConns.add(tgt);
                if (tgt === c && src !== d.name && src !== 'John Tronolone') theirConns.add(src);
            });
            let mutual = 0;
            myConnSet.forEach(m => { if (m !== c && theirConns.has(m)) mutual++; });
            return { name: c, mutual };
        });

        // Sort: people with mutuals first, then alphabetical
        connWithMutuals.sort((a, b) => b.mutual - a.mutual || a.name.localeCompare(b.name));

        const closeOrbit = connWithMutuals.filter(c => c.mutual > 0);
        const alsoConnected = connWithMutuals.filter(c => c.mutual === 0);

        html += `<div class="person-section-label">Connections (${connected.length})</div>`;
        if (closeOrbit.length) {
            html += `<div class="connection-tier-label">Close orbit</div>`;
            html += `<div class="person-connections">${closeOrbit.slice(0, 12).map(c =>
                `<button class="connection-tag has-mutual" data-name="${c.name}">${c.name}<span class="mutual-count">${c.mutual} mutual</span></button>`
            ).join('')}</div>`;
        }
        if (alsoConnected.length) {
            if (closeOrbit.length) html += `<div class="connection-tier-label">Also connected</div>`;
            html += `<div class="person-connections">${alsoConnected.slice(0, 12).map(c =>
                `<button class="connection-tag" data-name="${c.name}">${c.name}</button>`
            ).join('')}</div>`;
        }
        const total = closeOrbit.length + alsoConnected.length;
        if (total > 24) {
            html += `<div class="person-more-note">+ ${total - 24} more</div>`;
        }
    }

    // Timeline events
    if (profile?.timeline?.length) {
        const sorted = [...profile.timeline].sort((a, b) => (a.year || 0) - (b.year || 0));
        const maxEvents = sorted.length > 15 ? 15 : sorted.length;
        html += `<div class="person-section-label">Key Moments (${sorted.length})</div>`;
        html += `<div class="person-milestones">${sorted.slice(0, maxEvents).map(m => {
            const eventText = m.event || m.event_description || m.text || m.milestone || '';
            const eventType = m.event_type || '';
            const typeIcon = eventType === 'wwe' ? ' \u{1F3AD}' : eventType === 'milestone' ? ' \u{2B50}' : eventType === 'award' ? ' \u{1F3C6}' : '';
            return `<div class="person-milestone-item">
                <span class="person-milestone-year">${m.year || ''}</span>
                ${eventText}${typeIcon}
            </div>`;
        }).join('')}</div>`;
        if (sorted.length > maxEvents) {
            html += `<div class="person-more-note">+ ${sorted.length - maxEvents} more events</div>`;
        }
    }

    // Highlights
    if (profile?.highlights?.length) {
        html += `<div class="person-section-label">Highlights</div>`;
        html += profile.highlights.map(h => {
            const text = typeof h === 'string' ? h : (h.text || h.highlight || '');
            return `<div class="person-highlight-item">${text}</div>`;
        }).join('');
    }

    // Co-occurrence shared moments
    const coMatches = coOccurrencesData.filter(co =>
        (co.person_a === d.name || co.person_b === d.name) && co.context
    );
    if (coMatches.length) {
        html += `<div class="person-section-label">Shared Moments</div>`;
        html += coMatches.slice(0, 6).map(co => {
            const other = co.person_a === d.name ? co.person_b : co.person_a;
            return `<div class="person-co-item">
                <span class="person-co-year">${co.year}</span>
                <span class="person-co-with">with ${other}</span>
                <span class="person-co-context">${co.context}</span>
            </div>`;
        }).join('');
    }

    // ECD Dodgeball stats
    const ecdPlayer = ecdPlayersData[d.name];
    if (ecdPlayer) {
        const wins = ecdPlayer.wins || 0;
        const losses = ecdPlayer.losses || 0;
        const record = (wins + losses > 0) ? `${wins}W–${losses}L` : '';
        const winRate = (wins + losses > 0) ? Math.round((wins / (wins + losses)) * 100) : null;
        const ecdEra = ecdPlayer.era_active || '';

        // Find awards for this player (case-insensitive match)
        const playerAwards = ecdAwardsData.filter(a =>
            a.recipient && (
                a.recipient === d.name ||
                a.recipient.toLowerCase() === d.name.toLowerCase() ||
                a.recipient.toLowerCase().startsWith(d.name.toLowerCase())
            )
        );
        const hofInductee = playerAwards.some(a =>
            a.award_type === 'Hall of Fame' || a.award_type === 'ECD Elite Inductee'
        );

        html += `<div class="person-section-label">ECDElite Dodgeball${hofInductee ? ' \u{1F3C6}' : ''}</div>`;

        // Stats grid
        html += `<div class="person-dodgeball-stats">`;
        html += `<div class="dodgeball-stat"><span class="stat-label">Mentions</span><span class="stat-value">${ecdPlayer.total_mentions.toLocaleString()}</span></div>`;
        html += `<div class="dodgeball-stat"><span class="stat-label">Posts</span><span class="stat-value">${ecdPlayer.post_count}</span></div>`;
        if (record) {
            html += `<div class="dodgeball-stat"><span class="stat-label">Record</span><span class="stat-value">${record}</span></div>`;
        }
        if (winRate !== null) {
            html += `<div class="dodgeball-stat"><span class="stat-label">Win Rate</span><span class="stat-value">${winRate}%</span></div>`;
        }
        if (ecdEra) {
            html += `<div class="dodgeball-stat"><span class="stat-label">Active Era</span><span class="stat-value">${ecdEra}</span></div>`;
        }
        if (ecdPlayer.peak_year) {
            html += `<div class="dodgeball-stat"><span class="stat-label">Peak Year</span><span class="stat-value">${ecdPlayer.peak_year}</span></div>`;
        }
        html += `</div>`;

        // Nicknames
        let nicknames = [];
        try {
            nicknames = typeof ecdPlayer.nicknames === 'string' ? JSON.parse(ecdPlayer.nicknames) : (ecdPlayer.nicknames || []);
        } catch (_) { /* ignore parse errors */ }
        if (nicknames.length) {
            html += `<div class="person-highlight-item" style="font-size:11px;color:var(--lj-text-secondary);margin-top:6px">aka ${nicknames.join(', ')}</div>`;
        }

        // Awards
        if (playerAwards.length) {
            html += playerAwards.map(a =>
                `<div class="person-highlight-item">${a.award_type}${a.year ? ` (${a.year})` : ''}</div>`
            ).join('');
        }

        if (hofInductee) {
            html += `<div class="person-highlight-item" style="color:var(--room-accent)">Hall of Fame / ECD Elite Inductee</div>`;
        }
    }

    // Awards (from profile)
    if (profile?.awards?.length) {
        html += `<div class="person-section-label">Awards</div>`;
        html += `<div class="person-awards">${profile.awards.map(a =>
            `<div class="person-award-item">
                <span class="person-milestone-year">${a.year}</span>
                ${formatAwardCategory(a.category)}${a.note ? ` — ${a.note}` : ''}
            </div>`
        ).join('')}</div>`;
    }

    // Songs (from profile)
    if (profile?.songs?.length) {
        html += `<div class="person-section-label">Associated Songs</div>`;
        html += profile.songs.map(s => {
            const text = typeof s === 'string' ? s : `${s.title || s.song || ''} ${s.artist ? `by ${s.artist}` : ''} ${s.year ? `(${s.year})` : ''}`;
            return `<div class="person-highlight-item">${text}</div>`;
        }).join('');
    }

    // LJ Comments (from profile)
    if (profile?.lj_comments?.length) {
        html += `<div class="person-section-label">LiveJournal Comments</div>`;
        html += profile.lj_comments.map(c => {
            const text = typeof c === 'string' ? c : (c.comment || c.text || '');
            return `<blockquote class="person-lj-comment">&ldquo;${text}&rdquo;</blockquote>`;
        }).join('');
    }

    // If nothing to show, say so gently
    if (r.total === 0 && !connected.length && !connection) {
        html += `<p class="sidebar-empty">This person appears in the timeline but doesn't have documented details yet.</p>`;
    }

    sidebar.innerHTML = html;
    sidebar.classList.add('open');

    // Wire up close button
    sidebar.querySelector('.sidebar-close')?.addEventListener('click', closeSidebar);

    // Wire up connection tags
    sidebar.querySelectorAll('.connection-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            focusNodeByName(tag.dataset.name);
        });
    });

    // ─── Draw Social DNA Radar Chart ─────────────────────────────
    if (analyticsReady && d.id !== 'john') {
        const personScore = analyticsPersonScores.get(d.name);
        if (personScore) {
            requestAnimationFrame(() => {
                const canvasId = `dnaCanvas-${d.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                const canvas = document.getElementById(canvasId);
                if (canvas) drawRadarChart(canvas, personScore);
            });
        }
    }

    // ─── Draw Activity Sparkline ─────────────────────────────────
    if (d.id !== 'john') {
        requestAnimationFrame(() => {
            const sparkId = `sparkline-${d.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const canvas = document.getElementById(sparkId);
            if (canvas) drawSparkline(canvas, d, profile);
        });
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('personPanel');
    if (sidebar) sidebar.classList.remove('open');
}

// ─── Network Over Time Chart ─────────────────────────────────────
// Shows how the relationship network grew and shifted year by year,
// using temporal_network.json (active, new, lost people) and
// enriching with person_arc data for a fuller picture.

function renderNetworkChart(temporalNetwork, personArc) {
    const canvas = document.getElementById('networkChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const tnData = Array.isArray(temporalNetwork) ? temporalNetwork : [];

    // Build year→set of active people from people.json active_years
    let runningTotal = new Set();
    const yearPeopleMap = {};
    const allPeople = Object.values(peopleData);

    allPeople.forEach(p => {
        if (!p.active_years) return;
        const parsed = parseActiveYears(p.active_years);
        if (!parsed) return;
        for (let y = parsed.first; y <= parsed.last; y++) {
            if (!yearPeopleMap[y]) yearPeopleMap[y] = new Set();
            yearPeopleMap[y].add(p.name);
        }
    });

    // Also add person_arc data for people not in people.json
    const arcArr = Array.isArray(personArc) ? personArc : [];
    arcArr.forEach(a => {
        if (!a.first_year || !a.last_year) return;
        for (let y = a.first_year; y <= a.last_year; y++) {
            if (!yearPeopleMap[y]) yearPeopleMap[y] = new Set();
            yearPeopleMap[y].add(a.person);
        }
    });

    // Build sorted year list (2004–2025)
    const allYears = new Set();
    tnData.forEach(d => allYears.add(d.year));
    Object.keys(yearPeopleMap).forEach(y => allYears.add(parseInt(y)));
    const years = [...allYears].filter(y => y >= 2004 && y <= 2026).sort((a, b) => a - b);

    // Compute metrics per year
    const activePerYear = [];
    const newPerYear = [];
    const lostPerYear = [];
    const cumulativePerYear = [];
    const topPersonPerYear = [];

    years.forEach(y => {
        const tnEntry = tnData.find(d => d.year === y);
        const peopleThisYear = yearPeopleMap[y] || new Set();

        const active = Math.max(tnEntry?.active_people || 0, peopleThisYear.size);
        activePerYear.push(active);
        newPerYear.push(tnEntry?.new_people || 0);
        lostPerYear.push(tnEntry?.lost_people || 0);

        peopleThisYear.forEach(name => runningTotal.add(name));
        cumulativePerYear.push(runningTotal.size);

        topPersonPerYear.push(tnEntry?.top_person || '');
    });

    const yearLabels = years.map(String);

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: yearLabels,
            datasets: [
                {
                    type: 'line',
                    label: 'Total Network (cumulative)',
                    data: cumulativePerYear,
                    borderColor: '#c9a84c',
                    backgroundColor: 'rgba(201, 168, 76, 0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#c9a84c',
                    pointBorderColor: '#c9a84c',
                    borderWidth: 2,
                    yAxisID: 'y1',
                    order: 0
                },
                {
                    label: 'Active This Year',
                    data: activePerYear,
                    backgroundColor: 'rgba(74, 144, 217, 0.7)',
                    borderColor: '#4a90d9',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 1
                },
                {
                    label: 'New Connections',
                    data: newPerYear,
                    backgroundColor: 'rgba(74, 167, 65, 0.7)',
                    borderColor: '#4a6741',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'Faded Out',
                    data: lostPerYear.map(v => -v),
                    backgroundColor: 'rgba(180, 80, 80, 0.5)',
                    borderColor: '#b45050',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 3
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(10, 22, 40, 0.95)',
                    borderColor: '#4a90d9',
                    borderWidth: 1,
                    titleFont: { family: "'Courier Prime', monospace", size: 13 },
                    bodyFont: { family: "'Trebuchet MS', sans-serif", size: 12 },
                    padding: 12,
                    callbacks: {
                        afterTitle: function(ctx) {
                            const idx = ctx[0].dataIndex;
                            const top = topPersonPerYear[idx];
                            return top ? `Most mentioned: ${top}` : '';
                        },
                        label: function(ctx) {
                            const label = ctx.dataset.label;
                            let val = ctx.parsed.y;
                            if (label === 'Faded Out') val = Math.abs(val);
                            return ` ${label}: ${val}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#7a8fa6',
                        font: { family: "'Courier Prime', monospace", size: 10 }
                    },
                    grid: { color: 'rgba(30,58,95,0.2)' }
                },
                y: {
                    position: 'left',
                    title: {
                        display: true,
                        text: 'People',
                        color: '#7a8fa6',
                        font: { family: "'Courier Prime', monospace", size: 10 }
                    },
                    ticks: {
                        color: '#7a8fa6',
                        font: { family: "'Courier Prime', monospace", size: 10 },
                        callback: v => Math.abs(v)
                    },
                    grid: { color: 'rgba(30,58,95,0.2)' }
                },
                y1: {
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Cumulative',
                        color: '#c9a84c',
                        font: { family: "'Courier Prime', monospace", size: 10 }
                    },
                    ticks: {
                        color: '#c9a84c',
                        font: { family: "'Courier Prime', monospace", size: 10 }
                    },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });

    // Render custom legend
    const legendMount = document.getElementById('networkLegend');
    if (legendMount) {
        legendMount.innerHTML = `
            <span class="net-legend-item"><span class="net-legend-swatch" style="background:#4a90d9"></span>Active This Year</span>
            <span class="net-legend-item"><span class="net-legend-swatch" style="background:#4a6741"></span>New Connections</span>
            <span class="net-legend-item"><span class="net-legend-swatch" style="background:#b45050"></span>Faded Out</span>
            <span class="net-legend-item"><span class="net-legend-line" style="border-color:#c9a84c"></span>Total Network</span>
        `;
    }
}

// ─── Network Insights ────────────────────────────────────────────
// Summarizes key network stats: busiest year, longest relationships,
// most connected people, network layers.

function renderNetworkInsights(temporalNetwork, constellation, personArc) {
    const mount = document.getElementById('networkInsights');
    if (!mount) return;

    const tnData = Array.isArray(temporalNetwork) ? temporalNetwork : [];
    const nodes = constellation?.nodes || [];
    const links = constellation?.links || [];

    // Busiest year
    const busiest = tnData.reduce((max, d) =>
        (d.active_people > (max?.active_people || 0)) ? d : max, null);

    // Year with most new connections
    const mostNew = tnData.reduce((max, d) =>
        (d.new_people > (max?.new_people || 0)) ? d : max, null);

    // Longest-spanning relationships (from people.json active_years)
    const longestPeople = Object.values(peopleData)
        .map(p => {
            const parsed = parseActiveYears(p.active_years);
            if (!parsed) return null;
            return { name: p.name, span: parsed.last - parsed.first, first: parsed.first, last: parsed.last, relation: p.relation || '' };
        })
        .filter(p => p && p.span > 0)
        .sort((a, b) => b.span - a.span)
        .slice(0, 5);

    // Most connected people in the graph (by link count, excluding John)
    const connectionCounts = {};
    links.forEach(l => {
        const src = l.source;
        const tgt = l.target;
        if (src !== 'John Tronolone') connectionCounts[src] = (connectionCounts[src] || 0) + 1;
        if (tgt !== 'John Tronolone') connectionCounts[tgt] = (connectionCounts[tgt] || 0) + 1;
    });
    const mostConnected = Object.entries(connectionCounts)
        .filter(([name]) => name !== 'John Tronolone')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Category breakdown
    const catCounts = {};
    nodes.forEach(n => {
        const cat = n.category || 'other';
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const catLabels = { family: 'Family', inner_circle: 'Inner Circle', partner: 'Partners', other: 'Others' };

    // Build HTML
    let html = `<h3 class="insights-title">Network at a Glance</h3>`;
    html += `<div class="insights-grid">`;

    html += `<div class="insight-card">
        <div class="insight-number">${nodes.length + 1}</div>
        <div class="insight-label">People in the constellation</div>
    </div>`;
    html += `<div class="insight-card">
        <div class="insight-number">${links.length}</div>
        <div class="insight-label">Documented connections</div>
    </div>`;
    if (busiest) {
        html += `<div class="insight-card">
            <div class="insight-number">${busiest.year}</div>
            <div class="insight-label">Busiest year (${busiest.active_people} active)</div>
        </div>`;
    }
    if (mostNew) {
        html += `<div class="insight-card">
            <div class="insight-number">${mostNew.year}</div>
            <div class="insight-label">Most new connections (${mostNew.new_people})</div>
        </div>`;
    }

    html += `</div>`;

    // Network layers (category breakdown)
    html += `<div class="insights-section">`;
    html += `<h4 class="insights-section-title">Network Layers</h4>`;
    html += `<div class="layer-bars">`;
    const totalPeople = nodes.length;
    ['inner_circle', 'family', 'partner', 'other'].forEach(cat => {
        const count = catCounts[cat] || 0;
        const pct = Math.round((count / totalPeople) * 100);
        const colors = { inner_circle: '#4a90d9', family: '#4a6741', partner: '#6b4a8b', other: '#7a8fa6' };
        html += `<div class="layer-bar-row">
            <span class="layer-bar-label">${catLabels[cat] || cat}</span>
            <div class="layer-bar-track">
                <div class="layer-bar-fill" style="width:${pct}%;background:${colors[cat] || '#7a8fa6'}"></div>
            </div>
            <span class="layer-bar-count">${count}</span>
        </div>`;
    });
    html += `</div></div>`;

    // Longest relationships
    if (longestPeople.length) {
        html += `<div class="insights-section">`;
        html += `<h4 class="insights-section-title">Longest-Running Relationships</h4>`;
        html += `<div class="insights-list">`;
        longestPeople.forEach(p => {
            html += `<button class="insight-person" data-name="${p.name}">
                <span class="insight-person-name">${p.name}</span>
                <span class="insight-person-meta">${p.first}–${p.last} (${p.span} years)${p.relation ? ' · ' + p.relation : ''}</span>
            </button>`;
        });
        html += `</div></div>`;
    }

    // Most connected (network hubs)
    if (mostConnected.length) {
        html += `<div class="insights-section">`;
        html += `<h4 class="insights-section-title">Network Hubs</h4>`;
        html += `<p class="insights-desc">People connected to the most other people in the constellation</p>`;
        html += `<div class="insights-list">`;
        mostConnected.forEach(([name, count]) => {
            const person = peopleData[name];
            const relation = person?.relation || '';
            html += `<button class="insight-person" data-name="${name}">
                <span class="insight-person-name">${name}</span>
                <span class="insight-person-meta">${count} connections${relation ? ' · ' + relation : ''}</span>
            </button>`;
        });
        html += `</div></div>`;
    }

    mount.innerHTML = html;

    // Wire up clickable people
    mount.querySelectorAll('.insight-person').forEach(btn => {
        btn.addEventListener('click', () => {
            focusNodeByName(btn.dataset.name);
            document.getElementById('constellationMount')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

// ─── Radar Chart Drawing ─────────────────────────────────────────
// Draws a pentagon radar chart on a canvas for a person's social DNA.

function drawRadarChart(canvas, scores) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.38;

    const dims = [
        { key: 'pageRank', label: 'Influence' },
        { key: 'betweenness', label: 'Bridge' },
        { key: 'clustering', label: 'Clique' },
        { key: 'mentions', label: 'Activity' },
        { key: 'span', label: 'Longevity' }
    ];
    const n = dims.length;
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2; // top

    ctx.clearRect(0, 0, w, h);

    // Draw grid rings
    for (let ring = 1; ring <= 4; ring++) {
        const rr = (ring / 4) * r;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
            const a = startAngle + i * angleStep;
            const x = cx + rr * Math.cos(a);
            const y = cy + rr * Math.sin(a);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(30, 58, 95, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // Draw axis lines
    for (let i = 0; i < n; i++) {
        const a = startAngle + i * angleStep;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        ctx.strokeStyle = 'rgba(30, 58, 95, 0.25)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const val = scores[dims[i].key] || 0;
        const a = startAngle + i * angleStep;
        const x = cx + r * val * Math.cos(a);
        const y = cy + r * val * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(74, 144, 217, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < n; i++) {
        const val = scores[dims[i].key] || 0;
        const a = startAngle + i * angleStep;
        const x = cx + r * val * Math.cos(a);
        const y = cy + r * val * Math.sin(a);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#4a90d9';
        ctx.fill();
    }

    // Draw dimension labels
    ctx.font = '9px Trebuchet MS, sans-serif';
    ctx.fillStyle = '#7a8fa6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
        const a = startAngle + i * angleStep;
        const lx = cx + (r + 16) * Math.cos(a);
        const ly = cy + (r + 16) * Math.sin(a);
        ctx.fillText(dims[i].label, lx, ly);
    }
}

// ─── Sparkline Drawing ───────────────────────────────────────────
// Draws a mini bar chart of activity per year.

function drawSparkline(canvas, personData, profile) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Count events per year
    const eventsByYear = {};
    const timeline = profile?.timeline || [];
    timeline.forEach(e => {
        if (e.year) eventsByYear[e.year] = (eventsByYear[e.year] || 0) + 1;
    });

    // Also count co-occurrences
    (coOccurrencesData || []).forEach(co => {
        if ((co.person_a === personData.name || co.person_b === personData.name) && co.year) {
            eventsByYear[co.year] = (eventsByYear[co.year] || 0) + 0.5;
        }
    });

    const startYear = personData.firstYear || 2004;
    const endYear = personData.lastYear || 2026;
    const years = [];
    for (let y = startYear; y <= endYear; y++) years.push(y);

    if (!years.length) return;

    const values = years.map(y => eventsByYear[y] || 0);
    const maxVal = Math.max(...values, 1);
    const barW = Math.max(w / years.length - 1, 2);
    const gap = (w - barW * years.length) / (years.length + 1);

    for (let i = 0; i < years.length; i++) {
        const barH = (values[i] / maxVal) * (h - 4);
        const x = gap + i * (barW + gap);
        const y = h - barH - 2;

        const isPeak = personData.peakYear === years[i];
        ctx.fillStyle = isPeak ? 'rgba(201, 168, 76, 0.9)' :
            values[i] > 0 ? 'rgba(74, 144, 217, 0.6)' : 'rgba(30, 58, 95, 0.2)';
        ctx.fillRect(x, y, barW, barH);
    }
}

// ─── Network Health Dashboard ────────────────────────────────────
// Renders circular ring indicators for network health metrics.

function renderNetworkHealthDashboard() {
    const mount = document.getElementById('networkHealthMount');
    if (!mount || !analyticsReady) return;

    const h = analyticsNetworkHealth;

    const metrics = [
        {
            value: h.avgDegree?.toFixed(1) || '0',
            pct: Math.min((h.avgDegree || 0) / 10, 1),
            label: 'Avg Connections',
            sublabel: 'per person',
            color: '#4a90d9'
        },
        {
            value: ((h.density || 0) * 100).toFixed(1) + '%',
            pct: h.density || 0,
            label: 'Network Density',
            sublabel: 'of possible edges',
            color: '#4a6741'
        },
        {
            value: ((h.avgClusteringCoeff || 0) * 100).toFixed(0) + '%',
            pct: h.avgClusteringCoeff || 0,
            label: 'Clustering',
            sublabel: 'avg clique tightness',
            color: '#6b4a8b'
        },
        {
            value: h.giantComponentSize || 0,
            pct: Math.min((h.giantComponentSize || 0) / (allNodes.length || 1), 1),
            label: 'Giant Component',
            sublabel: 'largest connected group',
            color: '#c9a84c'
        },
        {
            value: (h.avgPathLength || 0).toFixed(1),
            pct: Math.min((h.avgPathLength || 0) / 5, 1),
            label: 'Avg Path Length',
            sublabel: 'hops between people',
            color: '#4a90d9'
        },
        {
            value: ((h.activeRatio || 0) * 100).toFixed(0) + '%',
            pct: h.activeRatio || 0,
            label: 'Still Active',
            sublabel: 'in last 3 years',
            color: '#4a6741'
        },
        {
            value: ((h.churnRate || 0) * 100).toFixed(0) + '%',
            pct: h.churnRate || 0,
            label: 'Faded Away',
            sublabel: 'inactive 5+ years',
            color: '#b45050'
        },
        {
            value: ((h.networkCentralization || 0) * 100).toFixed(0) + '%',
            pct: Math.min(h.networkCentralization || 0, 1),
            label: 'Centralization',
            sublabel: 'how star-shaped',
            color: '#7a8fa6'
        }
    ];

    mount.innerHTML = metrics.map(m => {
        const circumference = 2 * Math.PI * 22;
        const dashOffset = circumference * (1 - m.pct);
        return `<div class="health-card">
            <div class="health-card-ring">
                <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(30,58,95,0.3)" stroke-width="4" />
                    <circle cx="26" cy="26" r="22" fill="none" stroke="${m.color}" stroke-width="4"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                        stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:center;" />
                </svg>
                <div class="health-card-ring-value">${m.value}</div>
            </div>
            <div class="health-card-label">${m.label}</div>
            <div class="health-card-sublabel">${m.sublabel}</div>
        </div>`;
    }).join('');
}

// ─── Advanced Metrics Grid ───────────────────────────────────────
// Shows top PageRank, bridge people, clique leaders, etc.

function renderAdvancedMetrics(constellation) {
    const mount = document.getElementById('metricsGridMount');
    if (!mount || !analyticsReady) return;

    const nodes = allNodes.filter(n => n.id !== 'john');

    // Top PageRank people
    const topPR = [...analyticsPageRank.entries()]
        .filter(([name]) => name !== 'John Tronolone')
        .sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Top bridge people (betweenness)
    const topBridge = [...analyticsBetweenness.entries()]
        .filter(([name]) => name !== 'John Tronolone')
        .sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Highest clustering (clique leaders)
    const topClique = [...analyticsClustering.entries()]
        .filter(([name]) => name !== 'John Tronolone')
        .sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Strongest relationships
    const topRels = [...analyticsRelStrength.entries()]
        .sort((a, b) => b[1].strength - a[1].strength).slice(0, 5);

    const communityCount = new Set(analyticsCommunities.communities.values()).size;

    let html = '';

    // Summary cards
    html += `<div class="metric-card">
        <div class="metric-card-icon">🧠</div>
        <div class="metric-card-value">${communityCount}</div>
        <div class="metric-card-label">Natural Communities</div>
        <div class="metric-card-detail">Detected via modularity optimization (Q=${analyticsCommunities.modularity.toFixed(3)})</div>
        <div class="metric-card-bar" style="width:${Math.min(communityCount / 10 * 100, 100)}%"></div>
    </div>`;

    html += `<div class="metric-card">
        <div class="metric-card-icon">⭐</div>
        <div class="metric-card-value">${topPR.length ? topPR[0][0].split(' ')[0] : '—'}</div>
        <div class="metric-card-label">Highest PageRank</div>
        <div class="metric-card-detail">${topPR.length ? `Score: ${(topPR[0][1] * 100).toFixed(1)}% — most central by link structure` : 'N/A'}</div>
        <div class="metric-card-bar" style="width:${topPR.length ? topPR[0][1] * 100 : 0}%"></div>
    </div>`;

    html += `<div class="metric-card">
        <div class="metric-card-icon">🌉</div>
        <div class="metric-card-value">${topBridge.length ? topBridge[0][0].split(' ')[0] : '—'}</div>
        <div class="metric-card-label">Top Bridge Person</div>
        <div class="metric-card-detail">${topBridge.length ? `Betweenness: ${(topBridge[0][1] * 100).toFixed(1)}% — connects separate clusters` : 'N/A'}</div>
        <div class="metric-card-bar" style="width:${topBridge.length ? topBridge[0][1] * 100 : 0}%"></div>
    </div>`;

    html += `<div class="metric-card">
        <div class="metric-card-icon">🔗</div>
        <div class="metric-card-value">${topClique.length ? topClique[0][0].split(' ')[0] : '—'}</div>
        <div class="metric-card-label">Tightest Clique</div>
        <div class="metric-card-detail">${topClique.length ? `Clustering: ${(topClique[0][1] * 100).toFixed(0)}% — neighbors are also friends` : 'N/A'}</div>
        <div class="metric-card-bar" style="width:${topClique.length ? topClique[0][1] * 100 : 0}%"></div>
    </div>`;

    // Top lists
    html += `</div>`; // close metrics-grid
    html += `<div class="insights-grid" style="margin-top:20px">`;

    // PageRank leaders
    html += `<div class="insights-section">
        <h4 class="insights-section-title">PageRank Leaders</h4>
        <p class="insights-desc">Who matters most by network structure alone</p>
        <div class="insights-list">${topPR.map(([name, score]) => {
            const person = peopleData[name];
            return `<button class="insight-person" data-name="${name}">
                <span class="insight-person-name">${name}</span>
                <span class="insight-person-meta">${(score * 100).toFixed(1)}%${person?.relation ? ' · ' + person.relation : ''}</span>
            </button>`;
        }).join('')}</div>
    </div>`;

    // Bridge people
    html += `<div class="insights-section">
        <h4 class="insights-section-title">Bridge People</h4>
        <p class="insights-desc">Connectors between different social clusters</p>
        <div class="insights-list">${topBridge.map(([name, score]) => {
            const person = peopleData[name];
            return `<button class="insight-person" data-name="${name}">
                <span class="insight-person-name">${name}</span>
                <span class="insight-person-meta">${(score * 100).toFixed(1)}%${person?.relation ? ' · ' + person.relation : ''}</span>
            </button>`;
        }).join('')}</div>
    </div>`;

    // Strongest bonds
    html += `<div class="insights-section">
        <h4 class="insights-section-title">Strongest Bonds</h4>
        <p class="insights-desc">Relationships with highest composite strength (weight + co-occurrence + recency)</p>
        <div class="insights-list">${topRels.map(([key, data]) => {
            const [nameA, nameB] = key.split('|');
            const classification = data.strength > 2 ? 'Strong' : data.strength > 1 ? 'Moderate' : 'Weak';
            return `<button class="insight-person" data-name="${nameA}">
                <span class="insight-person-name">${nameA} ↔ ${nameB}</span>
                <span class="insight-person-meta">${data.strength.toFixed(2)} · ${classification} · ${data.mutualCount} mutual</span>
            </button>`;
        }).join('')}</div>
    </div>`;

    html += `</div>`;

    mount.innerHTML = html;

    // Wire up clickable people
    mount.querySelectorAll('.insight-person').forEach(btn => {
        btn.addEventListener('click', () => {
            focusNodeByName(btn.dataset.name);
            document.getElementById('constellationMount')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

// ─── Community Cards ─────────────────────────────────────────────
// Renders detected community clusters with member lists.

function renderCommunityCards() {
    const mount = document.getElementById('communitiesMount');
    if (!mount || !analyticsReady) return;

    const communityMembers = {};
    for (const [name, communityId] of analyticsCommunities.communities) {
        if (name === 'John Tronolone') continue;
        if (!communityMembers[communityId]) communityMembers[communityId] = [];
        communityMembers[communityId].push(name);
    }

    // Sort communities by size
    const sortedCommunities = Object.entries(communityMembers)
        .map(([id, members]) => ({
            id: parseInt(id),
            members: members.sort((a, b) => {
                const scoreA = analyticsPersonScores.get(a)?.socialGravity || 0;
                const scoreB = analyticsPersonScores.get(b)?.socialGravity || 0;
                return scoreB - scoreA;
            })
        }))
        .filter(c => c.members.length >= 2) // Only show communities with 2+ members
        .sort((a, b) => b.members.length - a.members.length);

    if (!sortedCommunities.length) return;

    // Name communities by their top member's category
    function nameCommunity(members) {
        const catCounts = {};
        members.forEach(name => {
            const node = allNodes.find(n => n.name === name);
            const cat = node?.displayCat || 'other';
            catCounts[cat] = (catCounts[cat] || 0) + 1;
        });
        const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const catNames = { core: 'Inner Circle', family: 'Family', ecd: 'ECD Community', other: 'Extended Network' };
        const topMember = members[0]?.split(' ')[0] || '';
        return `${catNames[topCat] || 'Group'} (${topMember}+)`;
    }

    let html = `<h4 class="insights-section-title">Detected Communities</h4>
        <p class="insights-desc">Clusters discovered by modularity optimization — groups that naturally hang together</p>
        <div class="communities-grid">`;

    sortedCommunities.forEach(c => {
        const color = analyticsCommunities.communityColors.get(c.id) || '#7a8fa6';
        const communityName = nameCommunity(c.members);

        // Community-level stats
        const avgPR = c.members.reduce((sum, m) => sum + (analyticsPageRank.get(m) || 0), 0) / c.members.length;
        const avgCC = c.members.reduce((sum, m) => sum + (analyticsClustering.get(m) || 0), 0) / c.members.length;

        html += `<div class="community-card" style="--community-color:${color}">
            <div class="community-card-header">
                <span class="community-dot" style="background:${color}"></span>
                <span class="community-name">${communityName}</span>
                <span class="community-count">${c.members.length}</span>
            </div>
            <div class="community-members">${c.members.slice(0, 12).map(name =>
                `<button class="community-member" data-name="${name}">${name}</button>`
            ).join('')}${c.members.length > 12 ? `<span class="community-member" style="cursor:default;opacity:0.5">+${c.members.length - 12} more</span>` : ''}</div>
            <div class="community-stats">
                <span>Avg PageRank: ${(avgPR * 100).toFixed(1)}%</span>
                <span>Avg Clustering: ${(avgCC * 100).toFixed(0)}%</span>
            </div>
        </div>`;
    });

    html += `</div>`;
    mount.innerHTML = html;

    // Wire up member clicks
    mount.querySelectorAll('.community-member[data-name]').forEach(btn => {
        btn.addEventListener('click', () => {
            focusNodeByName(btn.dataset.name);
            document.getElementById('constellationMount')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

// ─── Diversity Over Time Chart ───────────────────────────────────
// Shannon entropy of category mix + network age over time.

function renderDiversityChart() {
    const canvas = document.getElementById('diversityChart');
    if (!canvas || typeof Chart === 'undefined' || !analyticsReady) return;

    const evolution = analyticsTemporalEvolution;
    if (!evolution.length) return;

    const years = evolution.map(e => String(e.year));
    const diversity = evolution.map(e => e.diversityIndex);
    const networkAge = evolution.map(e => e.networkAge);
    const activeCount = evolution.map(e => e.activeCount);

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Diversity Index (Shannon)',
                    data: diversity,
                    borderColor: '#6b4a8b',
                    backgroundColor: 'rgba(107,74,139,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#6b4a8b',
                    borderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Network Age (avg years known)',
                    data: networkAge,
                    borderColor: '#c9a84c',
                    backgroundColor: 'rgba(201,168,76,0.05)',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 3,
                    pointBackgroundColor: '#c9a84c',
                    borderWidth: 2,
                    yAxisID: 'y1'
                },
                {
                    label: 'Active People',
                    data: activeCount,
                    borderColor: 'rgba(74,144,217,0.4)',
                    backgroundColor: 'rgba(74,144,217,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 2,
                    borderWidth: 1,
                    borderDash: [4, 4],
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        color: '#7a8fa6',
                        font: { family: "'Trebuchet MS', sans-serif", size: 11 },
                        boxWidth: 14,
                        padding: 16
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 22, 40, 0.95)',
                    borderColor: '#6b4a8b',
                    borderWidth: 1,
                    titleFont: { family: "'Courier Prime', monospace", size: 13 },
                    bodyFont: { family: "'Trebuchet MS', sans-serif", size: 12 },
                    padding: 12
                }
            },
            scales: {
                x: {
                    ticks: { color: '#7a8fa6', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(30,58,95,0.2)' }
                },
                y: {
                    position: 'left',
                    title: {
                        display: true, text: 'Shannon Entropy',
                        color: '#6b4a8b', font: { family: "'Courier Prime', monospace", size: 10 }
                    },
                    ticks: { color: '#6b4a8b', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(30,58,95,0.15)' }
                },
                y1: {
                    position: 'right',
                    title: {
                        display: true, text: 'People / Years',
                        color: '#c9a84c', font: { family: "'Courier Prime', monospace", size: 10 }
                    },
                    ticks: { color: '#c9a84c', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Auto-init
initConstellation()
    .then(() => initWormholes('constellation'))
    .then(() => plantClue('clue2', document.querySelector('.constellation-annotation')))
    .catch(() => {
        const el = document.getElementById('constellationMount');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
