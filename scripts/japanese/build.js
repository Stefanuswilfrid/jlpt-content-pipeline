import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toRomaji } from 'wanakana';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const INDICES_DIR = join(ROOT, 'indices', 'japanese');
const JLPT_EN_DIR = join(ROOT, 'jlpt_files', 'en');
const JLPT_ID_DIR = join(ROOT, 'jlpt_files', 'id');
const OUT_EN = join(ROOT, 'dist', 'japanese', 'en');
const OUT_ID = join(ROOT, 'dist', 'japanese', 'id');

// ── helpers ──────────────────────────────────

function loadJSON(p) { return JSON.parse(readFileSync(p, 'utf-8')); }

function isKanji(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF);
}

function freqRank(priority) {
  for (const t of priority) {
    const m = t.match(/^nf(\d+)$/);
    if (m) return (parseInt(m[1]) - 1) * 500 + 250;
  }
  if (priority.includes('ichi1')) return 5000;
  if (priority.includes('ichi2')) return 10000;
  if (priority.includes('news1')) return 12000;
  if (priority.includes('news2')) return 20000;
  return null;
}

function jlptLabel(old) {
  return { 4: 'N5', 3: 'N4', 2: 'N2', 1: 'N1' }[old] ?? null;
}

const JLPT_RANK = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };

// ── load JLPT word lists ─────────────────────

function loadJlptWords(dir) {
  const words = [];
  for (const n of [5, 4, 3, 2, 1]) {
    const f = join(dir, `n${n}.json`);
    if (!existsSync(f)) continue;
    for (const entry of loadJSON(f)) {
      words.push({ ...entry, jlpt: `N${n}` });
    }
  }
  return words;
}

// ── pre-build tatoeba examples index ─────────

function buildExamplesIndex(tatoeba, targetWords) {
  const index = new Map();
  const remaining = new Set(targetWords);

  for (const pair of tatoeba) {
    if (remaining.size === 0) break;

    const toRemove = [];
    for (const w of remaining) {
      if (pair.japanese.includes(w)) {
        if (!index.has(w)) index.set(w, []);
        index.get(w).push({ japanese: pair.japanese, english: pair.english });
        if (index.get(w).length >= 6) toRemove.push(w);
      }
    }
    for (const w of toRemove) remaining.delete(w);
  }

  return index;
}

// ── v2: score + filter related words ─────────

function scoreRelated(candidate, sourceWord, sourceJlpt, sourceFreq, sourcePosSet, jlptMap) {
  let score = 0;
  const cWord = candidate.kanji[0] || candidate.readings[0];
  const cFreq = freqRank(candidate.priority);
  const cJlpt = jlptMap.get(cWord) ?? null;
  const cPos = new Set(candidate.senses.flatMap((s) => s.pos));

  // shared kanji count
  const sourceKanji = new Set([...sourceWord].filter(isKanji));
  for (const ch of cWord) {
    if (sourceKanji.has(ch)) score += 1;
  }

  // same JLPT level
  if (cJlpt && sourceJlpt && cJlpt === sourceJlpt) score += 2;

  // frequency proximity (both have freq, diff < 3000)
  if (cFreq != null && sourceFreq != null && Math.abs(cFreq - sourceFreq) < 3000) score += 1;

  // shared POS
  for (const p of cPos) {
    if (sourcePosSet.has(p)) { score += 1; break; }
  }

  return score;
}

function isNoise(entry, kanjidic2) {
  const w = entry.kanji[0] || entry.readings[0];

  // exclude words with 4+ kanji characters
  const kanjiCount = [...w].filter(isKanji).length;
  if (kanjiCount >= 4) return true;

  // exclude archaisms and proverb-style
  for (const s of entry.senses) {
    for (const m of s.misc) {
      if (m.includes('archais') || m.includes('obsolete')) return true;
    }
  }

  // exclude very long compound words (likely proverb-style)
  if (w.length > 6) return true;

  // exclude words containing rare kanji (not taught in school grades 1-9)
  for (const ch of w) {
    if (isKanji(ch)) {
      const k = kanjidic2[ch];
      if (!k || (!k.grade && !k.jlpt)) return true;
    }
  }

  return false;
}

// ── v2: filter examples ──────────────────────

function filterExamples(rawExamples, sourceJlpt, kanjidic2) {
  const maxLen = 30;
  const jlptNum = JLPT_RANK[sourceJlpt] ?? 0;

  return rawExamples
    .filter((ex) => {
      // length gate
      if (ex.japanese.length > maxLen) return false;

      // check kanji grade: all kanji should be grade <= appropriate level
      // N5→grade 1-2, N4→grade 1-4, N3→grade 1-6, N2/N1→any
      const maxGrade = jlptNum >= 4 ? 2 : jlptNum === 3 ? 4 : jlptNum === 2 ? 6 : 99;
      for (const ch of ex.japanese) {
        if (isKanji(ch) && kanjidic2[ch]) {
          const g = kanjidic2[ch].grade;
          if (g && g > maxGrade) return false;
        }
      }

      return true;
    })
    .slice(0, 3);
}

// ── assemble word JSON ───────────────────────

function buildWord(word, reading, jlpt, entries, jmdict, kanjidic2, exIdx, jlptMap) {
  // Prefer exact kanji match; fall back to reading match.
  let seqs = jmdict.wordLookup[word];
  if (!seqs?.length) seqs = jmdict.readingLookup[word];
  if (!seqs?.length) return null;

  // For reading-only lookups with multiple matches, pick the entry
  // with the highest frequency. Avoids できる→出切る (rare) over 出来る (ichi1).
  let primarySeq = seqs[0];
  if (!jmdict.wordLookup[word] && seqs.length > 1) {
    primarySeq = [...seqs].sort((a, b) => {
      const fa = freqRank(jmdict.entries[a]?.priority ?? []) ?? 99999;
      const fb = freqRank(jmdict.entries[b]?.priority ?? []) ?? 99999;
      return fa - fb;
    })[0];
  }

  const matched = new Set(seqs);
  const primary = jmdict.entries[primarySeq];
  const w = primary.kanji[0] || primary.readings[0];
  const r = primary.readings[0] || reading;
  const sourceFreq = freqRank(primary.priority);
  const sourcePosSet = new Set(primary.senses.flatMap((s) => s.pos));

  // kanji
  const kanji = [];
  for (const ch of w) {
    if (isKanji(ch) && kanjidic2[ch]) {
      const k = kanjidic2[ch];
      kanji.push({
        character: k.character,
        meanings: k.meanings,
        onyomi: k.onyomi,
        kunyomi: k.kunyomi,
        strokeCount: k.strokeCount,
        jlpt: jlptLabel(k.jlpt),
        grade: k.grade,
      });
    }
  }

  // related — v2: scored + noise-filtered, top 10
  const relSeqs = new Set();
  for (const ch of w) {
    if (isKanji(ch) && jmdict.kanjiCharIndex[ch]) {
      for (const s of jmdict.kanjiCharIndex[ch]) {
        if (!matched.has(s)) relSeqs.add(s);
      }
    }
  }

  const related = [...relSeqs]
    .map((s) => jmdict.entries[s])
    .filter((e) => e?.priority.length > 0 && !isNoise(e, kanjidic2))
    .map((e) => ({
      entry: e,
      score: scoreRelated(e, w, jlpt, sourceFreq, sourcePosSet, jlptMap),
    }))
    .sort((a, b) => b.score - a.score || (freqRank(a.entry.priority) ?? 99999) - (freqRank(b.entry.priority) ?? 99999))
    .slice(0, 10)
    .map(({ entry: e }) => ({
      word: e.kanji[0] || e.readings[0],
      reading: e.readings[0],
      meaning: e.senses[0]?.meanings[0] ?? '',
    }));

  // examples — v2: filtered by length + kanji grade, top 3
  const rawExamples = exIdx?.get(word) ?? [];
  const examples = filterExamples(rawExamples, jlpt, kanjidic2);

  return {
    definition: {
      word: w,
      reading: r,
      romaji: toRomaji(r),
      jlpt,
      frequency: sourceFreq,
      entries,
    },
    kanji,
    related,
    examples,
  };
}

// ── main ─────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const levelFlag = args.find((a) => a.startsWith('--level='))?.split('=')[1]?.toUpperCase();
  const wordFlag = args.find((a) => a.startsWith('--word='))?.split('=')[1];

  if (args.includes('--help')) {
    console.log('Usage:');
    console.log('  node build.js                   # all JLPT words');
    console.log('  node build.js --level=N5         # one level');
    console.log('  node build.js --word=食べる      # one word');
    process.exit(0);
  }

  // load indices
  for (const f of ['jmdict.json', 'kanjidic2.json']) {
    if (!existsSync(join(INDICES_DIR, f))) {
      console.error(`Missing ${f}. Run: npm run jp:download:core && npm run jp:build`);
      process.exit(1);
    }
  }

  console.log('Loading indices...');
  const jmdict = loadJSON(join(INDICES_DIR, 'jmdict.json'));
  const kanjidic2 = loadJSON(join(INDICES_DIR, 'kanjidic2.json'));

  // load JLPT
  console.log('Loading JLPT words...');
  const enWords = loadJlptWords(JLPT_EN_DIR);
  const idWords = loadJlptWords(JLPT_ID_DIR);

  const idMeaningMap = new Map();
  for (const w of idWords) idMeaningMap.set(w.word, w.meaning);

  // word → JLPT level map (for related scoring)
  const jlptMap = new Map();
  for (const w of enWords) {
    if (!jlptMap.has(w.word)) jlptMap.set(w.word, w.jlpt);
  }

  // deduplicate + filter
  const seen = new Set();
  let words = enWords.filter((w) => {
    if (seen.has(w.word)) return false;
    seen.add(w.word);
    return true;
  });

  if (levelFlag) words = words.filter((w) => w.jlpt === levelFlag);
  if (wordFlag) words = words.filter((w) => w.word === wordFlag);

  console.log(`${words.length} words to process.`);

  // tatoeba (optional, single-pass index)
  let exIdx = null;
  const tatPath = join(INDICES_DIR, 'tatoeba.json');
  if (existsSync(tatPath)) {
    console.log('Building examples index from Tatoeba (one pass)...');
    const tatoeba = loadJSON(tatPath);
    exIdx = buildExamplesIndex(
      tatoeba,
      words.map((w) => w.word)
    );
    console.log(`  Examples found for ${exIdx.size} words.`);
  }

  // generate
  mkdirSync(OUT_EN, { recursive: true });
  mkdirSync(OUT_ID, { recursive: true });

  let ok = 0;
  let skip = 0;

  for (const jw of words) {
    // JMdict entries for EN (detailed English)
    const seqs = jmdict.wordLookup[jw.word] || jmdict.readingLookup[jw.word];
    if (!seqs?.length) { skip++; continue; }

    const enEntries = seqs
      .map((s) => jmdict.entries[s])
      .filter(Boolean)
      .flatMap((e) => e.senses.map((s) => ({ pos: s.pos, meanings: s.meanings })));

    // ID entries: JLPT ID meaning (brief), fallback to EN
    const idMeaning = idMeaningMap.get(jw.word);
    const idEntries = idMeaning
      ? [{ pos: enEntries[0]?.pos ?? [], meanings: idMeaning.split(/,\s*/) }]
      : enEntries;

    // EN file
    const en = buildWord(jw.word, jw.reading, jw.jlpt, enEntries, jmdict, kanjidic2, exIdx, jlptMap);
    if (!en) { skip++; continue; }

    // ID file (same structure, different meanings)
    const id = buildWord(jw.word, jw.reading, jw.jlpt, idEntries, jmdict, kanjidic2, exIdx, jlptMap);

    writeFileSync(join(OUT_EN, `${jw.word}.json`), JSON.stringify(en, null, 2));
    if (id) writeFileSync(join(OUT_ID, `${jw.word}.json`), JSON.stringify(id, null, 2));

    ok++;
  }

  console.log(`\nDone. ${ok} generated, ${skip} skipped (not in JMdict).`);
}

main();
