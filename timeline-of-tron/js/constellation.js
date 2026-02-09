// js/constellation.js — Room 2: The Constellation (People + Relationships)
// D3 force graph of 164 people as stars on a dark background

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

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

// Build a name→ECD player lookup (case-insensitive matching for awards)
function buildEcdPlayerMap(playersArray) {
    const map = {};
    if (!Array.isArray(playersArray)) return map;
    playersArray.forEach(p => {
        if (p.name) map[p.name] = p;
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
        'milestones_enriched.json',
        'co_occurrences.json'
    ]);
    // Optional enrichment data — don't block page if missing
    try {
        const extras = await loadMultiple(['people_highlights.json', 'ecd_players.json', 'ecd_awards_v2.json']);
        data.people_highlights = extras.people_highlights;
        data.ecd_players = extras.ecd_players;
        data.ecd_awards_v2 = extras.ecd_awards_v2;
    } catch (_) { /* enrichment data unavailable — page still works */ }

    const constellation = data.relationship_constellation;
    profilesData = buildProfileMap(data.people_profiles);
    peopleData = buildPeopleMap(data.people);
    arcData = buildArcMap(data.person_arc);
    coOccurrencesData = data.co_occurrences || [];
    ecdPlayersData = buildEcdPlayerMap(data.ecd_players);
    ecdAwardsData = data.ecd_awards_v2 || [];

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

    renderFeaturedCards(constellation.nodes, profilesData);
    renderFiltersAndLegend(constellation.nodes);
    renderStatsBar(constellation);
    renderForceGraph(constellation, profilesData, coOccurrencesData);
    initSearchAutocomplete(constellation.nodes, profilesData);
    renderInnerCircleChart(data.milestones_enriched);
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

    const categoryOrder = ['family', 'inner_circle', 'partner', 'other'];
    const categoryLabels = { family: 'Family', inner_circle: 'Inner Circle', partner: 'Partner', other: 'Others' };

    const filterBtns = categoryOrder
        .filter(c => cats[c])
        .map(c => `<button class="filter-pill" data-cat="${c}">${categoryLabels[c] || c} <span class="filter-count">${cats[c]}</span></button>`);

    const legendItems = Object.entries(ERA_COLORS).map(([key, color]) =>
        `<span class="legend-item"><span class="legend-dot" style="background: ${color}"></span>${ERA_LABELS[key]}</span>`
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

// ─── Force Graph ─────────────────────────────────────────────────

function renderForceGraph(constellation, profiles, coOccurrences) {
    const container = document.getElementById('constellationMount');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    const tooltip = d3.select(container)
        .append('div')
        .attr('class', 'constellation-tooltip')
        .style('display', 'none');

    // Prepare nodes — size and opacity based on data richness + importance
    const nodes = constellation.nodes
        .filter(n => n.name !== 'John Tronolone') // We add center node manually
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

        // Content = profile data + connection description + importance + ECD stats
        const hasContent = r.total > 0 || !!connection || importanceScore >= 10 || ecdMentions > 0;

        // Node radius: based on importance (primary) + mentions (secondary) + ECD (tertiary)
        const baseRadius = Math.sqrt(Math.max(importanceScore, 1)) * 1.2 + 3;
        const mentionBoost = Math.sqrt(totalMentions) * 0.5;
        const ecdBoost = Math.sqrt(ecdMentions) * 0.15;
        const radius = hasContent ? Math.max(baseRadius + mentionBoost + ecdBoost, 5) : Math.max(baseRadius * 0.5, 2.5);

        return {
            ...n,
            name: n.name,
            radius: Math.min(radius, 20), // cap max radius
            color: getEraColor(firstYear),
            richness: r,
            hasContent,
            relation,
            connection,
            firstYear,
            lastYear,
            totalMentions,
            importanceScore,
            peakYear: arc?.peak_year || person?.peak_year || null,
            activeYears: person?.active_years || '',
            dominantTopic: person?.dominant_topic || ''
        };
    });

    // Add center node (the subject)
    nodes.unshift({
        id: 'john',
        name: 'John Tronolone',
        category: 'self',
        radius: 18,
        color: '#c9a84c',
        fx: width / 2,
        fy: height / 2,
        richness: { total: 999 },
        hasContent: true,
        relation: '',
        connection: '',
        firstYear: 2004,
        lastYear: 2026,
        totalMentions: 999,
        importanceScore: 999,
        peakYear: null,
        activeYears: '2004-2026',
        dominantTopic: ''
    });

    // Links use names as source/target — D3 resolves via .id(d => d.name)
    const links = (constellation.links || []).map(l => ({
        source: l.source,
        target: l.target,
        weight: l.weight || 1,
        isHub: l.target === 'John Tronolone' || l.source === 'John Tronolone',
        fromCoOccurrence: false
    })).filter(l => l.source !== l.target);

    // Enrich with co-occurrence links not already in the data
    const existingLinkSet = new Set(links.map(l => [l.source, l.target].sort().join('|')));
    const nodeNames = new Set(nodes.map(n => n.name));
    (coOccurrences || []).forEach(co => {
        if (!nodeNames.has(co.person_a) || !nodeNames.has(co.person_b)) return;
        if (co.person_a === co.person_b) return;
        const key = [co.person_a, co.person_b].sort().join('|');
        if (existingLinkSet.has(key)) return;
        existingLinkSet.add(key);
        links.push({
            source: co.person_a,
            target: co.person_b,
            weight: Math.min(co.co_occurrence_count || 1, 3),
            fromCoOccurrence: true,
            isHub: false
        });
    });

    allNodes = nodes;
    allLinks = links;

    // Hub links (person→John) get longer distance to create the spoke structure;
    // peer links are shorter to cluster connected people together
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.name)
            .distance(d => d.isHub ? 120 : 60)
            .strength(d => d.isHub ? 0.15 : 0.4))
        .force('charge', d3.forceManyBody().strength(-40))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(d => d.radius + 3));

    // Hub links: thin, subtle rays from center; peer links: brighter
    svgLink = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', d => {
            if (d.isHub) return 'rgba(201, 168, 76, 0.12)';
            if (d.fromCoOccurrence) return 'rgba(201, 168, 76, 0.25)';
            return 'rgba(255,255,255,0.35)';
        })
        .attr('stroke-width', d => {
            if (d.isHub) return 0.5;
            return Math.min(d.weight, 3);
        })
        .attr('stroke-dasharray', d => d.fromCoOccurrence ? '3,3' : 'none');

    svgNode = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => d.color)
        .attr('stroke', d => d.hasContent ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)')
        .attr('stroke-width', d => d.hasContent ? 1.5 : 0.5)
        .attr('opacity', d => d.hasContent ? 1 : 0.35)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Hover — show enriched info
    svgNode.on('mouseover', (event, d) => {
        const relation = d.relation;
        const yearSpan = d.firstYear && d.lastYear ? `${d.firstYear}–${d.lastYear}` :
                         d.firstYear ? `Since ${d.firstYear}` : '';
        const parts = [`<strong>${d.name}</strong>`];
        if (relation) parts.push(relation);
        if (d.connection) {
            const snippet = d.connection.split('.')[0].split(';')[0];
            if (snippet && snippet !== relation) parts.push(`<span class="tooltip-connection">${snippet}</span>`);
        }
        if (yearSpan) parts.push(yearSpan);
        if (d.importanceScore > 0 && d.id !== 'john') {
            parts.push(`<span class="tooltip-richness">Importance: ${Math.round(d.importanceScore)}</span>`);
        }
        const ecdP = ecdPlayersData[d.name];
        if (ecdP) {
            const w = ecdP.wins || 0;
            const l = ecdP.losses || 0;
            const rec = (w + l > 0) ? ` ${w}W–${l}L` : '';
            parts.push(`<span class="tooltip-richness">ECD: ${ecdP.total_mentions.toLocaleString()} mentions${rec}</span>`);
        }
        const summary = richnessSummary(d.richness);
        if (summary) parts.push(`<span class="tooltip-richness">${summary}</span>`);

        tooltip
            .style('display', 'block')
            .style('left', (event.offsetX + 12) + 'px')
            .style('top', (event.offsetY - 10) + 'px')
            .html(parts.join('<br>'));
    })
    .on('mouseout', () => tooltip.style('display', 'none'));

    svgNode.on('click', (event, d) => {
        event.stopPropagation();
        focusNodeByName(d.name);
    });

    svg.on('click', () => {
        resetGraphOpacity();
        closeSidebar();
    });

    simulation.on('tick', () => {
        svgLink
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        svgNode
            .attr('cx', d => d.x = Math.max(d.radius, Math.min(width - d.radius, d.x)))
            .attr('cy', d => d.y = Math.max(d.radius, Math.min(height - d.radius, d.y)));
    });

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
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

    // Meta stats row
    const metaParts = [];
    if (yearText) metaParts.push(yearText);
    if (peakYear) metaParts.push(`Peak: ${peakYear}`);
    if (totalMentions > 0 && d.id !== 'john') metaParts.push(`${totalMentions} mention${totalMentions !== 1 ? 's' : ''}`);
    if (importanceScore > 0 && d.id !== 'john') metaParts.push(`Score: ${Math.round(importanceScore)}`);
    if (metaParts.length) {
        html += `<div class="person-meta-row">${metaParts.join(' · ')}</div>`;
    }

    // Connections (always show if any exist)
    if (connected.length) {
        html += `<div class="person-section-label">Connections (${connected.length})</div>`;
        html += `<div class="person-connections">${connected.slice(0, 16).map(c =>
            `<button class="connection-tag" data-name="${c}">${c}</button>`
        ).join('')}</div>`;
        if (connected.length > 16) {
            html += `<div class="person-more-note">+ ${connected.length - 16} more</div>`;
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
}

function closeSidebar() {
    const sidebar = document.getElementById('personPanel');
    if (sidebar) sidebar.classList.remove('open');
}

// ─── Inner Circle Chart ──────────────────────────────────────────

function renderInnerCircleChart(milestones) {
    const canvas = document.getElementById('innerCircleChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const yearlyPeople = {};
    const allMilestones = Array.isArray(milestones) ? milestones : [];

    allMilestones.forEach(m => {
        const year = m.year;
        if (!year) return;
        if (!yearlyPeople[year]) yearlyPeople[year] = new Set();
        yearlyPeople[year].add(m.category || 'unknown');
    });

    const years = Object.keys(yearlyPeople).sort();
    const counts = years.map(y => yearlyPeople[y].size);

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Active connections per year',
                data: counts,
                borderColor: '#4a90d9',
                backgroundColor: 'rgba(74, 144, 217, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointBackgroundColor: '#4a90d9'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#7a8fa6', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(30,58,95,0.3)' }
                },
                y: {
                    ticks: { color: '#7a8fa6', font: { family: "'Courier Prime', monospace", size: 10 } },
                    grid: { color: 'rgba(30,58,95,0.3)' }
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
