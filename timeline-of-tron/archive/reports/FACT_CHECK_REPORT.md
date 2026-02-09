# Fact-Check Report: Timeline of Tron
**Date**: February 9, 2026
**Scope**: All JSON data files in `db/api/`, `CLAUDE.md`, and `README.md`
**Method**: Cross-referenced against public records (web search), internal consistency checks, and geographic verification

---

## Summary

- **Total claims checked**: ~120
- **Confirmed correct**: ~95
- **Errors found**: 13
- **Severity breakdown**: 5 HIGH, 5 MEDIUM, 3 LOW

---

## HIGH SEVERITY — Factual Errors

### 1. St. Lucia Cruise Coordinates Are in Central America
**File**: `travel.json` (id: 20)
**Claim**: St. Lucia, Dominica, Antigua → lat 14.5557414, lon **-90.7379184**
**Problem**: Longitude -90.7° is near the El Salvador/Guatemala border in Central America, roughly **1,500 miles** from the actual Caribbean locations. St. Lucia is at approximately 14.0°N, **-61.0°W**; Dominica at 15.4°N, -61.3°W; Antigua at 17.1°N, -61.8°W.
**Fix**: Change longitude to approximately **-61.0** (Caribbean)

### 2. Panthers-Giants Game Was NOT the Final Game at Giants Stadium
**File**: `entertainment.json` (id: 3), `fun_facts.json` (id: 58)
**Claim**: "Final game ever at old Giants Stadium"
**Problem**: The Panthers' 41-9 win over the Giants on December 27, 2009 was the final **Giants** home game at Giants Stadium. However, the actual final NFL game ever played there was the **New York Jets vs. Cincinnati Bengals on January 3, 2010** (Week 17 of the 2009 season). The score and attendance (78,809) are correct.
**Fix**: Change to "Final Giants game at Giants Stadium" or "Final Giants home game at old Giants Stadium"

### 3. Survivor Series Streak Count Is Stale (25 vs 29)
**Files**: `CLAUDE.md` (line 350), `README.md` (line 43)
**Claim**: "25-year Survivor Series streak" / "25 consecutive Survivor Series years"
**Problem**: `streaks.json` correctly shows the streak as 1997–2025 = **29 years**. The "25th year" was reached in 2021 (per `wwe_events.json`), but the narrative docs were never updated.
**Fix**: Update CLAUDE.md and README.md to "29-year Survivor Series streak" (or current year count)

### 4. ECD Years Active Mismatch (18 vs 21)
**Files**: `traditions.json` (id: 2) vs `streaks.json` (id: 4)
**Claim**: traditions.json says ECD has been active **18 years**. streaks.json says 2005–2025 = **21 years**.
**Problem**: 2025 − 2005 + 1 = 21. The traditions entry is **3 years behind**.
**Fix**: Update traditions.json `years_active` from "18" to "21"

### 5. Table Tennis 62-Game Win Streak Is Logically Impossible
**Files**: `streaks.json` (id: 8) vs `sports.json` (ids: 1–3)
**Claim**: streaks.json says "Table tennis 62-game win streak" in 2016. sports.json says 62 wins and **4 losses** in 2016 (93.9% win rate).
**Problem**: You cannot have a 62-game consecutive win streak AND 4 losses in a 66-game season. If the streak was all 62 wins, the 4 losses would have to fall either all before or all after the streak, which seems unlikely.
**Fix**: Clarify — was it "62 total wins" or a "62-game win streak"? If the former, rename the streak entry. If the latter, the sports record is wrong.

---

## MEDIUM SEVERITY — Inconsistencies & Ambiguities

### 6. WrestleMania Attendance Streak Includes a "Viewing" Year
**Files**: `streaks.json` (id: 2) vs `travel.json` (id: 11)
**Claim**: streaks.json says "WrestleMania attendance streak: 2007–2017, length 11"
**Problem**: travel.json for 2011 says "**WM XXVII viewing at BeerFest**" in Atlantic City. WrestleMania XXVII was held at the Georgia Dome in **Atlanta, Georgia**. "Viewing at BeerFest" implies watching on a screen, not attending in person. If true, this breaks the streak in 2011.
**Additionally**: No WrestleMania travel entry exists for 2015 (WM 31 was in Santa Clara, CA).
**Fix**: Confirm whether 2011 and 2015 were in-person WrestleMania trips. If not, the streak should be adjusted.

### 7. ECD Events Count: 171 vs 168
**Files**: `epic_numbers.json` (id: 14), `sports.json` (id: 20) vs `CLAUDE.md` (line 42)
**Claim**: epic_numbers and sports both say **171** events before retirement. CLAUDE.md says the ECD room has "128 players, **168 events**, 20 years."
**Problem**: 3-event discrepancy between the personal attendance count (171) and the room's displayed count (168).
**Fix**: Clarify whether 171 is personal attendance and 168 is total community events, or standardize the number.

### 8. Career Promotions: "6" Doesn't Match Data
**Files**: `CLAUDE.md` (line 349), `README.md` (line 114) vs `career.json`
**Claim**: "6 Career Promotions (Intern → Executive Director)"
**Problem**: career.json shows career levels 0→1→2→3→2→3→4→5. Counting unique upward level jumps: 0→1, 1→2, 2→3, 3→4, 4→5 = **5 promotions**. The 2018 Reminiscence Coordinator was a **step down** (level 3 to level 2), then back up to 3.
**Fix**: Either say "5 promotions" or clarify the counting methodology.

### 9. U.S. Open 2019 Final — "3rd Longest" Claim Uncertain
**File**: `entertainment.json` (id: 10)
**Claim**: Nadal vs Medvedev final was "3rd longest in 100+ years"
**Problem**: The match lasted 4 hours, 50 minutes. While it is among the longest US Open finals in the Open Era, the specific ranking depends on whether you count only the Open Era (1968+), all-time, or "100+ years." Other long finals include Murray vs Djokovic 2012 (4h 54m) and Wilander vs Lendl 1988 (4h 54m). The exact ranking as "3rd" could not be conclusively verified.
**Fix**: Consider softening to "one of the longest US Open finals in history"

### 10. Dodgeball "Over 5 Years" — Borderline
**File**: `career.json` (id: 3)
**Claim**: "Created ECD, organized 500+ participants over 5 years" (founded 2005, retirement Jan 3, 2009)
**Problem**: 2005 to January 3, 2009 is approximately 3 years and 11 months. However, if counting calendar years touched (2005, 2006, 2007, 2008, 2009), it's 5. The phrase "over 5 years" technically overstates the duration.
**Fix**: Change to "across 5 calendar years" or "over 4 years"

---

## LOW SEVERITY — Minor Issues

### 11. Multi-Location Travel Pins Show Only One Location
**File**: `travel.json`
**Problem**: Several multi-destination entries only have coordinates for one location:
- "Australia & New Zealand" (id: 26) → coordinates point to Auckland, NZ only
- "Portugal, Spain, Norway, Iceland, Toronto" (id: 32) → points to Toronto only
- "Alaska & Seattle" (id: 21) → points to Seattle only

These aren't errors per se (you can only pin one spot on a map), but the map will show these trips far from some of the actual destinations.
**Fix**: Consider using the geographic midpoint, or noting this is a representative pin.

### 12. WrestleMania XXIV Location Context
**File**: `wwe_events.json` (id: 4)
**Claim**: Note says "CityWalk, Universal Studios"
**Clarification**: WrestleMania XXIV was held at the Florida Citrus Bowl (now Camping World Stadium) in Orlando, not at Universal Studios. The CityWalk/Universal reference appears to be about activities during the WrestleMania weekend trip, not the event venue itself. The data is technically fine since it's a trip note, but could be misread.

### 13. Survivor Series 2011 Attendance
**File**: `wwe_events.json` (id: 8)
**Claim**: "17,000+ attendance"
**Actual**: Reported attendance was **16,749**. The "17,000+" is a slight overstatement.
**Fix**: Change to "nearly 17,000 attendance" or "16,749 attendance"

---

## Confirmed Correct (Notable Verifications)

All of the following were verified against public records:

| Claim | Status |
|-------|--------|
| WrestleMania 23 at Ford Field, Detroit (2007) | ✅ Correct |
| WrestleMania XXIV in Orlando (2008) | ✅ Correct |
| WrestleMania 25 in Houston (2009), Undertaker 17-0 | ✅ Correct |
| Hell In A Cell, Oct 4, 2009, Newark NJ | ✅ Correct |
| WrestleMania XXVI in Arizona (2010) | ✅ Correct |
| Survivor Series 2011 at MSG, The Rock returns | ✅ Correct |
| WrestleMania 29 in NJ (2013), Undertaker 21-0 | ✅ Correct |
| WrestleMania XXX in New Orleans (2014), streak broken 21-1 | ✅ Correct |
| WrestleMania 32 in Texas (2016), "100K+" | ✅ Correct (official WWE figure: 101,763) |
| WrestleMania 33 in Orlando (2017) | ✅ Correct |
| Undertaker Hall of Fame induction (2022) | ✅ Correct |
| Ric Flair winning the 1992 Royal Rumble | ✅ Correct |
| Super Bowl LVII in Glendale, AZ (Feb 2023) | ✅ Correct |
| John Legend concert at MSG (Aug 2009) with listed artists | ✅ Correct |
| Virginia earthquake felt in NJ (Aug 23, 2011) | ✅ Correct |
| Laver Cup 2021 in Boston | ✅ Correct |
| BNP Paribas Showdown at MSG (2013) | ✅ Correct |
| CN Tower height: 1,815 feet | ✅ Correct |
| Lambeau Field 78,000+ capacity | ✅ Correct (capacity: 81,441) |
| Table tennis win rate math: 62/66 = 93.9% | ✅ Correct |
| Cornhole win rate math: 254/352 = 72.2% | ✅ Correct |
| Famous Faces: 9/20 = 45% | ✅ Correct |
| 6 cruises in 6 consecutive years (2013–2018) | ✅ Correct |
| 14 medical events total | ✅ Correct |
| George Michael "Fastlove" lyrics quoted correctly | ✅ Correct |
| All song-artist pairings in `song_person_map.json` | ✅ Correct |
| Most geographic coordinates (23 of 27 locations) | ✅ Correct |

---

## Internal Consistency Notes

### WWE Cumulative Event Count Has Gaps
`wwe_events.json` has two entries for 2007 (cumulative 51 and blank), and many years have null cumulative counts. The event numbering jumps (51 → 55 → 62 → 65 → 71 → 75 → 80 → 85 → 90 → 91) suggest events between milestones are not tracked individually.

### Career Level Dip in 2018
`career.json` shows career_level going from 3 (Manager of the Year, 2016) to 2 (Reminiscence Coordinator, 2018) before climbing back to 3, 4, and 5. This may be intentional (lateral move / different role type) but is worth noting for anyone consuming this data expecting monotonic career growth.

### Recovery Metric Unverifiable
CLAUDE.md claims "7.1-month average recovery" for medical events, but `medical_events.json` doesn't include recovery dates — only text descriptions. This metric can't be independently verified from the data.

---

*Report generated by fact-checking all JSON data files in `db/api/` against public records and internal cross-references.*
