// js/seismograph.js — Lobby animated sentiment line (V2: full centerpiece)
// Draws a rich sentiment line with year labels, life chapter shading,
// turning point annotations, and interactive hover tooltips.

import { loadData } from './data-loader.js';
import { checkRoom0Reveal } from './room0.js';

export async function initSeismograph() {
    const canvas = document.getElementById('seismograph');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Load data in parallel
    const [sentimentData, chaptersData, turningData] = await Promise.all([
        loadData('sentiment_timeline.json').catch(() => null),
        loadData('life_chapters.json').catch(() => null),
        loadData('turning_points.json').catch(() => null),
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

    // Sort by year
    const sorted = [...sentimentData].sort((a, b) => a.year - b.year);
    const sentiments = sorted.map(d => d.avg_sentiment);
    const years = sorted.map(d => d.year);
    const counts = sorted.map(d => d.milestone_count || 0);

    // High-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 24, bottom: 36, left: 16, right: 16 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    const minYear = years[0];
    const maxYear = years[years.length - 1];
    const yearSpan = maxYear - minYear || 1;

    // Normalize sentiment (-1 to 1) → canvas Y
    const minS = -1, maxS = 1;
    function yForSentiment(s) {
        return padding.top + plotH - ((s - minS) / (maxS - minS)) * plotH;
    }

    function xForYear(year) {
        return padding.left + ((year - minYear) / yearSpan) * plotW;
    }

    function xForIndex(i) {
        return xForYear(years[i]);
    }

    // Build points
    const points = sentiments.map((s, i) => ({
        x: xForIndex(i),
        y: yForSentiment(s),
        year: years[i],
        sentiment: s,
        count: counts[i]
    }));

    // Life chapter backgrounds
    const chapterColors = [
        'rgba(139, 26, 26, 0.06)',   // red tint
        'rgba(74, 144, 217, 0.05)',  // blue tint
        'rgba(201, 168, 76, 0.06)',  // gold tint
        'rgba(74, 103, 65, 0.06)',   // green tint
        'rgba(107, 74, 139, 0.05)', // purple tint
    ];

    // Turning points for annotation
    const turningPoints = (turningData || []).slice(0, 8); // limit annotations

    // Gradient for the line
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#8b1a1a');
    grad.addColorStop(0.25, '#b84a2a');
    grad.addColorStop(0.45, '#c9a84c');
    grad.addColorStop(0.65, '#8b9a44');
    grad.addColorStop(0.85, '#4a6741');
    grad.addColorStop(1, '#4a90d9');

    const zeroY = yForSentiment(0);

    // Animate
    const duration = 3500;
    let startTime = null;
    let hoveredPoint = null;
    let animComplete = false;

    function drawChapterBackgrounds() {
        if (!chaptersData || !chaptersData.length) return;
        chaptersData.forEach((ch, i) => {
            const x1 = xForYear(ch.start_year);
            const x2 = xForYear(ch.end_year || ch.start_year);
            const cw = Math.max(x2 - x1, 4);
            ctx.fillStyle = chapterColors[i % chapterColors.length];
            ctx.fillRect(x1, padding.top, cw, plotH);
        });
    }

    function drawGrid() {
        // Zero line
        ctx.strokeStyle = 'rgba(160, 148, 120, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(w - padding.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Faint +/- labels
        ctx.fillStyle = 'rgba(107, 91, 71, 0.35)';
        ctx.font = `9px 'Courier Prime', monospace`;
        ctx.textAlign = 'left';
        ctx.fillText('+', padding.left - 12, padding.top + 10);
        ctx.fillText('−', padding.left - 12, padding.top + plotH - 4);

        // Year labels along bottom
        const labelYears = [];
        for (let y = minYear; y <= maxYear; y++) {
            // Show every 2-3 years to avoid crowding
            if ((y - minYear) % 3 === 0 || y === maxYear) {
                labelYears.push(y);
            }
        }
        ctx.fillStyle = 'rgba(107, 91, 71, 0.6)';
        ctx.font = `10px 'Courier Prime', monospace`;
        ctx.textAlign = 'center';
        labelYears.forEach(y => {
            const x = xForYear(y);
            // Tick mark
            ctx.strokeStyle = 'rgba(160, 148, 120, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padding.top + plotH);
            ctx.lineTo(x, padding.top + plotH + 6);
            ctx.stroke();
            // Label
            ctx.fillText(`'${String(y).slice(2)}`, x, padding.top + plotH + 18);
        });
    }

    function drawTurningPointMarkers(progress) {
        if (!turningPoints.length || progress < 0.3) return;
        const markerOpacity = Math.min((progress - 0.3) / 0.4, 1);

        turningPoints.forEach(tp => {
            const x = xForYear(tp.year);
            if (x < padding.left || x > w - padding.right) return;

            // Vertical marker line
            const isRedemptive = tp.type === 'redemptive' || tp.type === 'stable';
            const color = isRedemptive ? `rgba(74, 103, 65, ${0.35 * markerOpacity})` : `rgba(139, 26, 26, ${0.35 * markerOpacity})`;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(x, padding.top + 4);
            ctx.lineTo(x, padding.top + plotH - 4);
            ctx.stroke();
            ctx.setLineDash([]);

            // Small diamond marker at top
            const dy = padding.top + 8;
            ctx.fillStyle = color.replace(/[\d.]+\)$/, `${0.7 * markerOpacity})`);
            ctx.beginPath();
            ctx.moveTo(x, dy - 4);
            ctx.lineTo(x + 3, dy);
            ctx.lineTo(x, dy + 4);
            ctx.lineTo(x - 3, dy);
            ctx.closePath();
            ctx.fill();
        });
    }

    function drawLine(progress) {
        const totalLen = points.length - 1;
        const drawUpTo = progress * totalLen;

        // Fill area under/over zero line
        ctx.beginPath();
        ctx.moveTo(points[0].x, zeroY);
        for (let i = 0; i <= Math.min(Math.ceil(drawUpTo), totalLen); i++) {
            const p = points[i];
            if (i <= Math.floor(drawUpTo)) {
                ctx.lineTo(p.x, p.y);
            } else {
                const frac = drawUpTo - Math.floor(drawUpTo);
                const prev = points[i - 1];
                ctx.lineTo(prev.x + (p.x - prev.x) * frac, prev.y + (p.y - prev.y) * frac);
            }
        }
        // Close back to zero line
        const lastDrawnX = Math.floor(drawUpTo) < totalLen
            ? points[Math.floor(drawUpTo)].x + (points[Math.ceil(drawUpTo)].x - points[Math.floor(drawUpTo)].x) * (drawUpTo - Math.floor(drawUpTo))
            : points[totalLen].x;
        ctx.lineTo(lastDrawnX, zeroY);
        ctx.closePath();

        const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + plotH);
        areaGrad.addColorStop(0, 'rgba(74, 103, 65, 0.08)');
        areaGrad.addColorStop(0.5, 'rgba(201, 168, 76, 0.03)');
        areaGrad.addColorStop(1, 'rgba(139, 26, 26, 0.08)');
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // The line itself
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();

        for (let i = 0; i <= Math.min(Math.ceil(drawUpTo), totalLen); i++) {
            const p = points[i];
            if (i === 0) {
                ctx.moveTo(p.x, p.y);
            } else if (i <= Math.floor(drawUpTo)) {
                ctx.lineTo(p.x, p.y);
            } else {
                const frac = drawUpTo - Math.floor(drawUpTo);
                const prev = points[i - 1];
                ctx.lineTo(prev.x + (p.x - prev.x) * frac, prev.y + (p.y - prev.y) * frac);
            }
        }
        ctx.stroke();

        // Dots at each data point
        for (let i = 0; i <= Math.min(Math.floor(drawUpTo), totalLen); i++) {
            const p = points[i];
            const dotSize = 2.5 + Math.min(p.count / 8, 2.5); // bigger dot = more milestones
            ctx.fillStyle = p.sentiment >= 0 ? '#4a6741' : '#8b1a1a';
            ctx.beginPath();
            ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
            ctx.fill();

            // White inner ring
            ctx.strokeStyle = 'rgba(245, 240, 230, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    function drawHover() {
        if (hoveredPoint === null) return;
        const p = points[hoveredPoint];

        // Vertical guide line
        ctx.strokeStyle = 'rgba(201, 168, 76, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(p.x, padding.top);
        ctx.lineTo(p.x, padding.top + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tooltip background
        const label1 = String(p.year);
        const label2 = `sentiment: ${p.sentiment >= 0 ? '+' : ''}${p.sentiment.toFixed(3)}`;
        const label3 = `${p.count} milestone${p.count !== 1 ? 's' : ''}`;
        const boxW = 140;
        const boxH = 52;
        let boxX = p.x - boxW / 2;
        let boxY = p.y - boxH - 16;

        // Keep tooltip in bounds
        if (boxX < padding.left) boxX = padding.left;
        if (boxX + boxW > w - padding.right) boxX = w - padding.right - boxW;
        if (boxY < padding.top) boxY = p.y + 16;

        ctx.fillStyle = 'rgba(44, 36, 22, 0.92)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 3);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.font = `bold 12px 'Courier Prime', monospace`;
        ctx.fillStyle = '#c9a84c';
        ctx.fillText(label1, boxX + 8, boxY + 16);

        ctx.font = `11px 'Courier Prime', monospace`;
        ctx.fillStyle = p.sentiment >= 0 ? '#a8c89a' : '#d4908a';
        ctx.fillText(label2, boxX + 8, boxY + 30);

        ctx.fillStyle = 'rgba(232, 224, 208, 0.6)';
        ctx.fillText(label3, boxX + 8, boxY + 44);

        // Highlight dot
        ctx.fillStyle = '#c9a84c';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 240, 230, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.stroke();
    }

    function draw(progress) {
        ctx.clearRect(0, 0, w, h);
        drawChapterBackgrounds();
        drawGrid();
        drawTurningPointMarkers(progress);
        drawLine(progress);
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
        points.forEach((p, i) => {
            const dist = Math.abs(p.x - mx);
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        });

        if (closestDist < 25) {
            hoveredPoint = closest;
            canvas.style.cursor = 'crosshair';
        } else {
            hoveredPoint = null;
            canvas.style.cursor = 'default';
        }
        draw(1);
    });

    canvas.addEventListener('mouseleave', () => {
        hoveredPoint = null;
        if (animComplete) draw(1);
    });

    checkRoom0Reveal();
}

// Auto-init
initSeismograph().catch(() => {});
