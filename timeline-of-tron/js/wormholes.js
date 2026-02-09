// js/wormholes.js — Cross-room contextual links
// Renders portal icons next to content that connects to other rooms.
// Import and call initWormholes() from any room's JS module.

const WORMHOLES = [
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
        from: { room: 'vault', selector: '.vault-people-section' },
        to: { room: 'constellation', url: 'constellation.html', hash: '' },
        label: 'Meet the people who said these words →',
        context: 'The Constellation'
    },
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
