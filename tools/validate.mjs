// Reproducible validation of TempSure's in-browser logic.
// Loads the real app.js (everything before the boot block) into a Node VM with
// minimal browser stubs and a seeded PRNG, then checks the rules the demo claims.
// Usage: node tools/validate.mjs [--runs N]   (writes docs/validation/results.json)
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argRuns = process.argv.indexOf('--runs');
const RUNS = argRuns > 0 ? Number(process.argv[argRuns + 1]) : 1000;

const appSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8').replace(/\r/g, '');
const bootAt = appSrc.indexOf('// ---------- boot ----------');
if (bootAt < 0) throw new Error('boot marker not found in app.js');
const qrSrc = fs.readFileSync(path.join(root, 'vendor', 'qrcode.js'), 'utf8');

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
vm.runInContext(qrSrc, ctx, { filename: 'vendor/qrcode.js' });
vm.runInContext(appSrc.slice(0, bootAt), ctx, { filename: 'app.js' });
vm.runInContext(`
globalThis.__T = {
  SHA, mkt, slopeOf, newShipment, resetSim, tick, evaluate, verifyChain, decide, snapshot, b64url, unb64url,
  shareUrl, runToEnd, seed, addEvent, custodyFor, actorFor, phaseText, PRODUCTS, SCENARIOS, PHASES, TRIP_END, TICK_MS, qrcode,
  shipments: () => state.shipments,
  clear: () => { state.shipments.length = 0; },
  setRandom: f => { Math.random = f; },
  // Mirrors runToEnd(); respond=false suppresses the scripted near-miss response (counterfactual).
  run(s, scenario, respond) {
    s.scenario = scenario; resetSim(s);
    s.readings.push({ m: 0, t: 5.1 }); s.phase = 0; s.custody = custodyFor(s, 'warehouse'); s.status = 'In transit'; s.peak = s.low = 5.1;
    addEvent(s, 'custody', actorFor('warehouse'), phaseText(s, 'warehouse'));
    for (;;) { if (!respond && s.autoActAt != null) s.autoActAt = Infinity; if (!tick(s)) break; }
    return s;
  },
  reseal(s) {
    let prev = 'GENESIS';
    for (const ev of s.events) { ev.prev = prev; ev.hash = SHA(prev + '|' + JSON.stringify([ev.seq, ev.min, ev.type, ev.actor, ev.text])); prev = ev.hash; }
  },
};`, ctx);
const T = ctx.__T;

const results = { generated: new Date().toISOString(), node: process.version, runsPerScenario: RUNS, checks: [] };
let failures = 0;
function check(group, name, pass, detail) {
  results.checks.push({ group, name, pass, detail });
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail !== undefined ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
}
function info(group, name, detail) {
  results.checks.push({ group, name, pass: null, detail });
  console.log(`INFO  [${group}] ${name} — ${detail}`);
}
const pct = (arr, p) => { if (!arr.length) return null; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.round((p / 100) * (a.length - 1))))]; };
const r2 = x => (x == null ? null : Math.round(x * 100) / 100);
const dist = arr => arr.length ? { n: arr.length, min: r2(pct(arr, 0)), p5: r2(pct(arr, 5)), median: r2(pct(arr, 50)), p95: r2(pct(arr, 95)), max: r2(pct(arr, 100)) } : { n: 0 };
const sha = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const newS = (over = {}) => T.newShipment({ product: 'Validation product', unit: 'units', lot: 'VAL-1', expiry: '01/2030', qty: 10, min: 2, max: 8, freeze: true, origin: 'Origin', destination: 'Destination', ...over });

// ---------- 1. SHA-256 ----------
{
  const vectors = [
    ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
    ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'],
  ];
  for (const [msg, hex] of vectors) check('sha256', `FIPS 180-4 vector "${msg.slice(0, 12)}${msg.length > 12 ? '…' : ''}" (len ${msg.length})`, T.SHA(msg) === hex);
  const rnd = mulberry32(7), alphabet = 'abcXYZ019 |[]{}",°Cµ→·عربي中文😀';
  let mismatch = 0, n = 2000;
  for (let i = 0; i < n; i++) {
    const len = Math.floor(rnd() * 300); let s = '';
    for (let j = 0; j < len; j++) s += [...alphabet][Math.floor(rnd() * [...alphabet].length)];
    if (T.SHA(s) !== sha(s)) mismatch++;
  }
  check('sha256', `${n} random UTF-8 strings (0–299 chars, incl. Arabic, CJK, emoji) match node:crypto`, mismatch === 0, `${mismatch} mismatches`);
  const big = 'a'.repeat(100000);
  check('sha256', '100 000-byte input matches node:crypto', T.SHA(big) === sha(big));
}

// ---------- 2. MKT ----------
const usp = (temps, dH = 83.144, R = 0.0083144) => {
  const m = temps.reduce((s, t) => s + Math.exp(-dH / (R * (t + 273.15))), 0) / temps.length;
  return -dH / R / Math.log(m) - 273.15;
};
{
  const rd = ts => ts.map((t, i) => ({ m: i, t }));
  check('mkt', 'empty readings return null', T.mkt([]) === null);
  check('mkt', 'constant 5 °C returns 5 °C', Math.abs(T.mkt(rd(Array(60).fill(5))) - 5) < 1e-9);
  const rnd = mulberry32(11); let maxDiff = 0, jensenOk = true;
  for (let i = 0; i < 1000; i++) {
    const ts = Array.from({ length: 5 + Math.floor(rnd() * 200) }, () => -5 + rnd() * 30);
    maxDiff = Math.max(maxDiff, Math.abs(T.mkt(rd(ts)) - usp(ts)));
    if (T.mkt(rd(ts)) < ts.reduce((a, b) => a + b, 0) / ts.length - 1e-9) jensenOk = false;
  }
  check('mkt', 'matches USP <1079.2> formula (ΔH 83.144 kJ/mol, R 8.3144 J/mol·K) on 1000 random series', maxDiff < 1e-9, `max |Δ| = ${maxDiff.toExponential(2)} °C`);
  check('mkt', 'MKT ≥ arithmetic mean on every random series (Jensen; expected for Arrhenius weighting)', jensenOk);
  const day = [...Array(23).fill(5), 15];
  results.mktExamples = {
    '23 h at 5 °C + 1 h at 15 °C (hourly)': { mean: r2(day.reduce((a, b) => a + b) / 24), mkt: r2(usp(day)) },
    '22 h at 5 °C + 2 h at 25 °C (hourly)': (() => { const d = [...Array(22).fill(5), 25, 25]; return { mean: r2(d.reduce((a, b) => a + b) / 24), mkt: r2(usp(d)) }; })(),
  };
}

// ---------- 3. slope ----------
{
  const pts = [0, 1, 2, 3, 4, 5].map(m => ({ m, t: 3 + 0.25 * m }));
  check('trend', 'least-squares slope exact on a 0.25 °C/min line', Math.abs(T.slopeOf(pts) - 0.25) < 1e-12);
  check('trend', 'fewer than 3 points gives slope 0', T.slopeOf(pts.slice(0, 2)) === 0);
}

// ---------- 4. scenario Monte Carlo ----------
function summarise(scenario, respond) {
  const acc = { quarantined: 0, warned: 0, corrected: 0, freezeFlag: 0, chainOk: 0, alertBeforeExcursion: 0, lead: [], firstAlert: [], excursion: [], peak: [], low: [], minutesOut: [], mkt: [], firstOut: [] };
  for (let i = 1; i <= RUNS; i++) {
    T.setRandom(mulberry32(i * 7919 + scenario.length));
    const s = T.run(newS(), scenario, respond);
    if (s.quarantined) acc.quarantined++;
    if (s.firstAlertMin != null) { acc.warned++; acc.firstAlert.push(s.firstAlertMin); }
    if (s.correctedAt != null) acc.corrected++;
    if (s.freezeLogged) acc.freezeFlag++;
    if (T.verifyChain(s).ok) acc.chainOk++;
    if (s.excursionMin != null) acc.excursion.push(s.excursionMin);
    if (s.firstAlertMin != null && s.excursionMin != null) { acc.alertBeforeExcursion++; acc.lead.push(s.excursionMin - s.firstAlertMin); }
    const fo = s.readings.find(r => r.t > s.max || r.t < s.min); if (fo) acc.firstOut.push(fo.m);
    acc.peak.push(s.peak); acc.low.push(s.low); acc.minutesOut.push(s.minutesOut); acc.mkt.push(T.mkt(s.readings));
    if (i % 200 === 0) T.clear();
  }
  T.clear();
  const rate = k => r2((acc[k] / RUNS) * 100);
  return {
    scenario, respond, runs: RUNS,
    pctQuarantined: rate('quarantined'), pctWarned: rate('warned'), pctCorrected: rate('corrected'), pctFreezeFlag: rate('freezeFlag'), pctChainOk: rate('chainOk'),
    firstAlertMin: dist(acc.firstAlert), firstOutOfRangeMin: dist(acc.firstOut), excursionConfirmedMin: dist(acc.excursion),
    warningLeadMin: dist(acc.lead), peakC: dist(acc.peak), lowC: dist(acc.low), minutesOut: dist(acc.minutesOut), mktC: dist(acc.mkt),
  };
}
{
  // runToEnd() and the harness runner must produce identical traces for the same seed.
  T.setRandom(mulberry32(42)); const a = newS(); T.runToEnd(a, 'breach');
  T.setRandom(mulberry32(42)); const b = T.run(newS(), 'breach', true);
  check('harness', 'harness runner reproduces app runToEnd() trace exactly', JSON.stringify(a.readings) === JSON.stringify(b.readings));
  T.clear();
  const sc = [['normal', true], ['near', true], ['near', false], ['breach', true], ['freeze', true]].map(([k, r]) => summarise(k, r));
  results.scenarios = sc;
  const [normal, near, nearNo, breach, freeze] = sc;
  check('scenario', 'normal: no warning and no quarantine in any run', normal.pctWarned === 0 && normal.pctQuarantined === 0, `${normal.pctWarned}% warned, ${normal.pctQuarantined}% quarantined`);
  check('scenario', 'near-miss: warned, scripted response, never quarantined', near.pctWarned === 100 && near.pctCorrected === 100 && near.pctQuarantined === 0, `${near.pctWarned}% warned, ${near.pctQuarantined}% quarantined`);
  info('scenario', 'near-miss without response (counterfactual): share of warnings that would have become excursions', `${nearNo.pctQuarantined}% quarantined; peak median ${nearNo.peakC.median} °C; lead median ${nearNo.warningLeadMin.median} min`);
  check('scenario', 'breach: always quarantined, warning precedes excursion', breach.pctQuarantined === 100 && breach.warningLeadMin.n === RUNS && breach.warningLeadMin.min > 0, `lead ${breach.warningLeadMin.min}–${breach.warningLeadMin.max} min`);
  check('scenario', 'freeze: always quarantined and freeze flag raised', freeze.pctQuarantined === 100 && freeze.pctFreezeFlag === 100, `low median ${freeze.lowC.median} °C`);
  check('scenario', 'hash chain verifies on every simulated run', sc.every(x => x.pctChainOk === 100));
}

// ---------- 5. rule replay on synthetic traces (sensitivity, not app behaviour) ----------
function replay(temps, over = {}) {
  const s = newS({ freeze: true, ...over });
  s.scenario = 'normal'; s.readings = []; s.phase = 0; s.status = 'In transit';
  temps.forEach((t, m) => { s.minute = m; s.readings.push({ m, t }); T.evaluate(s); });
  return s;
}
{
  const gauss = rnd => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
  results.noiseSensitivity = [0.06, 0.1, 0.25, 0.5].map(sd => {
    const rnd = mulberry32(Math.round(sd * 1000)); let warned = 0, quarantined = 0;
    for (let i = 0; i < RUNS; i++) {
      const s = replay(Array.from({ length: 93 }, () => Math.round((5 + sd * gauss(rnd)) * 100) / 100));
      if (s.firstAlertMin != null) warned++; if (s.quarantined) quarantined++;
      if (i % 200 === 0) T.clear();
    }
    T.clear();
    return { noiseSdC: sd, steadyC: 5, pctFalseWarning: r2((warned / RUNS) * 100), pctFalseQuarantine: r2((quarantined / RUNS) * 100) };
  });
  const nearEdge = replay([...Array(30).fill(5), 7.6, 7.9, 8.2, 8.3, 7.9, 7.4, ...Array(57).fill(6)]);
  results.shortExcursion = { trace: '5 °C, 2 min at 8.2–8.3 °C, back to 6 °C', quarantined: nearEdge.quarantined, minutesOut: nearEdge.minutesOut, peak: nearEdge.peak };
  check('rules', 'a 2-minute 8.3 °C blip triggers quarantine (stricter than USP <659> CCT 8–15 °C ≤24 h allowance; by design a hold, not a verdict)', nearEdge.quarantined === true, results.shortExcursion);
  const subZero = replay([...Array(30).fill(5), 1.5, 0.4, -0.2, 1.8, ...Array(59).fill(5)]);
  check('rules', 'freeze flag fires at ≤0 °C on freeze-sensitive stock', subZero.freezeLogged === true);
  const noFreeze = replay([...Array(30).fill(5), 1.5, 0.4, -0.2, 1.8, ...Array(59).fill(5)], { freeze: false });
  check('rules', 'freeze flag does not fire for stock marked not freeze-sensitive (still quarantined below 2 °C)', noFreeze.freezeLogged === false && noFreeze.quarantined === true);
  T.clear();
}

// ---------- 6. audit chain tamper tests ----------
{
  T.setRandom(mulberry32(2024)); T.seed();
  const ships = T.shipments();
  check('audit', 'all seeded shipments verify', ships.every(s => T.verifyChain(s).ok), `${ships.length} shipments`);
  const s = ships.find(x => x.decision) || ships[0];
  const clone = () => JSON.parse(JSON.stringify(s));
  const k = Math.floor(s.events.length / 2);
  let c = clone(); c.events[k].text += ' (edited)'; let v = T.verifyChain(c);
  check('audit', 'editing an event text is detected at that event', !v.ok && v.at === c.events[k].seq, v);
  c = clone(); c.events[k].min += 1; v = T.verifyChain(c);
  check('audit', 'editing an event minute is detected', !v.ok);
  c = clone(); [c.events[k], c.events[k + 1]] = [c.events[k + 1], c.events[k]];
  check('audit', 'reordering events is detected', !T.verifyChain(c).ok);
  const gaps = [];
  c = clone(); c.readings[Math.floor(c.readings.length / 2)].t = 5.0; if (T.verifyChain(c).ok) gaps.push('sensor readings are not hashed: editing a reading verifies OK');
  c = clone(); c.events[k].clock = '00:00'; if (T.verifyChain(c).ok) gaps.push('event clock string is not hashed');
  c = clone(); if (c.decision) { c.decision.name = 'Someone else'; c.decision.choice = 'release'; if (T.verifyChain(c).ok) gaps.push('decision object (shown in the report) is not hashed; only the decision event text is'); }
  c = clone(); c.events.pop(); if (T.verifyChain(c).ok) gaps.push('truncating the newest events verifies OK (no external anchor of the head hash)');
  c = clone(); c.events[k].text += ' (edited)'; T.reseal(c); if (T.verifyChain(c).ok) gaps.push('rewriting an event and recomputing every hash verifies OK (no signature or external anchor)');
  c = clone(); c.status = 'Released'; c.quarantined = false; if (T.verifyChain(c).ok) gaps.push('shipment status / quarantine flags are not hashed');
  results.auditGaps = gaps;
  check('audit', 'known integrity gaps documented (expected to be non-empty for this demo design)', gaps.length > 0, `${gaps.length} gaps`);
  T.clear();
}

// ---------- 7. QR passport ----------
{
  T.setRandom(mulberry32(99)); T.seed();
  results.qr = T.shipments().map(s => {
    const url = T.shareUrl(s), payload = url.split('#/v/')[1];
    const back = JSON.parse(T.unb64url(payload));
    const qr = T.qrcode(0, 'L'); qr.addData(url); qr.make();
    return { id: s.id, status: s.status, urlChars: url.length, qrModules: qr.getModuleCount(), qrVersion: (qr.getModuleCount() - 17) / 4, roundTrip: JSON.stringify(back) === JSON.stringify(T.snapshot(s)), readingsInSnapshot: back.r.length, readingsTotal: s.readings.length };
  });
  check('qr', 'snapshot round-trips through base64url', results.qr.every(q => q.roundTrip));
  check('qr', 'every seeded passport fits a QR code (ECC level L, version ≤ 40)', results.qr.every(q => q.qrVersion <= 40), results.qr.map(q => `${q.id}: ${q.urlChars} chars → v${q.qrVersion}`).join('; '));
  const s = T.shipments().find(x => x.status === 'Disposed' || x.status === 'Quarantined');
  const forged = { ...T.snapshot(s), st: 'Released' };
  const ok = JSON.parse(T.unb64url(T.b64url(JSON.stringify(forged)))).st === 'Released';
  results.qrForgery = ok ? 'A hand-edited snapshot (status changed to Released, hash prefix unchanged) decodes and would render as released: the QR payload is not signed.' : 'n/a';
  check('qr', 'QR payload is unsigned (forged status decodes) — documented limitation', ok);
  T.clear();
}

results.timing = Object.fromEntries(Object.entries(T.TICK_MS).map(([k, ms]) => [`${k}x`, `${r2((T.TRIP_END * ms) / 1000)} s for ${T.TRIP_END} simulated minutes`]));
results.summary = { asserted: results.checks.filter(c => c.pass !== null).length, failed: failures, informational: results.checks.filter(c => c.pass === null).length };
fs.writeFileSync(path.join(root, 'docs', 'validation', 'results.json'), JSON.stringify(results, null, 2) + '\n');
const asserted = results.checks.filter(c => c.pass !== null).length;
console.log(`\n${asserted - failures}/${asserted} checks passed. Results written to docs/validation/results.json`);
process.exit(failures ? 1 : 0);
