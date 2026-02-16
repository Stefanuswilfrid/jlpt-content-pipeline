/**
 * Grammar pattern attachment module.
 * Matches structured N5/N4 grammar patterns to words based on POS type.
 * Returns bilingual (EN + ID) pattern descriptions.
 */

const PATTERNS = {
  N5: {
    verb: [
      {
        pattern: 'V(dict.) + ことができる',
        meaning_en: 'can do V',
        meaning_id: 'bisa melakukan V',
      },
      {
        pattern: 'V(te) + ください',
        meaning_en: 'please do V',
        meaning_id: 'tolong lakukan V',
      },
      {
        pattern: 'V(masu stem) + たい',
        meaning_en: 'want to V',
        meaning_id: 'ingin V',
      },
    ],
    noun: [
      {
        pattern: 'N + です',
        meaning_en: 'is N',
        meaning_id: 'adalah N',
      },
    ],
    adjective_na: [
      {
        pattern: 'NA + です',
        meaning_en: 'is NA',
        meaning_id: 'adalah NA',
      },
    ],
    adjective_i: [
      {
        pattern: 'A + です',
        meaning_en: 'A (polite)',
        meaning_id: 'A (sopan)',
      },
    ],
  },
  N4: {
    verb: [
      {
        pattern: 'V(dict.) + ことができる',
        meaning_en: 'can do V',
        meaning_id: 'bisa melakukan V',
      },
      {
        pattern: 'V(te) + いる',
        meaning_en: 'be doing V / V-ing',
        meaning_id: 'sedang melakukan V',
      },
      {
        pattern: 'V(nai) + ないでください',
        meaning_en: "please don't V",
        meaning_id: 'tolong jangan V',
      },
    ],
    noun: [
      {
        pattern: 'N + です',
        meaning_en: 'is N',
        meaning_id: 'adalah N',
      },
    ],
    adjective_na: [
      {
        pattern: 'NA + だった',
        meaning_en: 'was NA',
        meaning_id: 'dulu NA',
      },
    ],
    adjective_i: [
      {
        pattern: 'A(stem) + くない',
        meaning_en: 'not A',
        meaning_id: 'tidak A',
      },
    ],
  },
};

/**
 * Detect broad POS category from JMdict POS tags.
 * Returns null for POS types that have no grammar patterns (interjections, adverbs, particles, etc.).
 */
function detectPosType(posTags) {
  for (const pos of posTags) {
    const lower = pos.toLowerCase();
    if (lower.includes('verb')) return 'verb';
    if (lower.includes('i-adjective') || lower.includes('adjective (keiyoushi)'))
      return 'adjective_i';
    if (lower.includes('adjectival noun') || lower.includes('keiyodoshi'))
      return 'adjective_na';
    if (lower.includes('noun')) return 'noun';
  }
  return null;
}

/**
 * Attach grammar patterns to a word based on POS and JLPT level.
 * @param {string[]} posTags - All POS tags from filtered senses
 * @param {string} jlpt      - e.g. 'N5'
 * @returns {Array<{ pattern, meaning_en, meaning_id, jlpt }>}
 */
export function attachExpressions(posTags, jlpt) {
  const posType = detectPosType(posTags);
  if (!posType) return [];

  const levelPatterns = PATTERNS[jlpt];
  if (!levelPatterns) return [];

  const matched = levelPatterns[posType] ?? [];
  return matched.map((p) => ({
    pattern: p.pattern,
    meaning_en: p.meaning_en,
    meaning_id: p.meaning_id,
    jlpt,
  }));
}
