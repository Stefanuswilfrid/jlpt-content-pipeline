import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toRomaji } from 'wanakana';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const INDEX_DIR = join(ROOT, 'indices', 'japanese');
const OUTPUT_DIR = join(ROOT, 'japanese', 'word');

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function loadJSON(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function isKanji(char) {
  const code = char.codePointAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0x20000 && code <= 0x2A6DF);
}

/**
 * Derive an approximate frequency rank from JMdict priority tags.
 * nfXX = frequency bucket (nf01 = top 500, nf02 = top 1000, ...).
 * Returns a rough midpoint rank, or null if no frequency data.
 */
function getFrequencyRank(priority) {
  let bestBucket = Infinity;
  for (const tag of priority) {
    const m = tag.match(/^nf(\d+)$/);
    if (m) bestBucket = Math.min(bestBucket, parseInt(m[1], 10));
  }
  if (bestBucket < Infinity) return (bestBucket - 1) * 500 + 250;

  if (priority.includes('ichi1')) return 5000;
  if (priority.includes('ichi2')) return 10000;
  if (priority.includes('news1')) return 12000;
  if (priority.includes('news2')) return 20000;
  if (priority.includes('spec1')) return 25000;
  if (priority.includes('spec2')) return 30000;
  return null;
}

/**
 * Map old JLPT levels (1-4 from KANJIDIC2) to modern N-levels.
 * Old 4→N5, 3→N4, 2→N2, 1→N1.
 */
function jlptLabel(oldLevel) {
  const map = { 4: 'N5', 3: 'N4', 2: 'N2', 1: 'N1' };
  return map[oldLevel] ?? null;
}

// ─────────────────────────────────────────────
//  Core generation
// ─────────────────────────────────────────────

function generateWord(word, jmdict, kanjidic2, tatoeba) {
  const seqs = jmdict.wordLookup[word] || jmdict.readingLookup[word];
  if (!seqs || seqs.length === 0) {
    console.error(`  ✗ "${word}" not found in JMdict.`);
    return null;
  }

  const matchedSeqs = new Set(seqs);
  const allEntries = seqs.map((s) => jmdict.entries[s]).filter(Boolean);
  const primary = allEntries[0];

  const primaryWord = primary.kanji[0] || primary.readings[0];
  const primaryReading = primary.readings[0] || '';

  // ── definition ──
  const definition = {
    word: primaryWord,
    reading: primaryReading,
    romaji: toRomaji(primaryReading),
    jlpt: null,
    frequency: getFrequencyRank(primary.priority),
    entries: allEntries.flatMap((e) =>
      e.senses.map((s) => ({
        pos: s.pos,
        meanings: s.meanings,
      }))
    ),
  };

  // ── kanji ──
  const kanjiSection = [];
  for (const ch of primaryWord) {
    if (isKanji(ch) && kanjidic2[ch]) {
      const k = kanjidic2[ch];
      kanjiSection.push({
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

  // ── related (compounds sharing kanji, sorted by frequency) ──
  const relatedSeqs = new Set();
  for (const ch of primaryWord) {
    if (isKanji(ch) && jmdict.kanjiCharIndex[ch]) {
      for (const seq of jmdict.kanjiCharIndex[ch]) {
        if (!matchedSeqs.has(seq)) relatedSeqs.add(seq);
      }
    }
  }

  const related = [...relatedSeqs]
    .map((s) => jmdict.entries[s])
    .filter((e) => e && e.priority.length > 0)
    .sort((a, b) => (getFrequencyRank(a.priority) ?? 99999) - (getFrequencyRank(b.priority) ?? 99999))
    .slice(0, 20)
    .map((e) => ({
      word: e.kanji[0] || e.readings[0],
      reading: e.readings[0],
      meaning: e.senses[0]?.meanings[0] ?? '',
    }));

  // ── expressions (idioms / proverbs / set phrases) ──
  const isExpression = (e) =>
    e.senses.some((s) =>
      s.misc.some(
        (m) =>
          m.includes('idiom') ||
          m.includes('proverb') ||
          m.includes('expression') ||
          m.includes('yojijukugo')
      )
    );

  const expressions = [...relatedSeqs]
    .map((s) => jmdict.entries[s])
    .filter((e) => e && isExpression(e))
    .sort((a, b) => (getFrequencyRank(a.priority) ?? 99999) - (getFrequencyRank(b.priority) ?? 99999))
    .slice(0, 15)
    .map((e) => ({
      word: e.kanji[0] || e.readings[0],
      reading: e.readings[0],
      meaning: e.senses[0]?.meanings[0] ?? '',
    }));

  // ── examples (from Tatoeba, if available) ──
  const examples = [];
  if (tatoeba) {
    const searchTerm = primaryWord;
    for (const pair of tatoeba) {
      if (pair.japanese.includes(searchTerm)) {
        examples.push({
          japanese: pair.japanese,
          reading: null,
          english: pair.english,
        });
        if (examples.length >= 2) break;
      }
    }
  }

  return { definition, kanji: kanjiSection, related, expressions, examples };
}

// ─────────────────────────────────────────────
//  CLI
// ─────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node generate.js <word> [word2] ...');
    console.log('  node generate.js --top <N>');
    console.log('\nExamples:');
    console.log('  node generate.js 食べる');
    console.log('  node generate.js 食べる 飲む 読む');
    console.log('  node generate.js --top 100');
    process.exit(0);
  }

  // Load indices
  console.log('Loading indices...');

  const jmdictPath = join(INDEX_DIR, 'jmdict.json');
  const kanjidicPath = join(INDEX_DIR, 'kanjidic2.json');

  if (!existsSync(jmdictPath) || !existsSync(kanjidicPath)) {
    console.error('Indices not found. Run: npm run jp:build');
    process.exit(1);
  }

  const jmdict = loadJSON(jmdictPath);
  const kanjidic2 = loadJSON(kanjidicPath);

  let tatoeba = null;
  const tatoebaPath = join(INDEX_DIR, 'tatoeba.json');
  if (existsSync(tatoebaPath)) {
    tatoeba = loadJSON(tatoebaPath);
    console.log(`  Tatoeba: ${tatoeba.length} pairs`);
  } else {
    console.log('  Tatoeba: not available (examples will be empty)');
  }

  console.log('Indices loaded.\n');

  // Resolve word list
  let words;

  if (args[0] === '--top') {
    const n = parseInt(args[1], 10) || 100;
    console.log(`Selecting top ${n} words by frequency...\n`);
    words = Object.values(jmdict.entries)
      .filter((e) => e.priority.length > 0)
      .sort((a, b) => (getFrequencyRank(a.priority) ?? 99999) - (getFrequencyRank(b.priority) ?? 99999))
      .slice(0, n)
      .map((e) => e.kanji[0] || e.readings[0]);
  } else {
    words = args;
  }

  // Generate
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;
  for (const word of words) {
    const result = generateWord(word, jmdict, kanjidic2, tatoeba);
    if (result) {
      const outPath = join(OUTPUT_DIR, `${word}.json`);
      writeFileSync(outPath, JSON.stringify(result, null, 2));
      console.log(`  ✓ ${outPath}`);
      count++;
    }
  }

  console.log(`\nGenerated ${count} file(s).`);
}

main();
