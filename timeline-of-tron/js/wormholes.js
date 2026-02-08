// js/wormholes.js — Cross-room contextual links
// Renders portal icons next to content that connects to other rooms.
// Import and call initWormholes() from any room's JS module.

const WORMHOLES = [
    // Arc → Comeback Lab
    {
        from: { room: 'arc', selector: '[data-stage="ordeal"]' },
        to: { room: 'comeback', url: 'comeback.html', hash: '' },
        label: 'See the recovery pattern →',
        context: 'Comeback Lab'
    },
    // Arc → Constellation (people woven into stages)
    {
        from: { room: 'arc', selector: '[data-stage="ordinary-world"]' },
        to: { room: 'constellation', url: 'constellation.html', hash: '' },
        label: 'Father-son reconciliation begins here →',
        context: 'The Constellation'
    },
    // Constellation → Arc
    {
        from: { room: 'constellation', selector: '.constellation-sidebar' },
        to: { room: 'arc', url: 'arc.html', hash: '' },
        label: 'See their role in the hero\'s journey →',
        context: 'The Arc'
    },
    // Atlas → Comeback Lab (recovery trips)
    {
        from: { room: 'atlas', selector: '.atlas-callout' },
        to: { room: 'comeback', url: 'comeback.html', hash: '' },
        label: 'The recovery trips connect here →',
        context: 'Comeback Lab'
    },
    // Records → Comeback Lab (broken streak)
    {
        from: { room: 'records', selector: '.record-wall-grid' },
        to: { room: 'comeback', url: 'comeback.html', hash: '' },
        label: 'The surgery that broke the streak →',
        context: 'Comeback Lab'
    },
    // Records → Dynasty (streaks + traditions)
    {
        from: { room: 'records', selector: '.obsession-grid' },
        to: { room: 'dynasty', url: 'dynasty.html', hash: '' },
        label: 'See what was built with this precision →',
        context: 'The Dynasty'
    },
    // Dynasty → Records
    {
        from: { room: 'dynasty', selector: '.staircase-container' },
        to: { room: 'records', url: 'records.html', hash: '' },
        label: 'The numbers behind the career →',
        context: 'Record Book'
    },
    // Dynasty → Constellation
    {
        from: { room: 'dynasty', selector: '.trophy-categories' },
        to: { room: 'constellation', url: 'constellation.html', hash: '' },
        label: 'The people behind the awards →',
        context: 'The Constellation'
    },
    // Vault → Arc (quotes in context)
    {
        from: { room: 'vault', selector: '.vault-quote-wall' },
        to: { room: 'arc', url: 'arc.html', hash: '' },
        label: 'See these words in the hero\'s journey →',
        context: 'The Arc'
    },
    // Vault → Constellation (speakers)
    {
        from: { room: 'vault', selector: '.vault-keyword-river' },
        to: { room: 'constellation', url: 'constellation.html', hash: '' },
        label: 'Meet the people who said these words →',
        context: 'The Constellation'
    },
    // Comeback → Atlas (recovery destinations)
    {
        from: { room: 'comeback', selector: '.comeback-detail' },
        to: { room: 'atlas', url: 'atlas.html', hash: '' },
        label: 'See where recovery took him →',
        context: 'The Atlas'
    },
    // Comeback → Dynasty (what was built after)
    {
        from: { room: 'comeback', selector: '.comeback-clock-section' },
        to: { room: 'dynasty', url: 'dynasty.html', hash: '' },
        label: 'What was built after each comeback →',
        context: 'The Dynasty'
    }
];

export function initWormholes(currentRoom) {
    const roomWormholes = WORMHOLES.filter(w => w.from.room === currentRoom);
    if (!roomWormholes.length) return;

    // Wait for DOM to be populated by room JS
    requestAnimationFrame(() => {
        setTimeout(() => {
            roomWormholes.forEach(wormhole => {
                const target = document.querySelector(wormhole.from.selector);
                if (!target) return;

                const portal = document.createElement('a');
                portal.href = wormhole.to.url + (wormhole.to.hash ? '#' + wormhole.to.hash : '');
                portal.className = 'wormhole-link';
                portal.setAttribute('data-destination', wormhole.context);
                portal.innerHTML = `
                    <span class="wormhole-icon">&#x1f517;</span>
                    <span class="wormhole-label">${wormhole.label}</span>
                    <span class="wormhole-dest">${wormhole.context}</span>
                `;

                // Append after the target element
                target.appendChild(portal);
            });
        }, 500); // Delay to let room JS render content first
    });
}
