# Claims audit

Every factual or performance claim in `README.md` and the app's UI text, checked against the
[research notes](research-notes.md) and the [validation results](../VALIDATION.md).

| Verdict | Meaning |
|---|---|
| ✅ **Supported** | Backed by a primary source or by the validation script |
| ⚠️ **Qualify** | Partly true. The wording should be narrowed |
| ❌ **Not supported** | Contradicted by the code, the data or the sources |
| ℹ️ **Demo assumption** | A scenario choice, fine if presented as one |

## README

| # | Claim (verbatim or close) | Verdict | Evidence / suggested wording |
|---|---|---|---|
| 1 | "A frozen vaccine can look perfect, get injected, and fail to protect the person who receives it." | ✅ | WHO: freezing destroys potency of adsorbed vaccines such as hepatitis B. VVMs do not show freezing. Freeze-damaged vaccine is linked to lower immunogenicity [R6, R7, R9] |
| 2 | "must stay within a narrow temperature range, usually 2–8°C" | ✅ | USP CCT 2–8 °C. All four seeded products are labelled 2–8 °C unopened [R1, R10–R14]. Note that M-M-R II may also be frozen [R13] |
| 3 | "linked to its live temperature" | ⚠️ | The feed is simulated (the README says so further down). Suggest "simulated live temperature" in the opening paragraph |
| 4 | "all in one tamper-evident record that anyone can open by scanning a QR code" | ⚠️ | The event log is tamper-evident for edits to event text, minute and order. Readings, status and the decision object are not hashed. The QR snapshot is unsigned (VALIDATION §6–7) |
| 5 | "A delivery truck crosses Dubai in 44°C heat" | ℹ️ | Plausible summer afternoon value (secondary NCM-based sources: highest monthly mean max ≈ 44 °C, records 51.8 °C) [R41, R42]. Ambient temperature is not an input to the model |
| 6 | "Four realistic UAE scenarios" | ⚠️ | The scenarios are scripted first-order curves with no ambient, vehicle or packaging parameters (MODEL §2). Suggest "four illustrative scenarios" |
| 7 | "warns before a limit is crossed ('breach in about 7 min')" | ✅ on simulated data | Breach lead time 7–10 min, freeze 13–17 min over 1000 seeded runs. Not validated on real sensor noise. False warnings reach 93% at 0.25 °C noise (VALIDATION §5). Median notice is 14 min vs 3 min for a 0.5 °C guard band, but at 0.25 °C noise a 1 °C guard band matches the best warning setting (VALIDATION §8) |
| 8 | "A 'Respond' action ... to save the shipment" | ⚠️ | In the no-response counterfactual, only 28% of near-miss runs become an excursion (VALIDATION §4). Suggest "to keep the shipment in range" |
| 9 | "A confirmed excursion puts the exact lot on hold and notifies the assessor" | ⚠️ | The hold works as described. "Notifies" is a log entry only: nothing is actually sent |
| 10 | "Flags readings at 0°C or below on freeze-sensitive products, where damage is invisible" | ✅ | Matches code. Conservative relative to the ≈ −0.5 °C hepatitis B freezing point and the PQS −0.5 °C alarm [R5, R6] |
| 11 | "TempSure never decides on its own" | ✅ | `decide()` is only called from the human decision form or seed data. Quarantine is a hold, not a disposition |
| 12 | "Every event is sealed with a SHA-256 hash chain" | ✅ | SHA-256 verified against FIPS vectors and `node:crypto`. Every event is chained |
| 13 | "'Simulate tampering' shows the chain breaking" | ✅ | Text edits are detected at the right `seq` |
| 14 | "Pharma-grade metrics: Mean kinetic temperature (USP <1079>)" | ⚠️ | The formula matches USP <1079.2> exactly. But MKT is computed over the trip, not the 24 h USP recommends for CCT products, and "pharma-grade" implies a qualified system. Suggest "Mean kinetic temperature (USP <1079.2> formula)" |
| 15 | "Temperatures come from a physical heat-transfer model for each scenario" | ❌ | The code is `T += k·(target − T) + noise` with hand-picked targets. Suggest "Temperatures come from a scripted first-order response curve for each scenario" |
| 16 | "Working as built: prediction, excursion detection, quarantine, MKT, evidence report, decision workflow, hash-chained audit log and QR passport" | ✅ as code | All run in the browser and are exercised by the validation script. "Working as built" means the logic runs. It does not mean the logic has been validated with users or hardware |
| 17 | "Viability decisions ... involve the manufacturer or public-health authority (see CDC and WHO guidance)" | ✅ | Consistent with GDP/WHO guidance on excursion handling and with product-label allowances [R2, R3, R47] |

## UI text (`app.js`, `story.js`, `sim3d.js`)

| # | Claim | Where | Verdict | Evidence / suggested wording |
|---|---|---|---|---|
| 18 | "Safe handling verified. Stored within its approved range." | Shared QR passport, status Delivered/Released | ⚠️ | Based on one simulated sensor and an unsigned payload. Suggest "No excursion recorded. Stored within its approved range." |
| 19 | "The record proves it stayed safe the whole way, so patients get medicine that works." | Story / 3D, final scene | ❌ | A temperature record cannot prove efficacy, and this record is simulated and unsigned. Suggest "The record shows it stayed in range the whole way." |
| 20 | "It went above 8°C. It may no longer work" / "Insulin locked: do not use" | Story / 3D, no-response ending | ⚠️ | "May" is fair, but insulin glargine is labelled for up to 28 days unopened at ≤ 30 °C [R10]. The quarantine is right. The implied harm is overstated for insulin. A vaccine would make a stronger example |
| 21 | "TempSure reads it every minute" | Story | ℹ️ | Demo resolution. Real loggers usually measure every 1–10 min [R5] |
| 22 | Seeded decision rationale "Manufacturer confirmed exposure above 15°C exceeds stability allowance." | `seed()`, adalimumab breach | ❌ | The breach scenario peaks at 13.25–14.30 °C in 1000 runs, so it never exceeds 15 °C. Humira's label also allows up to 25 °C for 14 days [R11]. Suggest a rationale tied to the data, e.g. "Exposure duration not covered by available stability data; manufacturer advised disposal." |
| 23 | MMR seeded with `freeze: false` | `PRODUCTS` | ⚠️ | Correct for M-M-R II (−50 to +8 °C) [R13], wrong for Priorix (do not freeze) [R14]. The profile should be brand-specific |
| 24 | "Their decision is sealed into a tamper-evident record." | How it works | ⚠️ | The decision event text is sealed. The `decision` object rendered in the report is not (VALIDATION §6) |
| 25 | "sealed with a SHA-256 hash of the one before it, so any edit after the fact breaks the chain" | Passport audit panel | ⚠️ | Not *any* edit: readings, status, truncation and a full re-hash are not caught. Suggest "so an edit to a logged event breaks the chain" |
| 26 | "Link a sensor: Any compatible reusable or disposable logger is linked" | How it works | ℹ️ | Roadmap. No logger integration exists |
| 27 | "a cooling failure and a silent freeze in UAE summer conditions" | How it works | ℹ️ | Ambient temperature is narrative only (see #5) |

## Hackathon and positioning claims

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 28 | "Healthtech track · Fish Tank hackathon (Devin × Hub71)" | ✅ | The event listing includes a Healthtech track, Abu Dhabi [R43] |
| 29 | Pilot "UAE distributor to pharmacy home delivery of insulin and biologics" | ✅ relevance | DoH Abu Dhabi delivery standard requires temperature-controlled transport of refrigerated items and an electronic delivery audit trail [R26] |
| 30 | "Link passports to national medicine track-and-trace serial numbers" | ✅ relevance | Tatmeen uses GS1 DataMatrix serialisation [R33] |
| 31 | Implied novelty of live monitoring + alerts | ⚠️ | Mature commercial products already do this (Controlant, Sensitech, Tive, ELPRO, ColdTrace) [R31, R32, R44–R46]. Position the per-lot custody + decision passport as the differentiator, and avoid "first/only" |

## Summary

- 2 ❌ claims in the README/UI (#15 heat-transfer model, #19 "proves ... medicine that works")
  and 1 ❌ in the seed data (#22, a rationale that contradicts its own data).
- The main ⚠️ themes are: describe the integrity chain more narrowly, say that the QR is
  unsigned, say that the warning is validated only on smooth simulated data, and make
  storage profiles product-specific.
- This audit only recommends wording. It does not change the app.
