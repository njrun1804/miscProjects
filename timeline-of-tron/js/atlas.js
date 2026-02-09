// js/atlas.js — Room 5: The Atlas (Redesigned)
// Dark ocean theme. Animated hero canvas. Flight arcs. Scroll reveals.

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';
import { plantClue } from './room0.js';

// === HOME COORDS (NJ) ===
const HOME = { lat: 40.7128, lng: -74.0060 };

export async function initAtlas() {
    const data = await loadMultiple([
        'travel.json',
        'medical_events.json',
        'cruise_detail.json'
    ]);

    const travel = data.travel || [];
    const medical = data.medical_events || [];
    const cruises = data.cruise_detail || [];

    initHeroCanvas();
    initCounterAnimation();
    const map = renderMap(travel);
    if (map) {
        initScrubber(map, travel);
        drawFlightArcs(map, travel);
    }
    renderEras(travel);
    renderCruiseStreak(cruises);
    renderRecoveryStories(medical, travel);
    renderBigTrips(travel);
    initScrollReveal();
}

// ================================
// HERO CANVAS — Starfield / particle grid
// ================================
function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h, particles;
    const PARTICLE_COUNT = 80;

    function resize() {
        w = canvas.width = canvas.offsetWidth;
        h = canvas.height = canvas.offsetHeight;
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.4 + 0.1
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(0, 210, 255, 0.03)';
        ctx.lineWidth = 0.5;
        const gridSize = 60;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Draw particles
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 210, 255, ${p.alpha})`;
            ctx.fill();
        });

        // Draw connections between nearby particles
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 210, 255, ${0.06 * (1 - dist / 120)})`;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(draw);
    }

    resize();
    createParticles();
    draw();
    window.addEventListener('resize', () => { resize(); createParticles(); });
}

// ================================
// ANIMATED COUNTERS
// ================================
function initCounterAnimation() {
    const stats = document.querySelectorAll('.atlas-stat[data-target]');
    if (!stats.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => observer.observe(stat));
}

function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const valueEl = el.querySelector('.atlas-stat__value');
    if (!valueEl) return;

    const suffix = valueEl.querySelector('.atlas-stat__suffix');
    const suffixText = suffix ? suffix.outerHTML : '';
    const duration = 1500;
    const start = performance.now();

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        valueEl.innerHTML = current + suffixText;

        if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

// ================================
// MAP — Dark tiles, glowing markers
// ================================
function renderMap(travel) {
    const mapEl = document.getElementById('atlasMap');
    if (!mapEl || typeof L === 'undefined') return null;

    const map = L.map('atlasMap', {
        scrollWheelZoom: false,
        zoomControl: true
    }).setView([25, 0], 2);

    // Dark map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18
    }).addTo(map);

    const markers = [];
    const markerLayer = L.layerGroup().addTo(map);

    travel.forEach(trip => {
        if (!trip.latitude || !trip.longitude) return;

        const isIntl = trip.scope === 'International';
        const color = isIntl ? '#00d2ff' : 'rgba(200, 214, 229, 0.5)';
        const glowColor = isIntl ? 'rgba(0, 210, 255, 0.4)' : 'rgba(200, 214, 229, 0.2)';
        const radius = isIntl ? 7 : 5;

        const marker = L.circleMarker([trip.latitude, trip.longitude], {
            radius: radius,
            fillColor: color,
            color: glowColor,
            weight: 3,
            fillOpacity: 0.9
        });

        const durationText = trip.duration_days ? `${trip.duration_days} days` : '';
        const scopeText = trip.scope || '';
        const meta = [trip.year, scopeText, durationText].filter(Boolean).join(' · ');

        marker.bindPopup(`
            <div class="atlas-popup">
                <div class="atlas-popup__dest">${trip.destination}</div>
                <div class="atlas-popup__year">${meta}</div>
                ${trip.highlight ? `<div class="atlas-popup__highlight">${trip.highlight}</div>` : ''}
            </div>
        `);

        marker._tripYear = trip.year;
        markers.push(marker);
        markerLayer.addLayer(marker);
    });

    map._tronMarkers = markers;
    map._tronMarkerLayer = markerLayer;

    return map;
}

// ================================
// FLIGHT ARCS — Curved lines from home to destinations
// ================================
function drawFlightArcs(map, travel) {
    const arcLayer = L.layerGroup().addTo(map);

    travel.forEach(trip => {
        if (!trip.latitude || !trip.longitude) return;

        const isIntl = trip.scope === 'International';
        if (!isIntl) return; // Only draw arcs for international trips

        // Create curved line points
        const start = [HOME.lat, HOME.lng];
        const end = [trip.latitude, trip.longitude];
        const points = generateArcPoints(start, end, 30);

        const polyline = L.polyline(points, {
            color: 'rgba(0, 210, 255, 0.15)',
            weight: 1.5,
            dashArray: '4 6',
            smoothFactor: 1
        });

        polyline._tripYear = trip.year;
        arcLayer.addLayer(polyline);
    });

    map._tronArcLayer = arcLayer;
}

function generateArcPoints(start, end, numPoints) {
    const points = [];
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const lat = start[0] + (end[0] - start[0]) * t;
        const lng = start[1] + (end[1] - start[1]) * t;
        // Add curvature — bulge proportional to distance
        const dist = Math.sqrt(
            Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
        );
        const bulge = dist * 0.15 * Math.sin(Math.PI * t);
        points.push([lat + bulge, lng]);
    }
    return points;
}

// ================================
// TIMELINE SCRUBBER
// ================================
function initScrubber(map, travel) {
    const slider = document.getElementById('yearSlider');
    const display = document.getElementById('yearDisplay');
    if (!slider || !display) return;

    const years = travel.map(t => t.year).filter(Boolean);
    if (!years.length) return;
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    slider.min = minYear;
    slider.max = maxYear;
    slider.value = maxYear;
    display.textContent = 'All Years';

    slider.addEventListener('input', () => {
        const cutoff = parseInt(slider.value);
        display.textContent = cutoff >= maxYear ? 'All Years' : `2007–${cutoff}`;

        // Filter markers
        const markers = map._tronMarkers || [];
        markers.forEach(m => {
            if (m._tripYear <= cutoff) {
                if (!map._tronMarkerLayer.hasLayer(m)) map._tronMarkerLayer.addLayer(m);
            } else {
                map._tronMarkerLayer.removeLayer(m);
            }
        });

        // Filter arcs
        const arcLayer = map._tronArcLayer;
        if (arcLayer) {
            arcLayer.eachLayer(arc => {
                if (arc._tripYear <= cutoff) {
                    arc.setStyle({ opacity: 1 });
                } else {
                    arc.setStyle({ opacity: 0 });
                }
            });
        }
    });
}

// ================================
// TRAVEL ERAS
// ================================
function renderEras(travel) {
    const container = document.querySelector('.atlas-eras-flow');
    if (!container) return;

    const eras = [
        {
            name: 'The WrestleMania Circuit',
            years: '2007–2010',
            desc: 'The first trips were pilgrimages. Detroit for WrestleMania 23. NYC for Monday Night RAW. Orlando, Houston, Arizona — always following the show. The world was as big as the next arena.',
            destinations: ['Detroit', 'NYC', 'Orlando', 'Houston', 'Arizona'],
            tripCount: countTripsInRange(travel, 2007, 2010),
            scope: 'domestic'
        },
        {
            name: 'The Local Loop',
            years: '2008–2012',
            desc: 'Atlantic City bachelor parties. Vermont ski weekends. DC for Pride. Shohola for a bachelor party. The radius stayed small — a few hours from Jersey, max.',
            destinations: ['Atlantic City', 'Vermont', 'Washington D.C.', 'Shohola'],
            tripCount: countTripsInRange(travel, 2008, 2012, t => t.trip_type !== 'cruise'),
            scope: 'domestic'
        },
        {
            name: 'The Cruise Years',
            years: '2013–2018',
            desc: 'Six cruises in six consecutive years. It started with a 7-day Bermuda run and ended with a 14-day, 5-country Mediterranean voyage where an engagement ring was purchased. The radius exploded.',
            destinations: ['Bermuda', 'Caribbean', 'USVI', 'Alaska', 'Mediterranean'],
            tripCount: 6,
            scope: 'international'
        },
        {
            name: 'The Expeditions',
            years: '2019–2020',
            desc: '19 days in Australia and New Zealand — "the best, the longest, and the greatest." Then 17 days across 5 Asian countries. Two trips. Two hemispheres. The ambition peaked.',
            destinations: ['Australia', 'New Zealand', 'Singapore', 'Thailand', 'Cambodia', 'Vietnam', 'Hong Kong'],
            tripCount: 2,
            scope: 'international'
        },
        {
            name: 'The Return',
            years: '2021–2025',
            desc: 'Post-pandemic, the trips got bigger. A Grand Canyon road trip. The Super Bowl in Phoenix. Five European countries in one year. A 4,000-mile, 16-state Midwest road trip.',
            destinations: ['Grand Canyon', 'Phoenix', 'Portugal', 'Spain', 'Norway', 'Iceland'],
            tripCount: countTripsInRange(travel, 2021, 2025),
            scope: 'both'
        },
        {
            name: 'What\'s Next',
            years: '2026',
            desc: 'Japan. Tokyo bound.',
            destinations: ['Tokyo'],
            tripCount: 1,
            scope: 'international'
        }
    ];

    container.innerHTML = eras.map((era) => {
        const scopeClass = era.scope === 'international' ? 'era--intl' : era.scope === 'both' ? 'era--both' : 'era--domestic';
        const scopeBadgeClass = era.scope === 'international' ? 'era-card__scope--intl' : era.scope === 'both' ? 'era-card__scope--both' : 'era-card__scope--domestic';
        const scopeLabel = era.scope === 'international' ? 'International' : era.scope === 'both' ? 'Mixed' : 'Domestic';
        return `
            <div class="era-card ${scopeClass} atlas-reveal">
                <div class="era-card__header">
                    <span class="era-card__name">${era.name}</span>
                    <span class="era-card__years">${era.years}</span>
                </div>
                <div class="era-card__desc">${era.desc}</div>
                <div class="era-card__footer">
                    <span class="era-card__count">${era.tripCount} trip${era.tripCount !== 1 ? 's' : ''}</span>
                    <div class="era-card__tags">${era.destinations.map(d => `<span class="era-tag">${d}</span>`).join('')}</div>
                    <span class="era-card__scope ${scopeBadgeClass}">${scopeLabel}</span>
                </div>
            </div>
        `;
    }).join('');
}

function countTripsInRange(travel, startYear, endYear, filterFn) {
    return travel.filter(t => {
        if (!t.year || t.year < startYear || t.year > endYear) return false;
        return filterFn ? filterFn(t) : true;
    }).length;
}

// ================================
// CRUISE STREAK — Card grid
// ================================
function renderCruiseStreak(cruises) {
    const container = document.querySelector('.cruise-log');
    if (!container) return;

    const items = Array.isArray(cruises) ? cruises : [];
    if (!items.length) return;

    const sorted = [...items].sort((a, b) => (a.year || 0) - (b.year || 0));

    container.innerHTML = sorted.map((c) => {
        const ship = c.ship_name || '';
        const duration = c.duration_days ? `${c.duration_days} days` : '';
        const rating = c.rating || '';
        const countries = c.countries_visited > 0 ? `${c.countries_visited} countries` : '';
        const meta = [ship, duration, countries].filter(Boolean).join(' · ');

        return `
            <div class="cruise-card atlas-reveal">
                <div class="cruise-card__number">#${c.cruise_number}</div>
                <div class="cruise-card__year">${c.year}</div>
                <div class="cruise-card__dest">${c.destinations}</div>
                ${meta ? `<div class="cruise-card__meta">${meta}</div>` : ''}
                ${c.highlight ? `<div class="cruise-card__highlight">${c.highlight}</div>` : ''}
                ${rating ? `<div class="cruise-card__rating">${rating}</div>` : ''}
                <div class="cruise-card__wave"></div>
            </div>
        `;
    }).join('');
}

// ================================
// RECOVERY STORIES
// ================================
function renderRecoveryStories(medical, travel) {
    const container = document.querySelector('.recovery-stories');
    if (!container) return;

    const stories = [
        {
            year: 2007,
            crisis: 'Near-anorexia, mental health crisis',
            recovery: 'Detroit (WrestleMania 23), NYC (MSG)',
            insight: 'The first-ever trips. Wrestling became the escape route.'
        },
        {
            year: 2017,
            crisis: 'L5-S1 herniation, microdiscectomy surgery, 14 staples',
            recovery: 'Alaska cruise, California road trip, Victoria BC, then 5-country Mediterranean cruise (2018)',
            insight: 'Six months from 14 staples to hiking Gros Piton. The engagement ring was purchased on that Mediterranean cruise.'
        },
        {
            year: 2019,
            crisis: 'Strep throat + kidney stone removal',
            recovery: 'Australia & New Zealand — 19 days',
            insight: '"The best, the longest, and the greatest." Highest sentiment score of any trip (0.855).'
        },
        {
            year: 2020,
            crisis: 'Quarantine, Mar 26–Apr 16',
            recovery: 'Singapore, Thailand, Cambodia, Vietnam, Hong Kong — 17 days',
            insight: 'Gained 3 lbs of muscle during quarantine, then crossed 5 countries.'
        },
        {
            year: 2024,
            crisis: 'Two hospitalizations in 3 days (Dec 18 & 20)',
            recovery: 'Portugal, Spain, Norway, Iceland, Toronto',
            insight: 'Five countries in one year. The travel didn\'t stop.'
        }
    ];

    container.innerHTML = stories.map(s => `
        <div class="recovery-card atlas-reveal">
            <div class="recovery-card__year">${s.year}</div>
            <div class="recovery-card__body">
                <div class="recovery-card__crisis">${s.crisis}</div>
                <div class="recovery-card__arrow">→</div>
                <div class="recovery-card__trips">${s.recovery}</div>
            </div>
            <div class="recovery-card__insight">${s.insight}</div>
        </div>
    `).join('');
}

// ================================
// BIG TRIPS
// ================================
function renderBigTrips(travel) {
    const container = document.querySelector('.big-trips-grid');
    if (!container) return;

    const bigTripIds = [26, 29, 24, 33, 31];
    const highlights = {
        26: { tagline: 'The Greatest Trip', detail: '19 days. 2 countries. Highest sentiment of any trip. "The best, the longest, and the greatest."' },
        29: { tagline: 'The Asian Expedition', detail: '17 days. 5 countries. Singapore to Hong Kong.' },
        24: { tagline: 'The Mediterranean', detail: '5 countries. 2 weeks. The engagement ring was purchased here.' },
        33: { tagline: 'The Great American Road Trip', detail: '4,000 miles. 16 states. Mount Rushmore, Devils Tower, Gateway Arch, Badlands.' },
        31: { tagline: 'The Super Bowl', detail: '"The most spectacular day I\'ve ever experienced." Phoenix, 2023.' }
    };

    const trips = bigTripIds.map(id => travel.find(t => t.id === id)).filter(Boolean);

    container.innerHTML = trips.map((trip, i) => {
        const h = highlights[trip.id] || {};
        const duration = trip.duration_days ? `${trip.duration_days} days` : '';
        const countries = trip.countries ? `${trip.countries} countries` : '';
        const meta = [trip.year, trip.scope, duration, countries].filter(Boolean).join(' · ');

        return `
            <div class="big-trip-card atlas-reveal">
                <div class="big-trip-card__rank">${i + 1}</div>
                <div class="big-trip-card__tagline">${h.tagline || trip.destination}</div>
                <div class="big-trip-card__dest">${trip.destination}</div>
                <div class="big-trip-card__meta">${meta}</div>
                <div class="big-trip-card__detail">${h.detail || trip.highlight || ''}</div>
                <div class="big-trip-card__glow"></div>
            </div>
        `;
    }).join('');
}

// ================================
// SCROLL REVEAL
// ================================
function initScrollReveal() {
    const reveals = document.querySelectorAll('.atlas-reveal');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, idx) => {
            if (entry.isIntersecting) {
                // Stagger the animation slightly for items in view
                const delay = idx * 80;
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    reveals.forEach(el => observer.observe(el));
}

// ================================
// AUTO-INIT
// ================================
initAtlas()
    .then(() => initWormholes('atlas'))
    .then(() => plantClue('clue5', document.querySelector('.atlas-callout')))
    .catch(err => {
        console.error('Atlas init error:', err);
        const el = document.getElementById('atlasMap');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
