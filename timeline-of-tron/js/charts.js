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
    // Sports Records: Stacked Bar
    TronCharts.sports = createChart('sportsChart', {
        type: 'bar',
        data: {
            labels: SPORTS_RECORDS.map(s => s.sport),
            datasets: [
                {
                    label: 'Wins',
                    data: SPORTS_RECORDS.map(s => s.wins),
                    backgroundColor: CHART_STYLE.colors.green,
                    borderWidth: 0,
                    borderRadius: CHART_STYLE.borderRadius
                },
                {
                    label: 'Losses',
                    data: SPORTS_RECORDS.map(s => s.losses),
                    backgroundColor: CHART_STYLE.colors.red,
                    borderWidth: 0,
                    borderRadius: CHART_STYLE.borderRadius
                }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                title: chartTitle('Competitive Records (W\u2013L)'),
                tooltip: {
                    callbacks: {
                        afterBody: function(items) {
                            var idx = items[0].dataIndex;
                            return 'Win Rate: ' + SPORTS_RECORDS[idx].winRate + '%';
                        }
                    }
                }
            },
            scales: {
                x: gridScale({ stacked: true }),
                y: hiddenGridScale({ stacked: true })
            }
        }
    });

    // Epic Numbers: Bar
    TronCharts.epicNumbers = createChart('epicNumbersChart', {
        type: 'bar',
        data: {
            labels: EPIC_NUMBERS.map(e => e.label),
            datasets: [{
                label: 'Count / Amount',
                data: EPIC_NUMBERS.map(e => e.value),
                backgroundColor: EPIC_NUMBERS_COLORS,
                borderWidth: 0,
                borderRadius: CHART_STYLE.borderRadius
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('Epic Single-Event Records'),
                legend: { display: false }
            },
            scales: {
                y: gridScale({ beginAtZero: true }),
                x: hiddenGridScale({ ticks: { maxRotation: 45, font: { size: 10 } } })
            }
        }
    });

    // Career: Line Chart
    var careerLabels = CAREER_DATA.map(c => c.title);

    TronCharts.career = createChart('careerChart', {
        type: 'line',
        data: {
            labels: CAREER_DATA.map(c => c.year),
            datasets: [{
                label: 'Career Level',
                data: CAREER_DATA.map(c => c.level),
                borderColor: CHART_STYLE.colors.green,
                backgroundColor: 'rgba(74, 103, 65, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 6,
                pointBackgroundColor: CAREER_DATA.map(c => c.year === 2025 ? CHART_STYLE.colors.gold : CHART_STYLE.colors.green),
                pointBorderColor: CHART_STYLE.panelBg,
                pointBorderWidth: 2,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('Career Progression'),
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            return CAREER_DATA[item.dataIndex].title;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0, max: CAREER_DATA.length + 1,
                    grid: { color: CHART_STYLE.gridColor },
                    ticks: {
                        callback: function(val) {
                            if (val === 0 || val > CAREER_DATA.length) return '';
                            return careerLabels[val - 1] || '';
                        },
                        font: { size: 10 }
                    }
                },
                x: hiddenGridScale()
            }
        }
    });

    // WWE Events: Line Chart with milestones
    TronCharts.wweEvents = createChart('wweEventsChart', {
        type: 'line',
        data: {
            labels: WWE_MILESTONES.map(w => w.year),
            datasets: [{
                label: 'Cumulative WWE Events',
                data: WWE_MILESTONES.map(w => w.events),
                borderColor: CHART_STYLE.colors.red,
                backgroundColor: 'rgba(139, 26, 26, 0.08)',
                fill: true,
                tension: 0.3,
                pointRadius: 7,
                pointBackgroundColor: CHART_STYLE.colors.red,
                pointBorderColor: CHART_STYLE.panelBg,
                pointBorderWidth: 2,
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
                        afterLabel: function(item) {
                            return WWE_MILESTONES[item.dataIndex].label;
                        }
                    }
                }
            },
            scales: {
                y: gridScale({ beginAtZero: true, title: { display: true, text: 'Events', font: { size: 11 } } }),
                x: hiddenGridScale()
            }
        }
    });

    // Travel: Scope over time
    var DOMESTIC_BAR_HEIGHT = 0.5;

    TronCharts.travel = createChart('travelChart', {
        type: 'bar',
        data: {
            labels: TRAVEL_DATA.map(t => t.year),
            datasets: [{
                label: 'Countries Visited',
                data: TRAVEL_DATA.map(t => t.countries !== null ? t.countries : DOMESTIC_BAR_HEIGHT),
                backgroundColor: TRAVEL_DATA.map(t => t.scope === 'International' ? CHART_STYLE.colors.blue : CHART_STYLE.colors.green),
                borderWidth: 0,
                borderRadius: CHART_STYLE.borderRadius
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('Travel Scope by Year (Countries per Trip)'),
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(items) {
                            return TRAVEL_DATA[items[0].dataIndex].destination;
                        },
                        label: function(item) {
                            var d = TRAVEL_DATA[item.dataIndex];
                            return d.scope === 'International' ? d.countries + ' countries' : 'Domestic';
                        },
                        afterLabel: function(item) {
                            return TRAVEL_DATA[item.dataIndex].highlight;
                        }
                    }
                }
            },
            scales: {
                y: gridScale({ beginAtZero: true, title: { display: true, text: 'Countries', font: { size: 11 } } }),
                x: hiddenGridScale()
            }
        }
    });

    // ECD: Bar + Line combo
    TronCharts.ecd = createChart('ecdChart', {
        type: 'bar',
        data: {
            labels: ECD_DATA.map(e => e.anniversary),
            datasets: [{
                label: 'Participants',
                data: ECD_DATA.map(e => e.participants),
                backgroundColor: CHART_STYLE.colors.purple,
                borderWidth: 0,
                borderRadius: CHART_STYLE.borderRadius,
                yAxisID: 'y'
            }, {
                label: 'Year',
                data: ECD_DATA.map(e => e.year),
                type: 'line',
                borderColor: CHART_STYLE.colors.gold,
                backgroundColor: 'transparent',
                pointBackgroundColor: CHART_STYLE.colors.gold,
                pointRadius: 5,
                borderWidth: 2,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('East Coast Dodgeball Growth')
            },
            scales: {
                y: gridScale({ position: 'left', title: { display: true, text: 'Participants', font: { size: 11 } }, beginAtZero: true }),
                y1: hiddenGridScale({ position: 'right', title: { display: true, text: 'Year', font: { size: 11 } }, min: 2008, max: 2026 }),
                x: hiddenGridScale()
            }
        }
    });

    // Awards: Doughnut
    var awards = computeAwardsSummary();

    TronCharts.awards = createChart('awardsChart', {
        type: 'doughnut',
        data: {
            labels: awards.labels,
            datasets: [{
                data: awards.data,
                backgroundColor: [CHART_STYLE.colors.red, CHART_STYLE.colors.gold, '#c4b8a0'],
                borderColor: CHART_STYLE.panelBg,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: chartTitle('Music Artist of the Year Wins'),
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            return item.label + ': ' + item.raw + ' wins';
                        }
                    }
                }
            },
            cutout: '55%'
        }
    });

    // Traditions: Horizontal Bar
    TronCharts.traditions = createChart('traditionsChart', {
        type: 'bar',
        data: {
            labels: TRADITIONS_DATA.map(t => t.icon + ' ' + t.tradition),
            datasets: [{
                label: 'Years Running',
                data: TRADITIONS_DATA.map(t => t.years),
                backgroundColor: RETRO_COLORS.slice(0, TRADITIONS_DATA.length),
                borderWidth: 0,
                borderRadius: CHART_STYLE.borderRadius
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                title: chartTitle('Tradition Longevity (Years)'),
                legend: { display: false }
            },
            scales: {
                x: gridScale({ beginAtZero: true, max: 25, title: { display: true, text: 'Years', font: { size: 11 } } }),
                y: hiddenGridScale()
            }
        }
    });
}
