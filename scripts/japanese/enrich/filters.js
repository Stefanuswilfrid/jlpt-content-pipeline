/**
 * Sense filtering and related-word JLPT filtering.
 *
 * - filterSenses: removes vulgar, archaic, and level-inappropriate senses
 * - filterRelatedByJlpt: keeps only words within 1 JLPT band of the source
 */

export const JLPT_RANK = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };

const INAPPROPRIATE_MISC = [
  'vulgar',
  'crude',
  'obscene',
  'derogatory',
  'archaic',
  'obsolete',
];

const INAPPROPRIATE_MEANINGS = [
  /\borgasm\b/i,
  /\bsexual(ly)?\b/i,
  /\berotic\b/i,
  /drug[- ]induced/i,
  /\bhallucination\b/i,
  /\bget pregnant\b/i,
  /\bintercourse\b/i,
  /\bcum\b/i,
  /\bget high\b/i,
];

/**
 * Filter JMdict senses for JLPT appropriateness.
 * @param {Array} senses - Raw JMdict sense objects ({ pos, meanings, misc, field })
 * @param {string} jlpt  - e.g. 'N5'
 * @returns {Array} Filtered senses
 */
export function filterSenses(senses, jlpt) {
  const rank = JLPT_RANK[jlpt] ?? 0;

  const filtered = senses.filter((sense) => {
    if (
      sense.misc?.some((m) =>
        INAPPROPRIATE_MISC.some((bad) => m.toLowerCase().includes(bad))
      )
    ) {
      return false;
    }

    if (rank >= 4) {
      const allMeanings = sense.meanings.join(' ');
      if (INAPPROPRIATE_MEANINGS.some((re) => re.test(allMeanings))) {
        return false;
      }
    }

    return true;
  });

  const maxSenses = rank >= 4 ? 5 : rank === 3 ? 8 : 12;
  return filtered.slice(0, maxSenses);
}

/**
 * Filter related words to only include JLPT-appropriate levels.
 * For N5 source: keep N5 + N4. For N4: keep N5 + N4 + N3. Etc.
 * Words not in any JLPT list are removed (conservative for beginners).
 *
 * @param {Array} related     - Related word objects with { word, reading, meaning }
 * @param {string} sourceJlpt - JLPT level of the source word
 * @param {Map} jlptMap       - Map<word, jlptLevel>
 * @returns {Array}
 */
export function filterRelatedByJlpt(related, sourceJlpt, jlptMap) {
  const sourceRank = JLPT_RANK[sourceJlpt] ?? 0;
  const minRank = Math.max(1, sourceRank - 1);

  return related.filter((r) => {
    const rJlpt = jlptMap.get(r.word);
    if (!rJlpt) return false;
    const rRank = JLPT_RANK[rJlpt] ?? 0;
    return rRank >= minRank;
  });
}
