# How one output file is generated (deep dive)

This document explains **exactly** how we generate **one** output JSON file end-to-end.

Example command:

```bash
node scripts/japanese/build.js --word=手
```

## Inputs involved

- **JLPT word lists**
  - `jlpt_files/en/n*.json` (drives which words to generate + JLPT level)
  - `jlpt_files/id/n*.json` (Indonesian meanings override)
- **Indices (built from downloads)**
  - `indices/japanese/jmdict.json` (dictionary entries + lookup tables)
  - `indices/japanese/kanjidic2.json` (kanji grades/JLPT metadata used for filtering)
  - `indices/japanese/tatoeba.json` (optional; example sentences)
- **Pitch data**
  - `data/japanese/pitch-accents.json` (optional; pitch accent patterns)

## What `jmdict.json` contains (the important structures)

Built by `scripts/japanese/build-indices.js`, it stores:

- **`entries[seq]`**: the parsed JMdict entry for a numeric sequence id
  - includes: `kanji[]`, `readings[]`, `priority[]`, `senses[]`
- **`wordLookup[word] -> seq[]`**: exact lookup by kanji spelling
- **`readingLookup[reading] -> seq[]`**: exact lookup by kana reading
- **`kanjiCharIndex[漢] -> seq[]`**: “reverse index” from a *single kanji character* to all entry seqs whose **kanji spellings** contain that character

That last one is what makes **related words** fast.

## Step-by-step generation for one word

Below is the real order of operations inside `scripts/japanese/build.js`.

### Step 1 — choose the target word(s)

`build.js` loads all JLPT words, then applies flags:

- `--level=N5` filters by JLPT level
- `--word=手` filters down to a single word

### Step 2 — lookup the word in JMdict (`wordLookup` / `readingLookup`)

For the JLPT entry `jw.word`:

1. Try: `jmdict.wordLookup[jw.word]`
2. Fallback: `jmdict.readingLookup[jw.word]`

This yields `seqs` (one or more matching JMdict entries).

If there are multiple matches and the match came from reading-lookup, we pick a “primary” by best frequency/priority.

Output fields decided here:

- **`definition.word`**: `primary.kanji[0] || primary.readings[0]`
- **`definition.reading`**: `primary.readings[0] || jw.reading`
- **`definition.frequency`**: derived from JMdict `priority[]` via `freqRank()`

### Step 3 — filter senses (clean/appropriate meanings)

JMdict entries have multiple `senses` (each with meanings + tags).

We apply `filterSenses(primary.senses, jw.jlpt)` from `scripts/japanese/enrich/filters.js`:

- Drops senses tagged as vulgar/obsolete/archaic/etc (using `sense.misc`)
- For beginners (N5/N4), also drops senses whose English gloss matches a “sensitive meaning” regex list
- Caps number of senses kept based on JLPT level

Then we convert senses to output `definition.entries[]`:

- **English output**: `meanings` come from JMdict `sense.meanings`
- **Indonesian output**: first sense’s `meanings` is overridden by `jlpt_files/id/*` (if present), remaining senses fall back to English meanings

### Step 4 — pitch accent lookup (optional)

We run `lookupPitch(reading)` (loaded once by `loadPitchDict()`).

If pitch exists, we add:

- `pitch: { pattern, type, ... }`

If not, the field is omitted.

### Step 5 — build “related words” (share-kanji candidates)

This is *not* “scan all entries for strings that contain 手”.

Instead:

1. Take the chosen surface form `w` (e.g. `手`) and iterate its characters.
2. For each character that is kanji:
   - pull candidate seq ids from `jmdict.kanjiCharIndex[ch]`

This yields a candidate set of JMdict entries that share at least one kanji character with the source word.

Then we:

- exclude the `seqs` that matched the source word (so we don’t recommend itself)
- drop “noise” entries with `isNoise(entry, kanjidic2)` (very long, archaic, too-many-kanji, unknown-grade kanji, etc.)
- score with `scoreRelated(...)` (shared kanji count + same JLPT + similar POS + similar frequency)
- sort and keep top N
- **JLPT filter**: `filterRelatedByJlpt(related, jw.jlpt, jlptMap)` keeps only related words that are in your JLPT lists and near the target level

Finally, each related item is simplified to:

```json
{ "word": "...", "reading": "...", "meaning": "..." }
```

For ID output we replace `meaning` with the Indonesian meaning if available.

### Step 6 — extract idioms (JMdict misc-tagged entries)

`extractIdioms(w, jmdict, sourceFreq, matched)` in `scripts/japanese/enrich/idioms.js`:

- builds candidates mostly via `kanjiCharIndex` (fast)
- also does a slower pass to find entries where the entry surface contains the full word (e.g. something like `...手...`)
- keeps only entries where at least one sense has `sense.misc` including:
  - `idiom`, `proverb`, `expression`, `yojijukugo`, `four-character idiom`
- returns top 10 after scoring (contains full word + short length + priority tags)

Each idiom item is output as:

```json
{ "word": "...", "reading": "...", "meaning": "...", "type": "idiom|proverb|yojijukugo|expression" }
```

### Step 7 — build lessons (example sentences) (optional Tatoeba)

If `indices/japanese/tatoeba.json` exists:

1. At startup, we build a one-pass index (`buildExamplesIndex`) for all target words:
   - for each word, keep up to 15 sentences that contain it as a substring
2. For the current word:
   - `rawExamples = exIdx.get(jw.word) || []`
   - `filterExamples(...)` keeps only:
     - short sentences (≤ 30 chars)
     - kanji difficulty appropriate to JLPT (uses `kanjidic2` grade)

## Mental model (tl;dr)

For one word:

1. **Find JMdict entry** by exact lookup table
2. **Filter senses** for appropriateness
3. **Compute pitch** by reading
4. **Related** = “shares kanji characters” via `kanjiCharIndex`
5. **Idioms** = “JMdict entries tagged idiom/proverb/etc” that contain the word
6. **Lessons** = “Tatoeba sentences containing the word” filtered for JLPT difficulty
7. **Write JSON** to `character/en` and `character/id`