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
      { pattern: 'V辞書形 + ことができる', meaning_en: 'can do', meaning_id: 'bisa melakukan', form: 'dict', suffix: 'ことができる' },
      { pattern: 'Vて形 + ください', meaning_en: 'please do', meaning_id: 'tolong lakukan', form: 'te', suffix: 'ください' },
      { pattern: 'Vます形 + たい', meaning_en: 'want to do', meaning_id: 'ingin melakukan', form: 'masu_stem', suffix: 'たい' },
      { pattern: 'Vて形 + います', meaning_en: 'be doing (polite)', meaning_id: 'sedang melakukan (sopan)', form: 'te', suffix: 'います' },
      { pattern: 'Vて形 + もいいです', meaning_en: 'may do / it\'s okay to do', meaning_id: 'boleh melakukan', form: 'te', suffix: 'もいいです' },
      { pattern: 'Vない形 + ないでください', meaning_en: 'please don\'t do', meaning_id: 'tolong jangan melakukan', form: 'nai', suffix: 'でください' },
      { pattern: 'Vて形 + はいけません', meaning_en: 'must not do', meaning_id: 'tidak boleh melakukan', form: 'te', suffix: 'はいけません' },
      { pattern: 'Vた形 + ことがあります', meaning_en: 'have done before', meaning_id: 'pernah melakukan', form: 'ta', suffix: 'ことがあります' },
      { pattern: 'Vます形 + ましょう', meaning_en: 'let\'s do', meaning_id: 'mari kita', form: 'masu_stem', suffix: 'ましょう' },
      { pattern: 'Vた形 + り、...たりします', meaning_en: 'do things like...', meaning_id: 'melakukan hal-hal seperti...', form: 'ta', suffix: 'り、...たりします' },
      { pattern: 'Vて形 + から', meaning_en: 'after doing', meaning_id: 'setelah melakukan', form: 'te', suffix: 'から' },
      { pattern: 'Vない形 + ないで', meaning_en: 'without doing', meaning_id: 'tanpa melakukan', form: 'nai', suffix: 'で' },
      { pattern: 'Vます形 + たくない', meaning_en: 'don\'t want to do', meaning_id: 'tidak ingin melakukan', form: 'masu_stem', suffix: 'たくない' },
      { pattern: 'Vます形 + ながら', meaning_en: 'while doing', meaning_id: 'sambil melakukan', form: 'masu_stem', suffix: 'ながら' },
      { pattern: 'Vます形 + すぎる', meaning_en: 'do too much', meaning_id: 'terlalu banyak melakukan', form: 'masu_stem', suffix: 'すぎる' },
    ],
    noun: [
      { pattern: 'N + です', meaning_en: 'is', meaning_id: 'adalah', form: 'dict', suffix: 'です' },
      { pattern: 'N + じゃありません', meaning_en: 'is not', meaning_id: 'bukan', form: 'dict', suffix: 'じゃありません' },
      { pattern: 'N + でした', meaning_en: 'was', meaning_id: 'adalah (lampau)', form: 'dict', suffix: 'でした' },
      { pattern: 'N + じゃありませんでした', meaning_en: 'was not', meaning_id: 'bukan (lampau)', form: 'dict', suffix: 'じゃありませんでした' },
      { pattern: 'N + の', meaning_en: 'possessive / of', meaning_id: 'milik / dari', form: 'dict', suffix: 'の' },
      { pattern: 'N + も', meaning_en: 'also / too', meaning_id: 'juga', form: 'dict', suffix: 'も' },
      { pattern: 'N + が好きです', meaning_en: 'like', meaning_id: 'suka', form: 'dict', suffix: 'が好きです' },
      { pattern: 'N + が嫌いです', meaning_en: 'dislike', meaning_id: 'tidak suka', form: 'dict', suffix: 'が嫌いです' },
      { pattern: 'N + がほしい', meaning_en: 'want', meaning_id: 'ingin', form: 'dict', suffix: 'がほしい' },
      { pattern: 'N + について', meaning_en: 'about / regarding', meaning_id: 'tentang', form: 'dict', suffix: 'について' },
    ],
    adjective_na: [
      { pattern: 'NA + です', meaning_en: 'is', meaning_id: 'adalah', form: 'dict', suffix: 'です' },
      { pattern: 'NA + じゃありません', meaning_en: 'is not', meaning_id: 'tidak', form: 'dict', suffix: 'じゃありません' },
      { pattern: 'NA + でした', meaning_en: 'was', meaning_id: 'adalah (lampau)', form: 'dict', suffix: 'でした' },
      { pattern: 'NA + じゃありませんでした', meaning_en: 'was not', meaning_id: 'tidak (lampau)', form: 'dict', suffix: 'じゃありませんでした' },
      { pattern: 'NA + な + N', meaning_en: 'adjective + noun', meaning_id: 'kata sifat + kata benda', form: 'dict', suffix: 'な' },
    ],
    adjective_i: [
      { pattern: 'A + です', meaning_en: 'is (polite)', meaning_id: 'adalah (sopan)', form: 'dict', suffix: 'です' },
      { pattern: 'A語幹 + くない', meaning_en: 'is not', meaning_id: 'tidak', form: 'adj_i_stem', suffix: 'くない' },
      { pattern: 'A語幹 + かった', meaning_en: 'was', meaning_id: 'adalah (lampau)', form: 'adj_i_stem', suffix: 'かった' },
      { pattern: 'A語幹 + くなかった', meaning_en: 'was not', meaning_id: 'tidak (lampau)', form: 'adj_i_stem', suffix: 'くなかった' },
      { pattern: 'A語幹 + くて', meaning_en: 'and (連用形)', meaning_id: 'dan', form: 'adj_i_stem', suffix: 'くて' },
    ],
  },
  N4: {
    verb: [
      { pattern: 'V辞書形 + ことができる', meaning_en: 'can do', meaning_id: 'bisa melakukan', form: 'dict', suffix: 'ことができる' },
      { pattern: 'Vて形 + いる', meaning_en: 'be doing / have done', meaning_id: 'sedang melakukan', form: 'te', suffix: 'いる' },
      { pattern: 'Vない形 + でください', meaning_en: 'please don\'t', meaning_id: 'tolong jangan', form: 'nai', suffix: 'でください' },
      { pattern: 'Vた形 + あとで', meaning_en: 'after doing', meaning_id: 'setelah melakukan', form: 'ta', suffix: 'あとで' },
      { pattern: 'Vる前に', meaning_en: 'before doing', meaning_id: 'sebelum melakukan', form: 'dict', suffix: '前に' },
      { pattern: 'Vて形 + おく', meaning_en: 'do in advance', meaning_id: 'melakukan sebelumnya', form: 'te', suffix: 'おく' },
      { pattern: 'Vて形 + みる', meaning_en: 'try doing', meaning_id: 'mencoba melakukan', form: 'te', suffix: 'みる' },
      { pattern: 'Vて形 + しまう', meaning_en: 'end up doing / finish doing', meaning_id: 'selesai melakukan', form: 'te', suffix: 'しまう' },
      { pattern: 'Vて形 + あげる', meaning_en: 'do for someone', meaning_id: 'melakukan untuk seseorang', form: 'te', suffix: 'あげる' },
      { pattern: 'Vて形 + もらう', meaning_en: 'have someone do', meaning_id: 'meminta seseorang melakukan', form: 'te', suffix: 'もらう' },
      { pattern: 'Vて形 + くれる', meaning_en: 'someone does for me', meaning_id: 'seseorang melakukan untuk saya', form: 'te', suffix: 'くれる' },
      { pattern: 'Vない形 + なければならない', meaning_en: 'must do', meaning_id: 'harus melakukan', form: 'nai', suffix: 'ければならない' },
      { pattern: 'Vない形 + なくてもいい', meaning_en: 'don\'t have to do', meaning_id: 'tidak perlu melakukan', form: 'nai', suffix: 'くてもいい' },
      { pattern: 'Vます形 + やすい', meaning_en: 'easy to do', meaning_id: 'mudah untuk melakukan', form: 'masu_stem', suffix: 'やすい' },
      { pattern: 'Vます形 + にくい', meaning_en: 'hard to do', meaning_id: 'sulit untuk melakukan', form: 'masu_stem', suffix: 'にくい' },
      { pattern: 'Vた形 + ばかり', meaning_en: 'just did', meaning_id: 'baru saja melakukan', form: 'ta', suffix: 'ばかり' },
      { pattern: 'Vた形 + ほうがいい', meaning_en: 'had better do', meaning_id: 'lebih baik melakukan', form: 'ta', suffix: 'ほうがいい' },
      { pattern: 'Vない形 + ないほうがいい', meaning_en: 'had better not do', meaning_id: 'lebih baik tidak melakukan', form: 'nai', suffix: 'ほうがいい' },
    ],
    noun: [
      { pattern: 'N + です', meaning_en: 'is', meaning_id: 'adalah', form: 'dict', suffix: 'です' },
      { pattern: 'N + だった', meaning_en: 'was (plain)', meaning_id: 'adalah (kasual lampau)', form: 'dict', suffix: 'だった' },
      { pattern: 'N + じゃない', meaning_en: 'is not (plain)', meaning_id: 'bukan (kasual)', form: 'dict', suffix: 'じゃない' },
      { pattern: 'N + だったら', meaning_en: 'if it is', meaning_id: 'jika', form: 'dict', suffix: 'だったら' },
      { pattern: 'N + みたい', meaning_en: 'like / seems like', meaning_id: 'seperti', form: 'dict', suffix: 'みたい' },
      { pattern: 'N + らしい', meaning_en: 'seems / I heard', meaning_id: 'sepertinya', form: 'dict', suffix: 'らしい' },
      { pattern: 'N + によって', meaning_en: 'depending on / by means of', meaning_id: 'tergantung pada', form: 'dict', suffix: 'によって' },
      { pattern: 'N + のために', meaning_en: 'for the sake of', meaning_id: 'untuk', form: 'dict', suffix: 'のために' },
    ],
    adjective_na: [
      { pattern: 'NA + だった', meaning_en: 'was (plain)', meaning_id: 'adalah (kasual lampau)', form: 'dict', suffix: 'だった' },
      { pattern: 'NA + じゃない', meaning_en: 'is not (plain)', meaning_id: 'tidak (kasual)', form: 'dict', suffix: 'じゃない' },
      { pattern: 'NA + そう', meaning_en: 'looks / seems', meaning_id: 'tampak', form: 'dict', suffix: 'そう' },
      { pattern: 'NA + に', meaning_en: 'adverbial form', meaning_id: 'bentuk adverbia', form: 'dict', suffix: 'に' },
    ],
    adjective_i: [
      { pattern: 'A語幹 + くない', meaning_en: 'not', meaning_id: 'tidak', form: 'adj_i_stem', suffix: 'くない' },
      { pattern: 'A語幹 + そう', meaning_en: 'looks', meaning_id: 'tampak', form: 'adj_i_stem', suffix: 'そう' },
      { pattern: 'A語幹 + すぎる', meaning_en: 'too', meaning_id: 'terlalu', form: 'adj_i_stem', suffix: 'すぎる' },
      { pattern: 'A語幹 + ければ', meaning_en: 'if', meaning_id: 'jika', form: 'adj_i_stem', suffix: 'ければ' },
    ],
  },
  N3: {
    verb: [
      { pattern: 'Vば形', meaning_en: 'if / when', meaning_id: 'jika', form: 'dict', suffix: 'ば' },
      { pattern: 'Vる + と', meaning_en: 'when / if', meaning_id: 'ketika / jika', form: 'dict', suffix: 'と' },
      { pattern: 'Vた形 + ら', meaning_en: 'if / when', meaning_id: 'jika / ketika', form: 'ta', suffix: 'ら' },
      { pattern: 'Vよう形 (volitional)', meaning_en: 'let\'s / will try to', meaning_id: 'mari / akan mencoba', form: 'dict', suffix: 'よう' },
      { pattern: 'Vられる形 (passive)', meaning_en: 'be done to', meaning_id: 'dilakukan (pasif)', form: 'passive', suffix: '' },
      { pattern: 'Vさせる形 (causative)', meaning_en: 'make / let someone do', meaning_id: 'membuat seseorang melakukan', form: 'causative', suffix: '' },
      { pattern: 'Vられる形 (potential)', meaning_en: 'can do', meaning_id: 'bisa melakukan', form: 'potential', suffix: '' },
      { pattern: 'Vて形 + いく', meaning_en: 'go on doing / continue to', meaning_id: 'terus melakukan', form: 'te', suffix: 'いく' },
      { pattern: 'Vて形 + くる', meaning_en: 'come to do / have been doing', meaning_id: 'mulai melakukan', form: 'te', suffix: 'くる' },
      { pattern: 'Vない形 + ずに', meaning_en: 'without doing', meaning_id: 'tanpa melakukan', form: 'nai', suffix: 'ずに' },
      { pattern: 'Vます形 + そうだ', meaning_en: 'looks like about to', meaning_id: 'sepertinya akan', form: 'masu_stem', suffix: 'そうだ' },
      { pattern: 'Vた形 + ところだ', meaning_en: 'just did', meaning_id: 'baru saja melakukan', form: 'ta', suffix: 'ところだ' },
      { pattern: 'Vる + ところだ', meaning_en: 'about to do', meaning_id: 'akan melakukan', form: 'dict', suffix: 'ところだ' },
      { pattern: 'Vて形 + いるところだ', meaning_en: 'in the middle of doing', meaning_id: 'sedang dalam proses melakukan', form: 'te', suffix: 'いるところだ' },
      { pattern: 'Vる + つもりだ', meaning_en: 'intend to do', meaning_id: 'berniat melakukan', form: 'dict', suffix: 'つもりだ' },
      { pattern: 'Vる + はずだ', meaning_en: 'should / supposed to', meaning_id: 'seharusnya', form: 'dict', suffix: 'はずだ' },
      { pattern: 'Vる + ようだ', meaning_en: 'seems / appears', meaning_id: 'sepertinya', form: 'dict', suffix: 'ようだ' },
      { pattern: 'Vた形 + ままで', meaning_en: 'remain in state of', meaning_id: 'tetap dalam keadaan', form: 'ta', suffix: 'ままで' },
    ],
    noun: [
      { pattern: 'N + というのは', meaning_en: 'what is called / means', meaning_id: 'yang disebut', form: 'dict', suffix: 'というのは' },
      { pattern: 'N + に対して', meaning_en: 'towards / in contrast to', meaning_id: 'terhadap', form: 'dict', suffix: 'に対して' },
      { pattern: 'N + に関して', meaning_en: 'regarding / concerning', meaning_id: 'mengenai', form: 'dict', suffix: 'に関して' },
      { pattern: 'N + のような', meaning_en: 'like / such as', meaning_id: 'seperti', form: 'dict', suffix: 'のような' },
      { pattern: 'N + のせいで', meaning_en: 'because of (negative)', meaning_id: 'karena (negatif)', form: 'dict', suffix: 'のせいで' },
      { pattern: 'N + のおかげで', meaning_en: 'thanks to', meaning_id: 'berkat', form: 'dict', suffix: 'のおかげで' },
    ],
    adjective_na: [
      { pattern: 'NA + である', meaning_en: 'is (formal)', meaning_id: 'adalah (formal)', form: 'dict', suffix: 'である' },
      { pattern: 'NA + になる', meaning_en: 'become', meaning_id: 'menjadi', form: 'dict', suffix: 'になる' },
      { pattern: 'NA + にする', meaning_en: 'make / decide on', meaning_id: 'membuat / memutuskan', form: 'dict', suffix: 'にする' },
    ],
    adjective_i: [
      { pattern: 'A語幹 + ければ', meaning_en: 'if', meaning_id: 'jika', form: 'adj_i_stem', suffix: 'ければ' },
      { pattern: 'A語幹 + くなる', meaning_en: 'become', meaning_id: 'menjadi', form: 'adj_i_stem', suffix: 'くなる' },
      { pattern: 'A語幹 + くする', meaning_en: 'make', meaning_id: 'membuat', form: 'adj_i_stem', suffix: 'くする' },
    ],
  },
  N2: {
    verb: [
      { pattern: 'Vずにはいられない', meaning_en: 'cannot help but do', meaning_id: 'tidak bisa tidak melakukan', form: 'nai', suffix: 'ずにはいられない' },
      { pattern: 'Vざるを得ない', meaning_en: 'cannot help but do / have no choice but', meaning_id: 'terpaksa melakukan', form: 'nai', suffix: 'ざるを得ない' },
      { pattern: 'Vる + にあたって', meaning_en: 'on the occasion of', meaning_id: 'pada saat', form: 'dict', suffix: 'にあたって' },
      { pattern: 'Vる + にともなって', meaning_en: 'along with / as', meaning_id: 'seiring dengan', form: 'dict', suffix: 'にともなって' },
      { pattern: 'Vた形 + とたん(に)', meaning_en: 'just as / the moment', meaning_id: 'begitu', form: 'ta', suffix: 'とたん(に)' },
      { pattern: 'Vる + かわりに', meaning_en: 'instead of', meaning_id: 'sebagai gantinya', form: 'dict', suffix: 'かわりに' },
      { pattern: 'Vる + わけがない', meaning_en: 'there\'s no way', meaning_id: 'tidak mungkin', form: 'dict', suffix: 'わけがない' },
      { pattern: 'Vる + わけではない', meaning_en: 'it doesn\'t mean that', meaning_id: 'bukan berarti', form: 'dict', suffix: 'わけではない' },
      { pattern: 'Vる + ことにする', meaning_en: 'decide to do', meaning_id: 'memutuskan untuk melakukan', form: 'dict', suffix: 'ことにする' },
      { pattern: 'Vる + ことになる', meaning_en: 'it has been decided that', meaning_id: 'diputuskan bahwa', form: 'dict', suffix: 'ことになる' },
      { pattern: 'Vた形 + ばかりだ', meaning_en: 'nothing but / only', meaning_id: 'hanya', form: 'ta', suffix: 'ばかりだ' },
      { pattern: 'Vる + べきだ', meaning_en: 'should / ought to', meaning_id: 'seharusnya', form: 'dict', suffix: 'べきだ' },
      { pattern: 'Vる + しかない', meaning_en: 'have no choice but to', meaning_id: 'tidak ada pilihan selain', form: 'dict', suffix: 'しかない' },
      { pattern: 'Vる + に違いない', meaning_en: 'must be / no doubt', meaning_id: 'pasti', form: 'dict', suffix: 'に違いない' },
      { pattern: 'Vる + におい て', meaning_en: 'in / at (formal)', meaning_id: 'dalam (formal)', form: 'dict', suffix: 'において' },
    ],
    noun: [
      { pattern: 'N + にとって', meaning_en: 'to / for (someone)', meaning_id: 'bagi', form: 'dict', suffix: 'にとって' },
      { pattern: 'N + として', meaning_en: 'as / in the capacity of', meaning_id: 'sebagai', form: 'dict', suffix: 'として' },
      { pattern: 'N + にもかかわらず', meaning_en: 'despite / in spite of', meaning_id: 'meskipun', form: 'dict', suffix: 'にもかかわらず' },
      { pattern: 'N + をはじめ', meaning_en: 'starting with / including', meaning_id: 'dimulai dengan', form: 'dict', suffix: 'をはじめ' },
      { pattern: 'N + をめぐって', meaning_en: 'concerning / regarding', meaning_id: 'mengenai', form: 'dict', suffix: 'をめぐって' },
      { pattern: 'N + に基づいて', meaning_en: 'based on', meaning_id: 'berdasarkan', form: 'dict', suffix: 'に基づいて' },
    ],
    adjective_na: [
      { pattern: 'NA + であれば', meaning_en: 'if it is', meaning_id: 'jika', form: 'dict', suffix: 'であれば' },
      { pattern: 'NA + であっても', meaning_en: 'even if', meaning_id: 'meskipun', form: 'dict', suffix: 'であっても' },
    ],
    adjective_i: [
      { pattern: 'A語幹 + かろうが', meaning_en: 'whether or not', meaning_id: 'entah...atau tidak', form: 'adj_i_stem', suffix: 'かろうが' },
    ],
  },
  N1: {
    verb: [
      { pattern: 'Vる + べく', meaning_en: 'in order to / for the purpose of', meaning_id: 'untuk', form: 'dict', suffix: 'べく' },
      { pattern: 'Vる + が早いか', meaning_en: 'as soon as', meaning_id: 'begitu', form: 'dict', suffix: 'が早いか' },
      { pattern: 'Vる + までもない', meaning_en: 'no need to', meaning_id: 'tidak perlu', form: 'dict', suffix: 'までもない' },
      { pattern: 'Vる + に足る', meaning_en: 'worth doing', meaning_id: 'layak untuk melakukan', form: 'dict', suffix: 'に足る' },
      { pattern: 'Vる + をもって', meaning_en: 'by means of / with', meaning_id: 'dengan', form: 'dict', suffix: 'をもって' },
      { pattern: 'Vる + いかんによっては', meaning_en: 'depending on', meaning_id: 'tergantung pada', form: 'dict', suffix: 'いかんによっては' },
      { pattern: 'Vる + ものなら', meaning_en: 'if by any chance', meaning_id: 'jika', form: 'dict', suffix: 'ものなら' },
      { pattern: 'Vる + まじき', meaning_en: 'should not / ought not', meaning_id: 'tidak seharusnya', form: 'dict', suffix: 'まじき' },
      { pattern: 'Vんばかりに', meaning_en: 'as if about to', meaning_id: 'seolah-olah akan', form: 'dict', suffix: 'んばかりに' },
      { pattern: 'Vる + か～まいか', meaning_en: 'whether or not to', meaning_id: 'apakah...atau tidak', form: 'dict', suffix: 'か～まいか' },
    ],
    noun: [
      { pattern: 'N + たるもの', meaning_en: 'being / as a', meaning_id: 'sebagai', form: 'dict', suffix: 'たるもの' },
      { pattern: 'N + ならでは', meaning_en: 'unique to / only', meaning_id: 'khas', form: 'dict', suffix: 'ならでは' },
      { pattern: 'N + ともなると', meaning_en: 'when it comes to', meaning_id: 'ketika datang ke', form: 'dict', suffix: 'ともなると' },
      { pattern: 'N + をものともせず', meaning_en: 'in defiance of', meaning_id: 'melawan', form: 'dict', suffix: 'をものともせず' },
    ],
    adjective_na: [],
    adjective_i: [],
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
 * @param {string}      form        - 'dict' | 'te' | 'masu_stem' | 'nai' | 'ta' | 'passive' | 'causative' | 'potential' | 'adj_i_stem'
 * @param {string}      word        - Dictionary form
 * @param {object|null} conjugation - Conjugation object from conjugation.js
 */
function resolveForm(form, word, conjugation) {
  switch (form) {
    case 'dict':
      return word;
    case 'te':
      return conjugation?.te ?? null;
    case 'ta':
      return conjugation?.ta ?? null;
    case 'masu_stem': {
      const masu = conjugation?.masu;
      return masu ? masu.replace(/ます$/, '') : null;
    }
    case 'nai':
      return conjugation?.nai ?? null;
    case 'passive':
      return conjugation?.passive ?? null;
    case 'causative':
      return conjugation?.causative ?? null;
    case 'potential':
      return conjugation?.potential ?? null;
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
  }).filter((item) => item.example !== null);
}
