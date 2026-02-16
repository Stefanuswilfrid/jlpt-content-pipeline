import { readFileSync, writeFileSync, existsSync, mkdirSync, createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DATA_DIR = join(ROOT, 'data', 'japanese');
const INDEX_DIR = join(ROOT, 'indices', 'japanese');

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

const ARRAY_TAGS = [
  'entry', 'k_ele', 'r_ele', 'sense', 'gloss', 'pos',
  'ke_pri', 're_pri', 'keb', 'reb', 'misc', 'field',
  'dial', 'ant', 'xref', 's_inf', 'lsource', 'stagk', 'stagr',
  'ke_inf', 're_inf', 're_restr',
  'character', 'meaning', 'reading', 'rmgroup',
  'cp_value', 'rad_value', 'variant', 'nanori', 'q_code'
];

function isKanji(char) {
  const code = char.codePointAt(0);
  return (code >= 0x4E00 && code <= 0x9FFF) ||
         (code >= 0x3400 && code <= 0x4DBF) ||
         (code >= 0x20000 && code <= 0x2A6DF);
}

// ─────────────────────────────────────────────
//  JMdict
// ─────────────────────────────────────────────

function buildJmdict() {
  const xmlPath = join(DATA_DIR, 'JMdict_e.xml');
  if (!existsSync(xmlPath)) {
    console.error('JMdict_e.xml not found. Run download first.');
    process.exit(1);
  }

  console.log('Reading JMdict XML...');
  let xml = readFileSync(xmlPath, 'utf-8');

  // Expand DTD entities (&v1; → "Ichidan verb", etc.)
  console.log('Expanding DTD entities...');
  const entityMap = {};
  const entityRe = /<!ENTITY\s+(\S+)\s+"([^"]+)">/g;
  let m;
  while ((m = entityRe.exec(xml)) !== null) {
    entityMap[m[1]] = m[2];
  }
  xml = xml.replace(/&([\w.-]+);/g, (full, name) => entityMap[name] ?? full);
  xml = xml.replace(/<!DOCTYPE[\s\S]*?\]>/, '');

  console.log('Parsing XML...');
  const parser = new XMLParser({
    ignoreAttributes: true,
    isArray: (name) => ARRAY_TAGS.includes(name),
  });
  const doc = parser.parse(xml);
  const rawEntries = doc.JMdict.entry;

  console.log(`Parsed ${rawEntries.length} entries. Building index...`);

  const entries = {};
  const wordLookup = {};
  const readingLookup = {};
  const kanjiCharIndex = {};

  for (const raw of rawEntries) {
    const seq = String(raw.ent_seq);
    const kanji = (raw.k_ele || []).flatMap((k) => k.keb || []);
    const readings = (raw.r_ele || []).flatMap((r) => r.reb || []);

    const prioritySet = new Set([
      ...(raw.k_ele || []).flatMap((k) => k.ke_pri || []),
      ...(raw.r_ele || []).flatMap((r) => r.re_pri || []),
    ]);
    const priority = [...prioritySet];

    const senses = (raw.sense || []).map((s) => ({
      pos: (s.pos || []).map(String),
      meanings: (s.gloss || []).map((g) =>
        typeof g === 'object' ? String(g['#text'] ?? g) : String(g)
      ),
      misc: (s.misc || []).map(String),
      field: (s.field || []).map(String),
    }));

    entries[seq] = { seq, kanji, readings, priority, senses };

    for (const k of kanji) {
      (wordLookup[k] ??= []).push(seq);
    }
    for (const r of readings) {
      (readingLookup[r] ??= []).push(seq);
    }
    for (const k of kanji) {
      for (const ch of k) {
        if (isKanji(ch)) {
          (kanjiCharIndex[ch] ??= new Set()).add(seq);
        }
      }
    }
  }

  // Sets → Arrays for JSON
  for (const ch of Object.keys(kanjiCharIndex)) {
    kanjiCharIndex[ch] = [...kanjiCharIndex[ch]];
  }

  const index = { entries, wordLookup, readingLookup, kanjiCharIndex };
  const outPath = join(INDEX_DIR, 'jmdict.json');
  console.log(`Writing ${outPath}...`);
  writeFileSync(outPath, JSON.stringify(index));
  console.log(`JMdict index: ${Object.keys(entries).length} entries.\n`);
}

// ─────────────────────────────────────────────
//  KANJIDIC2
// ─────────────────────────────────────────────

function buildKanjidic2() {
  const xmlPath = join(DATA_DIR, 'kanjidic2.xml');
  if (!existsSync(xmlPath)) {
    console.error('kanjidic2.xml not found. Run download first.');
    process.exit(1);
  }

  console.log('Reading KANJIDIC2 XML...');
  let xml = readFileSync(xmlPath, 'utf-8');
  xml = xml.replace(/<!DOCTYPE[\s\S]*?\]>/, '');

  console.log('Parsing XML...');
  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => ARRAY_TAGS.includes(name),
  });
  const doc = parser.parse(xml);
  const chars = doc.kanjidic2.character;

  console.log(`Parsed ${chars.length} characters. Building index...`);

  const index = {};

  for (const c of chars) {
    const literal = c.literal;
    const rmgroups = c.reading_meaning?.rmgroup || [];
    const onyomi = [];
    const kunyomi = [];
    const meanings = [];

    for (const g of rmgroups) {
      for (const r of g.reading || []) {
        const type = typeof r === 'object' ? r['@_r_type'] : null;
        const val = typeof r === 'object' ? String(r['#text'] ?? '') : String(r);
        if (type === 'ja_on') onyomi.push(val);
        if (type === 'ja_kun') kunyomi.push(val);
      }
      for (const m of g.meaning || []) {
        if (typeof m === 'string') {
          meanings.push(m);
        } else if (typeof m === 'object') {
          if (!m['@_m_lang'] || m['@_m_lang'] === 'en') {
            meanings.push(String(m['#text'] ?? ''));
          }
        }
      }
    }

    const misc = c.misc || {};
    const sc = Array.isArray(misc.stroke_count) ? misc.stroke_count[0] : misc.stroke_count;

    index[literal] = {
      character: literal,
      meanings,
      onyomi,
      kunyomi,
      strokeCount: sc ? Number(sc) : null,
      grade: misc.grade ? Number(misc.grade) : null,
      jlpt: misc.jlpt ? Number(misc.jlpt) : null,
      frequency: misc.freq ? Number(misc.freq) : null,
    };
  }

  const outPath = join(INDEX_DIR, 'kanjidic2.json');
  console.log(`Writing ${outPath}...`);
  writeFileSync(outPath, JSON.stringify(index));
  console.log(`KANJIDIC2 index: ${Object.keys(index).length} characters.\n`);
}

// ─────────────────────────────────────────────
//  Tatoeba
// ─────────────────────────────────────────────

async function buildTatoeba() {
  const tatDir = join(DATA_DIR, 'tatoeba');
  const jpnPath = join(tatDir, 'jpn_sentences.tsv');
  const engPath = join(tatDir, 'eng_sentences.tsv');
  const linksPath = join(tatDir, 'links.csv');

  if (!existsSync(jpnPath) || !existsSync(engPath) || !existsSync(linksPath)) {
    console.log('Tatoeba data not found — skipping. Run download without --skip-tatoeba.\n');
    return;
  }

  console.log('Parsing Japanese sentences...');
  const jpn = {};
  for await (const line of createInterface({ input: createReadStream(jpnPath) })) {
    const [id, , text] = line.split('\t');
    if (id && text) jpn[id] = text;
  }
  console.log(`  ${Object.keys(jpn).length} sentences`);

  console.log('Parsing English sentences...');
  const eng = {};
  for await (const line of createInterface({ input: createReadStream(engPath) })) {
    const [id, , text] = line.split('\t');
    if (id && text) eng[id] = text;
  }
  console.log(`  ${Object.keys(eng).length} sentences`);

  console.log('Building translation pairs (this may take a minute)...');
  const jpnIds = new Set(Object.keys(jpn));
  const engIds = new Set(Object.keys(eng));
  const pairs = [];

  for await (const line of createInterface({ input: createReadStream(linksPath) })) {
    const [id1, id2] = line.split('\t');
    if (jpnIds.has(id1) && engIds.has(id2)) {
      pairs.push({ japanese: jpn[id1], english: eng[id2] });
    } else if (jpnIds.has(id2) && engIds.has(id1)) {
      pairs.push({ japanese: jpn[id2], english: eng[id1] });
    }
  }
  console.log(`  ${pairs.length} Japanese-English pairs`);

  const outPath = join(INDEX_DIR, 'tatoeba.json');
  console.log(`Writing ${outPath}...`);
  writeFileSync(outPath, JSON.stringify(pairs));
  console.log('Tatoeba index built.\n');
}

// ─────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────

async function main() {
  ensureDir(INDEX_DIR);

  buildJmdict();
  buildKanjidic2();
  await buildTatoeba();

  console.log('All indices built.');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
