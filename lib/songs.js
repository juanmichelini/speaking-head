// # Songs: Happy Birthday in ten languages
//
// A song for lesson 10 is two lists of four lines: the **lyrics** as IPA, one syllable per note, and the **notes**
// (`C4:2` is middle C for two beats, see `melody.js`). Every language sings the same tune, but languages have
// different numbers of syllables in a line, so a line's notes are fitted by hand: where a language has an extra
// syllable the last note is split in two, and where it has one fewer the note is held longer.
//
// `checked` says whether someone who speaks the language has looked at the IPA. Most of it is written from the
// dictionaries in `data/dictionaries/` and from what the engine can say, so only the languages marked `true`
// should be trusted as pronunciation; the others are a first draft for a native speaker to fix.
//
// The test in `test/songs.test.js` checks that every line has exactly one note for each syllable.

// The four lines of the tune, for a line of six syllables (the English first line) and for seven.
const SIX = ['G4:0.75 G4:0.25 A4 G4 C5 B4:2', 'G4:0.75 G4:0.25 A4 G4 D5 C5:2', 'F5:0.75 F5:0.25 E5 C5 D5 C5:2'];
const SEVEN = 'G4:0.75 G4:0.25 G5 E5 C5 B4 A4:2';
const [FIRST, SECOND, LAST] = SIX;

export const HAPPY_BIRTHDAY = {
  en: { checked: true, lyrics: ['ˈhæpi ˈbɜːθdeɪ tə ˈjuː', 'ˈhæpi ˈbɜːθdeɪ tə ˈjuː', 'ˈhæpi ˈbɜːθdeɪ dɪɹ ˈmɛɹi', 'ˈhæpi ˈbɜːθdeɪ tə ˈjuː'], notes: [FIRST, SECOND, SEVEN, LAST] },
  es: { checked: true, lyrics: ['kum.ple.ˈa.ɲos fe.ˈlis', 'kum.ple.ˈa.ɲos fe.ˈlis', 'te de.se.ˈa.mos ˈto.dos', 'kum.ple.ˈa.ɲos fe.ˈlis'], notes: [FIRST, SECOND, SEVEN, LAST] },
  fr: { checked: false, lyrics: ['ʒwa.ˈjø a.ni.vɛʁ.ˈsɛʁ', 'ʒwa.ˈjø a.ni.vɛʁ.ˈsɛʁ', 'ʒwa.ˈjø a.ni.vɛʁ.ˈsɛʁ ma.ˈʁi', 'ʒwa.ˈjø a.ni.vɛʁ.ˈsɛʁ'], notes: [FIRST, SECOND, `${SEVEN.replace(' A4:2', ' A4 A4:2')}`, LAST] },
  pt: { checked: false, lyrics: ['pa.ɾa.ˈbẽs pɾa vo.ˈse', 'ˈnɛs.ta ˈda.ta ke.ˈɾi.da', 'ˈmũj.tas fe.li.si.ˈda.d͡ʒis', 'ˈmũj.tos ˈa.nos d͡ʒi ˈvi.da'], notes: [FIRST, 'G4:0.75 G4:0.25 A4 G4 D5 C5 C5:2', SEVEN, 'F5:0.75 F5:0.25 E5 C5 D5 C5 C5:2'] },
  id: { checked: false, lyrics: ['sə.ˈla.mat u.ˈlaŋ ta.ˈhun', 'sə.ˈla.mat u.ˈlaŋ ta.ˈhun', 'sə.ˈla.mat ˈpan.d͡ʒaŋ ˈu.mur', 'sə.ˈla.mat u.ˈlaŋ ta.ˈhun'], notes: [`${FIRST.replace(' B4:2', ' B4 B4:2')}`, `${SECOND.replace(' C5:2', ' C5 C5:2')}`, SEVEN, `${LAST.replace(' C5:2', ' C5 C5:2')}`] },
  ru: { checked: false, lyrics: ['z dnom raʒ.de.ˈni.ja te.ˈba', 'z dnom raʒ.de.ˈni.ja te.ˈba', 'z dnom raʒ.de.ˈni.ja ˈma.ʃa', 'z dnom raʒ.de.ˈni.ja te.ˈba'], notes: [`${FIRST.replace(' B4:2', ' B4 B4:2')}`, `${SECOND.replace(' C5:2', ' C5 C5:2')}`, SEVEN, `${LAST.replace(' C5:2', ' C5 C5:2')}`] },
  zh: { checked: false, lyrics: ['t͡ʃu ni ʃəŋ ɻi kwaɪ lɤ', 't͡ʃu ni ʃəŋ ɻi kwaɪ lɤ', 't͡ʃu ni ʃəŋ ɻi kwaɪ lɤ', 't͡ʃu ni ʃəŋ ɻi kwaɪ lɤ'], notes: [FIRST, SECOND, 'G4:0.75 G4:0.25 G5 E5 C5 B4:2', LAST] },
  hi: { checked: false, lyrics: ['d͡ʒən.mə.ˈdin mu.ˈbaː.rək ˈɦoː', 'd͡ʒən.mə.ˈdin mu.ˈbaː.rək ˈɦoː', 'd͡ʒən.mə.ˈdin mu.ˈbaː.rək ˈɦoː', 'd͡ʒən.mə.ˈdin mu.ˈbaː.rək ˈɦoː'], notes: [`${FIRST.replace(' B4:2', ' B4 B4:2')}`, `${SECOND.replace(' C5:2', ' C5 C5:2')}`, SEVEN, `${LAST.replace(' C5:2', ' C5 C5:2')}`] },
  bn: { checked: false, lyrics: ['ˈʃu.bʰo ˈd͡ʒon.mo.ˈdin', 'ˈʃu.bʰo ˈd͡ʒon.mo.ˈdin', 'ˈʃu.bʰo ˈd͡ʒon.mo.ˈdin to.ˈma.ke', 'ˈʃu.bʰo ˈd͡ʒon.mo.ˈdin'], notes: ['G4:0.75 G4:0.25 A4 G4 C5:2', 'G4:0.75 G4:0.25 A4 G4 D5:2', 'G4:0.75 G4:0.25 G5 E5 C5 B4 A4 A4:2', 'F5:0.75 F5:0.25 E5 C5 C5:2'] },
  ar: { checked: false, lyrics: ['ˈʕiːd miː.ˈlaːd sa.ˈʕiːd', 'ˈʕiːd miː.ˈlaːd sa.ˈʕiːd', 'ˈʕiːd miː.ˈlaːd sa.ˈʕiːd', 'ˈʕiːd miː.ˈlaːd sa.ˈʕiːd'], notes: ['G4:0.75 G4:0.25 A4 G4 C5:2', 'G4:0.75 G4:0.25 A4 G4 D5:2', 'G5:0.75 E5:0.25 C5 B4 A4:2', 'F5:0.75 F5:0.25 E5 C5 C5:2'] },
};

// The whole song for a language: the four lines joined, as the lesson's two text boxes want them.
export const songFor = (code) => {
  const s = HAPPY_BIRTHDAY[code] || HAPPY_BIRTHDAY.en;
  return { text: s.lyrics.join(' '), notes: s.notes.join(' '), checked: s.checked };
};
