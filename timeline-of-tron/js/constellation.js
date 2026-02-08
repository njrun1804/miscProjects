// js/constellation.js — Room 2: The Constellation (People + Relationships)
// D3 force graph of 124 people as stars on a dark background

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';

const ERA_COLORS = {
    early: '#4a90d9',    // 2004-2008: blue
    growth: '#4a6741',   // 2009-2012: green
    peak: '#6b4a8b',     // 2013-2016: purple
    mature: '#c9a84c'    // 2017+: gold
};

function getEraColor(firstYear) {
    if (!firstYear || firstYear <= 2008) return ERA_COLORS.early;
    if (firstYear <= 2012) return ERA_COLORS.growth;
    if (firstYear <= 2016) return ERA_COLORS.peak;
    return ERA_COLORS.mature;
}

export async function initConstellation() {
    const data = await loadMultiple([
        'relationship_constellation.json',
        'people_profiles.json',
        'quotes.json',
        'milestones_enriched.json'
    ]);

    const constellation = data.relationship_constellation;
    const profiles = data.people_profiles;
    const quotes = data.quotes;

    if (!constellation || !constellation.nodes) return;

    renderForceGraph(constellation, profiles, quotes);
    renderInnerCircleChart(data.milestones_enriched);
}

function renderForceGraph(constellation, profiles, quotes) {
    const container = document.getElementById('constellationMount');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    // Create SVG
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

    // Prepare data
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

    const links = (constellation.links || []).map(l => ({
        source: l.source,
        target: l.target,
        weight: l.weight || 1
    }));

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(80).strength(0.3))
        .force('charge', d3.forceManyBody().strength(-30))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(d => d.radius + 2));

    // Draw links
    const link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', 'rgba(255,255,255,0.3)')
        .attr('stroke-width', d => Math.min(d.weight, 3));

    // Draw nodes
    const node = svg.append('g')
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

    // Hover
    node.on('mouseover', (event, d) => {
        tooltip
            .style('display', 'block')
            .style('left', (event.offsetX + 12) + 'px')
            .style('top', (event.offsetY - 10) + 'px')
            .html(`<strong>${d.name}</strong><br>${d.total_mentions || 0} mentions`);
    })
    .on('mouseout', () => tooltip.style('display', 'none'));

    // Click
    node.on('click', (event, d) => {
        event.stopPropagation();
        showPersonPanel(d, nodes, links, profiles, quotes);

        // Visual focus
        const connected = new Set();
        links.forEach(l => {
            if (l.source.id === d.id) connected.add(l.target.id);
            if (l.target.id === d.id) connected.add(l.source.id);
        });
        connected.add(d.id);

        node.transition().duration(300)
            .attr('opacity', n => connected.has(n.id) ? 1 : 0.1);
        link.transition().duration(300)
            .attr('opacity', l =>
                (l.source.id === d.id || l.target.id === d.id) ? 0.6 : 0.05
            );
    });

    // Click background to reset
    svg.on('click', () => {
        node.transition().duration(300).attr('opacity', 1);
        link.transition().duration(300).attr('opacity', 1);
        closeSidebar();
    });

    // Tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        node
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

    // Search
    const searchInput = document.querySelector('.constellation-search input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            if (!q) {
                node.attr('opacity', 1);
                return;
            }
            node.attr('opacity', d =>
                d.name.toLowerCase().includes(q) ? 1 : 0.1
            );
        });
    }
}

function showPersonPanel(d, nodes, links, profiles, quotes) {
    const sidebar = document.getElementById('personPanel');
    if (!sidebar) return;

    // Find profile
    const profileList = Array.isArray(profiles) ? profiles : [];
    const profile = profileList.find(p =>
        p.name && d.name && p.name.toLowerCase() === d.name.toLowerCase()
    );

    // Find connections
    const connected = [];
    links.forEach(l => {
        if (l.source.id === d.id || l.source === d.id) {
            const target = nodes.find(n => n.id === (l.target.id || l.target));
            if (target) connected.push(target.name);
        }
        if (l.target.id === d.id || l.target === d.id) {
            const source = nodes.find(n => n.id === (l.source.id || l.source));
            if (source) connected.push(source.name);
        }
    });

    // Find quotes by this person
    const personQuotes = (Array.isArray(quotes) ? quotes : []).filter(q =>
        q.speaker && d.name && q.speaker.toLowerCase() === d.name.toLowerCase()
    );

    sidebar.querySelector('.person-name').textContent = d.name;
    sidebar.querySelector('.person-years').textContent =
        d.first_year && d.last_year ? `${d.first_year} – ${d.last_year}` :
        d.first_year ? `Since ${d.first_year}` : '';

    sidebar.querySelector('.person-highlight').textContent =
        profile ? (profile.highlight || profile.description || d.category || '') : (d.relation || d.category || '');

    // Connections
    const connHTML = connected.slice(0, 10).map(c =>
        `<span class="connection-tag">${c}</span>`
    ).join('');
    sidebar.querySelector('.person-connections').innerHTML = connHTML || '<em>No documented connections</em>';

    // Milestones from profile
    const milestonesEl = sidebar.querySelector('.person-milestones');
    if (profile && profile.milestones) {
        milestonesEl.innerHTML = profile.milestones.slice(0, 5).map(m =>
            `<div class="person-milestone-item">
                <span class="person-milestone-year">${m.year || ''}</span>
                ${m.text || m.milestone || ''}
            </div>`
        ).join('');
    } else {
        milestonesEl.innerHTML = '';
    }

    // Quotes
    const quotesEl = sidebar.querySelector('.person-quotes');
    if (personQuotes.length) {
        quotesEl.innerHTML = personQuotes.slice(0, 3).map(q =>
            `<blockquote>&ldquo;${q.quote || q.text}&rdquo;</blockquote>`
        ).join('');
    } else {
        quotesEl.innerHTML = '';
    }

    sidebar.classList.add('open');
}

function closeSidebar() {
    const sidebar = document.getElementById('personPanel');
    if (sidebar) sidebar.classList.remove('open');
}

function renderInnerCircleChart(milestones) {
    const canvas = document.getElementById('innerCircleChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Count unique people per year from milestones
    const yearlyPeople = {};
    const allMilestones = Array.isArray(milestones) ? milestones : [];

    allMilestones.forEach(m => {
        const year = m.year;
        if (!year) return;
        if (!yearlyPeople[year]) yearlyPeople[year] = new Set();
        // Count milestone as representing at least one person
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
                title: {
                    display: true,
                    text: 'The Circle Over Time',
                    color: '#d0d8e4',
                    font: { family: "'Courier Prime', monospace", size: 14 }
                }
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
    .catch(() => {
        const el = document.getElementById('constellationMount');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
