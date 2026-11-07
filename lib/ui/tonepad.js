// # The tone pad
//
// A tone is a path through five pitch levels, 5 high to 1 low (Chao's tone letters `˥˦˧˨˩`). The pad is those
// five levels as rows: press on the row you start at, slide up or down, let go where you end. What you drew
// becomes a short list of levels (`[5, 1]` falls, `[2, 1, 4]` dips and rises), the same list the tokenizer reads
// from `ma˥˩`, so the pad needs nothing the rest of the stack does not already have.
import { toneLetters } from '../ipa.js';

export const LEVELS = 5;

// ## From a height to a level
//
// `y` is the fraction of the pad's height, 0 at the top. The top row is level 5.
export function levelOfY(y) {
  return Math.min(LEVELS, Math.max(1, LEVELS - Math.floor(Math.min(0.999999, Math.max(0, y)) * LEVELS)));
}

// ## From a path to a contour
//
// A hand wobbles, and a tone letter string has at most three levels in practice (`˨˩˦`). So: drop repeats, drop
// any level that continues in the direction it was already going, and if more than three turns remain keep the
// first, the biggest turn and the last.
export function contourOf(path) {
  const levels = path.filter((l, i) => i === 0 || l !== path[i - 1]);
  const kept = levels.filter((l, i) => i === 0 || i === levels.length - 1 || Math.sign(l - levels[i - 1]) !== Math.sign(levels[i + 1] - l));
  if (kept.length <= 3) return kept;
  const first = kept[0], last = kept[kept.length - 1];
  const middle = kept.slice(1, -1).reduce((best, l) => (Math.abs(l - first) + Math.abs(l - last) > Math.abs(best - first) + Math.abs(best - last) ? l : best));
  return [first, middle, last];
}

// A path of one level is a level tone: `[3]`.
export { toneLetters };

// ## The element
//
// `createTonePad(container, { onChange, onRelease })`. `onChange(levels)` runs while you slide and
// `onRelease(levels)` when you let go. It returns `set(levels)` to show a contour drawn by something else (a
// preset button, a score being played).
export function createTonePad(container, { onChange = () => {}, onRelease = () => {}, label = 'Tone: press and slide' } = {}) {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 300, H = 200, X0 = 40, X1 = 280;
  const rowY = (level) => ((LEVELS - level + 0.5) / LEVELS) * H;
  const el = (name, attrs = {}, text) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tone-pad', role: 'img', 'aria-label': label });
  for (let level = 1; level <= LEVELS; level++) {
    svg.append(el('line', { x1: X0, y1: rowY(level), x2: X1, y2: rowY(level), class: 'axis-tick' }));
    svg.append(el('text', { x: X0 - 12, y: rowY(level) + 8, 'text-anchor': 'middle', class: 'chart-symbol' }, toneLetters([level])));
  }
  const line = el('polyline', { class: 'tone-line', fill: 'none', points: '' });
  svg.append(line);
  container.append(svg);

  const show = (levels) => {
    const n = levels.length;
    const pts = levels.map((l, i) => `${n === 1 ? (X0 + X1) / 2 : X0 + 20 + (i / (n - 1)) * (X1 - X0 - 40)},${rowY(l)}`);
    // A single level is drawn as a short flat stroke.
    line.setAttribute('points', n === 1 ? `${X0 + 60},${rowY(levels[0])} ${X1 - 60},${rowY(levels[0])}` : pts.join(' '));
  };
  const levelAt = (event) => {
    const rect = svg.getBoundingClientRect();
    return levelOfY((event.clientY - rect.top) / rect.height);
  };
  let path = null;
  let contour = [3];
  svg.addEventListener('pointerdown', (event) => { path = [levelAt(event)]; svg.setPointerCapture(event.pointerId); contour = contourOf(path); show(contour); onChange(contour); event.preventDefault(); });
  svg.addEventListener('pointermove', (event) => { if (!path) return; path.push(levelAt(event)); contour = contourOf(path); show(contour); onChange(contour); });
  const up = () => { if (path) { path = null; onRelease(contour); } };
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);

  return { svg, set(levels) { contour = levels; show(levels); } };
}
