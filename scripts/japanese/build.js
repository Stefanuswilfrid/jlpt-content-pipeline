import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toRomaji } from 'wanakana';

// V3 enrichment modules
import { detectVerbClass, conjugate } from './enrich/conjugation.js';
import { loadPitchDict, lookupPitch } from './enrich/pitch.js';
import { attachExpressions } from './enrich/expressions.js';
import { buildTags } from './enrich/tags.js';
import { filterSenses, filterRelatedByJlpt, JLPT_RANK } from './enrich/filters.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

const DATA_DIR = join(ROOT, 'data', 'japanese');
const INDICES_DIR = join(ROOT, 'indices', 'japanese');
const JLPT_EN_DIR = join(ROOT, 'jlpt_files', 'en');
const JLPT_ID_DIR = join(ROOT, 'jlpt_files', 'id');
const OUT_EN = join(ROOT, 'dist', 'japanese', 'en');
const OUT_ID = join(ROOT, 'dist', 'japanese', 'id');

// ── helpers ──────────────────────────────────

function loadJSON(p) {
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function isKanji(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf);
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

// ── score + filter related words ─────────────

function scoreRelated(candidate, sourceWord, sourceJlpt, sourceFreq, sourcePosSet, jlptMap) {
  let score = 0;
  const cWord = candidate.kanji[0] || candidate.readings[0];
  const cFreq = freqRank(candidate.priority);
  const cJlpt = jlptMap.get(cWord) ?? null;
  const cPos = new Set(candidate.senses.flatMap((s) => s.pos));

  const sourceKanji = new Set([...sourceWord].filter(isKanji));
  for (const ch of cWord) {
    if (sourceKanji.has(ch)) score += 1;
  }

  if (cJlpt && sourceJlpt && cJlpt === sourceJlpt) score += 2;
  if (cFreq != null && sourceFreq != null && Math.abs(cFreq - sourceFreq) < 3000) score += 1;

  let posOverlap = false;
  for (const p of cPos) {
    if (sourcePosSet.has(p)) {
      posOverlap = true;
      score += 2;
      break;
    }
  }
  if (!posOverlap) score -= 1;

  return score;
}

function isNoise(entry, kanjidic2) {
  const w = entry.kanji[0] || entry.readings[0];

  const kanjiCount = [...w].filter(isKanji).length;
  if (kanjiCount >= 4) return true;

  for (const s of entry.senses) {
    for (const m of s.misc) {
      if (m.includes('archais') || m.includes('obsolete')) return true;
    }
  }

  if (w.length > 6) return true;

  for (const ch of w) {
    if (isKanji(ch)) {
      const k = kanjidic2[ch];
      if (!k || (!k.grade && !k.jlpt)) return true;
    }
  }

  return false;
}

// ── filter examples ──────────────────────────

function filterExamples(rawExamples, sourceJlpt, kanjidic2) {
  const maxLen = 30;
  const jlptNum = JLPT_RANK[sourceJlpt] ?? 0;

  return rawExamples
    .filter((ex) => {
      if (ex.japanese.length > maxLen) return false;

      const maxGrade = jlptNum >= 4 ? 2 : jlptNum === 3 ? 4 : jlptNum === 2 ? 6 : 99;
      for (const ch of ex.japanese) {
        if (isKanji(ch) && kanjidic2[ch]) {
          const g = kanjidic2[ch].grade;
          if (g && g > maxGrade) return false;
        }
      }

      return true;
    })
    .slice(0, 2);
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

  // ── load indices ──
  for (const f of ['jmdict.json', 'kanjidic2.json']) {
    if (!existsSync(join(INDICES_DIR, f))) {
      console.error(`Missing ${f}. Run: npm run jp:download:core && npm run jp:build-indices`);
      process.exit(1);
    }
  }

  console.log('Loading indices...');
  const jmdict = loadJSON(join(INDICES_DIR, 'jmdict.json'));
  const kanjidic2 = loadJSON(join(INDICES_DIR, 'kanjidic2.json'));

  // ── load pitch data ──
  console.log('Loading pitch data...');
  loadPitchDict(DATA_DIR);

  // ── load JLPT word lists ──
  console.log('Loading JLPT words...');
  const enWords = loadJlptWords(JLPT_EN_DIR);
  const idWords = loadJlptWords(JLPT_ID_DIR);

  const idMeaningMap = new Map();
  for (const w of idWords) idMeaningMap.set(w.word, w.meaning);

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

  // ── tatoeba (optional) ──
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

  // ── generate ──
  mkdirSync(OUT_EN, { recursive: true });
  mkdirSync(OUT_ID, { recursive: true });

  let ok = 0;
  let skip = 0;

  for (const jw of words) {
    // ── step 1: generate-base (JMdict lookup) ──
    let seqs = jmdict.wordLookup[jw.word];
    if (!seqs?.length) seqs = jmdict.readingLookup[jw.word];
    if (!seqs?.length) {
      skip++;
      continue;
    }

    let primarySeq = seqs[0];
    if (!jmdict.wordLookup[jw.word] && seqs.length > 1) {
      primarySeq = [...seqs].sort((a, b) => {
        const fa = freqRank(jmdict.entries[a]?.priority ?? []) ?? 99999;
        const fb = freqRank(jmdict.entries[b]?.priority ?? []) ?? 99999;
        return fa - fb;
      })[0];
    }

    const matched = new Set(seqs);
    const primary = jmdict.entries[primarySeq];
    if (!primary) {
      skip++;
      continue;
    }

    const w = primary.kanji[0] || primary.readings[0];
    const r = primary.readings[0] || jw.reading;
    const sourceFreq = freqRank(primary.priority);

    // ── step 2: filter senses (V3: remove inappropriate content) ──
    const filteredSenses = filterSenses(primary.senses, jw.jlpt);
    if (filteredSenses.length === 0) {
      skip++;
      continue;
    }

    const enEntries = filteredSenses.map((s) => ({
      pos: s.pos,
      meanings: s.meanings,
    }));

    const idMeaning = idMeaningMap.get(jw.word);
    const idMeaningSplit = idMeaning ? idMeaning.split(/,\s*/).map((m) => m.trim()) : null;
    const idEntries = enEntries.map((enEntry, idx) => ({
      pos: enEntry.pos,
      meanings: idMeaningSplit && idx === 0 ? idMeaningSplit : enEntry.meanings,
    }));

    // ── step 3: build-conjugation (V3) ──
    const allPos = filteredSenses.flatMap((s) => s.pos);
    const verbClass = detectVerbClass(allPos);
    const conjugation = conjugate(w, r, verbClass);

    // ── step 4: build-pitch (V3) ──
    const pitch = lookupPitch(r);

    // ── step 5: kanji ──
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

    // ── step 6: related (scored, noise-filtered, JLPT-filtered, POS-aware) ──
    const sourcePosSet = new Set(allPos);
    const isInterjection = allPos.some((p) => p.toLowerCase().includes('interjection'));

    let related = [];
    let idRelated = [];

    if (!isInterjection) {
      const relSeqs = new Set();
      for (const ch of w) {
        if (isKanji(ch) && jmdict.kanjiCharIndex[ch]) {
          for (const s of jmdict.kanjiCharIndex[ch]) {
            if (!matched.has(s)) relSeqs.add(s);
          }
        }
      }

      related = [...relSeqs]
        .map((s) => jmdict.entries[s])
        .filter((e) => e?.priority.length > 0 && !isNoise(e, kanjidic2))
        .map((e) => ({
          entry: e,
          score: scoreRelated(e, w, jw.jlpt, sourceFreq, sourcePosSet, jlptMap),
        }))
        .filter(({ score }) => score > 0)
        .sort(
          (a, b) =>
            b.score - a.score ||
            (freqRank(a.entry.priority) ?? 99999) - (freqRank(b.entry.priority) ?? 99999)
        )
        .slice(0, 20)
        .map(({ entry: e }) => ({
          word: e.kanji[0] || e.readings[0],
          reading: e.readings[0],
          meaning: e.senses[0]?.meanings[0] ?? '',
        }));

      related = filterRelatedByJlpt(related, jw.jlpt, jlptMap);
      related = related.slice(0, 8);

      idRelated = related.map((rel) => ({
        ...rel,
        meaning: idMeaningMap.get(rel.word) ?? rel.meaning,
      }));
    }

    // ── step 7: attach-expressions (V3) ──
    const expressions = attachExpressions(allPos, jw.jlpt);

    // ── step 8: attach-tags (V3) ──
    const tags = buildTags(allPos, jw.jlpt, kanji, filteredSenses);

    // ── step 9: examples ──
    const rawExamples = exIdx?.get(jw.word) ?? [];
    const examples = filterExamples(rawExamples, jw.jlpt, kanjidic2);

    const enExamples = examples.map((ex) => ({
      japanese: ex.japanese,
      english: ex.english,
    }));

    const idExamples = examples.map((ex) => ({
      japanese: ex.japanese,
      indonesian: ex.english,
    }));

    // ── step 10: write-en ──
    const en = {
      definition: {
        word: w,
        reading: r,
        romaji: toRomaji(r),
        jlpt: jw.jlpt,
        frequency: sourceFreq,
        entries: enEntries,
      },
      ...(conjugation && { conjugation }),
      ...(pitch && { pitch }),
      kanji,
      related,
      expressions,
      tags,
      examples: enExamples,
    };

    // ── step 11: translate-id + write-id ──
    const id = {
      definition: {
        word: w,
        reading: r,
        romaji: toRomaji(r),
        jlpt: jw.jlpt,
        frequency: sourceFreq,
        entries: idEntries,
      },
      ...(conjugation && { conjugation }),
      ...(pitch && { pitch }),
      kanji,
      related: idRelated,
      expressions,
      tags,
      examples: idExamples,
    };

    writeFileSync(join(OUT_EN, `${jw.word}.json`), JSON.stringify(en, null, 2));
    writeFileSync(join(OUT_ID, `${jw.word}.json`), JSON.stringify(id, null, 2));

    ok++;
  }

  console.log(`\nDone. ${ok} generated, ${skip} skipped (not in JMdict).`);
}

main();
