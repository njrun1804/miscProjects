// js/constellation.js — Room 2: The Constellation (People + Relationships)
// D3 force graph of 124 people as stars on a dark background

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
    return parts.join(', ');
}

// Format award category names nicely
function formatAwardCategory(cat) {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Module-level refs so features can cross-communicate
let allNodes = [];
let allLinks = [];
let svgNode = null;
let svgLink = null;
let simulation = null;
let profilesData = {};
let coOccurrencesData = [];

export async function initConstellation() {
    const data = await loadMultiple([
        'relationship_constellation.json',
        'people_profiles.json',
        'quotes.json',
        'milestones_enriched.json',
        'co_occurrences.json'
    ]);

    const constellation = data.relationship_constellation;
    profilesData = data.people_profiles || {};
    coOccurrencesData = data.co_occurrences || [];

    if (!constellation || !constellation.nodes) return;

    renderFeaturedCards(constellation.nodes, profilesData);
    renderFiltersAndLegend(constellation.nodes);
    renderStatsBar(constellation);
    renderForceGraph(constellation, profilesData, coOccurrencesData);
    initSearchAutocomplete(constellation.nodes, profilesData);
    renderInnerCircleChart(data.milestones_enriched);
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
        return { node: n, profile, richness: r };
    }).filter(s => s.richness.total >= 5) // Only people with real content
      .sort((a, b) => b.richness.total - a.richness.total)
      .slice(0, 8);

    if (!scored.length) return;

    const cards = scored.map(({ node: n, profile, richness }) => {
        const relation = n.relation || profile?.basic?.relation || '';
        const firstYear = n.first_year || profile?.arc?.first_year;
        const lastYear = n.last_year || profile?.arc?.last_year;
        const yearSpan = firstYear && lastYear ? `${firstYear}–${lastYear}` :
                         firstYear ? `Since ${firstYear}` : '';
        const color = getEraColor(firstYear);
        const summary = richnessSummary(richness);

        return `<button class="featured-card" data-name="${n.name}" style="--card-accent: ${color}">
            <span class="featured-dot" style="background: ${color}"></span>
            <span class="featured-name">${n.name}</span>
            <span class="featured-relation">${relation}</span>
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
            .attr('opacity', d => d.hubLink ? 0.3 : 1);
    } else {
        svgNode.transition().duration(300)
            .attr('opacity', d => (d.category === cat || d.id === 'john') ? 1 : 0.08);
        svgLink.transition().duration(300)
            .attr('opacity', l => {
                const s = typeof l.source === 'object' ? l.source : allNodes.find(n => n.id === l.source);
                const t = typeof l.target === 'object' ? l.target : allNodes.find(n => n.id === l.target);
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
    const years = constellation.nodes.filter(n => n.first_year).map(n => n.first_year);
    const minYear = years.length ? Math.min(...years) : 2004;
    const maxYear = new Date().getFullYear();
    mount.textContent = `${nodeCount} people · ${linkCount} connections · ${maxYear - minYear} years`;
}

// ─── Search Autocomplete ─────────────────────────────────────────

function initSearchAutocomplete(nodes, profiles) {
    const wrapper = document.querySelector('.constellation-search');
    const input = wrapper?.querySelector('input');
    if (!wrapper || !input) return;

    // Build searchable list, sorted by richness so best results come first
    const searchList = nodes.map(n => {
        const profile = profiles[n.name];
        const r = getDataRichness(n.name, profile);
        return {
            name: n.name,
            relation: n.relation || profile?.basic?.relation || '',
            category: n.category || profile?.basic?.category || '',
            id: n.id,
            richness: r.total
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
            .filter(p => p.name.toLowerCase().includes(q) || p.relation.toLowerCase().includes(q))
            .slice(0, 8);

        if (!matches.length) {
            dropdown.innerHTML = '<div class="search-no-results">No matches</div>';
            dropdown.style.display = 'block';
            if (svgNode) svgNode.attr('opacity', d => (d.name || '').toLowerCase().includes(q) ? 1 : 0.1);
            return;
        }

        dropdown.innerHTML = matches.map(m =>
            `<button class="search-result" data-name="${m.name}">
                <span class="search-result-name">${highlightMatch(m.name, q)}</span>
                <span class="search-result-meta">${m.relation || m.category}</span>
            </button>`
        ).join('');
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
        const srcId = typeof l.source === 'object' ? l.source.id : l.source;
        const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
        if (srcId === targetNode.id) connected.add(tgtId);
        if (tgtId === targetNode.id) connected.add(srcId);
    });
    connected.add(targetNode.id);

    svgNode.transition().duration(300)
        .attr('opacity', n => connected.has(n.id) ? 1 : 0.1);
    svgLink.transition().duration(300)
        .attr('opacity', l => {
            const srcId = typeof l.source === 'object' ? l.source.id : l.source;
            const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
            return (srcId === targetNode.id || tgtId === targetNode.id) ? 0.6 : 0.05;
        });

    showPersonPanel(targetNode);
}

function resetGraphOpacity() {
    if (svgNode) svgNode.transition().duration(300).attr('opacity', 1);
    if (svgLink) svgLink.transition().duration(300).attr('opacity', 1);
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

    // Prepare nodes — size and opacity based on data richness
    const nodes = constellation.nodes.map(n => {
        const profile = profiles[n.name];
        const r = getDataRichness(n.name, profile);
        const hasContent = r.total > 0;
        // Nodes with content get normal sizing; empty shells are smaller and dimmer
        const baseRadius = Math.sqrt(Math.max(n.total_mentions, 1)) * 3 + 4;
        return {
            ...n,
            radius: hasContent ? Math.max(baseRadius, 6) : Math.max(baseRadius * 0.6, 3),
            color: getEraColor(n.first_year),
            richness: r,
            hasContent
        };
    });

    // Add center node (John)
    nodes.unshift({
        id: 'john',
        name: 'John Tronolone',
        category: 'self',
        total_mentions: 50,
        radius: 18,
        color: '#c9a84c',
        fx: width / 2,
        fy: height / 2,
        richness: { total: 999 },
        hasContent: true
    });

    // Build name→id map for co-occurrence enrichment
    const nameToId = {};
    nodes.forEach(n => { nameToId[n.name] = n.id; });

    const links = (constellation.links || []).map(l => ({
        source: l.source,
        target: l.target,
        weight: l.weight || 1,
        hubLink: !!l.hub_link,
        fromCoOccurrence: false
    })).filter(l => l.source !== l.target);

    // Enrich with co-occurrence links not already in the data
    const existingLinkSet = new Set(links.map(l => [l.source, l.target].sort().join('|')));
    (coOccurrences || []).forEach(co => {
        const idA = nameToId[co.person_a];
        const idB = nameToId[co.person_b];
        if (!idA || !idB || idA === idB) return;
        const key = [idA, idB].sort().join('|');
        if (existingLinkSet.has(key)) return;
        existingLinkSet.add(key);
        links.push({
            source: idA,
            target: idB,
            weight: Math.min(co.co_occurrence_count || 1, 3),
            fromCoOccurrence: true,
            hubLink: false
        });
    });

    allNodes = nodes;
    allLinks = links;

    // Hub links (person→John) get longer distance to create the spoke structure;
    // peer links are shorter to cluster connected people together
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id)
            .distance(d => d.hubLink ? 120 : 60)
            .strength(d => d.hubLink ? 0.15 : 0.4))
        .force('charge', d3.forceManyBody().strength(-40))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(d => d.radius + 3));

    // Hub links: thin, subtle rays from center; peer links: brighter
    svgLink = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', d => {
            if (d.hubLink) return 'rgba(201, 168, 76, 0.12)';
            if (d.fromCoOccurrence) return 'rgba(201, 168, 76, 0.25)';
            return 'rgba(255,255,255,0.35)';
        })
        .attr('stroke-width', d => {
            if (d.hubLink) return 0.5;
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

    // Hover — show richness signals
    svgNode.on('mouseover', (event, d) => {
        const profile = profiles[d.name];
        const relation = d.relation || profile?.basic?.relation || '';
        const yearSpan = d.first_year && d.last_year ? `${d.first_year}–${d.last_year}` :
                         d.first_year ? `Since ${d.first_year}` : '';
        const parts = [`<strong>${d.name}</strong>`];
        if (relation) parts.push(relation);
        if (yearSpan) parts.push(yearSpan);
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
    const r = getDataRichness(d.name, profile);

    // Find connections from graph links
    const connected = [];
    allLinks.forEach(l => {
        const srcId = typeof l.source === 'object' ? l.source.id : l.source;
        const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
        if (srcId === d.id) {
            const target = allNodes.find(n => n.id === tgtId);
            if (target && target.name !== d.name) connected.push(target.name);
        }
        if (tgtId === d.id) {
            const source = allNodes.find(n => n.id === srcId);
            if (source && source.name !== d.name) connected.push(source.name);
        }
    });

    // Also pull connections from profile data
    if (profile?.connections?.length) {
        profile.connections.forEach(c => {
            const name = typeof c === 'string' ? c : (c.connected_to || c.name || c.person || '');
            if (name && !connected.includes(name) && name !== d.name) {
                connected.push(name);
            }
        });
    }

    // Build the sidebar HTML dynamically — only sections with content
    const relation = d.relation || profile?.basic?.relation || '';
    const category = d.category || profile?.basic?.category || '';
    const yearText = d.first_year && d.last_year ? `${d.first_year} – ${d.last_year}` :
                     d.first_year ? `Since ${d.first_year}` : '';

    let html = `<button class="sidebar-close">&times;</button>`;
    html += `<h2 class="person-name">${d.name}</h2>`;
    if (yearText) html += `<p class="person-years">${yearText}</p>`;
    if (relation) html += `<p class="person-highlight">${relation}</p>`;
    else if (category && category !== 'other') html += `<p class="person-highlight">${category.replace('_', ' ')}</p>`;

    // Connections (always show if any exist)
    if (connected.length) {
        html += `<div class="person-section-label">Connections</div>`;
        html += `<div class="person-connections">${connected.slice(0, 12).map(c =>
            `<button class="connection-tag" data-name="${c}">${c}</button>`
        ).join('')}</div>`;
    }

    // Timeline events — show more for people with rich profiles
    if (profile?.timeline?.length) {
        const maxEvents = profile.timeline.length > 12 ? 12 : profile.timeline.length;
        html += `<div class="person-section-label">Key Moments (${profile.timeline.length})</div>`;
        html += `<div class="person-milestones">${profile.timeline.slice(0, maxEvents).map(m => {
            const eventText = m.event || m.text || m.milestone || '';
            const withPerson = m.with ? ` <span class="person-co-with">with ${m.with}</span>` : '';
            return `<div class="person-milestone-item">
                <span class="person-milestone-year">${m.year || ''}</span>
                ${eventText}${withPerson}
            </div>`;
        }).join('')}</div>`;
        if (profile.timeline.length > maxEvents) {
            html += `<div class="person-highlight-item" style="font-size:11px;color:var(--lj-text-secondary)">+ ${profile.timeline.length - maxEvents} more events</div>`;
        }
    }

    // Awards
    if (profile?.awards?.length) {
        html += `<div class="person-section-label">Awards</div>`;
        html += `<div class="person-awards">${profile.awards.map(a =>
            `<div class="person-award-item">
                <span class="person-milestone-year">${a.year}</span>
                ${formatAwardCategory(a.category)}${a.note ? ` — ${a.note}` : ''}
            </div>`
        ).join('')}</div>`;
    }

    // Highlights
    if (profile?.highlights?.length) {
        html += `<div class="person-section-label">Highlights</div>`;
        html += profile.highlights.map(h => {
            const text = typeof h === 'string' ? h : (h.text || h.highlight || '');
            return `<div class="person-highlight-item">${text}</div>`;
        }).join('');
    }

    // Songs
    if (profile?.songs?.length) {
        html += `<div class="person-section-label">Associated Songs</div>`;
        html += profile.songs.map(s => {
            const text = typeof s === 'string' ? s : `${s.title || s.song || ''} ${s.artist ? `by ${s.artist}` : ''} ${s.year ? `(${s.year})` : ''}`;
            return `<div class="person-highlight-item">${text}</div>`;
        }).join('');
    }

    // Co-occurrence shared moments
    const coMatches = coOccurrencesData.filter(co =>
        (co.person_a === d.name || co.person_b === d.name) && co.context
    );
    if (coMatches.length) {
        html += `<div class="person-section-label">Shared Moments</div>`;
        html += coMatches.slice(0, 5).map(co => {
            const other = co.person_a === d.name ? co.person_b : co.person_a;
            return `<div class="person-co-item">
                <span class="person-co-year">${co.year}</span>
                <span class="person-co-with">with ${other}</span>
                <span class="person-co-context">${co.context}</span>
            </div>`;
        }).join('');
    }

    // LJ Comments
    if (profile?.lj_comments?.length) {
        html += `<div class="person-section-label">LiveJournal Comments</div>`;
        html += profile.lj_comments.map(c => {
            const text = typeof c === 'string' ? c : (c.comment || c.text || '');
            return `<blockquote class="person-lj-comment">&ldquo;${text}&rdquo;</blockquote>`;
        }).join('');
    }

    // If absolutely nothing to show, say so gently
    if (r.total === 0 && !connected.length) {
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
