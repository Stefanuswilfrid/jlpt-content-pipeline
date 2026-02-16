/**
 * OpenAI TTS audio generation module.
 *
 * - Generates word-level and sentence-level MP3 files.
 * - Caches aggressively: skips if file already exists on disk.
 * - Small delay between requests to respect rate limits.
 * - Fails gracefully: returns null path on error, never crashes the pipeline.
 */

import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import OpenAI from 'openai';

let client = null;
let enabled = false;

const DELAY_MS = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Initialise the TTS client.
 * Call once at pipeline start. If OPENAI_API_KEY is missing, audio is silently disabled.
 */
export function initAudio() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log('  OPENAI_API_KEY not set — audio generation disabled.');
    return;
  }
  client = new OpenAI({ apiKey });
  enabled = true;
  console.log('  OpenAI TTS initialised.');
}

export function isAudioEnabled() {
  return enabled;
}

/**
 * Generate a single MP3 file from Japanese text.
 * @param {string} text       - Japanese text to speak
 * @param {string} outputPath - Absolute path for the output MP3
 * @returns {Promise<boolean>} true if file exists (cached or freshly generated)
 */
export async function generateAudio(text, outputPath) {
  if (!enabled) return false;
  if (existsSync(outputPath)) return true;

  mkdirSync(dirname(outputPath), { recursive: true });

  try {
    const response = await client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      instructions: 'Speak naturally in Japanese. Pronounce clearly at a moderate pace.',
      input: text,
      response_format: 'mp3',
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath, buffer);
    await sleep(DELAY_MS);
    return true;
  } catch (err) {
    console.warn(`  ⚠ Audio failed for "${text}": ${err.message}`);
    return false;
  }
}
