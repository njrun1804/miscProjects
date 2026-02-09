// js/nav.js — Shared navigation for Timeline of Tron V2
// Single unified header: identity + room links + search.
// Each page calls initNav() with room config.

const ROOMS = [
    { id: 'lobby', label: 'Lobby', href: 'index.html' },
    { id: 'arc', label: 'The Arc', href: 'arc.html' },
    { id: 'constellation', label: 'Constellation', href: 'constellation.html' },
    { id: 'records', label: 'Record Book', href: 'records.html' },
    { id: 'atlas', label: 'Atlas', href: 'atlas.html' },
    { id: 'vault', label: 'Vault', href: 'vault.html' },
    { id: 'dynasty', label: 'Dynasty', href: 'dynasty.html' },
    { id: 'ecd', label: 'ECD', href: 'ecd.html' },
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
    renderFooter(cfg);
}

function renderHeader(cfg) {
    const mount = document.getElementById('lj-header-mount');
    if (!mount) return;

    const roomLinks = ROOMS.map(room => {
        const active = room.id === cfg.room ? ' active' : '';
        return `<a href="${room.href}" class="lj-room-link${active}">${room.label}</a>`;
    }).join('');

    mount.innerHTML = `
        <header class="lj-header">
            <div class="lj-header-inner">
                <a href="index.html" class="lj-identity" style="text-decoration:none">
                    <div class="lj-userpic">JT</div>
                    <div class="lj-identity-text">
                        <span class="lj-username">J.Tronolone</span>
                        <span class="lj-subtitle">${cfg.subtitle}</span>
                    </div>
                </a>
                <nav class="lj-rooms" aria-label="Room navigation">
                    ${roomLinks}
                </nav>
                <div class="lj-search">
                    <input type="search" placeholder="Search timeline..." aria-label="Search across all rooms">
                    <div class="search-results" id="searchResults"></div>
                </div>
                <button class="lj-hamburger" aria-label="Toggle navigation" onclick="this.closest('.lj-header').classList.toggle('nav-open')">&#9776;</button>
            </div>
        </header>
    `;
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
