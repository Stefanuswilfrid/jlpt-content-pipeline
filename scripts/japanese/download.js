import { createWriteStream, createReadStream, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const DATA_DIR = join(ROOT, 'data', 'japanese');

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
      let downloaded = 0;

      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalBytes > 0) {
          const pct = ((downloaded / totalBytes) * 100).toFixed(1);
          process.stdout.write(`\r  ${pct}% (${(downloaded / 1e6).toFixed(1)}MB)`);
        } else {
          process.stdout.write(`\r  ${(downloaded / 1e6).toFixed(1)}MB`);
        }
      });

      const file = createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        process.stdout.write('\n');
        file.close(resolve);
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadAndGunzip(url, dest) {
  const tempFile = dest + '.gz';
  console.log(`Downloading: ${url}`);
  await downloadFile(url, tempFile);
  console.log(`Decompressing → ${dest}`);
  await pipeline(
    createReadStream(tempFile),
    createGunzip(),
    createWriteStream(dest)
  );
  unlinkSync(tempFile);
  console.log('Done.\n');
}

async function downloadAndBunzip2(url, dest) {
  const tempFile = dest + '.bz2';
  console.log(`Downloading: ${url}`);
  await downloadFile(url, tempFile);
  console.log(`Decompressing → ${dest}`);
  execSync(`bunzip2 -f "${tempFile}"`);
  console.log('Done.\n');
}

async function downloadAndUntarBz2(url, destDir, expectedFile) {
  const tempFile = join(destDir, '_temp.tar.bz2');
  console.log(`Downloading: ${url}`);
  await downloadFile(url, tempFile);
  console.log(`Extracting → ${join(destDir, expectedFile)}`);
  execSync(`tar xjf "${tempFile}" -C "${destDir}"`);
  unlinkSync(tempFile);
  console.log('Done.\n');
}

const SKIP_TATOEBA = process.argv.includes('--skip-tatoeba');

async function main() {
  ensureDir(DATA_DIR);
  ensureDir(join(DATA_DIR, 'tatoeba'));

  // ── JMdict (definitions, readings, POS) ──
  const jmdictPath = join(DATA_DIR, 'JMdict_e.xml');
  if (!existsSync(jmdictPath)) {
    await downloadAndGunzip(
      'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz',
      jmdictPath
    );
  } else {
    console.log('JMdict_e.xml exists, skipping.\n');
  }

  // ── KANJIDIC2 (kanji metadata) ──
  const kanjidicPath = join(DATA_DIR, 'kanjidic2.xml');
  if (!existsSync(kanjidicPath)) {
    await downloadAndGunzip(
      'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz',
      kanjidicPath
    );
  } else {
    console.log('kanjidic2.xml exists, skipping.\n');
  }

  // ── Tatoeba (example sentences, optional) ──
  if (SKIP_TATOEBA) {
    console.log('Skipping Tatoeba (--skip-tatoeba).\n');
  } else {
    const tatDir = join(DATA_DIR, 'tatoeba');

    const jpnPath = join(tatDir, 'jpn_sentences.tsv');
    if (!existsSync(jpnPath)) {
      await downloadAndBunzip2(
        'https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2',
        jpnPath
      );
    } else {
      console.log('jpn_sentences.tsv exists, skipping.\n');
    }

    const engPath = join(tatDir, 'eng_sentences.tsv');
    if (!existsSync(engPath)) {
      await downloadAndBunzip2(
        'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2',
        engPath
      );
    } else {
      console.log('eng_sentences.tsv exists, skipping.\n');
    }

    const linksPath = join(tatDir, 'links.csv');
    if (!existsSync(linksPath)) {
      await downloadAndUntarBz2(
        'https://downloads.tatoeba.org/exports/links.tar.bz2',
        tatDir,
        'links.csv'
      );
    } else {
      console.log('links.csv exists, skipping.\n');
    }
  }

  console.log('All downloads complete.');
}

main().catch((err) => {
  console.error('Download failed:', err);
  process.exit(1);
});
