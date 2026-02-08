// =============================
// CUSTOM CHART.JS PLUGINS FOR TRON TIMELINE DASHBOARD
// =============================

// Plugin 1: Center Text — draws main text + sub-text inside doughnut/polar charts
var centerTextPlugin = {
    id: 'centerText',
    afterDraw: function(chart) {
        var opts = chart.config.options.plugins.centerText;
        if (!opts) return;
        var ctx = chart.ctx;
        var area = chart.chartArea;
        var centerX = area.left + (area.right - area.left) / 2;
        var centerY = area.top + (area.bottom - area.top) / 2;

        // For half-circle gauges (circumference 180), shift center down
        if (chart.config.options.circumference === 180) {
            centerY = area.top + (area.bottom - area.top) * 0.65;
        }

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Main value
        ctx.font = 'bold ' + (opts.fontSize || 28) + "px 'Courier Prime', monospace";
        ctx.fillStyle = opts.color || '#2c2416';
        ctx.fillText(opts.text || '', centerX, centerY - (opts.subText ? 10 : 0));

        // Sub-label
        if (opts.subText) {
            ctx.font = "11px 'Trebuchet MS', Arial, sans-serif";
            ctx.fillStyle = opts.subColor || '#5a4e3c';
            ctx.fillText(opts.subText, centerX, centerY + 14);
        }
        ctx.restore();
    }
};
Chart.register(centerTextPlugin);

// Plugin 2: Bar Value — draws values on/near bar chart elements
var barValuePlugin = {
    id: 'barValue',
    afterDatasetsDraw: function(chart) {
        var opts = chart.config.options.plugins.barValue;
        if (!opts) return;
        var ctx = chart.ctx;
        ctx.save();
        ctx.font = "bold 12px 'Courier Prime', monospace";
        ctx.textBaseline = 'middle';

        chart.data.datasets.forEach(function(dataset, di) {
            var meta = chart.getDatasetMeta(di);
            meta.data.forEach(function(bar, i) {
                var value = dataset.data[i];
                if (chart.config.options.indexAxis === 'y') {
                    // Horizontal bar: draw value to the right of bar end
                    ctx.textAlign = 'left';
                    ctx.fillStyle = opts.color || '#2c2416';
                    var textX = bar.x + 6;
                    // If bar is wide enough, draw inside the bar
                    var barWidth = bar.x - chart.chartArea.left;
                    if (barWidth > 50) {
                        ctx.textAlign = 'right';
                        ctx.fillStyle = opts.insideColor || '#faf7f0';
                        textX = bar.x - 8;
                    }
                    ctx.fillText(value, textX, bar.y);
                } else {
                    // Vertical bar: draw value above bar
                    ctx.textAlign = 'center';
                    ctx.fillStyle = opts.color || '#2c2416';
                    ctx.fillText(value, bar.x, bar.y - 8);
                }
            });
        });
        ctx.restore();
    }
};
Chart.register(barValuePlugin);

// Plugin 3: Milestone Labels — draws descriptive labels near line/scatter points
var milestoneLabelsPlugin = {
    id: 'milestoneLabels',
    afterDatasetsDraw: function(chart) {
        var opts = chart.config.options.plugins.milestoneLabels;
        if (!opts) return;
        var labels = opts.labels || [];
        var ctx = chart.ctx;
        ctx.save();

        var meta = chart.getDatasetMeta(0);
        var points = meta.data;

        // Pre-compute positions to detect overlaps
        points.forEach(function(point, i) {
            if (!labels[i]) return;
            ctx.font = "bold 8px 'Trebuchet MS', Arial, sans-serif";
            ctx.fillStyle = '#5c3d1a';

            // Check distance to next point — skip label if too close
            var tooCloseToNext = (i < points.length - 1) && Math.abs(point.x - points[i + 1].x) < 50;
            var tooCloseToPrev = (i > 0) && Math.abs(point.x - points[i - 1].x) < 50;

            // Alternate above/below, with extra offset for crowded areas
            var above = (i % 2 === 0);
            var offset = above ? -20 : 20;

            // For last point, always go above-right to avoid cutoff
            if (i === points.length - 1) {
                ctx.textAlign = 'right';
                offset = -18;
            } else if (tooCloseToNext && tooCloseToPrev) {
                // Middle of a cluster — use smaller font and tighter positioning
                ctx.font = "bold 7px 'Trebuchet MS', Arial, sans-serif";
                offset = above ? -16 : 16;
                ctx.textAlign = 'center';
            } else {
                ctx.textAlign = 'center';
            }

            var text = labels[i];
            // Truncate very long labels
            if (text.length > 22) {
                text = text.substring(0, 20) + '...';
            }
            ctx.fillText(text, point.x, point.y + offset);
        });
        ctx.restore();
    }
};
Chart.register(milestoneLabelsPlugin);

// Plugin 4: Stepped Fill Labels — draws duration labels on career staircase plateaus
var steppedFillLabelsPlugin = {
    id: 'steppedFillLabels',
    afterDatasetsDraw: function(chart) {
        var opts = chart.config.options.plugins.steppedFillLabels;
        if (!opts) return;
        var durations = opts.durations || [];
        var ctx = chart.ctx;
        var meta = chart.getDatasetMeta(0);
        ctx.save();

        // For stepped charts, find pairs of points that form plateaus
        var points = meta.data;
        var dIdx = 0;
        for (var i = 0; i < points.length - 1; i++) {
            var curr = points[i];
            var next = points[i + 1];
            // A plateau is two consecutive points at the same y
            if (Math.abs(curr.y - next.y) < 2 && durations[dIdx]) {
                var midX = (curr.x + next.x) / 2;
                var labelY = curr.y - 12;
                ctx.font = "bold 10px 'Courier Prime', monospace";
                ctx.fillStyle = 'rgba(74, 103, 65, 0.7)';
                ctx.textAlign = 'center';
                ctx.fillText(durations[dIdx], midX, labelY);
                dIdx++;
            }
        }
        ctx.restore();
    }
};
Chart.register(steppedFillLabelsPlugin);
