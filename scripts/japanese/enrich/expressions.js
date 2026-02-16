/**
 * Grammar pattern attachment module (V4).
 *
 * Patterns use standard Japanese grammar terminology (辞書形, て形, etc.).
 * Meanings are generic — never word-specific.
 * Each pattern generates an applied `example` using the word's conjugation forms.
 */

const PATTERNS = {
  N5: {
    verb: [
      {
        pattern: 'V辞書形 + ことができる',
        meaning_en: 'can do',
        meaning_id: 'bisa melakukan',
        form: 'dict',
        suffix: 'ことができる',
      },
      {
        pattern: 'Vて形 + ください',
        meaning_en: 'please do',
        meaning_id: 'tolong lakukan',
        form: 'te',
        suffix: 'ください',
      },
      {
        pattern: 'Vます形 + たい',
        meaning_en: 'want to do',
        meaning_id: 'ingin melakukan',
        form: 'masu_stem',
        suffix: 'たい',
      },
    ],
    noun: [
      {
        pattern: 'N + です',
        meaning_en: 'is',
        meaning_id: 'adalah',
        form: 'dict',
        suffix: 'です',
      },
    ],
    adjective_na: [
      {
        pattern: 'NA + です',
        meaning_en: 'is',
        meaning_id: 'adalah',
        form: 'dict',
        suffix: 'です',
      },
    ],
    adjective_i: [
      {
        pattern: 'A + です',
        meaning_en: 'polite form',
        meaning_id: 'bentuk sopan',
        form: 'dict',
        suffix: 'です',
      },
    ],
  },
  N4: {
    verb: [
      {
        pattern: 'V辞書形 + ことができる',
        meaning_en: 'can do',
        meaning_id: 'bisa melakukan',
        form: 'dict',
        suffix: 'ことができる',
      },
      {
        pattern: 'Vて形 + いる',
        meaning_en: 'be doing',
        meaning_id: 'sedang melakukan',
        form: 'te',
        suffix: 'いる',
      },
      {
        pattern: 'Vない形 + でください',
        meaning_en: "please don't",
        meaning_id: 'tolong jangan',
        form: 'nai',
        suffix: 'でください',
      },
    ],
    noun: [
      {
        pattern: 'N + です',
        meaning_en: 'is',
        meaning_id: 'adalah',
        form: 'dict',
        suffix: 'です',
      },
    ],
    adjective_na: [
      {
        pattern: 'NA + だった',
        meaning_en: 'was',
        meaning_id: 'dulu',
        form: 'dict',
        suffix: 'だった',
      },
    ],
    adjective_i: [
      {
        pattern: 'A語幹 + くない',
        meaning_en: 'negative form',
        meaning_id: 'bentuk negatif',
        form: 'adj_i_stem',
        suffix: 'くない',
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
 * Resolve the correct word form for an example.
 * @param {string}      form        - 'dict' | 'te' | 'masu_stem' | 'nai' | 'adj_i_stem'
 * @param {string}      word        - Dictionary form
 * @param {object|null} conjugation - Conjugation object from conjugation.js
 */
function resolveForm(form, word, conjugation) {
  switch (form) {
    case 'dict':
      return word;
    case 'te':
      return conjugation?.te ?? null;
    case 'masu_stem': {
      const masu = conjugation?.masu;
      return masu ? masu.replace(/ます$/, '') : null;
    }
    case 'nai':
      return conjugation?.nai ?? null;
    case 'adj_i_stem':
      return word.endsWith('い') ? word.slice(0, -1) : null;
    default:
      return word;
  }
}

/**
 * Attach grammar patterns to a word based on POS and JLPT level.
 * Generates an applied `example` from the word's forms.
 *
 * @param {string[]}    posTags     - All POS tags from filtered senses
 * @param {string}      jlpt        - e.g. 'N5'
 * @param {string}      word        - Dictionary form (e.g. '食べる')
 * @param {object|null} conjugation - Conjugation data (null for non-verbs)
 * @returns {Array<{ pattern, meaning_en, meaning_id, example, jlpt }>}
 */
export function attachExpressions(posTags, jlpt, word, conjugation) {
  const posType = detectPosType(posTags);
  if (!posType) return [];

  const levelPatterns = PATTERNS[jlpt];
  if (!levelPatterns) return [];

  const matched = levelPatterns[posType] ?? [];
  return matched.map((p) => {
    const resolved = resolveForm(p.form, word, conjugation);
    return {
      pattern: p.pattern,
      meaning_en: p.meaning_en,
      meaning_id: p.meaning_id,
      example: resolved ? resolved + p.suffix : null,
      jlpt,
    };
  });
}
