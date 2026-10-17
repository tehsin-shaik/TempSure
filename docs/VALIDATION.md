# TempSure validation

> **All results here come from the demo's simulated sensor feed and from synthetic test
> traces.** Nothing was measured on a real logger, vehicle or medicine. They show that the
> code behaves as designed and where that design breaks down. They do not show field
> performance.

Reproduce with Node ≥ 18 (no dependencies):

```bash
node tools/validate.mjs            # 1000 seeded runs per scenario, ~20 s
node tools/validate.mjs --runs 200 # quicker
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

## 8. What is not validated

- Real loggers, sampling intervals, sensor noise and calibration.
- Vehicle and packaging thermal behaviour. The scenarios are scripted curves.
- Whether the warning helps drivers in practice (lead time vs response time).
- Browser and device coverage, QR scanning on real phones, `localStorage` limits, offline use.
- Multi-user, identity and regulatory acceptance of the record.
