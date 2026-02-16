/**
 * Pitch accent lookup module.
 * Loads a pitch-accents.json dictionary keyed by hiragana reading,
 * returns { pattern, type } or null if not found.
 *
 * Pitch types:
 *   heiban    (0)       — flat, no accent drop
 *   atamadaka (1)       — drop after first mora
 *   nakadaka  (2..N-1)  — drop after Nth mora
 *   odaka     (N)       — drop after last mora
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let pitchDict = null;

/**
 * Load pitch accent dictionary from data directory.
 * @param {string} dataDir - Path to data/japanese/
 */
export function loadPitchDict(dataDir) {
  const pitchPath = join(dataDir, 'pitch-accents.json');
  if (!existsSync(pitchPath)) {
    console.log('  Pitch data not found — pitch will be null.');
    return;
  }
  const raw = JSON.parse(readFileSync(pitchPath, 'utf-8'));
  pitchDict = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key.startsWith('_')) continue;
    pitchDict[key] = val;
  }
  console.log(`  Pitch data: ${Object.keys(pitchDict).length} entries.`);
}

/**
 * Look up pitch accent for a reading.
 * @param {string} reading - Hiragana reading
 * @returns {{ pattern: number, type: string }|null}
 */
export function lookupPitch(reading) {
  if (!pitchDict) return null;
  return pitchDict[reading] ?? null;
}
