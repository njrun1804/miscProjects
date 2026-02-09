// js/search-spellchecker.js — Lightweight "Did you mean?" engine
// Uses Levenshtein edit distance against a dictionary built from the search index.
// No external dependencies. ~300 known terms: people, places, themes, years.

let dictionary = [];

/**
 * Build the correction dictionary from a search index array.
 * Extracts unique meaningful words/phrases from titles, tags, context.
 * Call once after the search index is built.
 */
export function buildDictionary(searchIndex) {
    const termSet = new Set();

    for (const item of searchIndex) {
        // Add full titles (for multi-word corrections like "Dan Spengeman")
        if (item.title) termSet.add(item.title.trim());
        // Add individual words from title (for single-word typos)
        if (item.title) {
            for (const word of item.title.split(/\s+/)) {
                const clean = word.replace(/[^a-zA-Z0-9'-]/g, '');
                if (clean.length >= 3) termSet.add(clean);
            }
        }
        // Add tags
        if (item.tags) {
            for (const tag of item.tags) {
                if (tag && tag.length >= 3) termSet.add(tag);
            }
        }
        // Add aliases
        if (item.aliases) {
            for (const alias of item.aliases) {
                if (alias) termSet.add(alias);
            }
        }
        // Add room names
        if (item.room) termSet.add(item.room);
    }

    dictionary = [...termSet].filter(t => t.length >= 2);
}

/**
 * Suggest a correction for a query that returned 0 results.
 * Returns { term, distance } or null if no close match.
 */
export function suggestCorrection(query, maxDistance = 2) {
    if (!query || query.length < 2 || dictionary.length === 0) return null;

    const q = query.toLowerCase().trim();
    let bestTerm = null;
    let bestDist = Infinity;

    for (const term of dictionary) {
        const t = term.toLowerCase();

        // Skip if lengths are too different (prune for speed)
        if (Math.abs(t.length - q.length) > maxDistance) continue;

        // Exact match — no correction needed
        if (t === q) return null;

        // For multi-word queries, compare against full phrases
        const dist = levenshtein(q, t);
        if (dist <= maxDistance && dist < bestDist) {
            bestDist = dist;
            bestTerm = term;
        }
    }

    // Also try word-level: if query is one word, match against individual titles
    if (!bestTerm && !q.includes(' ')) {
        // Try substring containment with edit distance on each word
        for (const term of dictionary) {
            const words = term.toLowerCase().split(/\s+/);
            for (const word of words) {
                if (word.length < 3) continue;
                const dist = levenshtein(q, word);
                if (dist <= maxDistance && dist < bestDist) {
                    bestDist = dist;
                    bestTerm = term; // Return the full phrase
                }
            }
        }
    }

    return bestTerm ? { term: bestTerm, distance: bestDist } : null;
}

/**
 * Standard Levenshtein edit distance (dynamic programming).
 * O(n*m) where n,m are string lengths. Fast enough for <300 terms.
 */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    // Use single-row optimization
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);

    for (let j = 0; j <= n; j++) prev[j] = j;

    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,       // deletion
                curr[j - 1] + 1,   // insertion
                prev[j - 1] + cost  // substitution
            );
        }
        [prev, curr] = [curr, prev];
    }

    return prev[n];
}

/**
 * Get the raw dictionary (for debug/stats).
 */
export function getDictionary() {
    return dictionary;
}
