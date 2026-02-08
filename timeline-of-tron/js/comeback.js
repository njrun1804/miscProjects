// js/comeback.js — Room 3: The Comeback Lab
// D3 Sankey diagram + Recovery Clock + detail panels

import { loadMultiple } from './data-loader.js';

export async function initComeback() {
    const data = await loadMultiple([
        'comeback_narrative.json',
        'medical_events.json'
    ]);

    const comebacks = data.comeback_narrative;
    const medical = data.medical_events;

    if (!comebacks || !comebacks.length) return;

    renderHeadlineStat(comebacks);
    renderSankey(comebacks);
    renderRecoveryClock(comebacks);
}

function renderHeadlineStat(comebacks) {
    const el = document.querySelector('.comeback-headline-stat');
    if (!el) return;

    // Calculate average gap_months
    const withGap = comebacks.filter(c => c.gap_months > 0);
    const avg = withGap.reduce((s, c) => s + c.gap_months, 0) / (withGap.length || 1);
    el.textContent = avg.toFixed(1);
}

function renderSankey(comebacks) {
    const container = document.querySelector('.comeback-sankey');
    if (!container || typeof d3 === 'undefined') return;

    const width = container.clientWidth || 900;
    const height = 450;

    // Build Sankey data from comeback narratives
    // Left: Crisis types, Middle: Recovery behaviors, Right: Outcomes
    const crisisTypes = new Set();
    const recoveryTypes = new Set();

    comebacks.forEach(c => {
        const crisis = categorizeCrisis(c);
        const recovery = categorizeRecovery(c);
        crisisTypes.add(crisis);
        recoveryTypes.add(recovery);
    });

    const crisisArr = [...crisisTypes];
    const recoveryArr = [...recoveryTypes];

    // Nodes: crisis types + recovery types + outcome
    const nodes = [
        ...crisisArr.map(c => ({ name: c })),
        ...recoveryArr.map(r => ({ name: r })),
        { name: 'Recovery' }
    ];

    // Links: crisis → recovery, recovery → outcome
    const linkMap = {};
    comebacks.forEach(c => {
        const crisis = categorizeCrisis(c);
        const recovery = categorizeRecovery(c);
        const crisisIdx = crisisArr.indexOf(crisis);
        const recoveryIdx = crisisArr.length + recoveryArr.indexOf(recovery);
        const outcomeIdx = nodes.length - 1;

        const key1 = `${crisisIdx}-${recoveryIdx}`;
        linkMap[key1] = (linkMap[key1] || 0) + 1;

        const key2 = `${recoveryIdx}-${outcomeIdx}`;
        linkMap[key2] = (linkMap[key2] || 0) + 1;
    });

    const links = Object.entries(linkMap).map(([key, val]) => {
        const [s, t] = key.split('-').map(Number);
        return { source: s, target: t, value: val };
    });

    // Check if d3-sankey is available
    if (typeof d3.sankey === 'undefined') {
        // Fallback: render a simple visual list
        renderFallbackSankey(container, comebacks);
        return;
    }

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const sankey = d3.sankey()
        .nodeWidth(20)
        .nodePadding(12)
        .extent([[20, 20], [width - 20, height - 20]]);

    const graph = sankey({
        nodes: nodes.map(d => ({ ...d })),
        links: links.map(d => ({ ...d }))
    });

    // Draw links
    svg.append('g')
        .selectAll('path')
        .data(graph.links)
        .join('path')
        .attr('d', d3.sankeyLinkHorizontal())
        .attr('fill', 'none')
        .attr('stroke', '#2e7d32')
        .attr('stroke-opacity', 0.35)
        .attr('stroke-width', d => Math.max(d.width, 2))
        .style('cursor', 'pointer')
        .on('click', (event, d) => showDetail(d, comebacks));

    // Draw nodes
    svg.append('g')
        .selectAll('rect')
        .data(graph.nodes)
        .join('rect')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => Math.max(d.y1 - d.y0, 2))
        .attr('fill', '#2e7d32');

    // Labels
    svg.append('g')
        .selectAll('text')
        .data(graph.nodes)
        .join('text')
        .attr('x', d => d.x0 < width / 2 ? d.x0 - 6 : d.x1 + 6)
        .attr('y', d => (d.y0 + d.y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => d.x0 < width / 2 ? 'end' : 'start')
        .attr('font-family', "'Courier Prime', monospace")
        .attr('font-size', '12px')
        .attr('fill', '#1a1a2e')
        .text(d => d.name);
}

function renderFallbackSankey(container, comebacks) {
    // Fallback: display comeback arcs as styled cards
    const html = comebacks.map(c => {
        const crisis = categorizeCrisis(c);
        const recovery = categorizeRecovery(c);
        return `
            <div class="comeback-flow-card" style="
                display: flex; gap: 12px; align-items: center;
                padding: 12px; margin: 8px 0;
                background: white; border: 1px solid #d0d0d0;
                border-left: 4px solid #2e7d32; border-radius: 3px;
                font-size: 13px; cursor: pointer;
            " data-year="${c.medical_year}">
                <span style="font-family: var(--font-mono); font-weight:700; color:#8b1a1a; min-width:40px;">${c.medical_year}</span>
                <span style="color:#5a5a6e;">${crisis}</span>
                <span style="color:#2e7d32; font-weight:bold;">&rarr;</span>
                <span style="color:#2e7d32;">${recovery}</span>
                <span style="color:#5a5a6e; font-style:italic; margin-left:auto; font-size:11px;">${c.gap_months}mo</span>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Click handlers
    container.querySelectorAll('.comeback-flow-card').forEach(card => {
        card.addEventListener('click', () => {
            const year = parseInt(card.dataset.year);
            const cb = comebacks.find(c => c.medical_year === year);
            if (cb) showDetailDirect(cb);
        });
    });
}

function showDetail(linkData, comebacks) {
    // Show first matching comeback
    if (comebacks.length) showDetailDirect(comebacks[0]);
}

function showDetailDirect(cb) {
    const detail = document.querySelector('.comeback-detail');
    if (!detail) return;

    detail.querySelector('.comeback-detail__title').textContent =
        `${cb.medical_year}: ${cb.medical_event}`;
    detail.querySelector('.comeback-detail__narrative').innerHTML = `
        <p><strong>Crisis:</strong> ${cb.medical_event} (${cb.medical_year})</p>
        <p><strong>Recovery:</strong> ${cb.comeback_event} (${cb.comeback_year})</p>
        <p><strong>Time to recovery:</strong> ${cb.gap_months} months</p>
        <p><strong>Pattern:</strong> ${cb.comeback_type}</p>
        ${cb.related_milestones ? `
            <p style="margin-top:8px;"><strong>Key milestones:</strong></p>
            <ul style="margin-left:20px; font-size:12px; color:var(--lj-text-secondary);">
                ${cb.related_milestones.map(m => `<li>${m.year}: ${m.milestone}</li>`).join('')}
            </ul>
        ` : ''}
    `;
    detail.classList.add('active');
}

function renderRecoveryClock(comebacks) {
    const canvas = document.getElementById('recoveryClock');
    if (!canvas || typeof Chart === 'undefined') return;

    // Group by crisis type, get average recovery time
    const groups = {};
    comebacks.forEach(c => {
        const type = categorizeCrisis(c);
        if (!groups[type]) groups[type] = [];
        groups[type].push(c.gap_months);
    });

    const labels = Object.keys(groups);
    const avgMonths = labels.map(l => {
        const vals = groups[l];
        return vals.reduce((s, v) => s + v, 0) / vals.length;
    });

    new Chart(canvas, {
        type: 'polarArea',
        data: {
            labels: labels,
            datasets: [{
                data: avgMonths,
                backgroundColor: [
                    'rgba(139, 26, 26, 0.6)',
                    'rgba(106, 75, 139, 0.6)',
                    'rgba(26, 74, 139, 0.6)',
                    'rgba(46, 125, 50, 0.6)',
                    'rgba(201, 168, 76, 0.6)',
                    'rgba(26, 92, 92, 0.6)'
                ],
                borderColor: '#d0d0d0',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#1a1a2e',
                        font: { family: "'Courier Prime', monospace", size: 11 }
                    }
                },
                title: {
                    display: true,
                    text: 'Average Recovery Time by Crisis Type (months)',
                    color: '#1a1a2e',
                    font: { family: "'Courier Prime', monospace", size: 13 }
                }
            },
            scales: {
                r: {
                    ticks: {
                        color: '#5a5a6e',
                        font: { family: "'Courier Prime', monospace", size: 10 }
                    },
                    grid: { color: 'rgba(0,0,0,0.1)' }
                }
            }
        }
    });
}

function categorizeCrisis(c) {
    const event = (c.medical_event || '').toLowerCase();
    if (event.includes('surgery') || event.includes('labrum') || event.includes('herniat') || event.includes('fracture') || event.includes('pinky') || event.includes('wart')) return 'Physical Trauma';
    if (event.includes('anorexia') || event.includes('mental') || event.includes('crisis') || event.includes('emotional')) return 'Mental Health';
    if (event.includes('car') || event.includes('accident')) return 'Accident';
    if (event.includes('strep') || event.includes('kidney') || event.includes('shingles') || event.includes('fever') || event.includes('influenza') || event.includes('covid') || event.includes('quarantine')) return 'Illness';
    return 'Other';
}

function categorizeRecovery(c) {
    const type = (c.comeback_type || '').toLowerCase();
    if (type.includes('travel') || type.includes('adventure') || type.includes('cruise')) return 'Travel/Adventure';
    if (type.includes('community') || type.includes('social') || type.includes('ecd')) return 'Community Creation';
    if (type.includes('physical') || type.includes('fitness') || type.includes('gym')) return 'Physical Fitness';
    if (type.includes('career') || type.includes('work')) return 'Career Growth';
    if (type.includes('family')) return 'Family Bonds';
    return 'Resilience';
}

// Auto-init
initComeback();
