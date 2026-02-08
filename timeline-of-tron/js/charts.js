// =============================
// CHART CONFIGURATIONS FOR TRON TIMELINE DASHBOARD
// =============================

// Chart.js global defaults
Chart.defaults.font.family = "Georgia, 'Times New Roman', serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#2c2416';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.tooltip.backgroundColor = '#2c2416';
Chart.defaults.plugins.tooltip.titleFont = { family: "'Courier Prime', monospace", size: 12, weight: 'bold' };
Chart.defaults.plugins.tooltip.bodyFont = { family: "Georgia, serif", size: 12 };
Chart.defaults.plugins.tooltip.cornerRadius = 2;
Chart.defaults.plugins.tooltip.padding = 10;

// ===== HELPER FUNCTIONS =====

function chartTitle(text) {
    return {
        display: true,
        text: text,
        font: CHART_STYLE.titleFont,
        color: CHART_STYLE.titleColor,
        padding: CHART_STYLE.titlePadding
    };
}

function gridScale(extraOptions) {
    var base = { grid: { color: CHART_STYLE.gridColor } };
    return Object.assign(base, extraOptions || {});
}

function hiddenGridScale(extraOptions) {
    var base = { grid: { display: false } };
    return Object.assign(base, extraOptions || {});
}

function createChart(canvasId, config) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.warn('Chart canvas not found: #' + canvasId);
        return null;
    }
    return new Chart(canvas, config);
}

// ===== CHART REGISTRY =====

var TronCharts = {};

// ===== INITIALIZATION =====

function initializeCharts() {

    // =============================
    // 1. SPORTS RECORDS — Three Half-Circle Gauge Meters
    // =============================
    var gaugeColors = [CHART_STYLE.colors.green, CHART_STYLE.colors.purple, CHART_STYLE.colors.red];

    SPORTS_RECORDS.forEach(function(sport, i) {
        var winPercent = sport.winRate;
        var lossPercent = 100 - winPercent;

        TronCharts['sportsGauge' + i] = createChart('sportsGauge' + i, {
            type: 'doughnut',
            data: {
                labels: ['Wins', 'Remaining'],
                datasets: [{
                    data: [winPercent, lossPercent],
                    backgroundColor: [gaugeColors[i], 'rgba(196, 184, 160, 0.18)'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                rotation: -90,
                circumference: 180,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    title: chartTitle(sport.sport),
                    tooltip: {
                        callbacks: {
                            label: function() {
                                return sport.wins + 'W \u2013 ' + sport.losses + 'L (' + sport.winRate + '%)';
                            }
                        }
                    },
                    centerText: {
                        text: sport.winRate + '%',
                        fontSize: 22,
                        color: gaugeColors[i],
                        subText: sport.wins + 'W \u2013 ' + sport.losses + 'L',
                        subColor: '#5a4e3c'
                    }
                }
            }
        });
    });

    // =============================
    // 2. CAREER PROGRESSION — Staircase Plateau Chart
    // =============================
    var careerSteps = computeCareerSteps();
    var careerTitles = CAREER_DATA.map(function(c) { return c.title; });
    var careerDurations = computeCareerDurations();

    // Build point radius array: show dots only at role-start years
    var careerPointRadius = careerSteps.map(function(p) {
        var isRoleStart = CAREER_DATA.some(function(c) { return c.year === p.x && c.level === p.y; });
        return isRoleStart ? 7 : 0;
    });

    var careerPointColors = careerSteps.map(function(p) {
        return p.x === 2025 ? CHART_STYLE.colors.gold : CHART_STYLE.colors.green;
    });

    TronCharts.career = createChart('careerStaircaseChart', {
        type: 'line',
        data: {
            datasets: [{
                label: 'Career Level',
                data: careerSteps,
                borderColor: CHART_STYLE.colors.green,
                backgroundColor: 'rgba(74, 103, 65, 0.12)',
                fill: true,
                stepped: 'before',
                pointRadius: careerPointRadius,
                pointBackgroundColor: careerPointColors,
                pointBorderColor: CHART_STYLE.panelBg,
                pointBorderWidth: 2,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            parsing: false,
            scales: {
                x: {
                    type: 'linear',
                    min: 2009,
                    max: 2027,
                    grid: { display: false },
                    ticks: {
                        stepSize: 2,
                        callback: function(val) { return val; }
                    }
                },
                y: {
                    min: 0,
                    max: 7,
                    grid: { color: CHART_STYLE.gridColor },
                    ticks: {
                        callback: function(val) {
                            if (val === 0 || val > 6) return '';
                            return careerTitles[val - 1] || '';
                        },
                        font: { size: 9 }
                    }
                }
            },
            plugins: {
                title: chartTitle('Career Progression (Plateau = Tenure)'),
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            var level = item.parsed.y;
                            return careerTitles[level - 1] || '';
                        }
                    }
                },
                steppedFillLabels: {
                    durations: careerDurations
                }
            }
        }
    });

    // =============================
    // 4. WWE EVENTS — Milestone Climb with Stars
    // =============================
    var milestoneYears = [2014, 2020, 2021];

    TronCharts.wweEvents = createChart('wweTimelineChart', {
        type: 'line',
        data: {
            labels: WWE_MILESTONES.map(function(w) { return w.year; }),
            datasets: [{
                label: 'Cumulative WWE Events',
                data: WWE_MILESTONES.map(function(w) { return w.events; }),
                borderColor: CHART_STYLE.colors.red,
                backgroundColor: 'rgba(139, 26, 26, 0.06)',
                fill: true,
                tension: 0,
                pointRadius: 10,
                pointHoverRadius: 13,
                pointBackgroundColor: WWE_MILESTONES.map(function(w) {
                    return milestoneYears.indexOf(w.year) >= 0 ? CHART_STYLE.colors.gold : CHART_STYLE.colors.red;
                }),
                pointBorderColor: CHART_STYLE.panelBg,
                pointBorderWidth: 3,
                pointStyle: WWE_MILESTONES.map(function(w) {
                    return milestoneYears.indexOf(w.year) >= 0 ? 'star' : 'circle';
                }),
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('WWE Events: The Climb to 91+'),
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(items) {
                            return WWE_MILESTONES[items[0].dataIndex].year + '';
                        },
                        label: function(item) {
                            return WWE_MILESTONES[item.dataIndex].events + ' cumulative events';
                        },
                        afterLabel: function(item) {
                            return WWE_MILESTONES[item.dataIndex].label;
                        }
                    }
                },
                milestoneLabels: {
                    labels: WWE_MILESTONES.map(function(w) { return w.label; })
                }
            },
            scales: {
                y: gridScale({
                    beginAtZero: true,
                    title: { display: true, text: 'Events', font: { size: 11 } }
                }),
                x: hiddenGridScale()
            }
        }
    });

    // =============================
    // 5. TRAVEL — Bubble Timeline
    // =============================
    var travelBubbles = computeTravelBubbles();
    var intlBubbles = travelBubbles.filter(function(b) { return b.scope === 'International'; });
    var domesticBubbles = travelBubbles.filter(function(b) { return b.scope === 'Domestic'; });

    TronCharts.travel = createChart('travelBubbleChart', {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'International',
                data: intlBubbles,
                backgroundColor: 'rgba(26, 74, 139, 0.35)',
                borderColor: CHART_STYLE.colors.blue,
                borderWidth: 2,
                hoverBackgroundColor: 'rgba(26, 74, 139, 0.55)'
            }, {
                label: 'Domestic',
                data: domesticBubbles,
                backgroundColor: 'rgba(74, 103, 65, 0.35)',
                borderColor: CHART_STYLE.colors.green,
                borderWidth: 2,
                hoverBackgroundColor: 'rgba(74, 103, 65, 0.55)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('Travel Scope: A Decade of Adventures'),
                legend: {
                    display: true,
                    labels: { usePointStyle: true, pointStyle: 'circle' }
                },
                tooltip: {
                    callbacks: {
                        title: function(items) {
                            var raw = items[0].raw;
                            return raw.label + ' (' + raw.x + ')';
                        },
                        label: function(item) {
                            var raw = item.raw;
                            if (raw.scope === 'International' && raw.countries) {
                                return raw.countries + ' countries';
                            }
                            return 'Domestic trip';
                        },
                        afterLabel: function(item) {
                            return item.raw.highlight;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 2008,
                    max: 2028,
                    grid: { display: false },
                    title: { display: true, text: 'Year', font: { size: 11 } },
                    ticks: {
                        stepSize: 2,
                        callback: function(val) { return val; }
                    }
                },
                y: {
                    min: 0,
                    max: 3,
                    grid: { color: CHART_STYLE.gridColor },
                    ticks: {
                        callback: function(val) {
                            if (val === 1) return 'Domestic';
                            if (val === 2) return 'International';
                            return '';
                        },
                        font: { size: 10 }
                    }
                }
            }
        }
    });

    // =============================
    // 6. ECD DODGEBALL — Concentric Doughnut Rings
    // =============================
    var ecdMax = Math.max.apply(null, ECD_DATA.map(function(e) { return e.participants; }));
    var ecdPurples = [
        'rgba(107, 74, 139, 0.25)',
        'rgba(107, 74, 139, 0.40)',
        'rgba(107, 74, 139, 0.55)',
        'rgba(107, 74, 139, 0.70)',
        'rgba(107, 74, 139, 0.90)'
    ];

    TronCharts.ecd = createChart('ecdGrowthChart', {
        type: 'doughnut',
        data: {
            labels: ECD_DATA.map(function(e) {
                return e.anniversary + ' (' + e.year + ')';
            }),
            datasets: ECD_DATA.map(function(e, i) {
                return {
                    data: [e.participants, ecdMax - e.participants],
                    backgroundColor: [ecdPurples[i], 'rgba(196, 184, 160, 0.06)'],
                    borderWidth: 1,
                    borderColor: ['rgba(107, 74, 139, 0.3)', 'transparent'],
                    weight: 1
                };
            }).reverse()
        },
        options: {
            responsive: true,
            cutout: '20%',
            plugins: {
                title: chartTitle('ECD Growth: Ripples From 20 to 57'),
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            var idx = ECD_DATA.length - 1 - item.datasetIndex;
                            if (item.dataIndex === 0 && ECD_DATA[idx]) {
                                return ECD_DATA[idx].anniversary + ' (' + ECD_DATA[idx].year + '): ' + ECD_DATA[idx].participants + ' participants';
                            }
                            return '';
                        }
                    },
                    filter: function(item) {
                        return item.dataIndex === 0;
                    }
                },
                centerText: {
                    text: '57',
                    fontSize: 32,
                    color: CHART_STYLE.colors.purple,
                    subText: '18+ YEARS',
                    subColor: '#5a4e3c'
                }
            }
        }
    });

    // =============================
    // 7. AWARDS — Dynasty Timeline (Stacked Bar)
    // =============================
    var dynastyData = computeAwardsDynastyData();

    TronCharts.awards = createChart('awardsDynastyChart', {
        type: 'bar',
        data: {
            labels: dynastyData.years,
            datasets: [
                {
                    label: 'Janet Jackson',
                    data: dynastyData.janet,
                    backgroundColor: CHART_STYLE.colors.red,
                    borderWidth: 0,
                    borderRadius: CHART_STYLE.borderRadius
                },
                {
                    label: 'Mariah Carey',
                    data: dynastyData.mariah,
                    backgroundColor: CHART_STYLE.colors.gold,
                    borderWidth: 0,
                    borderRadius: CHART_STYLE.borderRadius
                },
                {
                    label: 'Other',
                    data: dynastyData.other,
                    backgroundColor: '#c4b8a0',
                    borderWidth: 0,
                    borderRadius: CHART_STYLE.borderRadius
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('Music Artist of the Year: The Dynasty'),
                legend: {
                    display: true,
                    labels: { usePointStyle: true, pointStyle: 'rect' }
                },
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            if (item.raw === 1) return item.dataset.label;
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: hiddenGridScale({ stacked: true }),
                y: {
                    display: false,
                    stacked: true,
                    max: 1.2
                }
            }
        }
    });

    // =============================
    // 8. TRADITIONS — Polar Area Chart
    // =============================
    TronCharts.traditions = createChart('traditionsPolarChart', {
        type: 'polarArea',
        data: {
            labels: TRADITIONS_DATA.map(function(t) { return t.icon + ' ' + t.tradition; }),
            datasets: [{
                data: TRADITIONS_DATA.map(function(t) { return t.years; }),
                backgroundColor: [
                    'rgba(139, 26, 26, 0.55)',
                    'rgba(107, 74, 139, 0.55)',
                    'rgba(26, 74, 139, 0.55)',
                    'rgba(74, 103, 65, 0.55)',
                    'rgba(201, 168, 76, 0.55)',
                    'rgba(184, 134, 11, 0.55)'
                ],
                borderColor: RETRO_COLORS.slice(0, 6),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('Tradition Longevity'),
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        pointStyle: 'rect',
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            return item.label + ': ' + item.raw + ' years';
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 25,
                    grid: { color: CHART_STYLE.gridColor },
                    ticks: {
                        stepSize: 5,
                        backdropColor: 'transparent',
                        font: { size: 9 }
                    }
                }
            }
        }
    });
}
