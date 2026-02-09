// js/seismograph.js — Lobby animated life intensity bar chart
// Draws intensity bars colored by dominant life domain, with life chapter
// backgrounds, turning point markers, and rich hover tooltips showing year themes.

import { loadData } from './data-loader.js';
import { checkRoom0Reveal } from './room0.js';

// Domain → color mapping
const DOMAIN_COLORS = {
    health:   { bar: '#a83232', glow: 'rgba(168, 50, 50, 0.35)' },
    travel:   { bar: '#2a7ab5', glow: 'rgba(42, 122, 181, 0.35)' },
    ecd:      { bar: '#c47a1a', glow: 'rgba(196, 122, 26, 0.35)' },
    career:   { bar: '#4a7a3a', glow: 'rgba(74, 122, 58, 0.35)' },
    creative: { bar: '#7a4a8a', glow: 'rgba(122, 74, 138, 0.35)' },
    social:   { bar: '#2a8a8a', glow: 'rgba(42, 138, 138, 0.35)' },
};
const DEFAULT_COLOR = { bar: '#8b7a5e', glow: 'rgba(139, 122, 94, 0.3)' };

export async function initSeismograph() {
    const canvas = document.getElementById('seismograph');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Load all data in parallel
    const [sentimentData, chaptersData, turningData, summariesData, breakdownData] = await Promise.all([
        loadData('sentiment_timeline.json').catch(() => null),
        loadData('life_chapters.json').catch(() => null),
        loadData('turning_points.json').catch(() => null),
        loadData('year_summaries.json').catch(() => null),
        loadData('year_intensity_breakdown.json').catch(() => null),
    ]);

    if (!sentimentData || !sentimentData.length) return;

    // Wait for canvas to have dimensions
    let rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
        await new Promise(resolve => {
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.contentRect.width > 10) {
                        observer.disconnect();
                        resolve();
                    }
                }
            });
            observer.observe(canvas);
            setTimeout(() => { observer.disconnect(); resolve(); }, 2000);
        });
        rect = canvas.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) return;
    }

    // Sort by year and build lookup maps
    const sorted = [...sentimentData].sort((a, b) => a.year - b.year);
    const summaryMap = {};
    (summariesData || []).forEach(s => { summaryMap[s.year] = s; });
    const breakdownMap = {};
    (breakdownData || []).forEach(b => { breakdownMap[b.year] = b; });

    // High-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 28, bottom: 36, left: 20, right: 20 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const years = sorted.map(d => d.year);
    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const yearCount = years.length;

    // Max intensity for normalization
    const maxIntensity = Math.max(...sorted.map(d => d.intensity_score || 0), 1);

    // Bar geometry
    const barGap = Math.max(2, plotW * 0.015);
    const totalGaps = (yearCount - 1) * barGap;
    const barWidth = Math.max(8, (plotW - totalGaps) / yearCount);

    // Build bar data
    const bars = sorted.map((d, i) => {
        const x = padding.left + i * (barWidth + barGap);
        const intensity = d.intensity_score || 0;
        const barH = (intensity / maxIntensity) * plotH * 0.92; // 92% max to leave room for markers
        const y = padding.top + plotH - barH;
        const breakdown = breakdownMap[d.year] || {};
        const summary = summaryMap[d.year] || {};
        const domain = breakdown.dominant_domain || 'social';
        const colors = DOMAIN_COLORS[domain] || DEFAULT_COLOR;

        return {
            x, y, barH, barWidth,
            year: d.year,
            intensity,
            milestones: d.milestone_count || 0,
            domain,
            secondaryDomain: breakdown.secondary_domain || null,
            theme: summary.year_theme || '',
            colors,
            isPeak: intensity >= maxIntensity * 0.85,
        };
    });

    // Life chapter backgrounds
    const chapterColors = [
        'rgba(139, 26, 26, 0.05)',
        'rgba(74, 144, 217, 0.04)',
        'rgba(201, 168, 76, 0.05)',
        'rgba(74, 103, 65, 0.05)',
        'rgba(107, 74, 139, 0.04)',
        'rgba(42, 138, 138, 0.04)',
        'rgba(196, 122, 26, 0.04)',
    ];

    // Turning points
    const turningPoints = turningData || [];

    // Baseline Y
    const baselineY = padding.top + plotH;

    // Animation state
    const duration = 2800;
    let startTime = null;
    let hoveredBar = null;
    let animComplete = false;

    function barCenterX(bar) {
        return bar.x + bar.barWidth / 2;
    }

    function drawChapterBackgrounds() {
        if (!chaptersData || !chaptersData.length) return;
        chaptersData.forEach((ch, i) => {
            // Find first and last bar in this chapter
            const first = bars.find(b => b.year >= ch.start_year);
            const last = [...bars].reverse().find(b => b.year <= (ch.end_year || ch.start_year));
            if (!first || !last) return;

            const x1 = first.x - 2;
            const x2 = last.x + last.barWidth + 2;
            ctx.fillStyle = chapterColors[i % chapterColors.length];
            ctx.fillRect(x1, padding.top, x2 - x1, plotH);
        });
    }

    function drawGrid() {
        // Faint horizontal guides at 25%, 50%, 75%
        [0.25, 0.5, 0.75].forEach(frac => {
            const y = padding.top + plotH - plotH * 0.92 * frac;
            ctx.strokeStyle = 'rgba(160, 148, 120, 0.15)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // Baseline
        ctx.strokeStyle = 'rgba(160, 148, 120, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, baselineY);
        ctx.lineTo(w - padding.right, baselineY);
        ctx.stroke();

        // Year labels
        ctx.fillStyle = 'rgba(107, 91, 71, 0.6)';
        ctx.font = `10px 'Courier Prime', monospace`;
        ctx.textAlign = 'center';
        bars.forEach((bar, i) => {
            // Show every 3rd year + first + last to avoid crowding
            if (i % 3 === 0 || i === bars.length - 1) {
                const cx = barCenterX(bar);
                // Tick
                ctx.strokeStyle = 'rgba(160, 148, 120, 0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx, baselineY);
                ctx.lineTo(cx, baselineY + 6);
                ctx.stroke();
                // Label
                ctx.fillStyle = 'rgba(107, 91, 71, 0.6)';
                ctx.fillText(`'${String(bar.year).slice(2)}`, cx, baselineY + 18);
            }
        });
    }

    function drawTurningPointMarkers(progress) {
        if (!turningPoints.length || progress < 0.2) return;
        const markerOpacity = Math.min((progress - 0.2) / 0.3, 1);

        turningPoints.forEach(tp => {
            const bar = bars.find(b => b.year === tp.year);
            if (!bar) return;
            const cx = barCenterX(bar);

            const isRedemptive = tp.type === 'redemptive' || tp.type === 'stable';
            const color = isRedemptive
                ? `rgba(74, 103, 65, ${0.6 * markerOpacity})`
                : `rgba(168, 50, 50, ${0.6 * markerOpacity})`;

            // Diamond marker above the bar
            const dy = Math.min(bar.y - 8, padding.top + 10);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(cx, dy - 5);
            ctx.lineTo(cx + 4, dy);
            ctx.lineTo(cx, dy + 5);
            ctx.lineTo(cx - 4, dy);
            ctx.closePath();
            ctx.fill();
        });
    }

    function drawBars(progress) {
        const barsToShow = Math.ceil(progress * bars.length);
        const easeOut = t => 1 - Math.pow(1 - t, 3);

        for (let i = 0; i < barsToShow; i++) {
            const bar = bars[i];
            // Per-bar staggered animation
            const barStart = i / bars.length;
            const barEnd = (i + 1) / bars.length;
            const barProgress = Math.min(Math.max((progress - barStart) / (barEnd - barStart + 0.3), 0), 1);
            const easedProgress = easeOut(barProgress);
            const currentH = bar.barH * easedProgress;
            const currentY = baselineY - currentH;

            if (currentH < 0.5) continue;

            // Bar gradient (bottom to top: darker to lighter)
            const grad = ctx.createLinearGradient(0, baselineY, 0, currentY);
            const baseColor = bar.colors.bar;
            grad.addColorStop(0, adjustAlpha(baseColor, 0.6));
            grad.addColorStop(0.4, adjustAlpha(baseColor, 0.8));
            grad.addColorStop(1, baseColor);
            ctx.fillStyle = grad;

            // Rounded top corners
            const r = Math.min(3, bar.barWidth / 4);
            ctx.beginPath();
            ctx.moveTo(bar.x, baselineY);
            ctx.lineTo(bar.x, currentY + r);
            ctx.quadraticCurveTo(bar.x, currentY, bar.x + r, currentY);
            ctx.lineTo(bar.x + bar.barWidth - r, currentY);
            ctx.quadraticCurveTo(bar.x + bar.barWidth, currentY, bar.x + bar.barWidth, currentY + r);
            ctx.lineTo(bar.x + bar.barWidth, baselineY);
            ctx.closePath();
            ctx.fill();

            // Peak glow
            if (bar.isPeak && easedProgress > 0.8) {
                const glowOpacity = (easedProgress - 0.8) / 0.2;
                ctx.shadowColor = bar.colors.glow;
                ctx.shadowBlur = 12 * glowOpacity;
                ctx.fillStyle = 'rgba(0,0,0,0)';
                ctx.fill();
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }

            // Subtle inner highlight (left edge)
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * easedProgress})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bar.x + 1, currentY + r + 2);
            ctx.lineTo(bar.x + 1, baselineY - 1);
            ctx.stroke();
        }
    }

    function drawHover() {
        if (hoveredBar === null) return;
        const bar = bars[hoveredBar];
        const cx = barCenterX(bar);

        // Highlight the bar with brighter version
        const highlightGrad = ctx.createLinearGradient(0, baselineY, 0, bar.y);
        highlightGrad.addColorStop(0, adjustAlpha(bar.colors.bar, 0.8));
        highlightGrad.addColorStop(1, lighten(bar.colors.bar));
        ctx.fillStyle = highlightGrad;

        const r = Math.min(3, bar.barWidth / 4);
        ctx.beginPath();
        ctx.moveTo(bar.x, baselineY);
        ctx.lineTo(bar.x, bar.y + r);
        ctx.quadraticCurveTo(bar.x, bar.y, bar.x + r, bar.y);
        ctx.lineTo(bar.x + bar.barWidth - r, bar.y);
        ctx.quadraticCurveTo(bar.x + bar.barWidth, bar.y, bar.x + bar.barWidth, bar.y + r);
        ctx.lineTo(bar.x + bar.barWidth, baselineY);
        ctx.closePath();
        ctx.fill();

        // Glow on hover
        ctx.shadowColor = bar.colors.glow;
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Build tooltip content
        const yearStr = String(bar.year);
        const themeParts = (bar.theme || '').split(' — ');
        const themeLine1 = themeParts[0] || '';
        const themeLine2 = themeParts.slice(1).join(' — ') || '';
        const intensityLabel = bar.isPeak ? `${bar.intensity.toFixed(1)} (peak)` : bar.intensity.toFixed(1);
        const domainLabel = bar.domain;
        const milestoneLabel = `${bar.milestones} milestone${bar.milestones !== 1 ? 's' : ''}`;

        // Measure text for tooltip width
        ctx.font = `bold 12px 'Courier Prime', monospace`;
        const yearTextW = ctx.measureText(yearStr).width;
        ctx.font = `11px 'Courier Prime', monospace`;
        const theme1W = ctx.measureText(themeLine1).width;
        const theme2W = themeLine2 ? ctx.measureText(themeLine2).width : 0;
        const intensityW = ctx.measureText(`intensity: ${intensityLabel}`).width;
        const milestoneW = ctx.measureText(`${milestoneLabel} \u00b7 ${domainLabel}`).width;

        const boxW = Math.min(Math.max(yearTextW, theme1W, theme2W, intensityW, milestoneW) + 24, w * 0.45);
        const lineCount = themeLine2 ? 5 : 4;
        const boxH = 16 + lineCount * 14 + 8;
        let boxX = cx - boxW / 2;
        let boxY = bar.y - boxH - 12;

        // Keep tooltip in bounds
        if (boxX < padding.left) boxX = padding.left;
        if (boxX + boxW > w - padding.right) boxX = w - padding.right - boxW;
        if (boxY < 4) {
            // Try below bar first, but clamp to canvas
            boxY = baselineY - bar.barH + 8;
            if (boxY + boxH > h - 4) boxY = h - boxH - 4;
            if (boxY < 4) boxY = 4;
        }

        // Tooltip background
        ctx.fillStyle = 'rgba(44, 36, 22, 0.94)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 4);
        ctx.fill();

        // Thin accent line at top of tooltip
        ctx.fillStyle = bar.colors.bar;
        ctx.fillRect(boxX, boxY, boxW, 2);

        // Tooltip text
        let ty = boxY + 18;
        ctx.textAlign = 'left';
        const tx = boxX + 10;

        // Year
        ctx.font = `bold 12px 'Courier Prime', monospace`;
        ctx.fillStyle = '#c9a84c';
        ctx.fillText(yearStr, tx, ty);
        ty += 15;

        // Theme line 1
        ctx.font = `11px 'Courier Prime', monospace`;
        ctx.fillStyle = 'rgba(232, 224, 208, 0.95)';
        ctx.fillText(truncate(themeLine1, boxW - 20), tx, ty);
        ty += 13;

        // Theme line 2 (if present)
        if (themeLine2) {
            ctx.fillStyle = 'rgba(232, 224, 208, 0.7)';
            ctx.fillText(truncate(themeLine2, boxW - 20), tx, ty);
            ty += 14;
        }

        // Intensity
        ctx.fillStyle = bar.isPeak ? '#c9a84c' : 'rgba(200, 192, 172, 0.75)';
        ctx.fillText(`intensity: ${intensityLabel}`, tx, ty);
        ty += 13;

        // Milestones + domain
        ctx.fillStyle = 'rgba(200, 192, 172, 0.55)';
        ctx.fillText(`${milestoneLabel} \u00b7 ${domainLabel}`, tx, ty);
    }

    function draw(progress) {
        ctx.clearRect(0, 0, w, h);
        drawChapterBackgrounds();
        drawGrid();
        drawBars(progress);
        drawTurningPointMarkers(progress);
        if (animComplete) drawHover();
    }

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        draw(progress);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            animComplete = true;
            draw(1); // final render with all bars at full height
        }
    }

    requestAnimationFrame(animate);

    // Hover interaction
    canvas.addEventListener('mousemove', (e) => {
        if (!animComplete) return;
        const r = canvas.getBoundingClientRect();
        const mx = e.clientX - r.left;

        let closest = null;
        let closestDist = Infinity;
        bars.forEach((bar, i) => {
            const cx = barCenterX(bar);
            const dist = Math.abs(cx - mx);
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        });

        if (closestDist < barWidth + barGap) {
            hoveredBar = closest;
            canvas.style.cursor = 'pointer';
        } else {
            hoveredBar = null;
            canvas.style.cursor = 'default';
        }
        draw(1);
    });

    canvas.addEventListener('mouseleave', () => {
        hoveredBar = null;
        if (animComplete) draw(1);
    });

    checkRoom0Reveal();
}

// Helpers
function adjustAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lighten(hex) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 40);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 40);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 40);
    return `rgb(${r}, ${g}, ${b})`;
}

function truncate(text, maxW) {
    // Simple character-based truncation (canvas measureText not available here without ctx)
    if (text.length > 45) return text.slice(0, 42) + '...';
    return text;
}

// Auto-init
initSeismograph().catch(() => {});
