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
import {
    resolveName,
    deduplicateNodes,
    deduplicateLinks,
    deduplicateCoOccurrences,
    deduplicateArcs,
    resolveProfileKey,
    getAliases
} from './name-resolver.js';

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

// ─── New enrichment data for enhanced sidebar ──────────────────
let quotesData = [];
let quoteAttributionData = [];
let ecdRivalriesData = [];
let ecdMatchResultsData = [];
let ecdGameResultsData = [];
let traditionsData = [];
let streaksData = [];
let funFactsData = [];
let ljCommentsData = [];
let milestonePeopleData = [];

// ─── Build lookups for new enrichment data ─────────────────────
function buildQuotesByPerson(quoteAttrArray) {
    const map = {};
    if (!Array.isArray(quoteAttrArray)) return map;
    quoteAttrArray.forEach(q => {
        if (!q.person_name) return;
        if (!map[q.person_name]) map[q.person_name] = [];
        map[q.person_name].push(q);
    });
    return map;
}

function buildRivalriesByPlayer(rivalriesArray) {
    const map = {};
    if (!Array.isArray(rivalriesArray)) return map;
    rivalriesArray.forEach(r => {
        if (r.player1) {
            if (!map[r.player1]) map[r.player1] = [];
            map[r.player1].push(r);
        }
        if (r.player2) {
            if (!map[r.player2]) map[r.player2] = [];
            map[r.player2].push(r);
        }
    });
    return map;
}

function buildMatchRecordsByPlayer(matchArray) {
    const map = {};
    if (!Array.isArray(matchArray)) return map;
    matchArray.forEach(m => {
        if (m.winner) {
            if (!map[m.winner]) map[m.winner] = { wins: [], losses: [] };
            map[m.winner].wins.push(m);
        }
        if (m.loser) {
            if (!map[m.loser]) map[m.loser] = { wins: [], losses: [] };
            map[m.loser].losses.push(m);
        }
    });
    return map;
}

function buildLjCommentsByPerson(commentsArray) {
    const map = {};
    if (!Array.isArray(commentsArray)) return map;
    commentsArray.forEach(c => {
        if (!c.commenter) return;
        if (!map[c.commenter]) map[c.commenter] = [];
        map[c.commenter].push(c);
    });
    return map;
}

function buildMilestonesByPerson(milestoneArray) {
    const map = {};
    if (!Array.isArray(milestoneArray)) return map;
    milestoneArray.forEach(m => {
        let people = [];
        try {
            people = typeof m.people_names === 'string' ? JSON.parse(m.people_names) : (m.people_names || []);
        } catch (_) { /* ignore */ }
        if (!Array.isArray(people)) return;
        people.forEach(name => {
            if (!name) return;
            if (!map[name]) map[name] = [];
            map[name].push(m);
        });
    });
    return map;
}

let quotesByPerson = {};
let rivalriesByPlayer = {};
let matchRecordsByPlayer = {};
let ljCommentsByPerson = {};
let milestonesByPerson = {};

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
        const extras = await loadMultiple(['people_highlights.json', 'ecd_players_full.json', 'ecd_awards.json', 'song_person_map.json', 'ecd_player_network.json']);
        data.people_highlights = extras.people_highlights;
        data.ecd_players = extras.ecd_players;
        data.ecd_awards = extras.ecd_awards;
        data.song_person_map = extras.song_person_map;
        data.ecd_player_network = extras.ecd_player_network;
    } catch (_) { /* enrichment data unavailable — page still works */ }

    // ─── Load extended enrichment data (quotes, rivalries, records, etc.) ────
    try {
        const extended = await loadMultiple([
            'quotes.json', 'quote_attribution.json',
            'ecd_rivalries.json', 'ecd_match_results.json', 'ecd_game_results.json',
            'traditions.json', 'streaks.json', 'fun_facts.json',
            'lj_comments.json', 'milestone_people.json'
        ]);
        quotesData = extended.quotes || [];
        quoteAttributionData = extended.quote_attribution || [];
        ecdRivalriesData = extended.ecd_rivalries || [];
        ecdMatchResultsData = extended.ecd_match_results || [];
        ecdGameResultsData = extended.ecd_game_results || [];
        traditionsData = extended.traditions || [];
        streaksData = extended.streaks || [];
        funFactsData = extended.fun_facts || [];
        ljCommentsData = extended.lj_comments || [];
        milestonePeopleData = extended.milestone_people || [];

        // Build person-indexed lookups
        quotesByPerson = buildQuotesByPerson(quoteAttributionData);
        rivalriesByPlayer = buildRivalriesByPlayer(ecdRivalriesData);
        matchRecordsByPlayer = buildMatchRecordsByPlayer([...(ecdMatchResultsData || []), ...(ecdGameResultsData || [])]);
        ljCommentsByPerson = buildLjCommentsByPerson(ljCommentsData);
        milestonesByPerson = buildMilestonesByPerson(milestonePeopleData);
    } catch (e) {
        console.warn('[Constellation] Extended enrichment data unavailable:', e.message);
    }

    // ─── Name Resolution: Deduplicate before anything touches the data ────
    const rawConstellation = data.relationship_constellation || { nodes: [], links: [] };
    const constellation = {
        ...rawConstellation,
        nodes: deduplicateNodes(rawConstellation.nodes || []),
        links: deduplicateLinks(rawConstellation.links || [])
    };
    const deduplicatedNodeCount = (rawConstellation.nodes || []).length - constellation.nodes.length;
    if (deduplicatedNodeCount > 0) {
    }
    const deduplicatedLinkCount = (rawConstellation.links || []).length - constellation.links.length;
    if (deduplicatedLinkCount > 0) {
    }

    // Resolve names in co-occurrences before building maps
    const rawCoOcc = data.co_occurrences || [];
    const resolvedCoOcc = deduplicateCoOccurrences(rawCoOcc);

    // Resolve names in person_arc before building arc map
    const rawArc = data.person_arc || [];
    const resolvedArc = deduplicateArcs(rawArc);

    // Resolve names in people data
    const rawPeople = data.people || [];
    rawPeople.forEach(p => { p.name = resolveName(p.name); });

    // Resolve names in people_profiles
    const rawProfiles = data.people_profiles || [];
    rawProfiles.forEach(p => {
        if (p.person) p.person.name = resolveName(p.person.name);
    });

    // Resolve names in ECD players
    const rawEcd = data.ecd_players || [];
    rawEcd.forEach(p => { p.name = resolveName(p.name); });

    // Resolve names in ECD player network
    const rawEcdNet = data.ecd_player_network || { nodes: [], links: [] };
    const ecdNet = {
        nodes: deduplicateNodes(rawEcdNet.nodes || []),
        links: deduplicateLinks(rawEcdNet.links || [])
    };

    profilesData = buildProfileMap(rawProfiles);
    peopleData = buildPeopleMap(rawPeople);
    arcData = buildArcMap(resolvedArc);
    coOccurrencesData = resolvedCoOcc;
    ecdPlayersData = buildEcdPlayerMap(rawEcd);
    ecdAwardsData = data.ecd_awards || [];
    ecdPlayerNetworkData = ecdNet;
    lifeChaptersData = data.life_chapters || [];
    songsByPerson = buildSongPersonMap(data.song_person_map);

    // Enrich profiles with person_timelines data for people who have events there
    // but not in people_profiles (covers more people)
    const personTimelines = data.person_timelines || [];
    personTimelines.forEach(evt => {
        const name = resolveName(evt.person_name);
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
    } catch (e) {
        console.warn('[Constellation] Analytics computation failed, falling back to basic mode:', e);
        analyticsReady = false;
    }

    renderFeaturedCards(constellation.nodes, profilesData);
    renderFiltersAndLegend(constellation.nodes);
    renderChapterTimeline(lifeChaptersData);
    renderStatsBar(constellation);
    renderTemporalSlider();
    renderForceGraph(constellation, profilesData, coOccurrencesData);
    initSearchAutocomplete(constellation.nodes, profilesData);
    renderNetworkInsights(data.temporal_network, constellation, data.person_arc);
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

// ─── Search Autocomplete (Fuse.js + Alias-Aware) ────────────────

function initSearchAutocomplete(nodes, profiles) {
    const wrapper = document.querySelector('.constellation-search');
    const input = wrapper?.querySelector('input');
    if (!wrapper || !input) return;

    // Build searchable list with enriched data + aliases for fuzzy matching
    const searchList = nodes.map(n => {
        const profile = profiles[n.name];
        const r = getDataRichness(n.name, profile);
        const relation = getBestRelation(n);
        const connection = getBestConnection(n);
        const aliases = getAliases(n.name); // e.g. "Dan Spengeman" → ["Danny Sponge", "Spengeman"]
        return {
            name: n.name,
            relation,
            connection,
            category: n.category || '',
            aliases,
            aliasStr: aliases.join(' '), // Flattened for Fuse.js key matching
            richness: r.total + (n.importance_score || 0) / 10
        };
    }).sort((a, b) => b.richness - a.richness);

    // Build Fuse.js instance for fuzzy + alias-aware search
    const constellationFuse = new Fuse(searchList, {
        keys: [
            { name: 'name',      weight: 10 },
            { name: 'aliasStr',  weight: 8 },
            { name: 'relation',  weight: 5 },
            { name: 'connection', weight: 3 },
            { name: 'category',  weight: 2 }
        ],
        threshold: 0.35,
        ignoreLocation: true,
        includeScore: true,
        minMatchCharLength: 2
    });

    // Build a mini spellcheck dictionary for "did you mean?"
    const nameTerms = new Set();
    searchList.forEach(p => {
        nameTerms.add(p.name);
        p.aliases.forEach(a => nameTerms.add(a));
    });
    const nameDictionary = [...nameTerms];

    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown';
    dropdown.style.display = 'none';
    wrapper.appendChild(dropdown);

    input.addEventListener('input', () => {
        const q = input.value.trim();
        if (!q) {
            dropdown.style.display = 'none';
            resetGraphOpacity();
            return;
        }

        const fuseResults = constellationFuse.search(q, { limit: 8 });
        const matches = fuseResults.map(r => r.item);

        // Determine which node names matched (for graph dimming)
        const matchedNames = new Set(matches.map(m => m.name.toLowerCase()));

        if (!matches.length) {
            // Try lightweight spellcheck
            const correction = findClosestName(q, nameDictionary);
            if (correction) {
                dropdown.innerHTML = `
                    <div class="search-no-results">No matches</div>
                    <div class="constellation-suggestion">
                        Did you mean: <a href="javascript:void(0)" data-correction="${correction}">${correction}</a>?
                    </div>`;
                const link = dropdown.querySelector('.constellation-suggestion a');
                if (link) {
                    link.addEventListener('click', () => {
                        input.value = correction;
                        input.dispatchEvent(new Event('input'));
                    });
                }
            } else {
                dropdown.innerHTML = '<div class="search-no-results">No matches</div>';
            }
            dropdown.style.display = 'block';
            if (svgNode) svgNode.attr('opacity', d => 0.1);
            return;
        }

        dropdown.innerHTML = matches.map(m => {
            const subtitle = m.relation || (m.connection ? m.connection.split('.')[0].split(';')[0] : '') || m.category;
            const aliasHint = m.aliases.length
                ? `<span class="search-result-alias">aka ${m.aliases.slice(0, 2).join(', ')}</span>`
                : '';
            return `<button class="search-result" data-name="${m.name}">
                <span class="search-result-name">${highlightMatch(m.name, q)}</span>
                <span class="search-result-meta">${subtitle}</span>
                ${aliasHint}
            </button>`;
        }).join('');
        dropdown.style.display = 'block';

        // Dim non-matching nodes in D3 graph
        if (svgNode) {
            svgNode.attr('opacity', d =>
                matchedNames.has((d.name || '').toLowerCase()) ? 1 : 0.1
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

/** Lightweight Levenshtein for constellation-local spellcheck */
function findClosestName(query, dictionary, maxDist = 2) {
    if (query.length < 2) return null;
    const q = query.toLowerCase();
    let best = null, bestDist = Infinity;
    for (const term of dictionary) {
        const t = term.toLowerCase();
        if (Math.abs(t.length - q.length) > maxDist) continue;
        if (t === q) return null; // exact match, no correction needed
        const d = levenshteinDist(q, t);
        if (d <= maxDist && d < bestDist) { bestDist = d; best = term; }
    }
    return best;
}

function levenshteinDist(a, b) {
    const m = a.length, n = b.length;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    let curr = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }
        [prev, curr] = [curr, prev];
    }
    return prev[n];
}

function highlightMatch(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + query.length) + '</mark>' + text.slice(idx + query.length);
}

// ─── Focus a node by name ────────────────────────────────────────

function focusNodeByName(name) {
    if (!svgNode || !svgLink) return;
    const resolved = resolveName(name);
    const targetNode = allNodes.find(n => n.name === resolved) || allNodes.find(n => n.name === name);
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

// ─── Temporal Slider ─────────────────────────────────────────────
// Year slider that filters the graph to show network at a point in time.

let temporalSliderYear = null; // null = show all

function renderTemporalSlider() {
    const mount = document.getElementById('temporalSliderMount');
    if (!mount) return;

    mount.innerHTML = `
        <div class="temporal-slider-wrap">
            <span class="temporal-slider-label">Network Through Time</span>
            <div class="temporal-slider-track">
                <button class="temporal-btn temporal-all active" data-year="all">All Years</button>
                <input type="range" class="temporal-range" min="2004" max="2026" value="2026" step="1">
                <span class="temporal-year-display">2026</span>
            </div>
            <button class="temporal-play-btn" title="Animate timeline">&#9654;</button>
        </div>
    `;

    const slider = mount.querySelector('.temporal-range');
    const yearDisplay = mount.querySelector('.temporal-year-display');
    const allBtn = mount.querySelector('.temporal-all');
    const playBtn = mount.querySelector('.temporal-play-btn');
    let animationTimer = null;

    slider.addEventListener('input', () => {
        const year = parseInt(slider.value);
        yearDisplay.textContent = year;
        allBtn.classList.remove('active');
        temporalSliderYear = year;
        applyTemporalFilter(year);
    });

    allBtn.addEventListener('click', () => {
        allBtn.classList.add('active');
        slider.value = 2026;
        yearDisplay.textContent = '2026';
        temporalSliderYear = null;
        resetGraphOpacity();
    });

    playBtn.addEventListener('click', () => {
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
            playBtn.innerHTML = '&#9654;';
            return;
        }
        playBtn.innerHTML = '&#9632;';
        let y = 2004;
        slider.value = y;
        yearDisplay.textContent = y;
        allBtn.classList.remove('active');
        applyTemporalFilter(y);

        animationTimer = setInterval(() => {
            y++;
            if (y > 2026) {
                clearInterval(animationTimer);
                animationTimer = null;
                playBtn.innerHTML = '&#9654;';
                return;
            }
            slider.value = y;
            yearDisplay.textContent = y;
            temporalSliderYear = y;
            applyTemporalFilter(y);
        }, 800);
    });
}

function applyTemporalFilter(year) {
    if (!svgNode || !svgLink) return;

    svgNode.transition().duration(350)
        .attr('opacity', d => {
            if (d.id === 'john') return 1;
            const first = d.firstYear;
            if (!first) return 0.06;
            if (first > year) return 0.03;
            const last = d.lastYear || 2026;
            const isActive = first <= year && last >= year;
            const isPast = last < year;
            return isActive ? 1 : isPast ? 0.15 : 0.03;
        })
        .attr('r', d => {
            if (d.id === 'john') return d.radius;
            const first = d.firstYear;
            if (!first || first > year) return d.radius * 0.3;
            return d.radius;
        });

    svgLink.transition().duration(350)
        .attr('opacity', l => {
            const src = typeof l.source === 'object' ? l.source : allNodes.find(n => n.name === l.source);
            const tgt = typeof l.target === 'object' ? l.target : allNodes.find(n => n.name === l.target);
            const srcFirst = src?.firstYear;
            const tgtFirst = tgt?.firstYear;
            if (!srcFirst || !tgtFirst) return 0.02;
            const bothActive = srcFirst <= year && tgtFirst <= year;
            return bothActive ? 0.45 : 0.02;
        });
}

// ─── Enhanced Hover: 2-Hop Ego Network ──────────────────────────
// On hover, highlight 1-hop connections bright, 2-hop dimmer

function highlightEgoNetwork(targetName) {
    if (!svgNode || !svgLink) return;

    const oneHop = new Set();
    const twoHop = new Set();

    allLinks.forEach(l => {
        const srcName = typeof l.source === 'object' ? l.source.name : l.source;
        const tgtName = typeof l.target === 'object' ? l.target.name : l.target;
        if (srcName === targetName) oneHop.add(tgtName);
        if (tgtName === targetName) oneHop.add(srcName);
    });

    oneHop.forEach(hop1 => {
        allLinks.forEach(l => {
            const srcName = typeof l.source === 'object' ? l.source.name : l.source;
            const tgtName = typeof l.target === 'object' ? l.target.name : l.target;
            if (srcName === hop1 && !oneHop.has(tgtName) && tgtName !== targetName) twoHop.add(tgtName);
            if (tgtName === hop1 && !oneHop.has(srcName) && srcName !== targetName) twoHop.add(srcName);
        });
    });

    svgNode.transition().duration(200)
        .attr('opacity', d => {
            if (d.name === targetName) return 1;
            if (oneHop.has(d.name)) return 0.9;
            if (twoHop.has(d.name)) return 0.4;
            return 0.06;
        });

    svgLink.transition().duration(200)
        .attr('opacity', l => {
            const srcName = typeof l.source === 'object' ? l.source.name : l.source;
            const tgtName = typeof l.target === 'object' ? l.target.name : l.target;
            if (srcName === targetName || tgtName === targetName) return 0.7;
            if ((oneHop.has(srcName) && oneHop.has(tgtName)) ||
                (oneHop.has(srcName) && twoHop.has(tgtName)) ||
                (twoHop.has(srcName) && oneHop.has(tgtName))) return 0.2;
            return 0.02;
        });
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
    const maxR = Math.min(width, height) * 0.46;

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', `0 0 ${width} ${height}`);

    // Zoom container — all drawing goes inside this <g>
    const zoomG = svg.append('g').attr('class', 'zoom-layer');

    const zoom = d3.zoom()
        .scaleExtent([0.3, 4])
        .filter((event) => {
            // Allow programmatic zoom (from buttons) and drag-to-pan,
            // but block scroll/wheel zoom so page scrolling works normally
            if (event.type === 'wheel') return false;
            if (event.type === 'dblclick') return false;
            return true;
        })
        .on('zoom', (event) => {
            zoomG.attr('transform', event.transform);
        });
    svg.call(zoom);

    // Wire up zoom control buttons
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const zoomResetBtn = document.getElementById('zoomReset');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => svg.transition().duration(300).call(zoom.scaleBy, 1.4));
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => svg.transition().duration(300).call(zoom.scaleBy, 0.7));
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity));

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
    zoomG.append('g').attr('class', 'ring-guides')
        .selectAll('circle').data(ringFracs).join('circle')
        .attr('cx', cx).attr('cy', cy)
        .attr('r', f => maxR * f)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(30,58,95,0.12)')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '4,8');

    // ── SVG: Defs (filters, gradients) ──
    const defs = svg.append('defs');

    // Center glow
    const grad = defs.append('radialGradient').attr('id', 'centerGlow');
    grad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(201,168,76,0.08)');
    grad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(201,168,76,0)');
    zoomG.append('circle').attr('cx', cx).attr('cy', cy)
        .attr('r', maxR * 0.3).attr('fill', 'url(#centerGlow)');

    // Nebula glow filter for community clusters
    const nebulaFilter = defs.append('filter').attr('id', 'nebulaGlow')
        .attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
    nebulaFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '30');

    // Node glow filter
    const nodeGlowFilter = defs.append('filter').attr('id', 'nodeGlow')
        .attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%');
    nodeGlowFilter.append('feGaussianBlur').attr('in', 'SourceGraphic').attr('stdDeviation', '4')
        .attr('result', 'blur');
    const nodeGlowMerge = nodeGlowFilter.append('feMerge');
    nodeGlowMerge.append('feMergeNode').attr('in', 'blur');
    nodeGlowMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Animated edge gradient for peer links
    const edgeGrad = defs.append('linearGradient').attr('id', 'edgeFlow')
        .attr('gradientUnits', 'userSpaceOnUse');
    edgeGrad.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(74,144,217,0)');
    edgeGrad.append('stop').attr('offset', '50%').attr('stop-color', 'rgba(201,168,76,0.6)');
    edgeGrad.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(74,144,217,0)');

    // ── SVG: Community Nebulae (soft cluster backgrounds) ──
    if (analyticsReady) {
        const communityGroups = {};
        nodes.forEach(n => {
            if (n.communityId >= 0 && n.id !== 'john') {
                if (!communityGroups[n.communityId]) communityGroups[n.communityId] = [];
                communityGroups[n.communityId].push(n);
            }
        });

        const nebulaG = zoomG.append('g').attr('class', 'community-nebulae');
        Object.entries(communityGroups).forEach(([cid, members]) => {
            if (members.length < 3) return; // Only show nebulae for clusters of 3+
            const centroidX = members.reduce((s, m) => s + (m.x || 0), 0) / members.length;
            const centroidY = members.reduce((s, m) => s + (m.y || 0), 0) / members.length;
            const maxDist = members.reduce((max, m) => {
                const dx = (m.x || 0) - centroidX;
                const dy = (m.y || 0) - centroidY;
                return Math.max(max, Math.sqrt(dx * dx + dy * dy));
            }, 0);
            const color = members[0].communityColor || members[0].color;
            nebulaG.append('circle')
                .attr('cx', centroidX).attr('cy', centroidY)
                .attr('r', maxDist + 40)
                .attr('fill', color)
                .attr('opacity', 0.04)
                .attr('filter', 'url(#nebulaGlow)')
                .attr('pointer-events', 'none');
        });
    }

    // ── SVG: Sector separator lines ──
    const separatorAngles = [240, 300, 308, 353, 1, 130, 138, 232];
    zoomG.append('g').attr('class', 'sector-lines')
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
    zoomG.append('g').attr('class', 'sector-labels')
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

    svgLink = zoomG.append('g')
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
        zoomG.append('g').attr('class', 'community-halos')
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
    svgNode = zoomG.append('g')
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
        .attr('filter', d => d.percentile >= 85 ? 'url(#nodeGlow)' : null)
        .attr('class', d => {
            const classes = [];
            if (d.percentile >= 90) classes.push('node-hub', 'node-pulse');
            else if (d.percentile >= 70) classes.push('node-important');
            if (d.hasContent) classes.push('node-has-content');
            return classes.join(' ');
        })
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // ── SVG: Name labels for important people ──
    const labelThreshold = 10;
    const labeledNodes = nodes.filter(n =>
        n.importanceScore > labelThreshold || n.id === 'john');
    const svgLabels = zoomG.append('g').attr('class', 'node-labels')
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

    // ── Hover tooltip + ego network highlight ──
    svgNode.on('mouseover', (event, d) => {
        // Highlight ego network on hover
        highlightEgoNetwork(d.name);

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
        // Show a quote snippet in tooltip
        const personQuotes = quotesByPerson[d.name];
        if (personQuotes?.length) {
            const q = personQuotes[0];
            const snippet = q.quote?.length > 60 ? q.quote.slice(0, 57) + '...' : q.quote;
            parts.push(`<span class="tooltip-quote">"${snippet}"</span>`);
        }
        // Show rivalry count in tooltip
        const personRivalries = rivalriesByPlayer[d.name];
        if (personRivalries?.length) {
            parts.push(`<span class="tooltip-richness">${personRivalries.length} rivalr${personRivalries.length > 1 ? 'ies' : 'y'}</span>`);
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
    .on('mouseout', () => {
        tooltip.style('display', 'none');
        // Reset opacity on mouseout (unless a node is focused via sidebar)
        const sidebarOpen = document.querySelector('.constellation-sidebar.open');
        if (!sidebarOpen) {
            if (temporalSliderYear) applyTemporalFilter(temporalSliderYear);
            else resetGraphOpacity();
        }
    });

    // Click node → focus + sidebar
    svgNode.on('click', (event, d) => {
        event.stopPropagation();
        focusNodeByName(d.name);
    });

    // Background double-click → reset selection (single click used for pan)
    svg.on('dblclick', () => {
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
    // Show aliases if this person was merged from other name variants
    const aliases = getAliases(d.name);
    if (aliases.length > 0) {
        const displayAliases = aliases
            .filter(a => a.length > 2 && !a.includes("it's") && !a.includes(' it') && !a.includes(' on') && !a.endsWith("'s"))
            .slice(0, 4)
            .map(a => a.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
        if (displayAliases.length > 0) {
            html += `<p class="person-more-note">aka ${displayAliases.join(', ')}</p>`;
        }
    }
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

    // ─── Mentions Over Time Sparkline ────────────────────────────
    if (d.id !== 'john' && (profile?.timeline?.length || arc?.first_year)) {
        const sparkFirstYear = firstYear || 2004;
        const sparkLastYear = lastYear || 2026;
        html += `<div class="sparkline-section">
            <div class="sparkline-label">Mentions Over Time</div>
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

    // ─── Quotes attributed to this person ──────────────────────
    const personQuotes = quotesByPerson[d.name] || [];
    if (personQuotes.length) {
        html += `<div class="person-section-label">Quotes & Words</div>`;
        html += personQuotes.slice(0, 6).map(q => {
            return `<div class="person-quote-item">
                <blockquote class="person-quote-text">&ldquo;${q.quote}&rdquo;</blockquote>
                <div class="person-quote-meta">
                    <span class="person-milestone-year">${q.year || ''}</span>
                    ${q.context ? `<span class="quote-context">${q.context}</span>` : ''}
                </div>
            </div>`;
        }).join('');
        if (personQuotes.length > 6) {
            html += `<div class="person-more-note">+ ${personQuotes.length - 6} more quotes</div>`;
        }
    }

    // ─── ECD Rivalries ───────────────────────────────────────────
    const personRivalries = rivalriesByPlayer[d.name] || [];
    if (personRivalries.length) {
        html += `<div class="person-section-label">Rivalries (${personRivalries.length})</div>`;
        html += personRivalries
            .sort((a, b) => (b.mention_count || 0) - (a.mention_count || 0))
            .slice(0, 6).map(r => {
                const opponent = r.player1 === d.name ? r.player2 : r.player1;
                const yearRange = r.first_year && r.last_year
                    ? `${r.first_year}–${r.last_year}` : r.first_year ? `Since ${r.first_year}` : '';
                let snippets = [];
                try {
                    snippets = typeof r.context_snippets === 'string'
                        ? JSON.parse(r.context_snippets) : (r.context_snippets || []);
                } catch (_) { /* ignore */ }
                const snippetText = snippets.length > 0
                    ? `<span class="rivalry-snippet">${snippets[0].length > 80 ? snippets[0].slice(0, 77) + '...' : snippets[0]}</span>` : '';
                return `<div class="rivalry-item">
                    <div class="rivalry-header">
                        <button class="rivalry-opponent connection-tag" data-name="${opponent}">${opponent}</button>
                        <span class="rivalry-mentions">${r.mention_count || 0} clashes</span>
                    </div>
                    ${yearRange ? `<span class="rivalry-years">${yearRange}</span>` : ''}
                    ${snippetText}
                </div>`;
            }).join('');
    }

    // ─── ECD Match Records ───────────────────────────────────────
    const personMatches = matchRecordsByPlayer[d.name];
    if (personMatches && (personMatches.wins.length + personMatches.losses.length > 0)) {
        const allMatches = [
            ...personMatches.wins.map(m => ({ ...m, result: 'W' })),
            ...personMatches.losses.map(m => ({ ...m, result: 'L' }))
        ].sort((a, b) => (a.year || 0) - (b.year || 0));

        html += `<div class="person-section-label">Match Records (${personMatches.wins.length}W–${personMatches.losses.length}L)</div>`;
        html += `<div class="match-records-list">`;
        html += allMatches.slice(0, 10).map(m => {
            const opponent = m.result === 'W' ? m.loser : m.winner;
            const score = m.score || (m.score_winner && m.score_loser ? `${m.score_winner}–${m.score_loser}` : '');
            const resultClass = m.result === 'W' ? 'match-win' : 'match-loss';
            return `<div class="match-record-item ${resultClass}">
                <span class="match-result-badge">${m.result}</span>
                <span class="match-opponent">${m.result === 'W' ? 'def.' : 'lost to'} <button class="connection-tag match-opp-btn" data-name="${opponent}">${opponent}</button></span>
                ${score ? `<span class="match-score">${score}</span>` : ''}
                <span class="match-meta">${m.year || ''}${m.event_number ? ` · ECD #${m.event_number}` : ''}${m.match_type ? ` · ${m.match_type}` : ''}</span>
            </div>`;
        }).join('');
        html += `</div>`;
        if (allMatches.length > 10) {
            html += `<div class="person-more-note">+ ${allMatches.length - 10} more matches</div>`;
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

    // ─── Milestones where this person is mentioned ───────────────
    const personMilestones = milestonesByPerson[d.name] || [];
    if (personMilestones.length) {
        html += `<div class="person-section-label">Life Milestones Mentioned In</div>`;
        html += personMilestones
            .sort((a, b) => (a.year || 0) - (b.year || 0))
            .slice(0, 8).map(m => {
                const categoryIcon = m.category === 'ecd' ? ' \u{1F3C0}' :
                    m.category === 'travel' ? ' \u{2708}' :
                    m.category === 'medical' ? ' \u{1FA7A}' :
                    m.category === 'relationship' ? ' \u{2764}' :
                    m.category === 'career' ? ' \u{1F4BC}' : '';
                return `<div class="person-milestone-item">
                    <span class="person-milestone-year">${m.year || ''}</span>
                    ${m.milestone}${categoryIcon}
                </div>`;
            }).join('');
        if (personMilestones.length > 8) {
            html += `<div class="person-more-note">+ ${personMilestones.length - 8} more milestones</div>`;
        }
    }

    // Songs (from profile)
    if (profile?.songs?.length) {
        html += `<div class="person-section-label">Associated Songs</div>`;
        html += profile.songs.map(s => {
            const text = typeof s === 'string' ? s : `${s.title || s.song || ''} ${s.artist ? `by ${s.artist}` : ''} ${s.year ? `(${s.year})` : ''}`;
            return `<div class="person-highlight-item">${text}</div>`;
        }).join('');
    }

    // ─── LJ Comments by this person ──────────────────────────────
    const personLjComments = ljCommentsByPerson[d.name] || profile?.lj_comments || [];
    if (personLjComments.length) {
        html += `<div class="person-section-label">LiveJournal Comments</div>`;
        html += personLjComments.slice(0, 5).map(c => {
            const text = typeof c === 'string' ? c : (c.excerpt || c.comment || c.text || '');
            const postTitle = c.post_title ? `<span class="lj-comment-post">on "${c.post_title}"</span>` : '';
            const year = c.year ? `<span class="person-milestone-year">${c.year}</span>` : '';
            return `<div class="lj-comment-enhanced">
                <blockquote class="person-lj-comment">&ldquo;${text}&rdquo;</blockquote>
                <div class="lj-comment-meta">${year}${postTitle}</div>
            </div>`;
        }).join('');
    }

    // ─── Mini Ego Network Visualization ──────────────────────────
    if (connected.length > 0 && d.id !== 'john') {
        html += `<div class="person-section-label">Network Map</div>`;
        html += `<div class="ego-network-container"><canvas class="ego-network-canvas" id="egoNet-${d.name.replace(/[^a-zA-Z0-9]/g, '_')}" width="340" height="220"></canvas></div>`;
    }

    // If nothing to show, say so gently
    if (r.total === 0 && !connected.length && !connection && !personQuotes.length && !personRivalries.length) {
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

    // ─── Draw Mentions Sparkline ─────────────────────────────────
    if (d.id !== 'john') {
        requestAnimationFrame(() => {
            const sparkId = `sparkline-${d.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const canvas = document.getElementById(sparkId);
            if (canvas) drawSparkline(canvas, d, profile);
        });
    }

    // ─── Draw Ego Network Mini Graph ─────────────────────────────
    if (connected.length > 0 && d.id !== 'john') {
        requestAnimationFrame(() => {
            const egoId = `egoNet-${d.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const canvas = document.getElementById(egoId);
            if (canvas) drawEgoNetwork(canvas, d, connected);
        });
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('personPanel');
    if (sidebar) sidebar.classList.remove('open');
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

// ─── Ego Network Mini Graph Drawing ──────────────────────────────
// Draws a small radial graph showing a person's direct connections

function drawEgoNetwork(canvas, personData, connected) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;
    const radius = Math.min(w, h) * 0.38;

    ctx.clearRect(0, 0, w, h);

    // Filter to max 16 connections (most important first)
    const sortedConns = connected
        .map(name => {
            const node = allNodes.find(n => n.name === name);
            return { name, importanceScore: node?.importanceScore || 0, displayCat: node?.displayCat || 'other', color: node?.color || '#7a8fa6' };
        })
        .sort((a, b) => b.importanceScore - a.importanceScore)
        .slice(0, 16);

    // Compute peer links among connected nodes
    const connSet = new Set(sortedConns.map(c => c.name));
    const peerLinks = [];
    allLinks.forEach(l => {
        const src = typeof l.source === 'object' ? l.source.name : l.source;
        const tgt = typeof l.target === 'object' ? l.target.name : l.target;
        if (src !== personData.name && tgt !== personData.name &&
            connSet.has(src) && connSet.has(tgt)) {
            peerLinks.push({ src, tgt });
        }
    });

    // Position nodes in a circle
    const positions = {};
    positions[personData.name] = { x: centerX, y: centerY };
    sortedConns.forEach((c, i) => {
        const angle = (2 * Math.PI * i) / sortedConns.length - Math.PI / 2;
        positions[c.name] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        };
    });

    // Draw peer links (faint)
    peerLinks.forEach(({ src, tgt }) => {
        const p1 = positions[src];
        const p2 = positions[tgt];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
    });

    // Draw hub links (to center)
    sortedConns.forEach(c => {
        const pos = positions[c.name];
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = 'rgba(74, 144, 217, 0.2)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
    });

    // Draw connection nodes
    sortedConns.forEach(c => {
        const pos = positions[c.name];
        const nodeR = Math.max(3, Math.sqrt(c.importanceScore) * 0.5 + 2);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeR, 0, 2 * Math.PI);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Labels for top connections
        if (c.importanceScore > 5 || sortedConns.length <= 8) {
            ctx.font = '8px Trebuchet MS, sans-serif';
            ctx.fillStyle = '#7a8fa6';
            ctx.textAlign = 'center';
            const labelY = pos.y > centerY ? pos.y + nodeR + 10 : pos.y - nodeR - 4;
            const shortName = c.name.split(' ')[0];
            ctx.fillText(shortName, pos.x, labelY);
        }
    });

    // Draw center node
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#c9a84c';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Center label
    ctx.font = 'bold 9px Trebuchet MS, sans-serif';
    ctx.fillStyle = '#c9a84c';
    ctx.textAlign = 'center';
    ctx.fillText(personData.name.split(' ')[0], centerX, centerY - 10);
}

// Auto-init
initConstellation()
    .then(() => initWormholes('constellation'))
    .then(() => plantClue('clue2', document.querySelector('.constellation-annotation')))
    .catch(() => {
        const el = document.getElementById('constellationMount');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });

