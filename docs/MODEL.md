# TempSure model

This document describes everything TempSure computes: the simulated temperature feed, the
excursion and warning rules, mean kinetic temperature, the audit chain and the QR snapshot.
For each parameter it gives the value in the code, where that value came from, and whether
it is sourced or **[assumed]**. Line references are to `app.js`.

Sources ([R#]) are listed in [REFERENCES.md](REFERENCES.md). The test results are in
[VALIDATION.md](VALIDATION.md).

## 1. Timeline

| Parameter | Code | Value | Provenance |
|---|---|---|---|
| Trip length | `TRIP_END` | 92 simulated minutes | [assumed] One last-mile delivery |
| Sample interval | one reading per `tick()` | 1 simulated minute | [assumed] Finer than the ≤ 10 min measuring interval in WHO PQS E006 [R5] |
| Real-time speed | `TICK_MS` | 650 / 320 / 160 ms per minute (1×/2×/4×) | Presentation choice. 92 min plays in 59.8 s / 29.4 s / 14.7 s |
| Start clock | `START_CLOCK` | 13:40 | [assumed] Afternoon, the hottest part of the day |
| Phases | `PHASES` | warehouse 0, loading 8, transit 28, handoff 76, clinic 82 (start minute) | [assumed] |

## 2. Temperature generator

The sensor feed is the only simulated part. Each minute:

```
T[n+1] = round₂( T[n] + k · (T* − T[n]) + U(−0.06, +0.06) )
```

This is a discrete first-order approach towards a target `T*` at a rate `k` per minute,
plus uniform noise (standard deviation 0.12/√12 ≈ 0.035 °C). The equivalent time constant is
τ = −1/ln(1 − k) minutes. The README describes this as "a physical heat-transfer model". That
overstates it: no ambient temperature, insulation, refrigeration capacity or payload mass
appears anywhere (see [claims audit](research/claims-audit.md)). It is better described as a
*scripted first-order response curve*.

| Condition (`targetFor`) | Target T* | k | τ (min) | Provenance |
|---|---|---|---|---|
| Default (warehouse, transit, handoff, clinic) | 5.0 °C | 0.15 | 6.2 | [assumed] Mid-range set point |
| Loading dock | 5.6 °C | 0.15 | 6.2 | [assumed] Slightly warmer at the dock |
| Near-miss: loading, minute ≥ 10 | 12 °C | 0.03 | 32.8 | [assumed] Doors open at the dock [R24 qualitative] |
| Breach: transit/handoff, minute ≥ 32 | 17 °C | 0.025 | 39.5 | [assumed] Cooling failure |
| Freeze: transit/handoff, minute ≥ 32 | −4 °C | 0.025 | 39.5 | [assumed] Over-cooling / thermostat fault |
| After a corrective action (`correctedAt`) | (min+max)/2 + 0.5 = 5.5 °C | 0.12 | 7.8 | [assumed] Moved to a validated fridge |
| Initial reading | 5.1 °C | – | – | [assumed] |

Closed-form check: a breach starting at about 5 °C at minute 32, with k = 0.025, peaks just
before the clinic phase (minute 81) at about 17 − 12·0.975⁴⁹ ≈ 13.5 °C. The freeze scenario
bottoms out at about −4 + 9·0.975⁴⁹ ≈ −1.4 °C. Both agree with the Monte Carlo results
(median peak 13.7 °C, median low −1.38 °C). The fault ends when the clinic phase starts
because `targetFor` only applies the fault during transit and handoff.

## 3. Rules (`evaluate`)

| Rule | Code | Value | Provenance |
|---|---|---|---|
| Out of range | `t > max \|\| t < min` | 2–8 °C for every seeded product | Label storage range [R10–R14]. Product-specific allowances are ignored, see [research §2](research/research-notes.md#2-storage-rules-for-the-medicines-in-the-demo) |
| Excursion confirmed → quarantine | `consec >= 2` | 2 consecutive 1-min readings | [assumed] Much stricter than PQS E006 (+8 °C for 10 h; −0.5 °C for 60 min) [R5] and the USP CCT allowance (8–15 °C, ≤ 24 h) [R1] |
| Excursion start | `excursionMin = minute − 1` | first of the two readings | – |
| Freeze flag | `freeze && t <= 0` | 0 °C | [assumed] Conservative. Hepatitis B freezes at about −0.5 °C [R6]; PQS low alarm is −0.5 °C [R5] |
| Trend | `slopeOf(last 6 readings)` | ordinary least squares over a 5-min window | [assumed] |
| Warning trigger | `|slope| > 0.06` and ETA ≤ 20 min, while in range | 0.06 °C/min; 20 min | [assumed] |
| ETA | `(max − t)/slope` or `(t − min)/−slope` | linear extrapolation | [assumed] |
| Scripted response (near-miss only) | `autoActAt = minute + 6` | 6 min after the warning | Demo choreography |
| Decision | `decide()` | release / return / dispose, with name, role and note | Human only. TempSure never decides (matches GDP's requirement for a responsible person [R3]) |

Slope noise: with readings one minute apart, the OLS slope over 6 points has a standard
deviation of σ/√17.5 ≈ 0.24·σ. With the demo's σ ≈ 0.035 °C, the 0.06 °C/min threshold is
about 7 standard deviations, so false warnings never happen. With a σ of 0.25 °C, which is
plausible for real loggers rated ±0.5 °C, the threshold is about 1 standard deviation and
false warnings dominate. [VALIDATION §5](VALIDATION.md#5-rule-sensitivity-synthetic-traces)
confirms this.

## 4. Mean kinetic temperature (`mkt`)

```
MKT = (ΔH/R) / −ln( (1/n) Σ exp(−(ΔH/R) / (Tᵢ + 273.15)) ) − 273.15,   ΔH/R = 10 000 K
```

USP <1079.2> [R1] gives ΔH = 83.144 kJ/mol and R = 8.3144 × 10⁻³ kJ/mol·K, so
ΔH/R = 10 000 K (**VERIFIED**). The readings are equally spaced, so equal weights are
correct. The calculation window is **the whole trip**, not the 24 h that USP recommends for
CCT products, so trip MKT values cannot be compared directly with the USP "MKT ≤ 8 °C"
criterion.

## 5. Audit chain (`SHA`, `addEvent`, `verifyChain`)

- SHA-256 is implemented in pure JavaScript (FIPS 180-4) so it works from `file://`, where
  `crypto.subtle` is unavailable. It matches `node:crypto` on the standard test vectors and
  on 2000 random UTF-8 strings.
- `hash = SHA-256(prev + '|' + JSON.stringify([seq, min, type, actor, text]))`, with
  `prev = 'GENESIS'` for the first event.
- `verifyChain` recomputes every hash and reports the first event `seq` that fails.
- The hash does **not** cover readings, the clock string, status, quarantine flags or the
  `decision` object. There is no signature or external anchor (see
  [VALIDATION §6](VALIDATION.md#6-audit-chain)).

## 6. QR snapshot (`snapshot`, `shareUrl`)

- Fields: id, product, lot, expiry, qty, unit, limits, freeze flag, route, status, custody,
  peak/low, minutes out, MKT (0.1 °C), readings thinned to at most ~31 points (0.1 °C), the
  last 3 non-custody events (each cut to 100 characters), the first 16 hex characters of the
  chain head (or `INVALID`), the event count and the snapshot clock.
- Encoding: `base64url(JSON)` in the URL fragment, so the data never reaches a server. The
  QR code is generated by qrcode-generator at error-correction level L with automatic
  version selection.
- The viewer (`renderShared`) trusts the payload. It does not re-verify anything.

## 7. Limitations

1. The temperature feed is scripted. Nothing in it is calibrated against a real vehicle,
   cool box or logger.
2. A single 2–8 °C profile is used for every product, and label excursion allowances are
   ignored. The MMR freeze setting is only correct for some brands.
3. The rules have only been tuned against the demo's own low-noise feed.
4. The integrity chain is local, unsigned and only partly covers the record.
5. There is no identity, authentication, server, trusted time or multi-party record.
6. The "Safe handling verified" message on the shared passport is based only on the
   simulated readings from one sensor.
