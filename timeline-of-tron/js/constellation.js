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

// Featured people — the richest profiles, curated for first-click experience
const FEATURED_PEOPLE = [
    'Ma', 'Rob', 'The Pops', 'Dan Spengeman',
    'Juan Londono (Muffin Man)', 'Lauren Winston', 'Diana DiBuccio', 'Rupert'
];

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

function renderFeaturedCards(nodes, profiles) {
    const mount = document.getElementById('featuredMount');
    if (!mount) return;

    const cards = FEATURED_PEOPLE.map(name => {
        const node = nodes.find(n => n.name === name);
        const profile = profiles[name];
        if (!node && !profile) return null;

        const relation = node?.relation || profile?.basic?.relation || '';
        const firstYear = node?.first_year || profile?.arc?.first_year;
        const lastYear = node?.last_year || profile?.arc?.last_year;
        const yearSpan = firstYear && lastYear ? `${firstYear}–${lastYear}` :
                         firstYear ? `Since ${firstYear}` : '';

        // Pick a highlight
        let highlight = '';
        if (profile?.highlights?.length) {
            const h = profile.highlights[0];
            highlight = typeof h === 'string' ? h : (h.text || h.highlight || '');
        } else if (relation) {
            highlight = relation;
        }

        // Truncate highlight
        if (highlight.length > 80) highlight = highlight.slice(0, 77) + '...';

        const eraKey = getEraKey(firstYear);
        const color = getEraColor(firstYear);

        // Count data richness for a subtle indicator
        const timelineCount = profile?.timeline?.length || 0;
        const connectionsCount = profile?.connections?.length || 0;

        return `<button class="featured-card" data-name="${name}" style="--card-accent: ${color}">
            <span class="featured-dot" style="background: ${color}"></span>
            <span class="featured-name">${name}</span>
            <span class="featured-relation">${relation}</span>
            <span class="featured-years">${yearSpan}</span>
            ${timelineCount > 0 ? `<span class="featured-depth">${timelineCount} events</span>` : ''}
        </button>`;
    }).filter(Boolean);

    mount.innerHTML = `
        <div class="featured-header">Start here — people with the richest stories</div>
        <div class="featured-row">${cards.join('')}</div>
    `;

    // Click handler — focus node in graph
    mount.querySelectorAll('.featured-card').forEach(card => {
        card.addEventListener('click', () => {
            const name = card.dataset.name;
            focusNodeByName(name);
            document.getElementById('constellationMount')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });
}

// ─── Category Filters + Era Legend ───────────────────────────────

function renderFiltersAndLegend(nodes) {
    const mount = document.getElementById('filtersMount');
    if (!mount) return;

    // Count categories
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

    // Filter click handlers
    let activeFilter = 'all';
    mount.querySelectorAll('.filter-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            mount.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.cat;
            applyFilter(activeFilter);
        });
    });
}

function applyFilter(cat) {
    if (!svgNode || !svgLink) return;
    if (cat === 'all') {
        svgNode.transition().duration(300).attr('opacity', 1);
        svgLink.transition().duration(300).attr('opacity', 1);
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
    const nodeCount = constellation.nodes.length + 1; // +1 for John
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

    // Build searchable list
    const searchList = nodes.map(n => {
        const profile = profiles[n.name];
        return {
            name: n.name,
            relation: n.relation || profile?.basic?.relation || '',
            category: n.category || profile?.basic?.category || '',
            id: n.id
        };
    });

    // Create dropdown
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
            // Also fade non-matching nodes
            if (svgNode) {
                svgNode.attr('opacity', d => (d.name || '').toLowerCase().includes(q) ? 1 : 0.1);
            }
            return;
        }

        dropdown.innerHTML = matches.map(m =>
            `<button class="search-result" data-name="${m.name}">
                <span class="search-result-name">${highlightMatch(m.name, q)}</span>
                <span class="search-result-meta">${m.relation || m.category}</span>
            </button>`
        ).join('');
        dropdown.style.display = 'block';

        // Fade graph to match
        if (svgNode) {
            const matchNames = new Set(matches.map(m => m.name.toLowerCase()));
            svgNode.attr('opacity', d =>
                (d.name || '').toLowerCase().includes(q) ? 1 : 0.1
            );
        }

        // Click on result
        dropdown.querySelectorAll('.search-result').forEach(btn => {
            btn.addEventListener('click', () => {
                const name = btn.dataset.name;
                input.value = name;
                dropdown.style.display = 'none';
                focusNodeByName(name);
            });
        });
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    // Keyboard nav
    input.addEventListener('keydown', (e) => {
        const items = dropdown.querySelectorAll('.search-result');
        const active = dropdown.querySelector('.search-result.active');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!active && items.length) { items[0].classList.add('active'); }
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

// ─── Focus a node by name (used by featured cards, search, deep links) ──

function focusNodeByName(name) {
    if (!svgNode || !svgLink) return;
    const targetNode = allNodes.find(n => n.name === name);
    if (!targetNode) return;

    // Visual focus
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

    // Tooltip
    const tooltip = d3.select(container)
        .append('div')
        .attr('class', 'constellation-tooltip')
        .style('display', 'none');

    // Prepare nodes
    const nodes = constellation.nodes.map(n => ({
        ...n,
        radius: Math.sqrt(Math.max(n.total_mentions, 1)) * 3 + 4,
        color: getEraColor(n.first_year)
    }));

    // Add center node (John)
    nodes.unshift({
        id: 'john',
        name: 'John Tronolone',
        category: 'self',
        total_mentions: 50,
        radius: 18,
        color: '#c9a84c',
        fx: width / 2,
        fy: height / 2
    });

    // Build name→id map for co-occurrence enrichment
    const nameToId = {};
    nodes.forEach(n => { nameToId[n.name] = n.id; });

    // Start with constellation links
    const links = (constellation.links || []).map(l => ({
        source: l.source,
        target: l.target,
        weight: l.weight || 1
    })).filter(l => l.source !== l.target);

    // Enrich with co-occurrence links (only where both people exist as nodes)
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
            fromCoOccurrence: true
        });
    });

    // Store module-level refs
    allNodes = nodes;
    allLinks = links;

    // Force simulation
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.3))
        .force('charge', d3.forceManyBody().strength(-30))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(d => d.radius + 2));

    // Draw links
    svgLink = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', d => d.fromCoOccurrence ? 'rgba(201, 168, 76, 0.25)' : 'rgba(255,255,255,0.3)')
        .attr('stroke-width', d => Math.min(d.weight, 3))
        .attr('stroke-dasharray', d => d.fromCoOccurrence ? '3,3' : 'none');

    // Draw nodes
    svgNode = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => d.color)
        .attr('stroke', 'rgba(255,255,255,0.5)')
        .attr('stroke-width', 1.5)
        .attr('cursor', 'pointer')
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

    // Hover — enhanced tooltip
    svgNode.on('mouseover', (event, d) => {
        const relation = d.relation || profiles[d.name]?.basic?.relation || '';
        const yearSpan = d.first_year && d.last_year ? `${d.first_year}–${d.last_year}` :
                         d.first_year ? `Since ${d.first_year}` : '';
        const parts = [`<strong>${d.name}</strong>`];
        if (relation) parts.push(relation);
        if (yearSpan) parts.push(yearSpan);

        tooltip
            .style('display', 'block')
            .style('left', (event.offsetX + 12) + 'px')
            .style('top', (event.offsetY - 10) + 'px')
            .html(parts.join('<br>'));
    })
    .on('mouseout', () => tooltip.style('display', 'none'));

    // Click
    svgNode.on('click', (event, d) => {
        event.stopPropagation();
        focusNodeByName(d.name);
    });

    // Click background to reset
    svg.on('click', () => {
        resetGraphOpacity();
        closeSidebar();
    });

    // Tick
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

function showPersonPanel(d) {
    const sidebar = document.getElementById('personPanel');
    if (!sidebar) return;

    // Profile is an OBJECT keyed by name, not an array
    const profile = profilesData[d.name] || null;

    // Find connections from graph links
    const connected = [];
    allLinks.forEach(l => {
        const srcId = typeof l.source === 'object' ? l.source.id : l.source;
        const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
        if (srcId === d.id) {
            const target = allNodes.find(n => n.id === tgtId);
            if (target) connected.push(target.name);
        }
        if (tgtId === d.id) {
            const source = allNodes.find(n => n.id === srcId);
            if (source) connected.push(source.name);
        }
    });

    // Also pull connections from profile data
    if (profile?.connections?.length) {
        profile.connections.forEach(c => {
            const name = typeof c === 'string' ? c : (c.name || c.person || '');
            if (name && !connected.includes(name) && name !== d.name) {
                connected.push(name);
            }
        });
    }

    sidebar.querySelector('.person-name').textContent = d.name;
    sidebar.querySelector('.person-years').textContent =
        d.first_year && d.last_year ? `${d.first_year} – ${d.last_year}` :
        d.first_year ? `Since ${d.first_year}` : '';

    // Relation / category line
    const relation = d.relation || profile?.basic?.relation || '';
    const category = d.category || profile?.basic?.category || '';
    sidebar.querySelector('.person-highlight').textContent = relation || category || '';

    // Connections
    const connHTML = connected.slice(0, 12).map(c =>
        `<button class="connection-tag" data-name="${c}">${c}</button>`
    ).join('');
    const connSection = sidebar.querySelector('.person-connections');
    connSection.innerHTML = connHTML || '<em>No documented connections</em>';

    // Make connection tags clickable
    connSection.querySelectorAll('.connection-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.stopPropagation();
            focusNodeByName(tag.dataset.name);
        });
    });

    // Timeline (was incorrectly looking for "milestones")
    const timelineEl = sidebar.querySelector('.person-milestones');
    if (profile?.timeline?.length) {
        timelineEl.innerHTML = profile.timeline.slice(0, 8).map(m =>
            `<div class="person-milestone-item">
                <span class="person-milestone-year">${m.year || ''}</span>
                ${m.event || m.text || m.milestone || ''}
            </div>`
        ).join('');
    } else {
        timelineEl.innerHTML = '<em class="sidebar-empty">No timeline events documented</em>';
    }

    // Highlights (replaces broken quotes section)
    const highlightsEl = sidebar.querySelector('.person-highlights');
    if (profile?.highlights?.length) {
        highlightsEl.innerHTML = '<div class="person-section-label">Highlights</div>' +
            profile.highlights.map(h => {
                const text = typeof h === 'string' ? h : (h.text || h.highlight || JSON.stringify(h));
                return `<div class="person-highlight-item">${text}</div>`;
            }).join('');
    } else {
        highlightsEl.innerHTML = '';
    }

    // Co-occurrence context
    const coCtxEl = sidebar.querySelector('.person-co-occurrences');
    const coMatches = coOccurrencesData.filter(co =>
        (co.person_a === d.name || co.person_b === d.name) && co.context
    );
    if (coMatches.length) {
        coCtxEl.innerHTML = '<div class="person-section-label">Shared Moments</div>' +
            coMatches.slice(0, 5).map(co => {
                const other = co.person_a === d.name ? co.person_b : co.person_a;
                return `<div class="person-co-item">
                    <span class="person-co-year">${co.year}</span>
                    <span class="person-co-with">with ${other}</span>
                    <span class="person-co-context">${co.context}</span>
                </div>`;
            }).join('');
    } else {
        coCtxEl.innerHTML = '';
    }

    sidebar.classList.add('open');
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

// Close sidebar on button click
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.querySelector('.sidebar-close');
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
});

// Auto-init
initConstellation()
    .then(() => initWormholes('constellation'))
    .then(() => plantClue('clue2', document.querySelector('.constellation-annotation')))
    .catch(() => {
        const el = document.getElementById('constellationMount');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
