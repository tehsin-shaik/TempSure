# Pitch fact-check

Every factual claim that the pitch, the README, the story and 3D pages, and the page
metadata make, or that a presenter is likely to say out loud, checked against a source or
against the validation results. Use it before writing slides or answering judges'
questions.

**Labels**

- **VERIFIED**: confirmed in a primary source (standard, label, peer-reviewed paper,
  official page) or by the validation harness. Harness results are on simulated or
  synthetic data only, and the row says so.
- **APPROX**: broadly right but secondary, rounded, or true only with a caveat that must be
  said with it.
- **UNVERIFIED**: plausible but not checked against a source, or not measured.
- **CONTRADICTED**: a source or the validation results show it is wrong. Do not say it.

Source numbers refer to [REFERENCES.md](../REFERENCES.md). "Abstract" means only the
abstract was read (see the Read column there).

---

## 1. The problem

| # | Claim (where) | Label | Evidence and safe wording |
|---|---|---|---|
| 1 | "A frozen vaccine can look perfect, get injected, and fail to protect the person who receives it." (README, demo script) | **VERIFIED** | Freezing destroys the potency of adsorbed vaccines such as hepatitis B [R6, R8]. VVMs do not register freezing [R7]. Freeze-damaged adsorbed vaccine was linked to lower immunogenicity [R9] |
| 2 | "Vaccines and many medicines must stay within a narrow temperature range, usually 2–8 °C" (README) | **VERIFIED** | USP controlled cold temperature is 2–8 °C [R1]. All four seeded products are labelled 2–8 °C unopened [R10–R14] |
| 3 | "Insulin and vaccines must stay between 2 °C and 8 °C, like the inside of your fridge" (story, 3D) | **APPROX** | True for unopened storage. Lantus may be kept unopened up to 30 °C for up to 28 days [R10]; M-M-R II may be stored frozen down to −50 °C [R13]. Safer: "are stored between 2 °C and 8 °C" |
| 4 | "The record of whether they did is split across warehouses, vans, handoffs and clinics" / "Today the evidence is scattered across companies" (README, demo script) | **UNVERIFIED** | Consistent with GDP, which makes each party keep its own records [R3, R4], but no study measuring how fragmented the records are was read. Say it as the team's observation, not a statistic |
| 5 | Freezing in the cold chain is common | **VERIFIED** (abstract) | Hanson et al. 2017 reviewed 45 studies: "the percentage of vaccine exposure to temperatures below recommended ranges during storage was 33% in wealthier countries and 37.1% in lower income countries", and 38% / 19.3% of studies found it during shipments [R16]. Quote the figures with the review's own wording; the abstract does not say what the 33% is a percentage of |
| 6 | Patients often store insulin out of range | **VERIFIED** (abstract) | Braune et al. 2019: 400 sensor logs from 338 people; 78.8% of logs had deviations (100% of fridge logs, 50% of carried); fridge insulin was out of range 11.3% of the time; 17% of sensors recorded < 0 °C [R20]. Two authors work for the sensor maker (MedAngel), so mention it if challenged |
| 7 | Unmonitored mail shipping performs badly | **VERIFIED** | Simulated mail transit spent on average 68.3% of the time outside USP <659> ranges [R21] |
| 8 | "Over 50% of vaccines are wasted" | **APPROX** | WHO reported more than 50% wastage worldwide, but for **all causes** (open-vial discard, expiry, breakage, temperature) [R18]. Never say "50% are lost to the cold chain" |
| 9 | "Cold-chain failures cost biopharma about US$35 bn a year" | **APPROX** (secondary) | Reported by *Air Cargo News* from IQVIA's 2019 survey; the survey itself was not read [R19]. Say "an industry survey reported by Air Cargo News", or leave it out |

## 2. The setting

| # | Claim (where) | Label | Evidence and safe wording |
|---|---|---|---|
| 10 | "A delivery truck crosses Dubai in 44 °C heat" / "Outside: 44 °C" (README, story, 3D) | **APPROX** (secondary) | Secondary sources citing NCM put Dubai's highest monthly mean maximum at about 44 °C, with a UAE record of 51.8 °C [R41, R42]. It is a hot summer afternoon, not an average. The model does **not** use ambient temperature at all, so do not say the curves are calculated from the 44 °C |
| 11 | "Four realistic UAE scenarios" (README) | **UNVERIFIED** | The scenarios are scripted first-order curves with hand-picked targets and no ambient, vehicle or packaging inputs ([MODEL §2](../MODEL.md)). Say "four illustrative scenarios" |
| 12 | "TempSure reads it every minute" (story) | **APPROX** | Demo resolution. Real loggers usually measure every 1–10 min; WHO PQS E006 fridge loggers measure at least every 10 min [R5] |
| 13 | The UAE has a national medicine regulator and storage/transport rules | **VERIFIED** | Federal Decree-Law No. 28 of 2023 created the Emirates Drug Establishment [R36]. MOHAP publishes GSDP (2017) [R37]; Ministerial Decree No. 227 of 2023 covers transport, storage and distribution, circulated by DHA [R39]. The decree text itself was not read |
| 14 | "Pilot on one UAE pharmacy home-delivery route" (demo script, roadmap) | **VERIFIED** as relevant, for Abu Dhabi | DoH Abu Dhabi's delivery standard requires temperature-controlled transport of refrigerated medicines [R26]. That standard covers Abu Dhabi; the story is set in Dubai, whose delivery rules (DHA) were **not** checked. Name the emirate in the pitch |
| 15 | "Connect to national medicine track-and-trace" (demo script, roadmap) | **VERIFIED** that it exists | Tatmeen serialises packs with GS1 DataMatrix [R33]. No integration exists and no Tatmeen API was checked. Say TempSure would add temperature and custody events alongside Tatmeen, not replace it |
| 16 | "Healthtech track · Fish Tank hackathon (Devin × Hub71)" (README) | **VERIFIED** | The event page lists a Healthtech track, Abu Dhabi [R43] |

## 3. What TempSure does

| # | Claim (where) | Label | Evidence and safe wording |
|---|---|---|---|
| 17 | "Links the medicine to its live temperature" (README) | **APPROX** | The feed is simulated ([MODEL](../MODEL.md)); the README says so further down. Say "simulated live temperature" in the pitch |
| 18 | "Warns before a limit is crossed ('breach in about 7 min')" (README) | **VERIFIED** on simulated data | Median notice 8 min (breach), 15 (freeze), 14 (near-miss), with 0% false alarms on the demo feed. A guard band 0.5 °C inside the limits gives 2–4 min, a plain limit alarm 0 min ([VALIDATION §8](../VALIDATION.md#8-comparison-with-conventional-alarms-and-threshold-sweep)). With 0.25 °C added noise the default setting false-alarms on 98.7% of normal trips. Safe: "in our simulation, about 8–15 minutes' warning" |
| 19 | Early warning is better than a normal alarm | **APPROX** | True on the demo's smooth feed. At 0.25 °C noise a 1 °C guard band gives the same ~6 min notice as the best warning setting, with no false alarms (§8). Do not claim it beats conventional alarms on real hardware |
| 20 | "Respond ... to save the shipment" (README) | **APPROX** | Without the scripted response, only 28% of near-miss runs actually leave the range ([VALIDATION §4](../VALIDATION.md#4-scenarios-1000-seeded-runs-each)). Say "to keep the shipment in range" |
| 21 | "A confirmed excursion puts the exact lot on hold and notifies the assessor" (README) | **APPROX** | The hold works (2 consecutive readings out of range). "Notifies" is a log entry; nothing is sent |
| 22 | "TempSure never decides on its own" (README) | **VERIFIED** (code) | `decide()` is only called from the human decision form or seed data. Quarantine is a hold, not a disposition |
| 23 | "Tamper-evident record that anyone can open by scanning a QR code" (README) | **APPROX** | SHA-256 matches FIPS 180-4 [R48]. Edits to event text, minute and order are detected; readings, status, the decision object, truncation and a full re-hash are not. The QR payload is unsigned ([VALIDATION §6–7](../VALIDATION.md#6-audit-chain)). Say "tamper-evident event log" and "read-only snapshot" |
| 24 | "Pharma-grade metrics: Mean kinetic temperature (USP <1079>)" (README) | **APPROX** | The formula matches USP <1079.2> to 6e-14 °C [R1], but it is computed over the whole trip, not a USP evaluation window |
| 25 | "The record proves it stayed safe the whole way, so patients get medicine that works" (story, 3D) | **CONTRADICTED** | A temperature record cannot prove efficacy, and this one is simulated. Say "The record shows it stayed in its safe range the whole way" |
| 26 | "It went above 8 °C. It may no longer work" (story, 3D) | **APPROX** | "May" is fair. The breach peaks at about 14 °C ([VALIDATION §4](../VALIDATION.md#4-scenarios-1000-seeded-runs-each)), well inside Lantus's labelled 30 °C / 28-day allowance [R10]. Frame it as "needs a pharmacist's check" |
| 27 | Seeded disposal reason "exposure above 15 °C" | **CONTRADICTED** | The breach scenario never exceeds 14.3 °C in 1000 runs, and Humira allows up to 25 °C for 14 days [R11, R11b] |
| 28 | "Connects every vaccine and temperature-sensitive medicine to its temperature history" (page description) | **APPROX** | One fixed 2–8 °C profile per shipment, which is wrong for Priorix freezing and M-M-R II frozen storage [R13, R14]. Say "each shipment" |

## 4. Positioning and impact

| # | Claim | Label | Evidence and safe wording |
|---|---|---|---|
| 29 | Real-time cold-chain monitoring is new | **CONTRADICTED** | Controlant, Sensitech, Tive, ELPRO and Nexleaf ColdTrace already sell real-time loggers and alerts [R31, R32, R44–R46]. Never say "first" or "only" |
| 30 | One per-lot passport (temperature + custody + response + human decision, readable by QR) is the differentiator | **UNVERIFIED** | No feature-by-feature comparison with those products was done (research notes §6). Say "our focus is ..." rather than "nobody else does ..." |
| 31 | Supports SDG 3 | **VERIFIED** (target wording) | SDG 3.8: access to "safe, effective, quality and affordable essential medicines and vaccines"; 3.b: access to affordable essential medicines and vaccines; 3.3: combat hepatitis and other communicable diseases; 3.d: "early warning, risk reduction and management of national and global health risks" [R49]. The link is conceptual: TempSure has no measured health impact |
| 32 | Offline-first mode for immunisation supply chains (roadmap) | **UNVERIFIED** | Roadmap only; not built. Phone-based fridge monitoring for immunisation already exists (ColdTrace) [R32] |

---

## Summary for the presenter

- **Say freely:** frozen vaccines can look normal (#1); 2–8 °C is the standard cold range
  (#2); freezing exposure is common in published reviews (#5); patients often store insulin
  out of range (#6); TempSure leaves the decision to a qualified person (#22); the
  hackathon track (#16); the SDG 3 targets (#31) as alignment, not impact.
- **Say with the caveat:** 44 °C (#10, a hot afternoon, not used by the model); >50%
  wastage (#8, all causes); US$35 bn (#9, secondary); early warning (#18–19, simulated,
  noise-sensitive); tamper evidence and QR (#23, events only, unsigned).
- **Do not say:** "the record proves the medicine works" (#25), "exposure above 15 °C"
  (#27), "first/only real-time monitoring" (#29), or that the scenarios are realistic UAE
  physics (#11).

The app text behind #3, #11, #17, #20, #23, #25–28 is unchanged. Suggested replacements are
in [claims-audit.md](claims-audit.md).
