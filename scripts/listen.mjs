// # Listening with numbers: a report on a sung song
//
// Claude cannot hear, and you may not want to listen to ten songs to find a fault. This renders Happy Birthday in a
// language, writes it as a WAV file you can play, and prints for every sustained note the pitch that was meant, the
// pitch measured in the audio, and the difference in cents (a hundredth of a semitone). A note more than about 25
// cents off is marked, and so is any big jump in pitch. The measuring is in `lib/pitchtrack.js`.
//
// Usage: `node scripts/listen.mjs [language code] [bpm]`, for example `node scripts/listen.mjs es 120`.
import { writeFileSync } from 'node:fs';
import { sing, parseNotes } from '../lib/melody.js';
import { renderScore, encodeWav } from '../lib/render.js';
import { pitchTrack, pitchBetween, centsOff, largestJump } from '../lib/pitchtrack.js';
import { songFor } from '../lib/songs.js';

const [code = 'en', bpm = '100'] = process.argv.slice(2);
const { text, notes } = songFor(code);
const song = sing(text, parseNotes(notes), { bpm: Number(bpm) });
const samples = renderScore(song.score, { sampleRate: 44100 });
const track = pitchTrack(samples, 44100);
const file = `happy-birthday-${code}.wav`;
writeFileSync(file, Buffer.from(encodeWav(samples, 44100)));

console.log(`${code}: ${song.notes.length} notes, ${song.duration.toFixed(1)} s, written to ${file}`);
for (const [i, n] of song.notes.entries()) {
  if (n.end - n.start < 0.3) continue;
  const quarter = (n.end - n.start) / 4, mid = (n.start + n.end) / 2;
  const hz = pitchBetween(track, mid - quarter, mid + quarter);
  const meant = 440 * 2 ** ((n.midi - 69) / 12);
  const off = hz === null ? null : centsOff(hz, meant);
  const flag = off === null || Math.abs(off) > 25 ? '   <-- check' : '';
  console.log(`note ${String(i + 1).padStart(2)}  meant ${meant.toFixed(1).padStart(6)} Hz  heard ${hz === null ? '   none' : hz.toFixed(1).padStart(6)} Hz  ${off === null ? '' : `${off.toFixed(0)} cents`}${flag}`);
}
console.log(`biggest pitch jump between frames: ${largestJump(track).toFixed(1)} semitones`);
