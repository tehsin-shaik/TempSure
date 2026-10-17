# TempSure validation

> **All results here come from the demo's simulated sensor feed and from synthetic test
> traces.** Nothing was measured on a real logger, vehicle or medicine. They show that the
> code behaves as designed and where that design breaks down. They do not show field
> performance.

Reproduce with Node ≥ 18 (no dependencies):

```bash
node tools/validate.mjs            # 1000 seeded runs per scenario, ~20 s
node tools/validate.mjs --runs 200 # quicker
node tools/compare-alarms.mjs      # alarm comparison and threshold sweep (§8), ~15 s
```

The script loads the real `app.js` (everything before the boot block) and `vendor/qrcode.js`
into a Node `vm` context with minimal browser stubs. It replaces `Math.random` with a seeded
PRNG (mulberry32), so every number below can be reproduced exactly. Full output:
[`validation/results.json`](validation/results.json). The run date and Node version are
recorded there. Result: **28/28 asserted checks pass**, plus one informational result.

## 1. SHA-256

| Check | Result |
|---|---|
| FIPS 180-4 vectors: `""`, `"abc"`, 448-bit message | match |
| 2000 random UTF-8 strings (0–299 chars, including Arabic, CJK, emoji) vs `node:crypto` | 0 mismatches |
| 100 000-byte input | match |

## 2. Mean kinetic temperature

| Check | Result |
|---|---|
| `mkt([])` | `null` |
| Constant 5 °C | 5 °C exactly |
| 1000 random series vs the USP <1079.2> formula (ΔH 83.144 kJ/mol, R 8.3144 J/mol·K) | max difference 5.7 × 10⁻¹⁴ °C |
| MKT ≥ arithmetic mean on every series | holds |

Worked examples (hourly readings, USP formula):

| Profile | Arithmetic mean | MKT |
|---|---|---|
| 23 h at 5 °C + 1 h at 15 °C | 5.42 °C | 5.76 °C |
| 22 h at 5 °C + 2 h at 25 °C | 6.67 °C | 9.83 °C |

The second profile exceeds the USP CCT criterion of MKT ≤ 8 °C over 24 h, even though only
2 hours were out of range. This shows why MKT gives extra weight to warm periods.

## 3. Harness fidelity

The harness's scenario runner reproduces the app's own `runToEnd()` exactly for the same
seed (identical reading arrays).

## 4. Scenarios (1000 seeded runs each)

All times are in simulated minutes from the start of the trip. "Lead" is the time from the
first warning to the confirmed excursion.

| Scenario | Warned | Quarantined | First warning (median, range) | Excursion confirmed | Lead | Peak (median) | Low (median) | Minutes out (median) | Trip MKT (median) |
|---|---|---|---|---|---|---|---|---|---|
| Normal | 0% | 0% | – | – | – | 5.62 °C | 4.89 °C | 0 | 5.14 °C |
| Near-miss (scripted response) | 100% | 0% | 12 (11–13) | – | – | 6.77 °C | 5.00 °C | 0 | 5.62 °C |
| Near-miss, **no response** (counterfactual) | 100% | **28%** | 12 (11–13) | 26 (24–26) | 14 (13–15) | 8.06 °C | 4.89 °C | 1 | 5.60 °C |
| Breach | 100% | 100% | 34 (33–34) | 42 (41–44) | 8 (7–10) | 13.70 °C | 5.00 °C | 46 | 9.03 °C |
| Freeze | 100% | 100% (freeze flag 100%) | 34 (33–35) | 49 (47–51) | 15 (13–17) | 5.62 °C | −1.38 °C | 37 | 3.10 °C |

The hash chain verified on 100% of runs in every scenario.

Findings:

1. **No false alarms on the demo's own feed.** The normal scenario never warns. With the
   demo's very low noise, this is expected, not earned (see §5).
2. **Warning lead time is 7–10 min for the breach and 13–17 min for the freeze.** The
   README's example "breach in about 7 min" is consistent with the low end of this range.
3. **The near-miss would usually have been fine.** Without the scripted response, only 28%
   of near-miss runs actually go out of range for two consecutive minutes. In the other 72%,
   the van leaves the dock (minute 28) before the temperature confirms an excursion. Peaks
   cluster around 8 °C. So for this scenario, the warning is right roughly 1 time in 4.
   That is fine for a demo, but the README's "save the shipment" framing should be read with
   that in mind.
4. **The breach never reaches 15 °C.** Its peak is 13.25–14.30 °C over 1000 runs. The seeded
   adalimumab disposal rationale says "exposure above 15 °C exceeds stability allowance".
   That contradicts the data it is attached to. The ~46 min at ≤ 14.3 °C is also inside the
   USP CCT excursion allowance (8–15 °C, ≤ 24 h) and Humira's labelled 25 °C/14-day
   allowance [R1, R11].
5. **The freeze scenario reaches −0.77 to −1.82 °C.** That is below the about −0.5 °C
   freezing point WHO gives for hepatitis B vaccine [R6], so the freeze story is physically
   plausible for that product.

## 5. Rule sensitivity (synthetic traces)

These traces are fed straight into the app's `evaluate()`. They test the **rules**, not the
scenarios.

**False alarms vs sensor noise.** Steady 5 °C plus Gaussian noise, 93 readings, 1000 traces
per level:

| Noise SD | False warning (≥ 1 per trip) | False quarantine |
|---|---|---|
| 0.06 °C | 0% | 0% |
| 0.10 °C | 5.0% | 0% |
| 0.25 °C | 93.1% | 0% |
| 0.50 °C | 100% | 0% |

The 0.06 °C/min slope threshold only works when the readings are very smooth. Commercial
loggers are typically rated ±0.5 °C [R31]. If their minute-to-minute noise is anywhere near
0.25 °C SD, almost every trip would raise a warning. Before using real hardware, add
smoothing (for example an EWMA or a longer window), require the prediction to persist, or
scale the threshold to the measured noise.

**Short excursion.** Holding at 5 °C, then 2 minutes at 8.2–8.3 °C, then back to 6 °C →
**quarantined** (2 minutes out, peak 8.3 °C). This is by design, because quarantine is a
hold for review. But it is much stricter than the PQS E006 high alarm (≥ 8 °C for 10 h) and
the USP CCT allowance [R1, R5]. Door openings will generate review work.

**Freeze flag.** A dip to −0.2 °C raises the freeze flag on a freeze-sensitive product. On a
product marked not freeze-sensitive it does not, but the shipment is still quarantined
because the dip went below 2 °C.

## 6. Audit chain

Seeded data (4 shipments) all verify. Using a copy of the disposed shipment:

| Tamper | Detected? |
|---|---|
| Edit an event's text | **Yes**, reported at that event's `seq` |
| Edit an event's minute | **Yes** |
| Swap two events | **Yes** |
| Edit a sensor reading | No: readings are not hashed |
| Edit an event's clock string | No |
| Edit the `decision` object (name, choice) shown in the report | No: only the decision event's text is hashed |
| Delete the newest events | No: no external anchor for the head hash |
| Edit an event and recompute every hash | No: no signature |
| Change status / quarantine flags | No |

The "Simulate tampering" button edits event text, so the demo shows the case that *is*
detected. That is honest as far as it goes, but "any edit after the fact breaks the chain"
(UI text) is too broad.

## 7. QR passport

| Shipment (seeded) | Status | URL length | QR version (ECC L) | Readings in QR / total |
|---|---|---|---|---|
| TS-0138 | Created | 586 | 16 (81 × 81) | 0 / 0 |
| TS-0137 | Delivered | 986 | 22 (105 × 105) | 24 / 93 |
| TS-0136 | Quarantined | 1165 | 24 (113 × 113) | 24 / 93 |
| TS-0135 | Disposed | 1190 | 25 (117 × 117) | 24 / 93 |

- Every snapshot round-trips through base64url without loss.
- They all fit in a QR code, but versions 22–25 are dense. Scanning from a projector or a
  small screen has not been tested.
- **The payload is unsigned.** A snapshot edited to say `Released` decodes and would display
  "Safe handling verified". The 16-character hash shown cannot be checked by the person
  scanning.

## 8. Comparison with conventional alarms and threshold sweep

**Question.** Does the trend-based early warning give more notice than a plain alarm, and
what does it cost in false alarms?

**Method** (`node tools/compare-alarms.mjs`). The same 4 scenarios × 1000 seeded trips as §4
(same seeds, no scripted response) are generated by the real `app.js`. Each alarm rule is
then run on the recorded readings, optionally with extra Gaussian noise added to mimic a
less smooth logger (σ = 0, 0.10, 0.25, 0.50 °C on top of the app's own ≈ 0.035 °C SD). The
event to anticipate is the start of the first confirmed excursion on the noise-free trip
(the minute `excursionMin` that `app.js` records). Lead time = event minute − first alarm
minute. A **false alarm** is any alarm on a *normal* trip, which never leaves 2–8 °C.

The tool re-implements the warning and quarantine rules so their settings can be swept. On
the 4000 noise-free trips, both re-implementations match `app.js` exactly (0 mismatches),
and the tool exits with code 1 if they ever drift apart.

| Rule | Definition |
|---|---|
| Limit alarm | First reading outside 2–8 °C |
| TempSure quarantine | 2 consecutive readings outside 2–8 °C (the app's rule) |
| Guard band | First reading ≥ 7.5 °C or ≤ 2.5 °C (0.5 °C inside the limits) [assumed baseline] |
| WHO PQS E006 | Fridge-logger alarms: ≥ +8 °C for 10 h, or ≤ −0.5 °C for 60 min, read as continuous [R5] |
| TempSure warning | Slope of last 6 readings > 0.06 °C/min and predicted crossing ≤ 20 min (the app's rule) |

**Results on the demo's own feed (σ = 0).**

| Rule | Alarm by excursion start | Median lead: breach / freeze / near-miss | False alarms (normal trips) |
|---|---|---|---|
| Limit alarm | 100% | 0 / 0 / 0 min | 0% |
| TempSure quarantine | 0% (fires 1 min after start by design) | – | 0% |
| Guard band 0.5 °C | 100% | 2 / 3 / 4 min | 0% |
| WHO PQS E006 | 0% (never fires within the 92-min trip) | – | 0% |
| **TempSure warning** | **100%** | **8 / 15 / 14 min** (range 7–10 / 13–17 / 13–15) | **0%** |

**Results with σ = 0.25 °C added noise.**

| Rule | Alarm by excursion start | Median lead: breach / freeze / near-miss | False alarms (normal trips) |
|---|---|---|---|
| Limit alarm | 79.2% | 0 / 1 / 1 min | 0% |
| TempSure quarantine | 26.5% | 0 / 0 / 0 min | 0% |
| Guard band 0.5 °C | 100% | 2 / 4 / 4 min | 0% |
| WHO PQS E006 | 0% | – | 0% |
| **TempSure warning** | 100% | 38 / 45 / 23 min (see note) | **98.7%** |

Note: with noise, the warning's "lead time" grows because it fires on noise early in the
trip, not because it predicts better. The 98.7% false-alarm rate on normal trips shows this.
Lead time only means something when the false-alarm rate is low.

**Sweep of the warning settings** (all event trips; false alarms on normal trips):

| Setting (window, slope, horizon) | σ = 0: by start · lead · false | σ = 0.10 | σ = 0.25 |
|---|---|---|---|
| 6, 0.06, 20 min (**app default**) | 100% · 14 min · 0% | 100% · 14 · 9.4% | 100% · 38 · 98.7% |
| 6, 0.03–0.10, 20 min | identical to the default at every noise level | | |
| 6, 0.20, 20 min | 93.2% · 11 · 0% | 98.9% · 10 · 0.8% | 100% · 14 · 41.9% |
| 10, 0.06, 20 min | 100% · 12 · 0% | 100% · 13 · 5.3% | 100% · 29 · 59.8% |
| 15, 0.06, 20 min | 100% · 11 · 0% | 100% · 11 · 5.3% | 100% · 24 · 55.8% |
| 6, 0.06, **10 min** | 100% · 11 · 0% | 100% · 10 · 0% | 100% · 12 · 20.4% |
| 6, 0.06, **5 min** | 100% · 6 · 0% | 100% · 6 · 0% | 99.9% · 6 · 0.5% |
| 6, 0.06, 30 min | 100% · 15 · 6.7% | 100% · 27 · 72.3% | 100% · 40 · 100% |

**Sweep of the guard band:**

| Band inside the limits | σ = 0: by start · lead · false | σ = 0.25 | σ = 0.50 |
|---|---|---|---|
| 0.25 °C | 100% · 1 min · 0% | 99.0% · 2 · 0% | 98.0% · 3 · 0% |
| 0.5 °C | 100% · 3 · 0% | 100% · 3 · 0% | 99.9% · 4 · 0.1% |
| 1.0 °C | 100% · 6 · 0% | 100% · 6 · 0% | 100% · 7 · 3.5% |
| 1.5 °C | 100% · 8 · 0% | 100% · 8 · 0.3% | 100% · 11 · 54.7% |

The full grid (4 windows × 7 slopes × 4 noise levels, 5 horizons, 4 bands) is in
[`validation/alarm-comparison.json`](validation/alarm-comparison.json). Per-trip alarm
minutes for σ = 0 and 0.25 are in [`validation/alarm-runs.csv`](validation/alarm-runs.csv).

**What this shows**

- On the demo's smooth feed, the trend warning gives about 11 minutes more notice than a
  0.5 °C guard band (median 14 vs 3 min) and 14 more than a plain limit alarm, with no false
  alarms.
- The slope threshold (0.06 °C/min) is barely the deciding setting: anything from 0.03 to
  0.10 gives the same result. The **20-minute horizon** decides how early, and how noisy, the
  warning is.
- At σ = 0.25 °C, the default warning is unusable (98.7% false alarms). The two settings
  that stay usable there give about the same notice: a **5-minute horizon** (6 min lead,
  0.5% false) or a **1 °C guard band** (6 min lead, 0% false). So with realistic noise, the
  trend rule's advantage over a simple guard band disappears in these tests.
- All the pre-alarms (guard band, warning) also fire on every near-miss trip that stays in
  range. That is arguably the right behaviour for a near-miss, but it is review work.
- The WHO PQS E006 alarm durations (10 h high, 60 min low) are designed for clinic fridges
  over days. They never fire within a 92-minute delivery and are shown only as the
  standard reference point, not as a fair transit baseline.

**Limits of this comparison.** The trips are scripted first-order curves (MODEL §2), the
normal trips have no door openings, and the added noise is independent Gaussian, whereas
real disturbances are correlated. Real door openings would raise every rule's false-alarm
rate, especially the guard band's. None of these rules decides whether a medicine is still
usable. The settings that work best here are only candidates to test on real logger data.

## 9. What is not validated

- Real loggers, sampling intervals, sensor noise and calibration.
- Vehicle and packaging thermal behaviour. The scenarios are scripted curves.
- Whether the warning helps drivers in practice (lead time vs response time). §8 compares
  rules on synthetic data only.
- Browser and device coverage, QR scanning on real phones, `localStorage` limits, offline use.
- Multi-user, identity and regulatory acceptance of the record.
