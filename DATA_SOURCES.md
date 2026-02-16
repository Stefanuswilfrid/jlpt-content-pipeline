# Data Sources Breakdown

## Overview

The pipeline uses **3 main external data sources**, all downloaded and processed locally:

```
┌─────────────────────────────────────────────────────────────┐
│ EXTERNAL SOURCES                                            │
├─────────────────────────────────────────────────────────────┤
│ 1. JMdict_e.xml      → Dictionary (definitions, idioms)    │
│ 2. KANJIDIC2.xml     → Kanji metadata                      │
│ 3. Tatoeba           → Example sentences                   │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Breakdown

### 1. **Definitions** (English meanings)
**Source:** JMdict (Japanese-Multilingual Dictionary)
**How:**
```javascript
// Line 310-348 in build.js
const seqs = jmdict.wordLookup[jw.word];  // Lookup word
const primary = jmdict.entries[primarySeq]; // Get entry
const meanings = primary.senses[0].meanings; // Extract meanings
```

**Example:**
- Word: `食べる`
- JMdict entry → `{ meanings: ["to eat"], pos: ["Ichidan verb"] }`

---

### 2. **Related Words** (words sharing kanji)
**Source:** JMdict (same dictionary!)
**How:**
```javascript
// Line 366-410 in build.js
// Step 1: Find all words containing same kanji characters
for (const ch of w) {
  if (isKanji(ch) && jmdict.kanjiCharIndex[ch]) {
    for (const s of jmdict.kanjiCharIndex[ch]) {
      relSeqs.add(s); // Collect related word IDs
    }
  }
}

// Step 2: Score by relevance (shared kanji, same JLPT level, similar POS)
related = [...relSeqs]
  .map(s => jmdict.entries[s])
  .map(e => ({ entry: e, score: scoreRelated(...) }))
  .sort((a,b) => b.score - a.score)
  .slice(0, 20);
```

**Example:**
- Word: `手` (hand)
- Shares kanji with: `手紙` (letter), `切手` (stamp), `上手` (skillful)
- All from JMdict!

---

### 3. **Idioms** (phrases, proverbs, 四字熟語)
**Source:** JMdict (same dictionary again!)
**How:**
```javascript
// scripts/japanese/enrich/idioms.js
// Step 1: Search JMdict for entries containing the word
for (const ch of word) {
  if (jmdict.kanjiCharIndex[ch]) {
    candidateSeqs.add(seq);
  }
}

// Step 2: Filter only entries tagged as idioms
if (!isIdiomaticExpression(entry)) continue;

// Check for tags: 'idiom', 'proverb', 'yojijukugo', 'expression'
for (const m of sense.misc) {
  if (m.includes('idiom') || m.includes('proverb')) {
    // This is an idiom!
  }
}
```

**Example:**
- Word: `目` (eye)
- JMdict has: `目が点になる` tagged as `idiomatic expression`
- Result: `{ word: "目が点になる", meaning: "to be stunned", type: "idiom" }`

---

### 4. **Lessons** (example sentences)
**Source:** Tatoeba (sentence database)
**How:**
```javascript
// Line 286-297 in build.js
const tatoeba = loadJSON('indices/japanese/tatoeba.json');
exIdx = buildExamplesIndex(tatoeba, words); // Pre-index sentences

// Line 415-427
const rawExamples = exIdx?.get(jw.word) ?? []; // Find sentences containing word
const examples = filterExamples(rawExamples, jw.jlpt, kanjidic2); // Filter by difficulty

const enLessons = examples.map(ex => ({
  japanese: ex.japanese,
  english: ex.english, // Translation from Tatoeba
  lessonInfo: { level: analyzeSentenceLevel(...) }
}));
```

**Example:**
- Word: `あそこ`
- Tatoeba has: 
  - JP: `あそこに何もありません。`
  - EN: `There's nothing there.`
- Result: Paired sentence in output

---

### 5. **Pitch Accent** (pronunciation patterns)
**Source:** External pitch accent dictionary file
**How:**
```javascript
// Line 250-252 in build.js
loadPitchDict(DATA_DIR); // Loads pitch-accents.json

// Line 363-364
const pitch = lookupPitch(r); // Lookup reading
```

**File:** `data/japanese/pitch-accents.json`

---

### 6. **Kanji Metadata** (for filtering/scoring)
**Source:** KANJIDIC2
**How:**
```javascript
// Line 247-248 in build.js
const kanjidic2 = loadJSON('indices/japanese/kanjidic2.json');

// Used in:
// - Filtering related words (line 385: isNoise checks kanji grade)
// - Filtering lessons (line 212: checks kanji grade for difficulty)
// - Analyzing sentence level (line 57: checks kanji grades)
```

**Example:**
- Kanji: `食`
- KANJIDIC2: `{ grade: 2, jlpt: "N5", meanings: ["eat", "food"] }`
- Used to filter out advanced kanji for N5 learners

---

## Summary Table

| Output Field | Source | Notes |
|-------------|---------|-------|
| **definition.meanings** | JMdict | English/multilingual meanings |
| **definition.pos** | JMdict | Parts of speech tags |
| **definition.frequency** | JMdict | Priority tags (news, ichi) |
| **related** | JMdict | Words sharing kanji characters |
| **idioms** | JMdict | Entries tagged as idiom/proverb |
| **lessons** | Tatoeba | Japanese-English sentence pairs |
| **pitch** | Pitch Dict | External pitch accent file |
| **kanji metadata** | KANJIDIC2 | For filtering & scoring only |

## Key Insight

**80% of the data comes from JMdict!**
- Definitions ✓
- Related words ✓
- Idioms ✓

Only lessons (Tatoeba) come from a different source.

This is why the system is so consistent and reliable - it's all from the same authoritative Japanese dictionary maintained by Jim Breen and the EDRDG group.

## Data Flow Diagram

```
┌────────────────────────────────────────────────────────────┐
│ DOWNLOAD PHASE                                             │
│ download.js                                                │
├────────────────────────────────────────────────────────────┤
│ JMdict_e.xml.gz      → data/japanese/JMdict_e.xml         │
│ kanjidic2.xml.gz     → data/japanese/kanjidic2.xml        │
│ tatoeba files        → data/japanese/tatoeba/*.tsv        │
│ (pitch-accents.json already exists)                        │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ INDEX BUILDING PHASE                                       │
│ build-indices.js                                           │
├────────────────────────────────────────────────────────────┤
│ Parse XML → JSON with fast lookup tables:                 │
│                                                            │
│ jmdict.json:                                               │
│   - wordLookup: { "食べる": [seq1, seq2] }               │
│   - entries: { seq1: { kanji, readings, senses } }       │
│   - kanjiCharIndex: { "食": [seq1, seq2, ...] }          │
│                                                            │
│ kanjidic2.json:                                            │
│   - { "食": { grade: 2, jlpt: N5, meanings } }           │
│                                                            │
│ tatoeba.json:                                              │
│   - [{ japanese: "...", english: "..." }, ...]            │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ GENERATION PHASE                                           │
│ build.js                                                   │
├────────────────────────────────────────────────────────────┤
│ For each word in jlpt_files/:                             │
│                                                            │
│ 1. DEFINITION     ← jmdict.entries[seq]                   │
│ 2. RELATED        ← jmdict.kanjiCharIndex + scoring       │
│ 3. IDIOMS         ← jmdict.entries (filtered by tags)     │
│ 4. LESSONS        ← tatoeba.json (filtered by difficulty) │
│ 5. PITCH          ← pitch-accents.json                    │
│                                                            │
│ Output: dist/japanese/en/食べる.json                       │
└────────────────────────────────────────────────────────────┘
```

## Why This Approach Works

✅ **Consistent** - Same dictionary for multiple features  
✅ **Authoritative** - JMdict is the gold standard  
✅ **Offline** - All data processed locally  
✅ **Fast** - Pre-built indices for quick lookup  
✅ **Maintainable** - Updates when source data updates  
✅ **License-friendly** - Creative Commons sources  

## External URLs

- **JMdict**: http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
- **KANJIDIC2**: http://www.edrdg.org/kanjidic/kanjidic2.xml.gz
- **Tatoeba**: https://downloads.tatoeba.org/exports/
- **Pitch Accents**: (pre-existing file, source not documented)
