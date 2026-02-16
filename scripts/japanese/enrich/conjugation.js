/**
 * Rule-based Japanese verb conjugation generator.
 * Detects verb class from JMdict POS tags and generates standard forms.
 *
 * Supports: ichidan, godan (all endings), godan-iku (special te/ta),
 *           suru (including N+する compounds), kuru (kanji + kana forms).
 */

const GODAN_MAP = {
  'う': { a: 'わ', i: 'い', e: 'え', te: 'って', ta: 'った' },
  'く': { a: 'か', i: 'き', e: 'け', te: 'いて', ta: 'いた' },
  'ぐ': { a: 'が', i: 'ぎ', e: 'げ', te: 'いで', ta: 'いだ' },
  'す': { a: 'さ', i: 'し', e: 'せ', te: 'して', ta: 'した' },
  'つ': { a: 'た', i: 'ち', e: 'て', te: 'って', ta: 'った' },
  'ぬ': { a: 'な', i: 'に', e: 'ね', te: 'んで', ta: 'んだ' },
  'ぶ': { a: 'ば', i: 'び', e: 'べ', te: 'んで', ta: 'んだ' },
  'む': { a: 'ま', i: 'み', e: 'め', te: 'んで', ta: 'んだ' },
  'る': { a: 'ら', i: 'り', e: 'れ', te: 'って', ta: 'った' },
};

/**
 * Detect verb class from an array of JMdict POS tags.
 * @param {string[]} posTags
 * @returns {'ichidan'|'godan'|'godan-iku'|'suru'|'kuru'|null}
 */
export function detectVerbClass(posTags) {
  for (const pos of posTags) {
    if (/Kuru verb/i.test(pos)) return 'kuru';
    if (/suru verb/i.test(pos)) return 'suru';
    if (/Godan verb - Iku\/Yuku special class/i.test(pos)) return 'godan-iku';
    if (/Godan verb/i.test(pos)) return 'godan';
    if (/Ichidan verb/i.test(pos)) return 'ichidan';
  }
  return null;
}

/**
 * Generate conjugation forms for a verb.
 * @param {string} word     - Dictionary form (may include kanji, e.g. 食べる)
 * @param {string} reading  - Kana reading (e.g. たべる)
 * @param {string} verbClass
 * @returns {object|null}
 */
export function conjugate(word, reading, verbClass) {
  if (!verbClass) return null;

  if (verbClass === 'ichidan') {
    const stem = word.slice(0, -1);
    return {
      type: 'ichidan',
      dictionary: word,
      masu: stem + 'ます',
      nai: stem + 'ない',
      ta: stem + 'た',
      te: stem + 'て',
      potential: stem + 'られる',
      passive: stem + 'られる',
      causative: stem + 'させる',
    };
  }

  if (verbClass === 'godan' || verbClass === 'godan-iku') {
    const lastChar = word.slice(-1);
    const forms = GODAN_MAP[lastChar];
    if (!forms) return null;
    const stem = word.slice(0, -1);
    const isIku = verbClass === 'godan-iku';

    return {
      type: 'godan',
      dictionary: word,
      masu: stem + forms.i + 'ます',
      nai: stem + forms.a + 'ない',
      ta: isIku ? stem + 'った' : stem + forms.ta,
      te: isIku ? stem + 'って' : stem + forms.te,
      potential: stem + forms.e + 'る',
      passive: stem + forms.a + 'れる',
      causative: stem + forms.a + 'せる',
    };
  }

  if (verbClass === 'suru') {
    const prefix = word.endsWith('する') ? word.slice(0, -2) : '';
    return {
      type: 'irregular',
      dictionary: word,
      masu: prefix + 'します',
      nai: prefix + 'しない',
      ta: prefix + 'した',
      te: prefix + 'して',
      potential: prefix + 'できる',
      passive: prefix + 'される',
      causative: prefix + 'させる',
    };
  }

  if (verbClass === 'kuru') {
    if (word.endsWith('来る')) {
      const prefix = word.slice(0, -2);
      return {
        type: 'irregular',
        dictionary: word,
        masu: prefix + '来ます',
        nai: prefix + '来ない',
        ta: prefix + '来た',
        te: prefix + '来て',
        potential: prefix + '来られる',
        passive: prefix + '来られる',
        causative: prefix + '来させる',
      };
    }
    const prefix = word.endsWith('くる') ? word.slice(0, -2) : '';
    return {
      type: 'irregular',
      dictionary: word,
      masu: prefix + 'きます',
      nai: prefix + 'こない',
      ta: prefix + 'きた',
      te: prefix + 'きて',
      potential: prefix + 'こられる',
      passive: prefix + 'こられる',
      causative: prefix + 'こさせる',
    };
  }

  return null;
}
