// Compares TempSure's trend warning with simpler alarm rules on the same simulated trips.
// Trips come from the real app.js (seeded, no scripted response). Optional Gaussian sensor
// noise is added on top to mimic a less smooth logger. The event every rule tries to
// anticipate is the start of the first confirmed excursion (2 consecutive out-of-range
// readings) on the noise-free trip.
// Usage: node tools/compare-alarms.mjs [--runs N]
//   writes docs/validation/alarm-comparison.json and docs/validation/alarm-runs.csv
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argRuns = process.argv.indexOf('--runs');
const RUNS = argRuns > 0 ? Number(process.argv[argRuns + 1]) : 1000;

const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/\r/g, '');
const bootAt = appSrc.indexOf('// ---------- boot ----------');
if (bootAt < 0) throw new Error('boot marker not found in app.js');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = rnd => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

const ctx = {
  TextEncoder, btoa, atob, unescape, escape, encodeURIComponent, decodeURIComponent, console,
  setInterval: () => 0, clearInterval: () => {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { href: 'https://example.test/TempSure/', hash: '' },
  document: { documentElement: { dataset: {} }, getElementById: () => null, querySelector: () => null },
  matchMedia: () => ({ matches: false }),
};
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(appSrc.slice(0, bootAt), ctx, { filename: 'app.js' });
vm.runInContext(`
globalThis.__T = {
  newShipment, TRIP_END,
  clear: () => { state.shipments.length = 0; },
  setRandom: f => { Math.random = f; },
  // Same runner as tools/validate.mjs with respond=false: no scripted near-miss response.
  run(s, scenario) {
    s.scenario = scenario; resetSim(s);
    s.readings.push({ m: 0, t: 5.1 }); s.phase = 0; s.custody = custodyFor(s, 'warehouse'); s.status = 'In transit'; s.peak = s.low = 5.1;
    addEvent(s, 'custody', actorFor('warehouse'), phaseText(s, 'warehouse'));
    for (;;) { if (s.autoActAt != null) s.autoActAt = Infinity; if (!tick(s)) break; }
    return s;
  },
};`, ctx);
const T = ctx.__T;
const MIN = 2, MAX = 8;
const newS = () => T.newShipment({ product: 'Validation product', unit: 'units', lot: 'VAL-1', expiry: '01/2030', qty: 10, min: MIN, max: MAX, freeze: true, origin: 'Origin', destination: 'Destination' });

// ---------- trips ----------
const SCENARIOS = ['normal', 'near', 'breach', 'freeze'];
const trips = [];
for (const scenario of SCENARIOS) {
  for (let i = 1; i <= RUNS; i++) {
    T.setRandom(mulberry32(i * 7919 + scenario.length));
    const s = T.run(newS(), scenario);
    trips.push({ scenario, seed: i, t: s.readings.map(r => r.t), onset: s.excursionMin, appAlert: s.firstAlertMin });
    if (i % 200 === 0) T.clear();
  }
  T.clear();
}

// ---------- alarm rules (each returns the first alarm minute, or null) ----------
const out = v => v > MAX || v < MIN;
function slope(t, m, n) { // same arithmetic as slopeOf() in app.js over the last n readings
  const a = Math.max(0, m - n + 1), k = m - a + 1;
  if (k < 3) return 0;
  let mx = 0, my = 0;
  for (let j = a; j <= m; j++) { mx += j; my += t[j]; }
  mx /= k; my /= k;
  let num = 0, den = 0;
  for (let j = a; j <= m; j++) { num += (j - mx) * (t[j] - my); den += (j - mx) ** 2; }
  return den ? num / den : 0;
}
const rules = {
  limit: t => { for (let m = 1; m < t.length; m++) if (out(t[m])) return m; return null; },
  confirmed: t => { for (let m = 2; m < t.length; m++) if (out(t[m]) && out(t[m - 1])) return m; return null; },
  guard: (t, band) => { for (let m = 1; m < t.length; m++) if (t[m] >= MAX - band || t[m] <= MIN + band) return m; return null; },
  pqs: t => { // WHO PQS E006 Type 1 alarms: ≥ +8 °C for 10 h, ≤ −0.5 °C for 60 min (read as continuous)
    let hi = 0, lo = 0;
    for (let m = 1; m < t.length; m++) {
      hi = t[m] >= 8 ? hi + 1 : 0; lo = t[m] <= -0.5 ? lo + 1 : 0;
      if (hi >= 600 || lo >= 60) return m;
    }
    return null;
  },
  trend: (t, th = 0.06, n = 6, horizon = 20) => { // mirrors evaluate() in app.js
    let consec = 0, quarantined = false;
    for (let m = 1; m < t.length; m++) {
      const v = t[m], o = out(v);
      consec = o ? consec + 1 : 0;
      if (consec >= 2) quarantined = true;
      if (o || quarantined) continue;
      const sl = slope(t, m, n);
      if (sl > th && (MAX - v) / sl <= horizon) return m;
      if (sl < -th && (v - MIN) / -sl <= horizon) return m;
    }
    return null;
  },
};

const r2 = x => (x == null ? null : Math.round(x * 100) / 100);
const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.round((p / 100) * (a.length - 1))))]; };
const dist = arr => arr.length ? { n: arr.length, min: pct(arr, 0), p5: pct(arr, 5), median: pct(arr, 50), p95: pct(arr, 95), max: pct(arr, 100) } : { n: 0 };
const rate = (k, n) => (n ? r2((k / n) * 100) : null);

function noisy(trip, sigma) {
  if (!sigma) return trip.t;
  const rnd = mulberry32(trip.seed * 104729 + SCENARIOS.indexOf(trip.scenario) * 7 + Math.round(sigma * 1000));
  return trip.t.map(v => Math.round((v + sigma * gauss(rnd)) * 100) / 100);
}

// Scores one rule on every trip at one noise level.
function score(fn, sigma, keep) {
  const by = Object.fromEntries(SCENARIOS.map(k => [k, { trips: 0, events: 0, before: 0, late: 0, missed: 0, lead: [], alarmNoEvent: 0, noEvent: 0 }]));
  for (const trip of trips) {
    const t = noisy(trip, sigma), a = fn(t), b = by[trip.scenario];
    b.trips++;
    if (keep) keep(trip, sigma, a);
    if (trip.onset == null) { b.noEvent++; if (a != null) b.alarmNoEvent++; continue; }
    b.events++;
    if (a == null) b.missed++;
    else if (a <= trip.onset) { b.before++; b.lead.push(trip.onset - a); }
    else b.late++;
  }
  const res = {};
  for (const k of SCENARIOS) {
    const b = by[k];
    res[k] = { trips: b.trips, excursions: b.events, pctAlarmByExcursionStart: rate(b.before, b.events), pctAlarmAfterStart: rate(b.late, b.events), pctMissed: rate(b.missed, b.events), leadMin: dist(b.lead), tripsWithoutExcursion: b.noEvent, pctAlarmWithoutExcursion: rate(b.alarmNoEvent, b.noEvent) };
  }
  const ev = SCENARIOS.flatMap(k => by[k].lead), nEv = SCENARIOS.reduce((s, k) => s + by[k].events, 0), nBefore = SCENARIOS.reduce((s, k) => s + by[k].before, 0);
  res.all = { excursions: nEv, pctAlarmByExcursionStart: rate(nBefore, nEv), leadMin: dist(ev), pctFalseAlarmNormalTrips: res.normal.pctAlarmWithoutExcursion };
  return res;
}

const SIGMAS = [0, 0.1, 0.25, 0.5];
const METHODS = {
  limit: { label: 'Limit alarm: first reading outside 2–8 °C', fn: rules.limit },
  confirmed: { label: 'TempSure quarantine: 2 consecutive readings outside 2–8 °C', fn: rules.confirmed },
  guard: { label: 'Guard-band pre-alarm: reading ≥ 7.5 °C or ≤ 2.5 °C', fn: t => rules.guard(t, 0.5) },
  pqs: { label: 'WHO PQS E006 fridge-logger alarms: ≥ 8 °C for 10 h or ≤ −0.5 °C for 60 min', fn: rules.pqs },
  trend: { label: 'TempSure early warning: 6-reading slope > 0.06 °C/min, crossing ≤ 20 min', fn: t => rules.trend(t) },
};

const results = { generated: new Date().toISOString(), node: process.version, runsPerScenario: RUNS, limitsC: [MIN, MAX], sigmasC: SIGMAS, methods: Object.fromEntries(Object.entries(METHODS).map(([k, v]) => [k, v.label])), parity: {}, comparison: {}, sweeps: {} };
let failures = 0;

// ---------- parity: the re-implemented rules must match the app on the noise-free trips ----------
{
  let trendMismatch = 0, confirmedMismatch = 0;
  for (const trip of trips) {
    if (rules.trend(trip.t) !== trip.appAlert) trendMismatch++;
    const c = rules.confirmed(trip.t);
    if ((c == null ? null : c - 1) !== trip.onset) confirmedMismatch++;
  }
  results.parity = { trips: trips.length, trendWarningMismatches: trendMismatch, quarantineMismatches: confirmedMismatch };
  const ok = trendMismatch === 0 && confirmedMismatch === 0;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  parity with app.js on ${trips.length} trips: warning mismatches ${trendMismatch}, quarantine mismatches ${confirmedMismatch}`);
}

// ---------- method comparison ----------
const csvRows = new Map();
for (const sigma of SIGMAS) {
  results.comparison[sigma] = {};
  for (const [k, m] of Object.entries(METHODS)) {
    const keep = sigma === 0 || sigma === 0.25 ? (trip, sg, a) => {
      const key = `${trip.scenario},${trip.seed},${sg}`;
      if (!csvRows.has(key)) csvRows.set(key, { scenario: trip.scenario, seed: trip.seed, sigma: sg, onset: trip.onset });
      csvRows.get(key)[k] = a;
    } : null;
    results.comparison[sigma][k] = score(m.fn, sigma, keep);
  }
}

// ---------- sweeps ----------
const sweepRow = r => ({ pctAlarmByExcursionStart: r.all.pctAlarmByExcursionStart, medianLeadMin: r.all.leadMin.median ?? null, pctFalseAlarmNormalTrips: r.all.pctFalseAlarmNormalTrips, pctAlarmNearMissInRange: r.near.pctAlarmWithoutExcursion });
results.sweeps.trend = [];
for (const sigma of SIGMAS) for (const n of [4, 6, 10, 15]) for (const th of [0.03, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2]) {
  results.sweeps.trend.push({ sigma, window: n, slopeC_per_min: th, horizonMin: 20, ...sweepRow(score(t => rules.trend(t, th, n, 20), sigma)) });
}
results.sweeps.trendHorizon = [];
for (const sigma of SIGMAS) for (const horizon of [5, 10, 20, 30, 45]) {
  results.sweeps.trendHorizon.push({ sigma, window: 6, slopeC_per_min: 0.06, horizonMin: horizon, ...sweepRow(score(t => rules.trend(t, 0.06, 6, horizon), sigma)) });
}
results.sweeps.guard = [];
for (const sigma of SIGMAS) for (const band of [0.25, 0.5, 1, 1.5]) {
  results.sweeps.guard.push({ sigma, bandC: band, ...sweepRow(score(t => rules.guard(t, band), sigma)) });
}

// ---------- console summary ----------
for (const sigma of SIGMAS) {
  console.log(`\nsensor noise σ = ${sigma} °C (on top of the app's own ≈0.035 °C)`);
  for (const k of Object.keys(METHODS)) {
    const r = results.comparison[sigma][k];
    console.log(`  ${k.padEnd(9)} alarm by excursion start ${String(r.all.pctAlarmByExcursionStart).padStart(5)}%  lead median ${String(r.all.leadMin.median ?? '-').padStart(3)} min  | breach ${r.breach.leadMin.median ?? '-'}  freeze ${r.freeze.leadMin.median ?? '-'}  near ${r.near.leadMin.median ?? '-'} | false alarms (normal) ${r.all.pctFalseAlarmNormalTrips}%`);
  }
}

fs.writeFileSync(path.join(root, 'docs', 'validation', 'alarm-comparison.json'), JSON.stringify(results, null, 2) + '\n');
const cols = ['scenario', 'seed', 'sigma', 'onset', ...Object.keys(METHODS)];
const csv = [cols.join(','), ...[...csvRows.values()].map(r => cols.map(c => r[c] ?? '').join(','))].join('\n') + '\n';
fs.writeFileSync(path.join(root, 'docs', 'validation', 'alarm-runs.csv'), csv);
console.log(`\nWrote docs/validation/alarm-comparison.json and docs/validation/alarm-runs.csv (${csvRows.size} rows)`);
process.exit(failures ? 1 : 0);
