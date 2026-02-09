# Timeline of Tron: Data Consistency Audit - Quick Reference

## Key Findings at a Glance

### CRITICAL ISSUES (Fix Immediately)

#### 1. Milestone Count Off by 1
- **index.html claims:** 227 milestones (line 7)
- **Actual data:** 226 milestones (milestones.json)
- **Fix:** Update meta description OR add missing 227th milestone

#### 2. People Count Understated by 40 (24%)
- **index.html claims:** 124 people (lines 79, 191)
- **Actual data:** 164 people (people_profiles.json)
- **Fix:** Update all references to "124" → "164"

#### 3. ECD Event Dates Corrupted
- **10 events (5.95%)** have impossible pre-2000 dates (org founded 2005)
- **53 events (31.5%)** have year/date field mismatches
- **66 events (39.3%)** have NULL dates (incomplete)
- **Fix:** Clean date fields; verify source dates from LiveJournal archive

---

## By the Numbers

| Item | Claimed | Actual | Status |
|------|---------|--------|--------|
| Milestones | 227 | 226 | ❌ OFF BY 1 |
| People | 124 | 164 | ❌ OFF BY 40 |
| Life Chapters | 19 | 19 | ✅ MATCH |
| Quotes | 79 | 79 | ✅ MATCH |
| Travel Trips | 34 | 34 | ✅ MATCH |
| ECD Events | 168 | 168 | ✅ MATCH |
| ECD Players | 128 | 128 | ✅ MATCH |

---

## Date Quality Issues in ECD Data

### Pre-2000 Dates (IMPOSSIBLE)
```
1982-03-10 → appears 3 times (Events 49, 79, 81)
1983-01-07 → appears 3 times (Events 73, 92, 114)
1985-06-23 → Event 57
1986-06-15 → Event 140
1986-11-08 → Event 119
1990-05-09 → Event 71
```

### Duplicated Dates (across multiple events)
```
2010-08-14 → appears 5 times (Events 30, 40, 47, 48, 50)
            with DIFFERENT year_field values (2006, 2008, 2010)
```

### Year Mismatches (date year ≠ year field)
```
Event 29: date=2005-11-26, year=2012  [7-year gap!]
Event 30: date=2010-08-14, year=2006  [4-year gap]
Event 23: date=2008-01-07, year=2007  [1-year gap]
... 50 more similar issues
```

---

## Files to Check

### Need Updating
- [ ] `/index.html` - Update hardcoded stats for milestones (227→226) and people (124→164)
- [ ] `/db/api/ecd_events_full.json` - Fix pre-2000 dates and year mismatches
- [ ] `/db/api/ecd_timeline.json` - Same fixes as ecd_events_full.json

### Data Verified As Correct
- ✅ `milestones.json` - 226 items (consistent)
- ✅ `people_profiles.json` - 164 items (consistent)
- ✅ `life_chapters.json` - 19 items
- ✅ `quotes.json` - 79 items
- ✅ `travel.json` - 34 items
- ✅ `epic_numbers.json` - All stats verified

---

## Quick Stats Validation Checklist

Run these to validate:

```bash
# Milestone count
jq 'length' db/api/milestones.json  # Should be 226 or 227?

# People count
jq 'length' db/api/people_profiles.json  # Should be 164

# Life chapters
jq 'length' db/api/life_chapters.json  # Should be 19

# Quotes
jq 'length' db/api/quotes.json  # Should be 79

# Travel trips
jq 'length' db/api/travel.json  # Should be 34

# ECD events
jq 'length' db/api/ecd_events_full.json  # Should be 168

# Check for pre-2000 dates in ECD data
jq '.[] | select(.date and (.date | startswith("198") or startswith("199")))' db/api/ecd_timeline.json | wc -l
```

---

## Recommended Fix Order

### Step 1: Immediate Stat Updates (15 minutes)
1. Update index.html line 7: "227 milestones" → "226 milestones"
2. Update index.html line 191: "124 people" → "164 people"
3. Update index.html line 79: "124 people" → "164 people"
4. Search codebase for all "124 people" references

### Step 2: ECD Date Cleanup (4-6 hours)
1. Backup ecd_events_full.json and ecd_timeline.json
2. Extract real dates from LiveJournal archive or parsed_events_v2.json
3. Replace pre-2000 dates with NULL or correct values
4. Fix date/year field inconsistencies (determine which is authoritative)
5. Re-validate all 168 events

### Step 3: Documentation (30 minutes)
1. Update README to note known data quality issues
2. Reference MISSING_EVENTS_DETAILED.csv as documentation
3. Add data quality notes to API documentation

---

## Root Causes

### Milestone & People Count Mismatch
- **Cause:** index.html stats outdated when data was expanded
- **Solution:** Update hardcoded values in HTML

### ECD Date Issues
- **Cause:** Data export/transformation errors from LiveJournal scraping
- **Evidence:** Duplicate dates across multiple events, pre-2000 placeholder dates
- **Solution:** Return to source data (LiveJournal), verify dates, update JSON files

---

## Related Documentation

See full reports for details:
- **AUDIT_DATA_CONSISTENCY_REPORT.txt** - Comprehensive analysis (16KB)
- **AUDIT_SUMMARY_TABLE.txt** - Quick reference tables (11KB)
- **AUDIT_DATA_MAPPING_REFERENCE.txt** - Data source mapping (14KB)

Cross-reference:
- **MISSING_EVENTS_DETAILED.csv** - 203 records with incomplete data

---

## Questions?

These reports document:
- What's wrong (exact counts, examples)
- Where to find it (file paths, line numbers)
- How to fix it (specific changes needed)
- Why it happened (root cause analysis)
