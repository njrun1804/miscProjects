// js/nav.js — Shared navigation for Timeline of Tron V2
// Injects LJ header, room nav bar, and footer into every page.
// Each page calls initNav() with room config.

const ROOMS = [
    { id: 'lobby', label: 'Lobby', href: 'index.html' },
    { id: 'arc', label: 'The Arc', href: 'arc.html' },
    { id: 'constellation', label: 'Constellation', href: 'constellation.html' },
    { id: 'comeback', label: 'Comeback Lab', href: 'comeback.html' },
    { id: 'records', label: 'Record Book', href: 'records.html' },
    { id: 'atlas', label: 'Atlas', href: 'atlas.html' },
    { id: 'vault', label: 'Vault', href: 'vault.html' },
    { id: 'dynasty', label: 'Dynasty', href: 'dynasty.html' },
];

const DEFAULT_CONFIG = {
    room: 'lobby',
    mood: 'nostalgic',
    moodEmoji: '',
    music: '',
    subtitle: 'To Tokyo, 2026.',
};

export function initNav(config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    renderHeader(cfg);
    renderRoomNav(cfg);
    renderFooter(cfg);
}

function renderHeader(cfg) {
    const mount = document.getElementById('lj-header-mount');
    if (!mount) return;

    mount.innerHTML = `
        <header class="lj-header">
            <div class="lj-header-inner">
                <nav class="lj-nav-bar" aria-label="LiveJournal navigation">
                    <a href="index.html">Recent Entries</a>
                    <span class="sep">|</span>
                    <a href="index.html">Archive</a>
                    <span class="sep">|</span>
                    <a href="constellation.html">Friends</a>
                    <span class="sep">|</span>
                    <a href="index.html">User Info</a>
                    <span class="sep">|</span>
                    <a href="vault.html">Memories</a>
                </nav>
                <div class="lj-title-bar">
                    <div class="lj-userpic">JT</div>
                    <div class="lj-title-text">
                        <a href="index.html" class="lj-username" style="text-decoration:none">J . T R O N O L O N E</a>
                        <span class="lj-subtitle">${cfg.subtitle}</span>
                    </div>
                </div>
            </div>
        </header>
    `;
}

function renderRoomNav(cfg) {
    const headerMount = document.getElementById('lj-header-mount');
    if (!headerMount) return;

    const nav = document.createElement('nav');
    nav.className = 'room-nav';
    nav.setAttribute('aria-label', 'Room navigation');

    const inner = document.createElement('div');
    inner.className = 'room-nav-inner';

    const label = document.createElement('span');
    label.className = 'room-nav-label';
    label.textContent = 'Rooms:';
    inner.appendChild(label);

    ROOMS.forEach(room => {
        const a = document.createElement('a');
        a.href = room.href;
        a.className = 'room-nav-link';
        a.textContent = room.label;
        if (room.id === cfg.room) a.classList.add('active');
        inner.appendChild(a);
    });

    // Search
    const search = document.createElement('div');
    search.className = 'room-nav-search';
    search.innerHTML = `
        <input type="search" placeholder="Search timeline..." aria-label="Search across all rooms">
        <div class="search-results" id="searchResults"></div>
    `;
    inner.appendChild(search);

    nav.appendChild(inner);
    headerMount.after(nav);
}

function renderFooter(cfg) {
    const mount = document.getElementById('lj-footer-mount');
    if (!mount) return;

    const hitCount = '022847';

    mount.innerHTML = `
        <footer class="lj-footer">
            <div class="lj-hit-counter">
                <span class="hit-counter-label">visitors</span>
                <div class="hit-counter-digits">
                    ${hitCount.split('').map(d => `<span class="hit-digit">${d}</span>`).join('')}
                </div>
            </div>
            <div class="lj-footer-mood">
                <span class="lj-current">
                    <strong>Current Mood:</strong>
                    <span class="lj-mood">
                        <span class="mood-icon mood-icon--${cfg.mood}"></span>
                        ${cfg.mood}
                    </span>
                    ${cfg.music ? `&nbsp;&nbsp;|&nbsp;&nbsp;<strong>Current Music:</strong> ${cfg.music}` : ''}
                </span>
            </div>
            <div class="lj-footer-tagline">
                The Timeline of Tron &middot; 22 years &middot; 227 milestones &middot; One obsessively documented life
            </div>
            <div class="lj-footer-fine-print">
                &copy; 2004&ndash;2026 J. Tronolone &middot; Built with obsessive precision
            </div>
        </footer>
    `;
}
