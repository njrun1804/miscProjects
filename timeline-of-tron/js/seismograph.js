// js/seismograph.js — Lobby animated sentiment line
// Draws a smooth sentiment line across the canvas, animating left-to-right

import { loadData } from './data-loader.js';

export async function initSeismograph() {
    const canvas = document.getElementById('seismograph');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const data = await loadData('sentiment_timeline.json');
    if (!data || !data.length) return;

    // Sort by year
    const sorted = [...data].sort((a, b) => a.year - b.year);
    const sentiments = sorted.map(d => d.avg_sentiment);
    const years = sorted.map(d => d.year);

    // High-DPI canvas
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 15, bottom: 15, left: 10, right: 10 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Normalize sentiment (-1 to 1) → canvas Y
    const minS = -1, maxS = 1;
    function yForSentiment(s) {
        return padding.top + plotH - ((s - minS) / (maxS - minS)) * plotH;
    }

    function xForIndex(i) {
        return padding.left + (i / (sentiments.length - 1)) * plotW;
    }

    // Build points
    const points = sentiments.map((s, i) => ({ x: xForIndex(i), y: yForSentiment(s), year: years[i], sentiment: s }));

    // Gradient for the line
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#8b1a1a');
    grad.addColorStop(0.4, '#c9a84c');
    grad.addColorStop(0.7, '#d4a24e');
    grad.addColorStop(1, '#4a6741');

    // Zero line
    const zeroY = yForSentiment(0);

    // Animate drawing
    const duration = 3000;
    let startTime = null;
    let hoveredPoint = null;

    function draw(progress) {
        ctx.clearRect(0, 0, w, h);

        // Faint zero line
        ctx.strokeStyle = 'rgba(160, 148, 120, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(w - padding.right, zeroY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw sentiment line up to progress
        const totalLen = points.length - 1;
        const drawUpTo = progress * totalLen;

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
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
                // Partial segment
                const frac = drawUpTo - Math.floor(drawUpTo);
                const prev = points[i - 1];
                const partX = prev.x + (p.x - prev.x) * frac;
                const partY = prev.y + (p.y - prev.y) * frac;
                ctx.lineTo(partX, partY);
            }
        }
        ctx.stroke();

        // Draw dots at each data point (if revealed)
        for (let i = 0; i <= Math.min(Math.floor(drawUpTo), totalLen); i++) {
            const p = points[i];
            ctx.fillStyle = p.sentiment >= 0 ? '#4a6741' : '#8b1a1a';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Hover labels (after animation completes)
        if (progress >= 1 && hoveredPoint !== null) {
            const p = points[hoveredPoint];
            ctx.fillStyle = 'rgba(44, 36, 22, 0.85)';
            ctx.font = `11px 'Courier Prime', monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(p.year, p.x, p.y - 12);
            ctx.fillText(p.sentiment.toFixed(3), p.x, p.y - 24);

            // Highlight dot
            ctx.fillStyle = '#c9a84c';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function animate(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        draw(progress);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);

    // Hover interaction (after animation)
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;

        let closest = null;
        let closestDist = Infinity;
        points.forEach((p, i) => {
            const dist = Math.abs(p.x - mx);
            if (dist < closestDist) {
                closestDist = dist;
                closest = i;
            }
        });

        if (closestDist < 20) {
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
        draw(1);
    });
}

// Auto-init when module loads
initSeismograph();
