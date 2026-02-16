# Japanese Language Content Pipeline

A comprehensive Japanese language content generation system that creates structured learning materials for JLPT (Japanese Language Proficiency Test) vocabulary levels N5-N1. This pipeline downloads dictionary data, enriches it with conjugations, pitch accents, grammar patterns, and example sentences, then outputs bilingual JSON files suitable for language learning applications.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Data Flow](#data-flow)
- [Setup](#setup)
- [Usage](#usage)
- [Key Scripts](#key-scripts)
- [Output Format](#output-format)
- [Enrichment Features](#enrichment-features)

## Overview

This project transforms raw Japanese dictionary data into rich, structured learning content by:

1. **Downloading** source dictionaries and sentence databases
2. **Parsing** XML/TSV data into fast JSON indices
3. **Enriching** vocabulary with linguistic metadata
4. **Generating** bilingual outputs (English and Indonesian)

The pipeline produces JSON files containing:
- Word definitions and readings
- Verb conjugations
- Pitch accent patterns
- Related vocabulary
- Grammar patterns (expressions)
- Example sentences with audio

## Project Structure

```
content/
├── data/japanese/          # Raw downloaded data files (git-ignored)
│   ├── JMdict_e.xml       # Japanese-English dictionary
│   ├── kanjidic2.xml      # Kanji character database
│   ├── pitch-accents.json # Pitch accent data
│   └── tatoeba/           # Example sentence pairs
│
├── indices/japanese/      # Processed JSON indices (git-ignored)
│   ├── jmdict.json        # Parsed dictionary with lookup tables
│   ├── kanjidic2.json     # Parsed kanji metadata
│   └── tatoeba.json       # Processed sentence database
│
├── jlpt_files/            # Input word lists by JLPT level
│   ├── en/                # English word lists (n5.json - n1.json)
│   └── id/                # Indonesian word lists (n5.json - n1.json)
│
├── dist/                  # Final output directory (git-ignored)
│   ├── japanese/
│   │   ├── en/            # English output files (one JSON per word)
│   │   └── id/            # Indonesian output files
│   └── audio/
│       └── japanese/
│           └── lesson/    # Generated MP3 audio files
│
└── scripts/japanese/      # Processing scripts
    ├── download.js        # Downloads source data
    ├── build-indices.js   # Parses data into JSON indices
    ├── generate.js        # Legacy single-word generator
    ├── build.js           # Main production builder
    └── enrich/            # Enrichment modules
        ├── conjugation.js # Verb conjugation generator
        ├── pitch.js       # Pitch accent lookup
        ├── idioms.js      # Idiom/proverb extraction from JMdict
        ├── filters.js     # Content filtering
        ├── audio.js       # OpenAI TTS audio generation
        └── tags.js        # Learning tags
```

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│ STEP 1: DOWNLOAD                                    │
│ download.js                                         │
│                                                     │
│ Downloads:                                          │
│  • JMdict_e.xml.gz (dictionary)                    │
│  • kanjidic2.xml.gz (kanji data)                   │
│  • Tatoeba sentence pairs (optional)               │
│                                                     │
│ Output: data/japanese/                             │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STEP 2: BUILD INDICES                              │
│ build-indices.js                                   │
│                                                     │
│ Parses XML/TSV into JSON:                          │
│  • Creates lookup tables for fast access           │
│  • Expands XML DTD entities                        │
│  • Builds sentence pair database                   │
│                                                     │
│ Output: indices/japanese/                          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ STEP 3: GENERATE CONTENT                           │
│ build.js                                           │
│                                                     │
│ For each word in jlpt_files/:                      │
│  1. Lookup in JMdict                               │
│  2. Filter inappropriate content                   │
│  3. Generate conjugations (verbs)                  │
│  4. Add pitch accent data                          │
│  5. Find related vocabulary                        │
│  6. Extract idioms and proverbs                    │
│  7. Build example sentence lessons                 │
│  8. Generate audio (optional)                      │
│                                                     │
│ Output: dist/japanese/en/ and dist/japanese/id/    │
└─────────────────────────────────────────────────────┘
```

## Setup

### Prerequisites

- Node.js (ES modules support)
- System commands: `bunzip2`, `tar` (for Tatoeba decompression)
- OpenAI API key (optional, for audio generation)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create `.env` file (optional, for audio):

```bash
OPENAI_API_KEY=your_api_key_here
```

### Dependencies

- **dotenv** (^17.3.1) - Environment variable management
- **fast-xml-parser** (^4.5.0) - XML parsing for JMdict/KANJIDIC2
- **openai** (^6.22.0) - OpenAI API client for TTS
- **wanakana** (^5.3.1) - Japanese text conversion

## Usage

### Full Pipeline

Run the complete pipeline:

```bash
# 1. Download all source data
npm run jp:download

# Or skip Tatoeba (faster, but no example sentences)
npm run jp:download:core

# 2. Build JSON indices from downloaded data
npm run jp:build-indices

# 3. Generate content for all JLPT levels
npm run jp:words
```

### Selective Processing

Process a specific JLPT level:

```bash
node scripts/japanese/build.js --level=N5
```

Process a single word:

```bash
node scripts/japanese/build.js --word=食べる
```

Skip audio generation:

```bash
node scripts/japanese/build.js --skip-audio
```

### Legacy Generator

Generate a single word (simpler output):

```bash
node scripts/japanese/generate.js 食べる
```

## Key Scripts

### `download.js`

Downloads source data files from external repositories:

- **JMdict_e.xml.gz** - Japanese-English dictionary from edrdg.org
- **kanjidic2.xml.gz** - Kanji character database from edrdg.org
- **Tatoeba files** - Example sentence pairs (optional with `--skip-tatoeba`)

Features:
- Automatic decompression (gunzip, bunzip2, tar)
- Skips already downloaded files
- Error handling for network issues

### `build-indices.js`

Parses raw XML/TSV files into optimized JSON indices:

**For JMdict:**
- Creates `wordLookup` (kanji → entries)
- Creates `readingLookup` (hiragana → entries)
- Builds `kanjiCharIndex` for related word lookup
- Expands DTD entities in XML

**For KANJIDIC2:**
- Parses kanji metadata (meanings, readings, stroke count, JLPT level)

**For Tatoeba:**
- Links Japanese sentences with English translations
- Creates searchable sentence pairs

### `build.js` (Main Production Script)

The core content generator with full enrichment pipeline:

**Input:**
- JLPT word lists from `jlpt_files/en/*.json` and `jlpt_files/id/*.json`
- Pre-built indices from `indices/japanese/`

**Processing Pipeline:**
1. Load all indices (JMdict, KANJIDIC2, Tatoeba, pitch accents)
2. For each word:
   - Lookup dictionary entry
   - Filter out inappropriate content (vulgar, archaic)
   - Generate verb conjugations
   - Add pitch accent information
   - Find and score related words
   - Attach grammar patterns (expressions)
   - Build lesson examples from Tatoeba sentences
   - Generate audio files (if enabled)
3. Write bilingual JSON outputs

**Options:**
- `--level=N5` - Process single JLPT level
- `--word=食べる` - Process single word
- `--skip-audio` - Skip OpenAI TTS generation

### `generate.js` (Legacy)

Simpler word generator for quick lookups:

```bash
node generate.js 食べる           # Generate single word
node generate.js --top 100        # Generate top 100 words
```

Outputs to `japanese/word/` directory with basic definitions and readings.

## Output Format

Each word generates a JSON file in `dist/japanese/en/*.json` (English) and `dist/japanese/id/*.json` (Indonesian):

```json
{
  "definition": {
    "word": "食べる",
    "reading": "たべる",
    "romaji": "taberu",
    "jlpt": "N5",
    "frequency": 12250,
    "entries": [
      {
        "pos": ["Ichidan verb", "transitive verb"],
        "meanings": ["to eat"]
      }
    ]
  },
  "conjugation": {
    "type": "ichidan",
    "dictionary": "食べる",
    "masu": "食べます",
    "nai": "食べない",
    "ta": "食べた",
    "te": "食べて",
    "potential": "食べられる",
    "passive": "食べられる",
    "causative": "食べさせる",
    "causative_passive": "食べさせられる",
    "imperative": "食べろ",
    "volitional": "食べよう",
    "conditional": "食べれば"
  },
  "pitch": {
    "pattern": 2,
    "type": "nakadaka",
    "description": "High on second mora, low after"
  },
  "kanji": [
    {
      "character": "食",
      "meanings": ["eat", "food"],
      "onyomi": ["ショク", "ジキ"],
      "kunyomi": ["た.べる", "く.う"],
      "strokeCount": 9,
      "jlpt": "N5"
    }
  ],
  "related": [
    {
      "word": "食事",
      "reading": "しょくじ",
      "meaning": "meal",
      "jlpt": "N5"
    }
  ],
  "idioms": [
    {
      "word": "食べ放題",
      "reading": "たべほうだい",
      "meaning": "all-you-can-eat",
      "type": "expression"
    }
  ],
  "lessons": [
    {
      "japanese": "私は朝ご飯を食べます。",
      "english": "I eat breakfast.",
      "indonesian": "Saya makan sarapan.",
      "audioUrl": "/audio/japanese/lesson/食べる_001.mp3"
    }
  ]
}
```

## Enrichment Features

### Conjugation Module (`enrich/conjugation.js`)

Generates complete verb conjugation tables:

**Supported verb types:**
- Ichidan verbs (食べる → 食べ)
- Godan verbs (書く → 書き, 書か, 書こ)
- Suru verbs (勉強する)
- Kuru (来る) - irregular
- Aru (ある) - special negative form

**Generated forms:**
- Dictionary, masu, nai, ta, te
- Potential, passive, causative, causative-passive
- Imperative, volitional, conditional, provisional

### Pitch Accent Module (`enrich/pitch.js`)

Adds pitch accent information from external dictionary:

- Pattern type (heiban, atamadaka, nakadaka, odaka)
- Mora pattern (e.g., pattern: 2 means high on second mora)
- Human-readable descriptions

### Idioms Module (`enrich/idioms.js`)

Extracts actual Japanese idioms, proverbs, and set phrases from JMdict where the target word appears:

**Idiom types extracted:**
- **idiom** - Idiomatic expressions (慣用句)
- **proverb** - Proverbs and sayings (諺)
- **yojijukugo** - Four-character idioms (四字熟語)
- **expression** - Set phrases and collocations

Each idiom includes:
- Full phrase (kanji/kana)
- Reading (hiragana)
- English/Indonesian meaning
- Type classification

Examples are scored by relevance and frequency, with preference for common, learner-appropriate expressions.

### Filters Module (`enrich/filters.js`)

Removes inappropriate content:

- Vulgar language
- Archaic/obsolete terms
- Sensitive content
- Rare/obscure readings

Configurable for different learner audiences.

### Audio Module (`enrich/audio.js`)

Generates natural-sounding pronunciation audio:

- Uses OpenAI TTS API (gpt-4o-mini-tts)
- Voice: "alloy" (neutral Japanese)
- Format: MP3
- Output: `dist/audio/japanese/lesson/*.mp3`

Can be disabled with `--skip-audio` flag.

### Tags Module (`enrich/tags.js`)

Adds learning metadata:

- Difficulty tags (based on JLPT level)
- Word type tags (noun, verb, adjective, etc.)
- Frequency tags (common, rare, etc.)
- Usage context tags (formal, casual, etc.)

## Data Sources

### JMdict (Electronic Japanese-Multilingual Dictionary)

- **Source:** http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz
- **License:** Creative Commons Attribution-ShareAlike 3.0
- **Contents:** Word definitions, readings, parts of speech, priority tags

### KANJIDIC2 (Kanji Character Database)

- **Source:** http://www.edrdg.org/kanjidic/kanjidic2.xml.gz
- **License:** Creative Commons Attribution-ShareAlike 3.0
- **Contents:** Kanji meanings, readings, stroke counts, JLPT levels

### Tatoeba (Example Sentences)

- **Source:** https://downloads.tatoeba.org/
- **License:** Creative Commons Attribution 2.0
- **Contents:** Japanese-English sentence pairs with IDs and links

### OpenAI (Text-to-Speech)

- **API:** OpenAI TTS API
- **Model:** gpt-4o-mini-tts
- **Usage:** Optional audio generation (requires API key)

## Development

### Adding New JLPT Words

1. Add words to `jlpt_files/en/*.json` and `jlpt_files/id/*.json`
2. Run `npm run jp:words`

### Testing Single Word

```bash
node scripts/japanese/build.js --word=新しい単語
```

### Debugging

Enable verbose logging by modifying scripts or checking output files directly.

## License

Please respect the licenses of the data sources:

- JMdict and KANJIDIC2: Creative Commons Attribution-ShareAlike 3.0
- Tatoeba: Creative Commons Attribution 2.0

## Contributing

When contributing:

1. Ensure data sources remain properly attributed
2. Test with small subsets before full pipeline runs
3. Document any new enrichment modules
4. Follow existing code structure in `scripts/japanese/`

---

**Last Updated:** February 2026
