// =============================
// INTERACTIVE FUNCTIONS FOR TRON TIMELINE DASHBOARD
// =============================

// Global sorting state
let sortCol = -1;
let sortAsc = true;

// =============================
// TRAVEL TABLE
// =============================
function populateTravelTable() {
    const tbody = document.querySelector('#travelTable tbody');
    if (!tbody) {
        console.warn('#travelTable tbody not found');
        return;
    }
    tbody.innerHTML = '';
    TRAVEL_DATA.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="travel-year">${t.year}</td>
            <td>${t.destination}</td>
            <td><span class="travel-highlight">${t.highlight}</span></td>
            <td>${t.scope}</td>
        `;
        tbody.appendChild(tr);
    });
}

function sortTable(colIndex) {
    const tbody = document.querySelector('#travelTable tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = document.querySelectorAll('#travelTable th');

    if (sortCol === colIndex) {
        sortAsc = !sortAsc;
    } else {
        sortCol = colIndex;
        sortAsc = true;
    }

    headers.forEach((h, i) => {
        h.classList.toggle('sorted', i === colIndex);
        const arrow = h.querySelector('.sort-arrow');
        if (arrow) arrow.textContent = (i === colIndex && !sortAsc) ? '▲' : '▼';
    });

    rows.sort((a, b) => {
        let aVal = a.children[colIndex].textContent.trim();
        let bVal = b.children[colIndex].textContent.trim();
        if (colIndex === 0) { aVal = parseInt(aVal); bVal = parseInt(bVal); }
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
    });

    rows.forEach(r => tbody.appendChild(r));
}

// =============================
// SECTION FILTER
// =============================
function showSection(section, clickedBtn) {
    const entries = document.querySelectorAll('.lj-entry');
    const buttons = document.querySelectorAll('.lj-filter-btn');

    buttons.forEach(btn => btn.classList.remove('active'));
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }

    entries.forEach(entry => {
        if (section === 'all' || entry.dataset.section === section) {
            entry.style.display = '';
        } else {
            entry.style.display = 'none';
        }
    });
}

// =============================
// CHART LIFECYCLE
// =============================
function destroyAllCharts() {
    Object.keys(TronCharts).forEach(function(key) {
        if (TronCharts[key]) {
            TronCharts[key].destroy();
            TronCharts[key] = null;
        }
    });
}

// =============================
// INITIALIZATION
// =============================
document.addEventListener('DOMContentLoaded', function() {
    populateTravelTable();

    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded. Charts will not render.');
    } else {
        try {
            initializeCharts();
        } catch (err) {
            console.error('Chart initialization failed:', err);
        }
    }

    // Bind filter buttons
    document.querySelectorAll('.lj-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            showSection(this.dataset.section, this);
        });
    });

    // Bind travel table sort headers
    document.querySelectorAll('#travelTable th').forEach((th, i) => {
        th.addEventListener('click', function() {
            sortTable(i);
        });
    });
});
