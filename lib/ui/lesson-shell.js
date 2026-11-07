// # The shell every lesson instrument shares
//
// A vowel lesson and a consonant lesson differ in two things: the surface you point at (a chart, a line)
// and how a position becomes a frame or a score. Everything else is the same, and lives here:
//
// - the synth, made on the first gesture (browsers refuse audio before that)
// - a **held** sound: starts on press, follows the pointer, releases on lift. Starting takes a moment (the
//   engine is fetched and compiled), so `held` records whether the press is still going when it is ready
// - a score played while the tract picture follows it, one at a time
// - the pitch slider (and the tenseness slider, on pages that have one), the Stop and Download buttons
//
// `createShell({ onControl })` returns the pieces; `onControl()` runs after a slider moves, so a held sound
// can pick up the new value. The state it keeps is `shell.state.f0` and `shell.state.tenseness`.
import { lazySynth, playAnimated, downloadWav, log, unlog, round } from './demo.js';
import { t } from '../i18n.js';

const PITCH = [70, 400];

export function createShell({ f0 = 130, tenseness = 0.6, onControl = () => {}, onStop = () => {}, downloadScore, downloadName } = {}) {
  const $ = (id) => document.getElementById(id);
  const synthHolder = lazySynth();
  const state = { f0, tenseness };
  let synth = null;
  let held = false;
  let heldLive = false;
  let playing = null;

  const getSynth = async () => {
    try { synth = await synthHolder.get(); $('status').textContent = ''; return synth; }
    catch (error) { $('status').textContent = t('common.audioError', { message: error.message }); return null; }
  };

  // ## A held sound
  //
  // `frame` is a function so the sound reads the latest state when it finally starts.
  async function startHeld(frame) {
    held = true;
    if (!(await getSynth()) || !held) return false;
    heldLive = true;
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
  $('pitch').addEventListener('input', (e) => { state.f0 = log(Number(e.target.value), ...PITCH); showPitch(); onControl(); });
  $('pitch').value = unlog(state.f0, ...PITCH);
  showPitch();
  if ($('tenseness')) {
    $('tenseness').addEventListener('input', (e) => { state.tenseness = Number(e.target.value); showVoice(); onControl(); });
    showVoice();
  }
  $('stop').addEventListener('click', () => { cancelPlaying(); stopHeld(); onStop(); $('status').textContent = ''; });
  $('download').addEventListener('click', () => downloadWav(downloadScore(), downloadName(state)));

  return { state, getSynth, startHeld, updateHeld, stopHeld, isHeld, isLive, play, cancelPlaying, setStatus: (s) => { $('status').textContent = s; } };
}

export { round };
