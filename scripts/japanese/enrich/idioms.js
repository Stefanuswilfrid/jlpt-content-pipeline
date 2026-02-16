/**
 * Idioms enrichment module.
 *
 * Extracts actual Japanese idioms, proverbs, and set phrases from JMdict
 * where the target word appears as part of the expression.
 */

/**
 * Check if a JMdict entry is an idiomatic expression.
 */
function isIdiomaticExpression(entry) {
  for (const sense of entry.senses) {
    for (const m of sense.misc) {
      const lower = m.toLowerCase();
      if (
        lower.includes('idiom') ||
        lower.includes('proverb') ||
        lower.includes('expression') ||
        lower.includes('yojijukugo') ||
        lower.includes('four-character idiom')
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Score idiom relevance based on word containment and frequency.
 */
function scoreIdiom(idiomEntry, sourceWord, sourceFreq) {
  let score = 0;
  
  const idiomWord = idiomEntry.kanji[0] || idiomEntry.readings[0];
  
  // Check if source word is contained in the idiom
  if (idiomWord.includes(sourceWord)) {
    score += 10; // Strong relevance
  }
  
  // Prefer shorter idioms (easier to learn)
  if (idiomWord.length <= 6) score += 2;
  else if (idiomWord.length <= 10) score += 1;
  
  // Prefer idioms with priority tags (more common)
  if (idiomEntry.priority && idiomEntry.priority.length > 0) {
    score += 5;
  }
  
  return score;
}

/**
 * Extract idioms containing the target word from JMdict.
 *
 * @param {string} word - Target word (e.g. '食べる')
 * @param {object} jmdict - Full JMdict index
 * @param {number} sourceFreq - Frequency rank of source word
 * @param {Set<number>} excludeSeqs - Sequence IDs to exclude (matched entries)
 * @returns {Array<{ word, reading, meaning, type }>}
 */
export function extractIdioms(word, jmdict, sourceFreq, excludeSeqs) {
  const idioms = [];
  
  // Search through kanji char index to find expressions containing this word
  const candidateSeqs = new Set();
  
  // Look for idioms that contain the source word
  for (const ch of word) {
    if (jmdict.kanjiCharIndex && jmdict.kanjiCharIndex[ch]) {
      for (const seq of jmdict.kanjiCharIndex[ch]) {
        if (!excludeSeqs.has(seq)) {
          candidateSeqs.add(seq);
        }
      }
    }
  }
  
  // Also check reading lookup
  if (jmdict.wordLookup) {
    for (const seq of Object.values(jmdict.wordLookup).flat()) {
      const entry = jmdict.entries[seq];
      if (!entry || excludeSeqs.has(seq)) continue;
      
      const entryWord = entry.kanji[0] || entry.readings[0];
      if (entryWord.includes(word)) {
        candidateSeqs.add(seq);
      }
    }
  }
  
  // Filter and score idioms
  const scoredIdioms = [];
  for (const seq of candidateSeqs) {
    const entry = jmdict.entries[seq];
    if (!entry) continue;
    
    // Must be an idiomatic expression
    if (!isIdiomaticExpression(entry)) continue;
    
    // Must contain the source word
    const idiomWord = entry.kanji[0] || entry.readings[0];
    if (!idiomWord.includes(word)) continue;
    
    const score = scoreIdiom(entry, word, sourceFreq);
    
    // Determine idiom type from misc tags
    let type = 'expression';
    for (const sense of entry.senses) {
      for (const m of sense.misc) {
        const lower = m.toLowerCase();
        if (lower.includes('proverb')) {
          type = 'proverb';
          break;
        } else if (lower.includes('yojijukugo') || lower.includes('four-character idiom')) {
          type = 'yojijukugo';
          break;
        } else if (lower.includes('idiom')) {
          type = 'idiom';
          break;
        }
      }
      if (type !== 'expression') break;
    }
    
    scoredIdioms.push({
      word: idiomWord,
      reading: entry.readings[0],
      meaning: entry.senses[0]?.meanings[0] || '',
      type,
      score,
    });
  }
  
  // Sort by score and limit to top 10
  return scoredIdioms
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ word, reading, meaning, type }) => ({
      word,
      reading,
      meaning,
      type,
    }));
}
