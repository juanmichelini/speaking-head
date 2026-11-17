// # Listening for pitch
//
// We cannot hear the synthesiser, but we can render a score to samples and measure the **pitch** of what came out.
// That answers "does the sung A4 really come out at 440 Hz?" and "did the pitch jump or drop out between notes?",
// which are the faults that turn a melody into noise. It does not say whether the result sounds good.
//
// ## The method: YIN
//
// A voiced sound repeats: after one period the wave looks like itself. For each short frame, YIN compares the
// frame with a copy of itself shifted by a candidate period (the **lag**) and measures the difference. The shift
// where the difference is smallest is the period, and the pitch is the sample rate divided by it. Two touches make
// it reliable: the differences are divided by their running average so that a small lag does not win just by
// being small, and the first lag below a threshold is taken, not the overall minimum, which avoids picking an
// octave too low.
//
// Reference: de Cheveigné and Kawahara, *YIN, a fundamental frequency estimator for speech and music* (2002).
import { semitonesOf } from './prosody.js';

// Average groups of `factor` samples: a cheap low-pass and a smaller problem. Pitch lives well under 1 kHz.
export function decimate(samples, factor) {
  const out = new Float32Array(Math.floor(samples.length / factor));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let k = 0; k < factor; k++) sum += samples[i * factor + k];
    out[i] = sum / factor;
  }
  return out;
}

// The pitch of one frame, in Hz, or `null` if it is not voiced. `clarity` is 1 for a perfectly periodic frame.
export function yin(frame, rate, { minHz = 70, maxHz = 1000, threshold = 0.15 } = {}) {
  const half = Math.floor(frame.length / 2);
  const minLag = Math.max(2, Math.floor(rate / maxHz));
  const maxLag = Math.min(half - 1, Math.ceil(rate / minHz));
  const d = new Float32Array(maxLag + 2);
  for (let lag = 1; lag <= maxLag + 1; lag++) {
    let sum = 0;
    for (let i = 0; i < half; i++) { const x = frame[i] - frame[i + lag]; sum += x * x; }
    d[lag] = sum;
  }
  // The cumulative mean normalised difference.
  const n = new Float32Array(maxLag + 2);
  n[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag + 1; lag++) { running += d[lag]; n[lag] = running === 0 ? 1 : (d[lag] * lag) / running; }
  let lag = -1;
  for (let l = minLag; l <= maxLag; l++) {
    if (n[l] < threshold) { while (l + 1 <= maxLag && n[l + 1] < n[l]) l++; lag = l; break; }
  }
  if (lag < 0) return { hz: null, clarity: 0 };
  // Refine with a parabola through the minimum and its neighbours.
  const a = n[lag - 1], b = n[lag], c = n[lag + 1];
  const shift = a + c - 2 * b === 0 ? 0 : (a - c) / (2 * (a + c - 2 * b));
  return { hz: rate / (lag + shift), clarity: 1 - b };
}

// ## A pitch track
//
// One estimate every `hop` seconds. Silent frames are `null`, so a track says where the voice was and wasn't.
export function pitchTrack(samples, rate, { hop = 0.01, window = 0.04, silence = 0.01, factor = 4, ...options } = {}) {
  const small = decimate(samples, factor);
  const r = rate / factor;
  const size = Math.round(window * r), step = Math.round(hop * r);
  const track = [];
  for (let start = 0; start + size <= small.length; start += step) {
    const frame = small.subarray(start, start + size);
    let energy = 0;
    for (const x of frame) energy += x * x;
    const loud = Math.sqrt(energy / size) > silence;
    const { hz, clarity } = loud ? yin(frame, r, options) : { hz: null, clarity: 0 };
    track.push({ t: (start + size / 2) / r, hz, clarity });
  }
  return track;
}

// ## Comparing with what was meant
//
// The pitch the track has between two times (the median of the voiced frames, so one bad frame does not matter),
// and how far it is from an intended pitch in semitones.
export function pitchBetween(track, from, to) {
  const hz = track.filter((p) => p.hz && p.t >= from && p.t <= to).map((p) => p.hz).sort((a, b) => a - b);
  return hz.length ? hz[Math.floor(hz.length / 2)] : null;
}

export const centsOff = (hz, target) => 100 * semitonesOf(hz / target);

// The biggest jump between neighbouring frames, in semitones, counting only frames the tracker is `minClarity` sure
// of. A glide is small steps; a glitch is one big one. (Where a nasal or other weak sound begins, a tracker can land
// an octave off for a frame or two with a clarity a little lower than usual, which is why weak frames are left out.)
export function largestJump(track, minClarity = 0.93) {
  const sure = track.map((p) => (p.hz && p.clarity >= minClarity ? p : { ...p, hz: null }));
  let worst = 0;
  for (let i = 1; i < sure.length; i++) {
    if (sure[i].hz && sure[i - 1].hz) worst = Math.max(worst, Math.abs(semitonesOf(sure[i].hz / sure[i - 1].hz)));
  }
  return worst;
}
