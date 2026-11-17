// # Listening for vowels
//
// Next to pitch (`pitchtrack.js`), the other thing a vowel is made of is its **formants**: the resonances of the
// mouth, which show up as bumps in the spectrum. F1 follows how open the mouth is and F2 how far forward the tongue
// is, so measuring them on rendered audio answers "is this really an /i/?" without hearing it. `analysis.js` finds
// formants from the tract shape; this finds them from the **sound that came out**, the way a person would.
//
// ## The method: linear prediction
//
// A voiced sound is a buzz passed through resonances. Linear prediction (LPC) guesses each sample as a weighted sum
// of the previous few, and the weights that guess best describe the resonances: `a`, a short filter whose frequency
// response, `1 / |A(f)|`, is a smooth envelope of the spectrum with one peak for each formant. The weights come from
// the signal's autocorrelation by the Levinson-Durbin recursion. The audio is first low-passed (decimated to
// about 11 kHz, since formants live below 5 kHz) and pre-emphasised, which lifts the highs that voices lack.
import { decimate } from './pitchtrack.js';

// Levinson-Durbin: filter coefficients `a[1..order]` (with a[0] = 1) from the autocorrelation `r[0..order]`.
export function levinson(r, order) {
  const a = new Float64Array(order + 1);
  a[0] = 1;
  let error = r[0];
  for (let i = 1; i <= order; i++) {
    if (error <= 0) break;
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / error;
    const next = a.slice();
    for (let j = 1; j < i; j++) next[j] = a[j] + k * a[i - j];
    next[i] = k;
    a.set(next);
    error *= 1 - k * k;
  }
  return a;
}

// The envelope `1 / |A|` on a grid, from `from` to `to` Hz, and its peaks sorted by frequency.
export function lpcPeaks(a, rate, { from = 150, to = 5000, step = 10, count = 4 } = {}) {
  const env = [];
  for (let hz = from; hz <= to; hz += step) {
    let re = 0, im = 0;
    for (let k = 0; k < a.length; k++) {
      const w = (2 * Math.PI * hz * k) / rate;
      re += a[k] * Math.cos(w);
      im -= a[k] * Math.sin(w);
    }
    env.push({ hz, v: 1 / Math.hypot(re, im) });
  }
  const peaks = [];
  for (let i = 1; i < env.length - 1; i++) {
    if (env[i].v > env[i - 1].v && env[i].v >= env[i + 1].v) {
      // Parabola through the peak and its neighbours, for a finer frequency than the grid.
      const [y0, y1, y2] = [env[i - 1].v, env[i].v, env[i + 1].v];
      const shift = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) || 1);
      peaks.push(env[i].hz + shift * step);
    }
  }
  return peaks.slice(0, count);
}

// Formants of a stretch of samples (a vowel, or part of one): F1, F2, ... in Hz.
export function formantsOf(samples, rate, { order = 12, factor = 4, count = 4, emphasis = 0.97 } = {}) {
  const x = decimate(samples, factor);
  const r = rate / factor;
  const n = x.length;
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) y[i] = (x[i] - (i ? emphasis * x[i - 1] : 0)) * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
  const ac = new Float64Array(order + 1);
  for (let lag = 0; lag <= order; lag++) for (let i = lag; i < n; i++) ac[lag] += y[i] * y[i - lag];
  ac[0] *= 1.0001;          // a touch of noise so a pure tone does not make the recursion divide by zero
  return lpcPeaks(levinson(ac, order), r, { to: Math.min(5000, r / 2 - 200), count });
}
