/**
 * Learning-aware tag generator (V3).
 * Deterministic tags based on JLPT level, kanji grade, and POS.
 * Designed to support V4 features (SRS, adaptive ordering).
 *
 * Output shape:
 *   { difficultyBand, wordType, register, isIrregular }
 */

const JLPT_DIFFICULTY = {
  N5: 'basic',
  N4: 'basic',
  N3: 'intermediate',
  N2: 'advanced',
  N1: 'advanced',
};

const LITERARY_MISC = ['archaic', 'obsolete', 'literary', 'poetical'];

/**
 * Derive difficulty band.
 *   1. Archaic / literary misc on any sense → 'literary'
 *   2. All kanji in word lack a grade AND word has no JLPT → 'literary'
 *   3. Otherwise map by JLPT: N5/N4 → basic, N3 → intermediate, N2/N1 → advanced
 */
function deriveDifficultyBand(jlpt, kanjiInfo, senses) {
  for (const s of senses) {
    for (const m of s.misc ?? []) {
      if (LITERARY_MISC.some((tag) => m.toLowerCase().includes(tag))) {
        return 'literary';
      }
    }
  }

  if (kanjiInfo.length > 0 && !jlpt) {
    const allUngraded = kanjiInfo.every((k) => !k.grade);
    if (allUngraded) return 'literary';
  }

  return JLPT_DIFFICULTY[jlpt] ?? 'advanced';
}

/**
 * Broad word-type from JMdict POS tags.
 */
function detectWordType(posTags) {
  for (const p of posTags) {
    const lower = p.toLowerCase();
    if (lower.includes('verb')) return 'verb';
    if (
      lower.includes('i-adjective') ||
      lower.includes('adjective (keiyoushi)')
    )
      return 'adjective';
    if (lower.includes('adjectival noun') || lower.includes('keiyodoshi'))
      return 'adjective';
    if (lower.includes('interjection')) return 'interjection';
    if (lower.includes('adverb')) return 'adverb';
    if (lower.includes('particle')) return 'particle';
    if (lower.includes('noun')) return 'noun';
  }
  return 'other';
}

/**
 * Detect register from JMdict misc / field tags on senses.
 */
function detectRegister(senses) {
  for (const s of senses) {
    for (const m of s.misc ?? []) {
      const lower = m.toLowerCase();
      if (lower.includes('formal') || lower.includes('polite')) return 'formal';
      if (lower.includes('literary') || lower.includes('poetical'))
        return 'literary';
      if (
        lower.includes('slang') ||
        lower.includes('colloquial') ||
        lower.includes('familiar')
      )
        return 'slang';
    }
  }
  return 'neutral';
}

function isIrregularVerb(posTags) {
  return posTags.some(
    (p) =>
      /suru verb/i.test(p) ||
      /Kuru verb/i.test(p) ||
      /Iku\/Yuku special class/i.test(p)
  );
}

/**
 * Generate learning-aware tags for a word.
 * @param {string[]} posTags   - All POS tags from filtered senses
 * @param {string}   jlpt      - e.g. 'N5'
 * @param {Array}    kanjiInfo  - Kanji objects with { grade, ... }
 * @param {Array}    senses     - Filtered senses (must include misc field)
 * @returns {{ difficultyBand, wordType, register, isIrregular }}
 */
export function buildTags(posTags, jlpt, kanjiInfo, senses) {
  return {
    difficultyBand: deriveDifficultyBand(jlpt, kanjiInfo, senses),
    wordType: detectWordType(posTags),
    register: detectRegister(senses),
    isIrregular: isIrregularVerb(posTags),
  };
}
