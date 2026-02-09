# Timeline of Tron — Fix & Improvement Plan

After a full click-through audit of every room, nav link, and interactive element — plus a deep read of all source code and 80+ data files — here are the 13 issues found, organized by severity, with exact file paths and what to change.

---

## HIGH Priority

### 1. Record Book: "undefined" on every stat card

**The bug:** Every card in the Obsession Index shows the word "undefined" where a year should be.

**Root cause:** `js/records.js` line 32 reads `item.context`, but `epic_numbers.json` has no `context` field — it has `year` and `note`. The template renders `${o.context}` which prints literal "undefined".

**Fix:** Change line 32 from `context: item.context` to `context: item.year || item.note || ''`

| File | Line | Change |
|------|------|--------|
| `js/records.js` | 32 | `item.context` → `item.year \|\| item.note \|\| ''` |

---

### 2. Search: completely non-functional

**The bug:** Typing in the search box produces no results. The dropdown never appears.

**Root cause:** Two compounding issues:
- Fuse.js is loaded as a `<script>` tag, but `search.js` is an ES module that auto-runs `initSearch()` at import time — race condition means `Fuse` may be undefined when the index tries to build
- The focus handler uses `{ once: true }`, so if Fuse isn't ready on first focus, it silently fails forever with no retry

**Fix:**

| File | Line | Change |
|------|------|--------|
| `js/nav.js` | 90 | Add `id="globalSearch"` to the search input |
| `js/search.js` | 15 | Remove `{ once: true }` from focus event listener |
| `js/search.js` | 136 | Add a `typeof Fuse === 'undefined'` check with retry or dynamic import |
| `js/search.js` | 150 | Defer `initSearch()` to `DOMContentLoaded` or use a polling check for Fuse |

---

### 3. Comeback Lab: contradictory recovery time (6.4 vs 7.1 months)

**The bug:** The Comeback Lab calculates and displays **6.4 months** average recovery. But the HTML initially hardcodes **7.1 months**. Neither number is correct.

**Root cause:** `comeback_narrative.json` has the 2017 L5-S1 herniation entry **duplicated 4 times** (lines ~161-294). This inflates the 2017 entry's weight in the average. With deduplication: (18 + 6 + 2 + 1) / 4 = **6.8 months**.

**Fix:**

| File | Lines | Change |
|------|-------|--------|
| `db/api/comeback_narrative.json` | ~195-294 | Remove the 3 duplicate 2017 herniation entries |
| `comeback.html` | 21 | Remove hardcoded `7.1` — let JS calculate the correct value |

---

## MEDIUM Priority

### 4. Atlas: "Repeat Destinations" shows non-repeat places

**The bug:** Section called "Repeat Destinations" displays 31 places, but only 3 have been visited more than once. The other 28 are single visits. Wisconsin says "(2 trips)" in its name but shows "1 visit" in the count.

**Root cause:** `js/atlas.js` `renderFrequency()` (lines 160-173) displays ALL entries from `location_frequency.json` without filtering for `visit_count > 1`.

**Fix:**

| File | Line | Change |
|------|------|--------|
| `js/atlas.js` | ~163 | Add `const repeats = frequency.filter(f => f.visit_count > 1);` before sort |
| `db/api/location_frequency.json` | ~38 | Fix Wisconsin: set `visit_count: 2` or remove "(2 trips)" from name |

---

### 5. Dynasty: "15 years of climb" is actually 24 years

**The bug:** Dynasty page claims "Cashier to Executive Director — 15 years of climb." First job was 2001, ED was 2025 = 24 years.

**Also:** "Manager of the Year Award" is mixed into the career staircase as a level-3 entry, making the career path appear to go backwards (level 3 → 2 → 3).

**Fix:**

| File | Line | Change |
|------|------|--------|
| `dynasty.html` | 25 | Change "15 years" to "24 years" (or "14 years at Sunrise" if scoping) |
| `db/api/career.json` | ~59-65 | Add `"type": "award"` to the Manager of Year entry |
| `js/dynasty.js` | ~23 | Filter out entries where `type === "award"` from the staircase |

---

### 6. Constellation: self-references and duplicate relationships

**The bug:** The force graph has 4 people linked to themselves and 8 duplicate relationship pairs. "Dan Spengeman" and "Danny Sponge" are treated as separate people.

**Fix:**

| File | Change |
|------|--------|
| `db/api/relationship_constellation.json` | Remove 4 self-reference links (source === target) |
| `db/api/relationship_constellation.json` | Deduplicate 8 duplicate pairs |
| `db/api/relationship_constellation.json` | Merge Danny Sponge into Dan Spengeman |
| `js/constellation.js` | ~78: Add safety filter `.filter(l => l.source !== l.target)` |

All known issues are documented in `db/api/name_issues.json`.

---

## LOW Priority

### 7. LJ nav links: 3 of 5 point to the Lobby

**The bug:** "Recent Entries," "Archive," and "User Info" all go to `index.html`. Only "Friends" and "Memories" go somewhere meaningful.

**Fix:** In `js/nav.js` lines 39-47:
- Archive → `arc.html` (chronological view = natural archive)
- User Info → `dynasty.html` (career/personal info)

---

### 8. Life chapters: arrays stored as JSON strings

**The bug:** `db/api/life_chapters.json` stores arrays as strings: `"years": "[2004, 2005, 2006]"` instead of `"years": [2004, 2005, 2006]`. Chapter 19 uses a completely different format: `"years": "2026-2026"`.

**Fix:** Rewrite life_chapters.json so `years`, `defining_moments`, and `key_people` are actual arrays. Normalize all chapters to the same format.

---

### 9. Room 0: clue system is dead code

**The bug:** `plantClue()` in `js/room0.js` is defined and exported but never imported or called anywhere. The 5-clue hidden room unlock is structurally complete but can never be triggered.

**Fix:** Import `plantClue` in 5 room JS files and call it on specific interactive elements to serve as clue triggers.

---

### 10. Hardcoded visitor counter

The "VISITORS 022847" footer counter is a static string in `js/nav.js`. Never updates. This is arguably on-brand for a LiveJournal homage — could keep as intentional nostalgia or remove.

---

### 11. Lobby seismograph intermittent render failure

The Chart.js seismograph sometimes shows just a dot on first load. Likely a race condition between data loading and canvas rendering.

**Fix:** Ensure data is fully loaded before calling chart render.

---

### 12. Constellation: duplicated chart title

"The Circle Over Time" appears both as an HTML `<h2>` heading and as the Chart.js chart title. Remove one.

---

### 13. Vault: 47% of quotes classified as "NEUTRAL"

37 of 79 quotes are tagged neutral in a collection called "The words that mattered." VADER sentiment analysis tends to underperform on personal/reflective text. Consider manual reclassification of the most obviously emotional "neutral" quotes.

---

## Suggested Implementation Order

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Record Book "undefined" | 1 line | Biggest visible bug gone |
| 2 | Comeback narrative dedup | Data edit | Fixes contradictory numbers |
| 3 | Atlas repeat filter | 1 line | Section makes sense |
| 4 | Dynasty year correction | Text edit | Factual accuracy |
| 5 | Search functionality | ~20 lines | Primary feature restored |
| 6 | Constellation data cleanup | Data edits | Cleaner graph |
| 7 | Nav link remapping | 2 href changes | Better navigation |
| 8 | Career award separation | Data + JS | Clean staircase |
| 9 | Life chapters format | Data rewrite | Proper data types |
| 10 | Room 0 clue wiring | 5 imports | Hidden feature works |
| 11 | Cosmetic fixes | Misc | Polish |

---

## Verification Checklist

- [ ] Record Book: no "undefined" text on any card
- [ ] Search: typing produces dropdown results
- [ ] Comeback Lab: hero stat matches calculated average from clean data
- [ ] Atlas: "Repeat Destinations" only shows places with 2+ visits
- [ ] Dynasty: staircase shows correct year span, no awards mixed in
- [ ] All 5 LJ nav links go to distinct pages
- [ ] Constellation: no self-referencing nodes, no visible duplicates
- [ ] Browser console: zero errors on every page
