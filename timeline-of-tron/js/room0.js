// js/room0.js — Room 0: The Before (Hidden Room)
// Clue tracking via localStorage, origin story content

const CLUE_KEY = 'tron_room0_clues';
const TOTAL_CLUES = 7;

export function initRoom0() {
    renderClueStatus();
    renderOriginStory();
}

function getFoundClues() {
    try {
        const stored = localStorage.getItem(CLUE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

export function markClueFound(clueId) {
    const found = getFoundClues();
    if (!found.includes(clueId)) {
        found.push(clueId);
        localStorage.setItem(CLUE_KEY, JSON.stringify(found));
    }
    return found.length;
}

export function checkAllCluesFound() {
    return getFoundClues().length >= TOTAL_CLUES;
}

function renderClueStatus() {
    const container = document.querySelector('.room0-clue-status');
    if (!container) return;

    const found = getFoundClues();

    container.innerHTML = `
        <div class="room0-clue-status__label">Clues Found</div>
        <div class="clue-dots">
            ${[1, 2, 3, 4, 5, 6, 7].map(i =>
                `<div class="clue-dot ${found.includes('clue' + i) ? 'found' : ''}" title="Clue ${i}"></div>`
            ).join('')}
        </div>
    `;
}

function renderOriginStory() {
    const container = document.querySelector('.room0-origin-content');
    if (!container) return;

    const origins = [
        {
            year: '1984',
            title: 'Born',
            text: 'September 27, 1984. The timeline begins — though it wouldn\'t start being documented for another 20 years.'
        },
        {
            year: '1997',
            title: 'First Survivor Series',
            text: 'The obsession begins. Not with data, not with tracking — but with wrestling. Survivor Series 1997, the Montreal Screwjob. A kid watching something he didn\'t fully understand, but knew he couldn\'t look away. 29 years of consecutive attendance would follow.'
        },
        {
            year: '1998–2002',
            title: 'The Falcon Years',
            text: 'Monmouth Regional High School. Room 306 hallway with Phil Campanella. Valerie Winston and "The Middle" by Jimmy Eat World on the way to graduation. The friendships that would last decades were forming, though nobody knew it yet.'
        },
        {
            year: '2001',
            title: 'First Job: Pathmark Cashier',
            text: 'Career Level 0. A cashier at Pathmark, circa 2001-2002. The staircase starts here — from scanning groceries to Executive Director, a climb that would take 15 years and get meticulously documented at every step.'
        },
        {
            year: '2001',
            title: 'MSG: Rangers Game',
            text: 'Madison Square Garden. A Rangers game. Then not again for 20 years — until 2021. Some obsessions replace others. The seat at MSG waited two decades.'
        },
        {
            year: '2004',
            title: 'The Car Accident',
            text: 'The event that, in hindsight, started everything. The first medical event in what would become a 14-entry medical timeline with a 100% comeback rate and a 7.1-month average recovery time. Before the data, before the tracking, before the precision — there was this moment. The timeline begins.'
        }
    ];

    container.innerHTML = origins.map(o => `
        <div class="room0-card">
            <div class="room0-card__year">${o.year}</div>
            <div class="room0-card__title">${o.title}</div>
            <div class="room0-card__text">${o.text}</div>
        </div>
    `).join('');
}

// Clue injection — called from other rooms to plant clues
// Each room checks if its clue element should be activated
export function plantClue(clueId, element) {
    if (!element) return;

    element.addEventListener('click', () => {
        const total = markClueFound(clueId);
        element.classList.add('clue-found');

        // Brief visual feedback
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(201,168,76,0.15);color:#c9a84c;font-family:var(--font-mono);font-size:13px;padding:12px 24px;border-radius:3px;z-index:9999;pointer-events:none;opacity:1;transition:opacity 1.5s';
        flash.textContent = `Clue ${total}/${TOTAL_CLUES} found`;
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; }, 200);
        setTimeout(() => flash.remove(), 2000);

        // If all found, reveal Room 0 link on lobby
        if (total >= TOTAL_CLUES) {
            localStorage.setItem('tron_room0_unlocked', 'true');
        }
    }, { once: true });
}

// Check if Room 0 should be revealed on lobby
export function checkRoom0Reveal() {
    if (localStorage.getItem('tron_room0_unlocked') === 'true') {
        const lobby = document.querySelector('.room-grid');
        if (!lobby) return;

        // Check if already added
        if (document.querySelector('.room0-reveal-link')) return;

        const link = document.createElement('a');
        link.href = 'room0.html';
        link.className = 'room0-reveal-link';
        link.style.cssText = 'display:block;text-align:center;margin-top:2rem;font-family:var(--font-mono);font-size:12px;color:#c9a84c;opacity:0.5;text-decoration:none;letter-spacing:0.15em;transition:opacity 0.3s';
        link.textContent = '[ room 0: the before ]';
        link.addEventListener('mouseenter', () => link.style.opacity = '1');
        link.addEventListener('mouseleave', () => link.style.opacity = '0.5');
        lobby.after(link);
    }
}

// Auto-init only on room0.html
if (document.querySelector('.room-before')) {
    initRoom0();
}
