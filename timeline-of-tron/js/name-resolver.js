/**
 * Name Resolver — Entity resolution for the Constellation
 *
 * Problem: The same person can appear under multiple names across data sources:
 *   "Dan Spengeman", "Danny Sponge", "Spengeman"
 *   "Rob", "RK (Rob Knott)", "Rob Phillips (Robert)"
 *   "Michael Krott", "Mike Krott", "Mike 'Sputz' Krott", "Sputz"
 *
 * This module provides a canonical-name mapping so the analytics engine
 * treats all variants as the same node.
 *
 * Approach:
 *   1. Hand-curated ALIAS_MAP for known duplicates (high confidence)
 *   2. Automatic parenthetical stripping ("Juan Londono (Muffin Man)" → "Juan Londono")
 *   3. Possessive stripping ("Dan Spengeman's" → "Dan Spengeman")
 *   4. ECD nickname matching ("Spengeman" → "Dan Spengeman")
 *   5. Fuzzy last-name + first-initial matching for remaining edge cases
 */

// ─── Hand-Curated Alias Map ─────────────────────────────────────
// key = variant name (lowercased), value = canonical name (exact casing)
// This is the ground truth. Add entries as new duplicates are discovered.

const ALIAS_MAP = {
    // Dan Spengeman cluster
    'danny sponge':                   'Dan Spengeman',
    'spengeman':                      'Dan Spengeman',
    "dan spengeman's":                'Dan Spengeman',

    // Rob / Partner cluster
    'rk (rob knott)':                 'Rob',
    'rob knott':                      'Rob',
    'rob phillips (robert)':          'Rob',
    'rob phillips':                   'Rob',
    'rk':                             'Rob',

    // Kevin Megill cluster
    'kevin megill (kmj)':             'Kevin Megill',
    'kmj':                            'Kevin Megill',
    'legend kevin megill':            'Kevin Megill',
    'megill':                         'Kevin Megill',

    // Michael Krott cluster
    'mike krott':                     'Michael Krott',
    "mike 'sputz' krott":            'Michael Krott',
    'michael sputz krott':            'Michael Krott',
    'sputz':                          'Michael Krott',

    // Ryan Letsche cluster
    'ryan letsche (ryguy)':           'Ryan Letsche',
    'ryguy (brody\'s big brother)':   'Ryan Letsche',
    'rl (letsche)':                   'Ryan Letsche',
    'letsche':                        'Ryan Letsche',

    // Juan Londono cluster
    'juan londono (muffin man)':      'Juan Londono',
    'londono':                        'Juan Londono',

    // Valerie Winston cluster
    'valerie winston (valpal)':       'Valerie Winston',
    'valerie winston (valpal':        'Valerie Winston',  // malformed in data
    'valpal':                         'Valerie Winston',

    // Kevin Adams cluster
    'kevin adams (the axe)':          'Kevin Adams',
    'the annihilator':                'Kevin Adams',

    // Chris Arbach / Topher cluster
    'chris arbach (topher)':          'Chris Arbach',
    'topher':                         'Chris Arbach',

    // Grant Cornero cluster
    'grant cornero (grantman)':       'Grant Cornero',
    'grantman':                       'Grant Cornero',

    // Michelle Mullins cluster
    'michelle mullins (muffins)':     'Michelle Mullins',
    'muffins':                        'Michelle Mullins',

    // Joe Kelly cluster
    'joey kelly':                     'Joe Kelly',

    // Julia Dennebaum spelling
    'julia dennabuam':                'Julia Dennebaum',

    // Bethany Schonberg spelling
    'bethany schon':                  'Bethany Schonberg',

    // Sara DeCuir casing
    'sara decuir':                    'Sara DeCuir',

    // Mike Edwards cluster
    'michael edwards':                'Mike Edwards',
    'edwards':                        'Mike Edwards',

    // Michael Butler cluster
    'michael butler':                 'Mike Butler',

    // Dan Turner cluster
    'dan turner word':                'Dan Turner',
    'd turner':                       'Dan Turner',

    // Tom Adams / Punter cluster
    'the punter':                     'Tom Adams',
    'punter wolf':                    'Tom Adams',

    // Diana DiBuccio cluster
    'di buccio':                      'Diana DiBuccio',
    'dibuccio':                       'Diana DiBuccio',
    'diana di':                       'Diana DiBuccio',

    // Justin Pierce cluster
    'pierce':                         'Justin Pierce',
    'the piercer':                    'Justin Pierce',

    // Michael Rosinski cluster
    'mike rosinski':                  'Michael Rosinski',
    'rosinski':                       'Michael Rosinski',

    // Kevin Fitzpatrick cluster
    'fitz':                           'Kevin Fitzpatrick',

    // Kathryn Nogueira cluster
    'kathryn kitty nogueira':         'Kathryn Nogueira',
    'liz nogueira':                   'Elizabeth Nogueira',

    // Justin Wolf cluster
    "justin wolf's":                  'Justin Wolf',
    'wolf':                           'Justin Wolf',

    // Joey Smalls cluster
    "joey smalls's":                  'Joey Smalls',

    // James Butler / Boofer
    'james butler (boofer)':          'James Butler',
    'boofer':                         'James Butler',

    // Joe Corcione
    'joe corcione (giuseppe nj)':     'Joe Corcione',

    // Bojana Beric
    'bojana beric (prof. beric)':     'Bojana Beric',

    // Sascha Basista
    'basista':                        'Sascha Basista',

    // Lauren Freda
    // NOTE: bare "Lauren" is ambiguous (could be Lauren Winston, Lauren Stopa, Lauren Freda)
    // Only map it if it appears in an ECD-only context

    // Joanice Lima
    'lima':                           'Joanice Lima',

    // Couple entries — map to the primary person
    'kevin & leah (kmj & ln)':        'Kevin Megill',

    // Possessive forms that leak from ECD scraping
    "steve adams it's":               'Steve Adams',
    'steve adams it':                 'Steve Adams',
    "kevin adams it's":               'Kevin Adams',
    "matt brown it's":                'Matt Brown',
    "sister it's":                    'Sister',
    'john tronolone it':              'John Tronolone',
    'winston it':                     'Valerie Winston',
    'cornero on':                     'Grant Cornero',
    'ray marzarella on':              'Ray Marzarella',

    // T. Adams (Greek) — likely Tom Adams or a distinct person
    't. adams (greek)':               'Tom Adams',

    // P-A-M-U-L-A
    'p-a-m-u-l-a (pamula)':          'Pamula',
};

// ─── Build fast lookup (case-insensitive) ────────────────────────
const _aliasLookup = new Map();
for (const [variant, canonical] of Object.entries(ALIAS_MAP)) {
    _aliasLookup.set(variant.toLowerCase().trim(), canonical);
}

/**
 * Resolves a name to its canonical form.
 *
 * Pipeline:
 *   1. Exact alias match (case-insensitive)
 *   2. Strip possessive 's
 *   3. Strip trailing garbage ("It", "It's", "On", etc.)
 *   4. Check alias again after cleaning
 *   5. Strip parenthetical nicknames, re-check
 *   6. Return cleaned name if no alias found
 *
 * @param {string} rawName
 * @returns {string} canonical name
 */
export function resolveName(rawName) {
    if (!rawName || typeof rawName !== 'string') return rawName;

    let name = rawName.trim();

    // 1. Direct alias match
    const directMatch = _aliasLookup.get(name.toLowerCase());
    if (directMatch) return directMatch;

    // 2. Strip possessive 's
    if (name.endsWith("'s") || name.endsWith("'s")) {
        name = name.slice(0, -2).trim();
        const match = _aliasLookup.get(name.toLowerCase());
        if (match) return match;
    }

    // 3. Strip trailing garbage tokens from ECD scraping
    const garbageTokens = [' it', " it's", ' on', ' the', ' a'];
    for (const token of garbageTokens) {
        if (name.toLowerCase().endsWith(token)) {
            const cleaned = name.slice(0, -token.length).trim();
            const match = _aliasLookup.get(cleaned.toLowerCase());
            if (match) return match;
            name = cleaned;
        }
    }

    // 4. Re-check after cleaning
    const cleanedMatch = _aliasLookup.get(name.toLowerCase());
    if (cleanedMatch) return cleanedMatch;

    // 5. Strip parenthetical nicknames: "Juan Londono (Muffin Man)" → "Juan Londono"
    const parenMatch = name.match(/^(.+?)\s*\(.*$/);
    if (parenMatch) {
        const baseName = parenMatch[1].trim();
        const baseMatch = _aliasLookup.get(baseName.toLowerCase());
        if (baseMatch) return baseMatch;

        // Also check the full parenthetical form
        const fullMatch = _aliasLookup.get(name.toLowerCase());
        if (fullMatch) return fullMatch;

        // Return the base name (without parenthetical) if no alias
        return baseName;
    }

    return name;
}

/**
 * Checks if two names refer to the same person.
 *
 * @param {string} nameA
 * @param {string} nameB
 * @returns {boolean}
 */
export function isSamePerson(nameA, nameB) {
    if (!nameA || !nameB) return false;
    return resolveName(nameA) === resolveName(nameB);
}

/**
 * Normalizes an array of node objects, merging duplicate names.
 * For merged nodes, combines importance scores and takes the richer metadata.
 *
 * @param {Array<{name: string, ...}>} nodes
 * @returns {Array<{name: string, ...}>} deduplicated nodes
 */
export function deduplicateNodes(nodes) {
    const canonical = new Map(); // canonical name → merged node

    for (const node of nodes) {
        const resolved = resolveName(node.name);

        if (canonical.has(resolved)) {
            const existing = canonical.get(resolved);

            // Merge: keep the higher importance score
            if ((node.importance_score || 0) > (existing.importance_score || 0)) {
                canonical.set(resolved, {
                    ...node,
                    name: resolved,
                    importance_score: Math.max(
                        node.importance_score || 0,
                        existing.importance_score || 0
                    ),
                    _mergedFrom: [...(existing._mergedFrom || [existing.name]), node.name]
                });
            } else {
                existing.importance_score = Math.max(
                    node.importance_score || 0,
                    existing.importance_score || 0
                );
                existing._mergedFrom = [...(existing._mergedFrom || [existing.name]), node.name];
            }
        } else {
            canonical.set(resolved, { ...node, name: resolved });
        }
    }

    return Array.from(canonical.values());
}

/**
 * Normalizes an array of link objects, resolving both source and target names.
 * Removes self-loops that arise from merging (e.g., "Dan Spengeman" ↔ "Danny Sponge").
 * Merges duplicate edges by summing weights.
 *
 * @param {Array<{source: string, target: string, weight?: number, ...}>} links
 * @returns {Array<{source: string, target: string, weight: number, ...}>}
 */
export function deduplicateLinks(links) {
    const edgeMap = new Map(); // "nameA|nameB" → merged link

    for (const link of links) {
        const source = resolveName(
            typeof link.source === 'string' ? link.source : link.source?.name || ''
        );
        const target = resolveName(
            typeof link.target === 'string' ? link.target : link.target?.name || ''
        );

        // Skip self-loops (same person after resolution)
        if (source === target) continue;
        if (!source || !target) continue;

        // Normalize edge key (alphabetical order)
        const [a, b] = source < target ? [source, target] : [target, source];
        const key = `${a}|${b}`;

        if (edgeMap.has(key)) {
            const existing = edgeMap.get(key);
            existing.weight = (existing.weight || 1) + (link.weight || 1);
        } else {
            edgeMap.set(key, {
                ...link,
                source: a,
                target: b,
                weight: link.weight || 1
            });
        }
    }

    return Array.from(edgeMap.values());
}

/**
 * Resolves names in co-occurrence records.
 * Merges co-occurrences for the same canonical pair.
 *
 * @param {Array<{person_a: string, person_b: string, ...}>} coOccurrences
 * @returns {Array} deduplicated co-occurrences
 */
export function deduplicateCoOccurrences(coOccurrences) {
    const merged = new Map();

    for (const co of coOccurrences) {
        const a = resolveName(co.person_a);
        const b = resolveName(co.person_b);

        // Skip self-references
        if (a === b) continue;

        const [nameA, nameB] = a < b ? [a, b] : [b, a];
        const key = `${nameA}|${nameB}|${co.year || ''}`;

        if (merged.has(key)) {
            const existing = merged.get(key);
            existing.co_occurrence_count = (existing.co_occurrence_count || 1) +
                                           (co.co_occurrence_count || 1);
            // Keep richer context
            if (co.context && co.context.length > (existing.context || '').length) {
                existing.context = co.context;
            }
        } else {
            merged.set(key, {
                ...co,
                person_a: nameA,
                person_b: nameB
            });
        }
    }

    return Array.from(merged.values());
}

/**
 * Resolves names in arc data (person_arc records).
 * Merges arcs for the same person: widens year range, sums mentions.
 *
 * @param {Array<{person: string, first_year: number, last_year: number, total_mentions: number, ...}>} arcData
 * @returns {Array} deduplicated arcs
 */
export function deduplicateArcs(arcData) {
    const merged = new Map();

    for (const arc of arcData) {
        const name = resolveName(arc.person || arc.name);

        if (merged.has(name)) {
            const existing = merged.get(name);
            existing.first_year = Math.min(existing.first_year || 9999, arc.first_year || 9999);
            existing.last_year = Math.max(existing.last_year || 0, arc.last_year || 0);
            existing.total_mentions = (existing.total_mentions || 0) + (arc.total_mentions || 0);
            existing.peak_mentions = Math.max(existing.peak_mentions || 0, arc.peak_mentions || 0);
            if ((arc.peak_mentions || 0) >= existing.peak_mentions) {
                existing.peak_year = arc.peak_year;
            }
            existing.span = existing.last_year - existing.first_year;
        } else {
            merged.set(name, { ...arc, person: name, name: name });
        }
    }

    return Array.from(merged.values());
}

/**
 * Resolves a name in profile/people data lookups.
 * Returns the canonical name so sidebar lookups work after deduplication.
 *
 * @param {string} name
 * @returns {string}
 */
export function resolveProfileKey(name) {
    return resolveName(name);
}

/**
 * Returns all known aliases for a canonical name.
 * Useful for sidebar display ("Also known as: ...").
 *
 * @param {string} canonicalName
 * @returns {string[]} array of alias names (excluding the canonical)
 */
export function getAliases(canonicalName) {
    const aliases = [];
    for (const [variant, canonical] of _aliasLookup) {
        if (canonical === canonicalName && variant !== canonicalName.toLowerCase()) {
            aliases.push(variant);
        }
    }
    return aliases;
}
