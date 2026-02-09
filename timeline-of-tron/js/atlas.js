// js/atlas.js — Room 5: The Atlas (Travel Map + Narrative)
// Story-driven travel page: eras, map, cruise streak, recovery stories, big trips

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';

export async function initAtlas() {
    const data = await loadMultiple([
        'travel.json',
        'medical_events.json',
        'cruise_detail.json',
        'travel_medical_correlations.json'
    ]);

    const travel = data.travel || [];
    const medical = data.medical_events || [];
    const cruises = data.cruise_detail || [];
    const correlations = data.travel_medical_correlations || [];

    renderStats(travel);
    renderEras(travel);
    const map = renderMap(travel);
    if (map) initScrubber(map, travel);
    renderCruiseStreak(cruises);
    renderRecoveryStories(medical, travel, correlations);
    renderBigTrips(travel);
}

// --- Big Numbers ---
function renderStats(travel) {
    const bar = document.querySelector('.atlas-stats-bar');
    if (!bar) return;

    const totalTrips = travel.length;
    const intlTrips = travel.filter(t => t.scope === 'International');
    const totalCountries = intlTrips.reduce((sum, t) => sum + (t.countries || 1), 0);
    const longestTrip = Math.max(...travel.map(t => t.duration_days || 0));
    const cruiseCount = travel.filter(t => t.trip_type === 'cruise').length;
    const totalMiles = travel.reduce((sum, t) => sum + (t.miles || 0), 0);

    const stats = [
        { value: totalTrips, label: 'Trips' },
        { value: `${totalCountries}+`, label: 'Countries' },
        { value: '5', label: 'Continents' },
        { value: `${longestTrip}`, label: 'Days (Longest Trip)' },
        { value: cruiseCount, label: 'Cruises in a Row' },
    ];

    if (totalMiles > 0) {
        stats.push({ value: totalMiles.toLocaleString(), label: 'Miles Driven' });
    }

    bar.innerHTML = stats.map(s => `
        <div class="atlas-stat">
            <div class="atlas-stat__value">${s.value}</div>
            <div class="atlas-stat__label">${s.label}</div>
        </div>
    `).join('');
}

// --- Travel Eras ---
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

    container.innerHTML = eras.map((era, i) => {
        const scopeClass = era.scope === 'international' ? 'era--intl' : era.scope === 'both' ? 'era--both' : 'era--domestic';
        const arrow = i < eras.length - 1 ? '<div class="era-arrow">→</div>' : '';
        return `
            <div class="era-card ${scopeClass}">
                <div class="era-card__header">
                    <span class="era-card__name">${era.name}</span>
                    <span class="era-card__years">${era.years}</span>
                </div>
                <div class="era-card__desc">${era.desc}</div>
                <div class="era-card__footer">
                    <span class="era-card__count">${era.tripCount} trip${era.tripCount !== 1 ? 's' : ''}</span>
                    <div class="era-card__tags">${era.destinations.map(d => `<span class="era-tag">${d}</span>`).join('')}</div>
                </div>
            </div>
            ${arrow}
        `;
    }).join('');
}

function countTripsInRange(travel, startYear, endYear, filterFn) {
    return travel.filter(t => {
        if (!t.year || t.year < startYear || t.year > endYear) return false;
        return filterFn ? filterFn(t) : true;
    }).length;
}

// --- Map ---
function renderMap(travel) {
    const mapEl = document.getElementById('atlasMap');
    if (!mapEl || typeof L === 'undefined') return null;

    const map = L.map('atlasMap', { scrollWheelZoom: false }).setView([30, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18
    }).addTo(map);

    const markers = [];
    const markerLayer = L.layerGroup().addTo(map);

    travel.forEach(trip => {
        if (!trip.latitude || !trip.longitude) return;

        const isIntl = trip.scope === 'International';
        const color = isIntl ? '#1a5c8b' : '#7a8a9a';
        const radius = isIntl ? 8 : 6;

        const marker = L.circleMarker([trip.latitude, trip.longitude], {
            radius: radius,
            fillColor: color,
            color: '#fff',
            weight: 1.5,
            fillOpacity: 0.85
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

// --- Timeline Scrubber ---
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
    display.textContent = `${minYear}–${maxYear}`;

    slider.addEventListener('input', () => {
        const cutoff = parseInt(slider.value);
        display.textContent = `${minYear}–${cutoff}`;

        const markers = map._tronMarkers || [];
        markers.forEach(m => {
            if (m._tripYear <= cutoff) {
                if (!map._tronMarkerLayer.hasLayer(m)) map._tronMarkerLayer.addLayer(m);
            } else {
                map._tronMarkerLayer.removeLayer(m);
            }
        });
    });
}

// --- Cruise Streak ---
function renderCruiseStreak(cruises) {
    const container = document.querySelector('.cruise-log');
    if (!container) return;

    const items = Array.isArray(cruises) ? cruises : [];
    if (!items.length) return;

    const sorted = [...items].sort((a, b) => (a.year || 0) - (b.year || 0));

    container.innerHTML = sorted.map((c, i) => {
        const ship = c.ship_name || '';
        const duration = c.duration_days ? `${c.duration_days} days` : '';
        const rating = c.rating || '';
        const countries = c.countries_visited > 0 ? `${c.countries_visited} countries` : '';
        const meta = [ship, duration, countries].filter(Boolean).join(' · ');
        const arrow = i < sorted.length - 1 ? '<div class="cruise-arrow">→</div>' : '';

        return `
            <div class="cruise-step">
                <div class="cruise-step__year">${c.year}</div>
                <div class="cruise-step__body">
                    <div class="cruise-step__dest">${c.destinations}</div>
                    ${meta ? `<div class="cruise-step__meta">${meta}</div>` : ''}
                    ${c.highlight ? `<div class="cruise-step__highlight">${c.highlight}</div>` : ''}
                    ${rating ? `<div class="cruise-step__rating">${rating}</div>` : ''}
                </div>
            </div>
            ${arrow}
        `;
    }).join('');
}

// --- Recovery by Travel ---
function renderRecoveryStories(medical, travel, correlations) {
    const container = document.querySelector('.recovery-stories');
    if (!container) return;

    // Build meaningful recovery stories from correlations
    // Group by medical event, find the post-recovery trips
    const medMap = new Map();
    medical.forEach(m => medMap.set(m.id, m));

    const travelMap = new Map();
    travel.forEach(t => travelMap.set(t.id, t));

    // Group correlations by medical event
    const byMedical = new Map();
    correlations.forEach(c => {
        if (c.correlation_type !== 'post_recovery') return;
        const key = c.medical_id;
        if (!byMedical.has(key)) byMedical.set(key, []);
        byMedical.get(key).push(c);
    });

    // Build curated recovery stories — only major/meaningful ones
    const stories = [
        {
            medicalId: 3,
            title: 'Mental Health Crisis',
            year: 2007,
            crisis: 'Near-anorexia, mental health crisis',
            recovery: 'Detroit (WrestleMania 23), NYC (MSG)',
            insight: 'The first-ever trips. Wrestling became the escape route.'
        },
        {
            medicalId: 10,
            title: 'Spinal Surgery',
            year: 2017,
            crisis: 'L5-S1 herniation, microdiscectomy surgery, 14 staples',
            recovery: 'Alaska cruise, California road trip, Victoria BC, then 5-country Mediterranean cruise (2018)',
            insight: 'Six months from 14 staples to hiking Gros Piton. The engagement ring was purchased on that Mediterranean cruise.'
        },
        {
            medicalId: 11,
            title: 'Kidney Stone',
            year: 2019,
            crisis: 'Strep throat + kidney stone removal',
            recovery: 'Australia & New Zealand — 19 days',
            insight: '"The best, the longest, and the greatest." Highest sentiment score of any trip (0.855).'
        },
        {
            medicalId: 12,
            title: 'Medical Quarantine',
            year: 2020,
            crisis: 'Quarantine, Mar 26–Apr 16',
            recovery: 'Singapore, Thailand, Cambodia, Vietnam, Hong Kong — 17 days',
            insight: 'Gained 3 lbs of muscle during quarantine, then crossed 5 countries.'
        },
        {
            medicalId: 13,
            title: 'Kidney Stones (x2)',
            year: 2024,
            crisis: 'Two hospitalizations in 3 days (Dec 18 & 20)',
            recovery: 'Portugal, Spain, Norway, Iceland, Toronto',
            insight: 'Five countries in one year. The travel didn\'t stop.'
        }
    ];

    container.innerHTML = stories.map(s => `
        <div class="recovery-card">
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

// --- Big Trips ---
function renderBigTrips(travel) {
    const container = document.querySelector('.big-trips-grid');
    if (!container) return;

    // The standout trips — by duration, distance, significance, or sentiment
    const bigTripIds = [26, 29, 24, 33, 31]; // AUS/NZ, Asia, Mediterranean, Midwest, Super Bowl
    const highlights = {
        26: { tagline: 'The Greatest Trip', detail: '19 days. 2 countries. Highest sentiment of any trip. "The best, the longest, and the greatest."' },
        29: { tagline: 'The Asian Expedition', detail: '17 days. 5 countries. Singapore to Hong Kong.' },
        24: { tagline: 'The Mediterranean', detail: '5 countries. 2 weeks. The engagement ring was purchased here.' },
        33: { tagline: 'The Great American Road Trip', detail: '4,000 miles. 16 states. Mount Rushmore, Devils Tower, Gateway Arch, Badlands.' },
        31: { tagline: 'The Super Bowl', detail: '"The most spectacular day I\'ve ever experienced." Phoenix, 2023.' }
    };

    const trips = bigTripIds.map(id => travel.find(t => t.id === id)).filter(Boolean);

    container.innerHTML = trips.map(trip => {
        const h = highlights[trip.id] || {};
        const duration = trip.duration_days ? `${trip.duration_days} days` : '';
        const miles = trip.miles ? `${trip.miles.toLocaleString()} miles` : '';
        const countries = trip.countries ? `${trip.countries} countries` : '';
        const meta = [trip.year, trip.scope, duration, miles, countries].filter(Boolean).join(' · ');

        return `
            <div class="big-trip-card">
                <div class="big-trip-card__tagline">${h.tagline || trip.destination}</div>
                <div class="big-trip-card__dest">${trip.destination}</div>
                <div class="big-trip-card__meta">${meta}</div>
                <div class="big-trip-card__detail">${h.detail || trip.highlight || ''}</div>
            </div>
        `;
    }).join('');
}

// Auto-init
initAtlas()
    .then(() => initWormholes('atlas'))
    .catch(err => {
        console.error('Atlas init error:', err);
        const el = document.getElementById('atlasMap');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
