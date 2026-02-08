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

// Initialize all charts
function initializeCharts() {
    // Sports Records: Stacked Bar
    new Chart(document.getElementById('sportsChart'), {
        type: 'bar',
        data: {
            labels: SPORTS_RECORDS.map(s => s.sport),
            datasets: [
                {
                    label: 'Wins',
                    data: SPORTS_RECORDS.map(s => s.wins),
                    backgroundColor: '#4a6741',
                    borderWidth: 0,
                    borderRadius: 2
                },
                {
                    label: 'Losses',
                    data: SPORTS_RECORDS.map(s => s.losses),
                    backgroundColor: '#8b1a1a',
                    borderWidth: 0,
                    borderRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                title: { display: true, text: 'Competitive Records (W–L)', font: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' }, color: '#5c3d1a', padding: { bottom: 12 } },
                tooltip: {
                    callbacks: {
                        afterBody: function(items) {
                            const idx = items[0].dataIndex;
                            return `Win Rate: ${SPORTS_RECORDS[idx].winRate}%`;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true, grid: { color: 'rgba(196,184,160,0.3)' } },
                y: { stacked: true, grid: { display: false } }
            }
        }
    });

    // Epic Numbers: Bar
    new Chart(document.getElementById('epicNumbersChart'), {
        type: 'bar',
        data: {
            labels: EPIC_NUMBERS.map(e => e.label),
            datasets: [{
                label: 'Count / Amount',
                data: EPIC_NUMBERS.map(e => e.value),
                backgroundColor: EPIC_NUMBERS.map(e => e.color),
                borderWidth: 0,
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Epic Single-Event Records', font: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' }, color: '#5c3d1a', padding: { bottom: 12 } },
                legend: { display: false }
            },
            scales: {
                y: { grid: { color: 'rgba(196,184,160,0.3)' }, beginAtZero: true },
                x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } }
            }
        }
    });

    // Career: Line Chart
    new Chart(document.getElementById('careerChart'), {
        type: 'line',
        data: {
            labels: CAREER_DATA.map(c => c.year),
            datasets: [{
                label: 'Career Level',
                data: CAREER_DATA.map(c => c.level),
                borderColor: '#4a6741',
                backgroundColor: 'rgba(74, 103, 65, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 6,
                pointBackgroundColor: CAREER_DATA.map(c => c.year === 2025 ? '#c9a84c' : '#4a6741'),
                pointBorderColor: '#f5f0e6',
                pointBorderWidth: 2,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Career Progression', font: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' }, color: '#5c3d1a', padding: { bottom: 12 } },
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
                    min: 0, max: 7,
                    grid: { color: 'rgba(196,184,160,0.3)' },
                    ticks: {
                        callback: function(val) {
                            const labels = ['', 'Intern', 'Manager', 'Coordinator', 'ALM', 'Sr. Coord', 'Exec. Dir.', ''];
                            return labels[val] || '';
                        },
                        font: { size: 10 }
                    }
                },
                x: { grid: { display: false } }
            }
        }
    });

    // WWE Events: Line Chart with milestones
    new Chart(document.getElementById('wweEventsChart'), {
        type: 'line',
        data: {
            labels: WWE_MILESTONES.map(w => w.year),
            datasets: [{
                label: 'Cumulative WWE Events',
                data: WWE_MILESTONES.map(w => w.events),
                borderColor: '#8b1a1a',
                backgroundColor: 'rgba(139, 26, 26, 0.08)',
                fill: true,
                tension: 0.3,
                pointRadius: 7,
                pointBackgroundColor: '#8b1a1a',
                pointBorderColor: '#f5f0e6',
                pointBorderWidth: 2,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'WWE Events: The Climb to 91+', font: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' }, color: '#5c3d1a', padding: { bottom: 12 } },
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
                y: { grid: { color: 'rgba(196,184,160,0.3)' }, beginAtZero: true, title: { display: true, text: 'Events', font: { size: 11 } } },
                x: { grid: { display: false } }
            }
        }
    });

    // Travel: Scope over time
    new Chart(document.getElementById('travelChart'), {
        type: 'bar',
        data: {
            labels: TRAVEL_DATA.map(t => t.year),
            datasets: [{
                label: 'Countries Visited',
                data: TRAVEL_DATA.map(t => t.countries || 0.5),
                backgroundColor: TRAVEL_DATA.map(t => t.scope === 'International' ? '#1a4a8b' : '#4a6741'),
                borderWidth: 0,
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Travel Scope by Year (Countries per Trip)', font: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' }, color: '#5c3d1a', padding: { bottom: 12 } },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(items) {
                            return TRAVEL_DATA[items[0].dataIndex].destination;
                        },
                        label: function(item) {
                            const d = TRAVEL_DATA[item.dataIndex];
                            return d.scope === 'International' ? `${d.countries} countries` : 'Domestic';
                        },
                        afterLabel: function(item) {
                            return TRAVEL_DATA[item.dataIndex].highlight;
                        }
                    }
                }
            },
            scales: {
                y: { grid: { color: 'rgba(196,184,160,0.3)' }, beginAtZero: true, title: { display: true, text: 'Countries', font: { size: 11 } } },
                x: { grid: { display: false } }
            }
        }
    });

    // ECD: Bar + Line combo
    new Chart(document.getElementById('ecdChart'), {
        type: 'bar',
        data: {
            labels: ECD_DATA.labels,
            datasets: [{
                label: 'Participants',
                data: ECD_DATA.participants,
                backgroundColor: '#6b4a8b',
                borderWidth: 0,
                borderRadius: 2,
                yAxisID: 'y'
            }, {
                label: 'Year',
                data: ECD_DATA.milestoneYears,
                type: 'line',
                borderColor: '#c9a84c',
                backgroundColor: 'transparent',
                pointBackgroundColor: '#c9a84c',
                pointRadius: 5,
                borderWidth: 2,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'East Coast Dodgeball Growth', font: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' }, color: '#5c3d1a', padding: { bottom: 12 } }
            },
            scales: {
                y: { position: 'left', grid: { color: 'rgba(196,184,160,0.3)' }, title: { display: true, text: 'Participants', font: { size: 11 } }, beginAtZero: true },
                y1: { position: 'right', grid: { display: false }, title: { display: true, text: 'Year', font: { size: 11 } }, min: 2008, max: 2026 },
                x: { grid: { display: false } }
            }
        }
    });

    // Awards: Doughnut
    new Chart(document.getElementById('awardsChart'), {
        type: 'doughnut',
        data: {
            labels: ['Janet Jackson (5)', 'Mariah Carey', 'Other'],
            datasets: [{
                data: [5, 3, 2],
                backgroundColor: ['#8b1a1a', '#c9a84c', '#c4b8a0'],
                borderColor: '#f5f0e6',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: { display: true, text: 'Music Artist of the Year Wins', font: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' }, color: '#5c3d1a', padding: { bottom: 12 } },
                tooltip: {
                    callbacks: {
                        label: function(item) {
                            return `${item.label}: ${item.raw} wins`;
                        }
                    }
                }
            },
            cutout: '55%'
        }
    });

    // Traditions: Horizontal Bar
    new Chart(document.getElementById('traditionsChart'), {
        type: 'bar',
        data: {
            labels: TRADITIONS_DATA.map(t => `${t.icon} ${t.tradition}`),
            datasets: [{
                label: 'Years Running',
                data: TRADITIONS_DATA.map(t => t.years),
                backgroundColor: RETRO_COLORS.slice(0, TRADITIONS_DATA.length),
                borderWidth: 0,
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                title: { display: true, text: 'Tradition Longevity (Years)', font: { family: "'Courier Prime', monospace", size: 14, weight: 'bold' }, color: '#5c3d1a', padding: { bottom: 12 } },
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(196,184,160,0.3)' }, beginAtZero: true, max: 25, title: { display: true, text: 'Years', font: { size: 11 } } },
                y: { grid: { display: false } }
            }
        }
    });
}
