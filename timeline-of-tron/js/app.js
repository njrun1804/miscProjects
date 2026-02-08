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
// EPIC RECORDS CARDS
// =============================
function populateEpicRecords() {
    const grid = document.getElementById('epicRecordsGrid');
    if (!grid) {
        console.warn('#epicRecordsGrid not found');
        return;
    }
    grid.innerHTML = '';
    EPIC_NUMBERS.forEach(function(rec, i) {
        var color = EPIC_NUMBERS_COLORS[i] || '#5c3d1a';
        var unitHtml = rec.unit ? '<span class="epic-record-unit">' + rec.unit + '</span>' : '';
        var card = document.createElement('div');
        card.className = 'epic-record-card';
        card.style.borderLeftColor = color;
        card.innerHTML =
            '<div class="epic-record-value" style="color:' + color + '">' + rec.value + unitHtml + '</div>' +
            '<div class="epic-record-stat">' + rec.stat + '</div>' +
            '<div class="epic-record-context">' + rec.context + '</div>';
        grid.appendChild(card);
    });
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
// LJ COMMENTS
// =============================
function buildCommentSections() {
    document.querySelectorAll('.lj-entry[data-comments]').forEach(entry => {
        const key = entry.dataset.comments;
        const comments = SECTION_COMMENTS[key];
        if (!comments || !comments.length) return;

        const body = entry.querySelector('.lj-entry-body');
        if (!body) return;

        // Build the comment bar (like real LJ: "N Readers Responded - Share Your Thoughts HERE")
        const bar = document.createElement('div');
        bar.className = 'lj-comment-bar';
        bar.innerHTML = '(<a href="#" class="lj-comment-toggle">' +
            comments.length + ' Readers Responded</a>' +
            ' - <a href="#" class="lj-comment-toggle">Share Your Thoughts HERE</a>)';
        body.appendChild(bar);

        // Build the comment thread (hidden by default)
        const thread = document.createElement('div');
        thread.className = 'lj-comment-thread';
        thread.style.display = 'none';

        comments.forEach(c => {
            const comment = document.createElement('div');
            comment.className = 'lj-comment' + (c.isOP ? ' lj-comment--op' : '');
            comment.innerHTML =
                '<div class="lj-comment-header">' +
                    '<span class="lj-comment-author' + (c.isOP ? ' lj-comment-author--op' : '') + '">' +
                        (c.isOP ? '<span class="lj-comment-userpic">JT</span> ' : '') +
                        c.name +
                    '</span>' +
                    '<span class="lj-comment-anon">' + (c.isOP ? '' : '(Anonymous):') + '</span> ' +
                    '<span class="lj-comment-date">' + c.date + ' (UTC)</span>' +
                '</div>' +
                '<div class="lj-comment-body">' + c.text + '</div>' +
                '<div class="lj-comment-actions">' +
                    '(<a href="#" onclick="return false">Reply</a>' +
                    (c.isOP ? '' : ' - <a href="#" onclick="return false">Thread</a>') +
                    ')' +
                '</div>';
            thread.appendChild(comment);
        });

        body.appendChild(thread);

        // Wire up the toggle
        bar.querySelectorAll('.lj-comment-toggle').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const isVisible = thread.style.display !== 'none';
                thread.style.display = isVisible ? 'none' : 'block';
            });
        });
    });
}

// =============================
// INITIALIZATION
// =============================
document.addEventListener('DOMContentLoaded', function() {
    populateTravelTable();
    populateEpicRecords();
    buildCommentSections();

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

    // Bind lj-cut collapse/expand toggles
    document.querySelectorAll('.lj-cut-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            const entry = this.closest('.lj-entry');
            if (entry.classList.contains('collapsed')) {
                entry.classList.remove('collapsed');
                this.textContent = '(collapse)';
            } else {
                entry.classList.add('collapsed');
                this.textContent = '(expand — lj-cut)';
            }
        });
    });
});
