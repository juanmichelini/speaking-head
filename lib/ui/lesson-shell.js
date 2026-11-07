// # The shell every lesson instrument shares
//
// A vowel lesson and a consonant lesson differ in two things: the surface you point at (a chart, a line)
// and how a position becomes a frame or a score. Everything else is the same, and lives here:
//
// - the synth, made on the first gesture (browsers refuse audio before that)
// - a **held** sound: starts on press, follows the pointer, releases on lift. Starting takes a moment (the
//   engine is fetched and compiled), so `held` records whether the press is still going when it is ready
// - a score played while the tract picture follows it, one at a time
// - the pitch slider (and the tenseness slider, on pages that have one), the Stop and Download buttons; a page
//   without one of these simply leaves it out
//
// `createShell({ onControl })` returns the pieces; `onControl()` runs after a slider moves, so a held sound
// can pick up the new value. The state it keeps is `shell.state.f0` and `shell.state.tenseness`.
import { lazySynth, playAnimated, downloadWav, log, unlog, round } from './demo.js';
import { normalizeScore } from '../score.js';
import { t } from '../i18n.js';

const PITCH = [70, 400];

// ## Voice quality on top of a gesture
//
// A vowel has one tenseness. A consonant gesture sets its own along the way (a voiced fricative is breathier
// than the vowel around it on purpose), so for a consonant the slider cannot simply replace it. Instead the
// slider moves every tenseness in a frame or a score by the same amount away from the neutral 0.6: the
// gestures keep their shape and the whole voice gets tighter or breathier.
const NEUTRAL_TENSENESS = 0.6;
const shiftedBy = (f, delta) => ({ ...f, tenseness: Math.min(1, Math.max(0.05, f.tenseness + delta)) });
export function withTenseness(x, tenseness) {
  const delta = tenseness - NEUTRAL_TENSENESS;
  if (!x.keyframes) return shiftedBy(x, delta);
  const n = normalizeScore(x);
  return { ...x, keyframes: n.keyframes.map((k) => shiftedBy(k, delta)), duration: n.duration };
}

export function createShell({ f0 = 130, tenseness = 0.6, pitch = true, quality = true, onControl = () => {}, onStop = () => {}, downloadScore, downloadName, downloadOptions = () => ({}) } = {}) {
  const $ = (id) => document.getElementById(id);
  const synthHolder = lazySynth();
  const state = { f0, tenseness };
  let synth = null;
  let held = false;
  let heldLive = false;
  let playing = null;

  const getSynth = async () => {
    try { synth = await synthHolder.get(); return synth; }
    catch (error) { $('status').textContent = t('common.audioError', { message: error.message }); return null; }
  };

  // ## A held sound
  //
  // `frame` is a function so the sound reads the latest state when it finally starts.
  async function startHeld(frame) {
    held = true;
    if (!(await getSynth()) || !held) return false;
    heldLive = true;
    $('status').textContent = '';
    synth.live(frame());
    return true;
  }
  const updateHeld = (frame) => { if (synth && heldLive) synth.live(frame); };
  const isHeld = () => held;
  const isLive = () => heldLive;
  function stopHeld() { held = false; if (synth && heldLive) { heldLive = false; synth.release(); } }

  // ## A played score
  //
  // Starts a new one over any that is still playing. Resolves when it ends.
  async function play(score, onFrame) {
    if (playing) playing.cancel();
    if (!(await getSynth())) return;
    playing = playAnimated(synth, score, onFrame);
    await playing.done;
  }
  const cancelPlaying = () => { if (playing) playing.cancel(); };

  // ## Controls
  const showPitch = () => { $('pitchOut').textContent = `${Math.round(state.f0)} Hz`; };
  const showVoice = () => { $('tensenessOut').textContent = t(state.tenseness < 0.35 ? 'voice.breathy' : state.tenseness > 0.8 ? 'voice.pressed' : 'voice.modal'); };
  if (pitch && $('pitch')) {
    $('pitch').addEventListener('input', (e) => { state.f0 = log(Number(e.target.value), ...PITCH); showPitch(); onControl(); });
    $('pitch').value = unlog(state.f0, ...PITCH);
    showPitch();
  }
  if (quality && $('tenseness')) {
    $('tenseness').addEventListener('input', (e) => { state.tenseness = Number(e.target.value); showVoice(); onControl(); });
    showVoice();
  }
  $('stop').addEventListener('click', () => { cancelPlaying(); stopHeld(); onStop(); $('status').textContent = ''; });
  if (downloadScore) $('download').addEventListener('click', () => { const score = downloadScore(); if (score) downloadWav(score, downloadName(state), downloadOptions()); });

  return { state, getSynth, startHeld, updateHeld, stopHeld, isHeld, isLive, play, cancelPlaying, synth: () => synth, setStatus: (s) => { $('status').textContent = s; } };
}

export { round };
