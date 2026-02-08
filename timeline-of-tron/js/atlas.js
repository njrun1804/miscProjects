// js/atlas.js — Room 5: The Atlas (Travel Map)
// Leaflet map with travel pins, timeline scrubber, recovery trips toggle

import { loadMultiple } from './data-loader.js';
import { initWormholes } from './wormholes.js';

export async function initAtlas() {
    const data = await loadMultiple([
        'travel.json',
        'location_frequency.json',
        'medical_events.json'
    ]);

    const travel = data.travel || [];
    const frequency = data.location_frequency || [];
    const medical = data.medical_events || [];

    renderStats(travel);
    const map = renderMap(travel, medical);
    if (map) initScrubber(map, travel);
    renderFrequency(frequency);
}

function renderStats(travel) {
    const bar = document.querySelector('.atlas-stats-bar');
    if (!bar) return;

    const totalTrips = travel.length;
    const countries = new Set();
    travel.forEach(t => {
        if (t.scope === 'International' && t.countries) {
            countries.add(t.destination);
        }
    });
    const intlTrips = travel.filter(t => t.scope === 'International').length;
    const avgSentiment = travel.reduce((s, t) => s + (t.vader_compound || 0), 0) / (totalTrips || 1);

    bar.innerHTML = `
        <div class="atlas-stat">
            <div class="atlas-stat__value">${totalTrips}</div>
            <div class="atlas-stat__label">Total Trips</div>
        </div>
        <div class="atlas-stat">
            <div class="atlas-stat__value">${intlTrips}</div>
            <div class="atlas-stat__label">International</div>
        </div>
        <div class="atlas-stat">
            <div class="atlas-stat__value">${avgSentiment >= 0 ? '+' : ''}${avgSentiment.toFixed(2)}</div>
            <div class="atlas-stat__label">Avg Sentiment</div>
        </div>
    `;
}

function renderMap(travel, medical) {
    const mapEl = document.getElementById('atlasMap');
    if (!mapEl || typeof L === 'undefined') return null;

    const map = L.map('atlasMap', { scrollWheelZoom: false }).setView([30, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18
    }).addTo(map);

    // Medical years for recovery trip detection
    const medicalYears = new Set(medical.map(m => m.year));

    // Store markers and layer group
    const markers = [];
    const markerLayer = L.layerGroup().addTo(map);

    travel.forEach(trip => {
        if (!trip.latitude || !trip.longitude) return;

        const sentiment = trip.vader_compound || 0;
        const color = sentiment > 0.1 ? '#4a6741' : sentiment < -0.1 ? '#8b1a1a' : '#c9a84c';
        const radius = trip.scope === 'International' ? 8 : 6;
        const isRecovery = trip.year && (medicalYears.has(trip.year) || medicalYears.has(trip.year - 1));

        const marker = L.circleMarker([trip.latitude, trip.longitude], {
            radius: radius,
            fillColor: color,
            color: '#fff',
            weight: 1.5,
            fillOpacity: 0.8
        });

        const sentClass = sentiment > 0.1 ? 'positive' : sentiment < -0.1 ? 'negative' : 'neutral';
        marker.bindPopup(`
            <div class="atlas-popup">
                <div class="atlas-popup__dest">${trip.destination}</div>
                <div class="atlas-popup__year">${trip.year}${trip.scope ? ' · ' + trip.scope : ''}${trip.duration_days ? ' · ' + trip.duration_days + ' days' : ''}</div>
                ${trip.highlight ? `<div class="atlas-popup__highlight">${trip.highlight}</div>` : ''}
                <span class="atlas-popup__sentiment atlas-popup__sentiment--${sentClass}">
                    Sentiment: ${sentiment >= 0 ? '+' : ''}${sentiment.toFixed(3)}
                </span>
                ${isRecovery ? '<div style="margin-top:6px; font-size:11px; color:#2e7d32; font-style:italic;">Recovery trip</div>' : ''}
            </div>
        `);

        marker._tripYear = trip.year;
        marker._isRecovery = isRecovery;
        markers.push(marker);
        markerLayer.addLayer(marker);
    });

    // Store on map for scrubber access
    map._tronMarkers = markers;
    map._tronMarkerLayer = markerLayer;

    // Recovery toggle
    const toggleBtn = document.getElementById('recoveryToggle');
    if (toggleBtn) {
        let recoveryMode = false;
        toggleBtn.addEventListener('click', () => {
            recoveryMode = !recoveryMode;
            toggleBtn.classList.toggle('active', recoveryMode);
            markers.forEach(m => {
                if (recoveryMode && !m._isRecovery) {
                    m.setStyle({ fillOpacity: 0.15, opacity: 0.3 });
                } else {
                    m.setStyle({ fillOpacity: 0.8, opacity: 1 });
                }
            });
        });
    }

    return map;
}

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

function renderFrequency(frequency) {
    const grid = document.querySelector('.atlas-frequency-grid');
    if (!grid) return;

    const repeats = frequency.filter(f => f.visit_count > 1);
    const sorted = [...repeats].sort((a, b) => b.visit_count - a.visit_count);

    grid.innerHTML = sorted.map(f => `
        <div class="freq-card">
            <div class="freq-card__dest">${f.destination}</div>
            <div class="freq-card__count">${f.visit_count} visit${f.visit_count > 1 ? 's' : ''} · avg sentiment ${(f.avg_sentiment || 0).toFixed(2)}</div>
            <div class="freq-card__years">${(f.years || []).join(', ')}</div>
        </div>
    `).join('');
}

// Auto-init
initAtlas()
    .then(() => initWormholes('atlas'))
    .catch(() => {
        const el = document.getElementById('atlasMap');
        if (el) el.innerHTML = '<p class="load-error">Data unavailable. Try refreshing.</p>';
    });
