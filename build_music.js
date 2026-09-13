// Dev-only, not shipped. Converts rain.mid into the TUNE/CHORDS array literals pasted into
// index.html's background-music section — run by hand whenever rain.mid changes:
//   node build_music.js
// Reads track 2 (monophonic melody) as [freq,beats] pairs and track 1 (polyphonic harmony,
// up to 4-note chords) as [freqs[],beats] steps, both against one shared absolute timeline
// (loopEndTick) so the two voices repeat in lockstep instead of drifting against each other.
// A freq of 0 (melody) / an empty freqs[] (chords) is an explicit rest — silence, not a note —
// used for a track's lead-in pickup silence and any real gap between two notes. Source is a
// humanized performance recording, not quantized, so onsets/ends are snapped to a 16th-note
// grid before grouping — raw ticks produce noisy fractional beats (e.g. 0.018, a ~13ms
// timing-jitter blip, not a real note or rest).
const fs = require('fs');
const buf = fs.readFileSync('rain.mid');

let pos = 0;
function u8() { return buf[pos++]; }
function u16() { const v = buf.readUInt16BE(pos); pos += 2; return v; }
function u32() { const v = buf.readUInt32BE(pos); pos += 4; return v; }
function str(n) { const s = buf.toString('ascii', pos, pos + n); pos += n; return s; }
function varLen() {
  let v = 0, b;
  do { b = u8(); v = (v << 7) | (b & 0x7f); } while (b & 0x80);
  return v;
}

str(4); u32();
u16(); // format
const ntrks = u16();
const division = u16();

let tempoUsPerQn = 500000;
const tracks = [];

for (let t = 0; t < ntrks; t++) {
  str(4);
  const len = u32();
  const trackEnd = pos + len;
  let running = null, tick = 0;
  const events = [];
  while (pos < trackEnd) {
    tick += varLen();
    let status = buf[pos];
    if (status & 0x80) { pos++; running = status; } else { status = running; }
    const type = status & 0xf0;
    if (status === 0xff) {
      const metaType = u8();
      const mlen = varLen();
      const data = buf.slice(pos, pos + mlen); pos += mlen;
      if (metaType === 0x51) tempoUsPerQn = (data[0] << 16) | (data[1] << 8) | data[2];
    } else if (status === 0xf0 || status === 0xf7) {
      pos += varLen();
    } else if (type === 0x90 || type === 0x80) {
      const pitch = u8(), vel = u8();
      events.push({ tick, type: type === 0x90 && vel > 0 ? 'on' : 'off', pitch });
    } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
      pos += 2;
    } else if (type === 0xc0 || type === 0xd0) {
      pos += 1;
    } else {
      break;
    }
  }
  pos = trackEnd;
  tracks.push(events);
}

const bpm = 60000000 / tempoUsPerQn;
function pitchToFreq(p) { return Math.round(440 * Math.pow(2, (p - 69) / 12)); }
function round(n) { return Math.round(n * 1000) / 1000; }

function extractNotes(events) {
  const active = {};
  const notes = [];
  for (const e of events) {
    if (e.type === 'on') (active[e.pitch] = active[e.pitch] || []).push(e.tick);
    else {
      const q = active[e.pitch];
      if (q && q.length) notes.push({ start: q.shift(), end: e.tick, pitch: e.pitch });
    }
  }
  notes.sort((a, b) => a.start - b.start);
  return notes;
}

const gridTicks = division / 4; // 16th note
function snap(tick) { return Math.round(tick / gridTicks) * gridTicks; }
function quantize(notes) {
  for (const n of notes) {
    n.start = snap(n.start);
    n.end = Math.max(n.start + gridTicks, snap(n.end));
  }
  return notes;
}

// Walks notes chronologically against a shared absolute timeline, emitting an explicit rest
// (empty pitches[]) for the lead-in pickup and any real gap, so both tracks share one loop
// length and stay in phase every repeat — see the header comment above.
function buildSteps(notes, loopEndTick) {
  const byStart = new Map();
  for (const n of notes) {
    if (!byStart.has(n.start)) byStart.set(n.start, []);
    byStart.get(n.start).push(n);
  }
  const starts = [...byStart.keys()].sort((a, b) => a - b);
  const steps = [];
  let cursor = 0;
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const group = byStart.get(start);
    const nextStart = i + 1 < starts.length ? starts[i + 1] : loopEndTick;
    if (start > cursor) { steps.push({ pitches: [], durTicks: start - cursor }); cursor = start; }
    const groupEnd = Math.max(...group.map(n => n.end));
    const playEnd = groupEnd >= nextStart ? nextStart : groupEnd; // sustain into next note, or stop at own note-off if a real gap follows
    const playDur = playEnd - start;
    if (playDur > 0) { steps.push({ pitches: group.map(n => n.pitch), durTicks: playDur }); cursor = start + playDur; }
    if (cursor < nextStart) { steps.push({ pitches: [], durTicks: nextStart - cursor }); cursor = nextStart; }
  }
  if (cursor < loopEndTick) steps.push({ pitches: [], durTicks: loopEndTick - cursor });
  return steps.filter(s => s.durTicks > 0);
}

const melodyNotes = quantize(extractNotes(tracks[2]));
const chordNotes = quantize(extractNotes(tracks[1]));
const loopEndTick = snap(Math.max(...melodyNotes.map(n => n.end), ...chordNotes.map(n => n.end)));

const melodySteps = buildSteps(melodyNotes, loopEndTick);
const chordSteps = buildSteps(chordNotes, loopEndTick);

const TUNE = melodySteps.map(s => [s.pitches.length ? pitchToFreq(s.pitches[0]) : 0, round(s.durTicks / division)]);
const CHORDS = chordSteps.map(s => [s.pitches.map(pitchToFreq), round(s.durTicks / division)]);

console.error(`${bpm.toFixed(1)}bpm, TUNE_TEMPO = 60/${bpm.toFixed(0)}, loop = ${(loopEndTick / division).toFixed(2)} beats, ${TUNE.length} melody steps, ${CHORDS.length} chord steps`);
console.log(`const TUNE = ${JSON.stringify(TUNE)};`);
console.log(`const CHORDS = ${JSON.stringify(CHORDS)};`);
