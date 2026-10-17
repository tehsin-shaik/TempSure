# TempSure research notes

Background research behind TempSure, the Medicine Integrity Passport demo. It covers why the
product exists, what the regulations and standards actually require, how individual
medicines behave, what the UAE context is, and where TempSure stands next to products that
already exist. Every number used in the app (`app.js`, `story.js`, `sim3d.js`) is traced in
[`../MODEL.md`](../MODEL.md). The claims made in the README and UI are checked one by one in
[`claims-audit.md`](claims-audit.md).

## How to read this

Every claim carries a confidence label:

| Label | Meaning |
|---|---|
| **VERIFIED** | Read directly from the primary source cited (regulation, guideline, label, standard, peer-reviewed abstract or full text). |
| **APPROX** | Derived from verified inputs, or taken from a credible secondary source (news report citing an official agency, vendor datasheet). |
| **UNVERIFIED** | Not checked against a primary source. Must not be presented as fact without a caveat. |

Reference numbers like [R12] point to [`../REFERENCES.md`](../REFERENCES.md).

**Scope.** TempSure is a browser-only hackathon prototype. Its sensor feed is simulated. None
of the findings below mean TempSure has been validated on real loggers, real vehicles or
real medicines. The research tells us what a real system would have to do. The
[validation report](../VALIDATION.md) tests what the demo actually does.

---

## 1. The problem TempSure addresses

### 1.1 Temperature-sensitive medicines

- **VERIFIED.** Most vaccines and many biologics are labelled for refrigerated storage at
  2–8 °C. USP defines "controlled cold temperature" (CCT) as 2–8 °C [R1]. Every product the
  demo seeds is labelled 2–8 °C for unopened storage: insulin glargine [R10], hepatitis B
  vaccine [R12], adalimumab [R11] and MMR (refrigerated presentations) [R13, R14].
- **VERIFIED.** Heat and freezing do different kinds of damage. Heat exposure adds up over
  time, which is why vaccine vial monitors track it [R7]. Freezing can destroy
  aluminium-adjuvanted vaccines such as hepatitis B in a single event [R6, R8].
- **VERIFIED.** Freeze damage can be invisible. WHO guidance on vaccine vial monitors states
  that a VVM does not register freezing, so separate freeze indicators are still needed
  [R7]. The shake test exists because frozen adsorbed vaccines can look normal until
  agitated. A validation study linked freeze-damaged adsorbed vaccine to lower immunogenicity
  and more sterile abscesses [R9]. This supports the README's opening line ("a frozen vaccine
  can look perfect ... and fail to protect").

### 1.2 How often it goes wrong

- **VERIFIED.** Freezing in the vaccine cold chain is common. A 2017 review of 45 studies
  (Hanson et al., *Vaccine*) reports that "the percentage of vaccine exposure to
  temperatures below recommended ranges during storage was 33% in wealthier countries and
  37.1% in lower income countries", and that below-range exposure during shipments occurred
  in 38% and 19.3% of studies respectively [R16]. An earlier systematic review reached a similar conclusion (Matthias et al.
  2007) [R17].
- **VERIFIED.** Patients' own storage is also unreliable. People with diabetes (n = 338)
  carried Bluetooth sensors with their insulin (Braune et al. 2019), and insulin was often
  kept outside the manufacturer's range, both in home fridges and when carried [R20].
- **VERIFIED.** Shipping by mail without monitoring performs badly. A *JAPhA* study of
  simulated mail transit found packages spent on average 68.3% of transit time outside the
  USP <659> range [R21].
- **VERIFIED, but the context matters.** WHO's 2005 guidance on monitoring vaccine wastage
  says WHO reported more than 50% vaccine wastage worldwide [R18]. That figure covers
  **all causes** (open-vial discard, expiry, breakage, temperature), not temperature
  failures alone. It must not be quoted as "50% of vaccines are lost to the cold chain".
- **APPROX (secondary source).** IQVIA's 2019 biopharma cold-chain survey, as reported by
  *Air Cargo News*, put losses from failures in temperature-controlled logistics at around
  US$35 bn a year [R19]. The underlying IQVIA report has not been read. Cite it as
  "reported by" if at all.

### 1.3 Why a record, not just a sensor

- **VERIFIED.** Regulators require excursions to be documented, investigated and reported.
  They do not just want them detected. EU GDP (2013/C 343/01) requires deviations such as
  temperature excursions during transport to be reported to the distributor and recipient
  [R3]. WHO TRS 961 Annex 9 defines a *temperature excursion* and covers alarm handling,
  monitoring and qualification of temperature-controlled road vehicles [R2]. WHO TRS 1025
  Annex 7 requires suspect and returned products to be quarantined, and monitoring records
  to be kept [R4].
- **VERIFIED.** Abu Dhabi's DoH *Delivery of Pharmacy Medication Standard* (V2, Jan 2025)
  asks for exactly the kind of record TempSure models [R26]. Refrigerated items must travel
  in a temperature-controlled container that keeps the product-specific temperature
  (§4.9.3). A "comprehensive audit trail of all deliveries ... preferably electronically"
  must record items with special storage needs (§4.11). Delivery must be confirmed
  (§4.12). The vehicle temperature must be appropriate (§4.14.2). The recipient's identity
  is checked with an Emirates ID (§4.14.3).
- **Inference.** A logger can show *that* a temperature changed. The pharmacist still has to
  piece together *which lot*, *who held it*, *what was done* and *what was decided* from
  separate systems. Joining these up is TempSure's main idea. The demo shows the idea works
  as a user flow. It does not show that the joined-up record would satisfy an inspector
  (see §5).

---

## 2. Storage rules for the medicines in the demo

The demo applies one profile to every product: 2–8 °C, quarantine on any reading outside
it. Real labels are more nuanced.

| Product in demo | Label storage (unopened) | Freeze | Label excursion / out-of-fridge allowance | Source | Demo setting |
|---|---|---|---|---|---|
| Insulin glargine 100 U/mL pens (Lantus) | 2–8 °C | Do not freeze. Discard if frozen | Unopened at room temperature (up to 30 °C) for up to 28 days | DailyMed Lantus §16.2 [R10] **VERIFIED** | 2–8, freeze-sensitive ✔ |
| Hepatitis B vaccine (Engerix B) | 2–8 °C | Do not freeze | Stable up to 37 °C for 3 days or 25 °C for 7 days. For temporary excursions only | emc SmPC §6.4 [R12] **VERIFIED** | 2–8, freeze-sensitive ✔ |
| Adalimumab pens (Humira) | 2–8 °C | Do not freeze | May be kept up to 25 °C for up to 14 days | EMA product information [R11]; SPS NHS fridge tool [R11b] **VERIFIED** | 2–8, freeze-sensitive ✔ |
| MMR, lyophilised (M-M-R II) | −50 °C to +8 °C | Freezing allowed before reconstitution. Diluent: do not freeze | Reconstituted: 2–8 °C, use within 8 h | Merck US PI §16 [R13] **VERIFIED** | 2–8, not freeze-sensitive ✔ for this brand |
| MMR, lyophilised (Priorix) | 2–8 °C | **Do not freeze** | Reconstituted: 2–8 °C, up to 8 h | emc SmPC §6.4; GSK US PI §16.1 [R14] **VERIFIED** | Demo would **miss** freezing for this brand ✘ |

What this means for TempSure:

1. **The storage profile has to belong to the product and presentation, not the category.**
   "MMR vaccine" is not enough. M-M-R II can be frozen and Priorix must not be. The demo's
   `freeze: false` is right only for M-M-R II. A real passport needs the profile taken from
   the labelled product (for example via GTIN, see §4.3).
2. **Leaving 2–8 °C does not make a product unusable.** Three of the four seeded products
   have published allowances for time outside the fridge. Quarantining on any excursion is
   a sensible conservative hold, and the app correctly leaves the final call to a qualified
   person. But wording such as "it may no longer work" should not be strengthened into
   "spoiled".
3. **WHO also allows some freeze-dried vaccines to be frozen.** WHO's *Temperature
   sensitivity of vaccines* (2006) notes that freeze-dried measles-containing vaccines may
   be stored at −15 to −25 °C, although this is not required [R6]. **VERIFIED.**
4. **Hepatitis B freezes below 0 °C.** WHO gives a freezing point of about −0.5 °C for
   hepatitis B vaccine and says freezing destroys its potency [R6]. **VERIFIED.** TempSure
   flags readings at ≤ 0 °C, which is a reasonable conservative proxy. Any reading below
   2 °C already leads to quarantine anyway.

### 2.1 How insulin handles heat

- **VERIFIED.** Kaufmann et al. (PLoS One 2021) tested insulin types under tropical
  temperature conditions in a humanitarian setting. Their aim was to see whether the strict
  storage rules could safely be relaxed where refrigeration is unreliable [R22].
- **VERIFIED.** A 2023 review of human insulin stability found studies reporting no
  clinically relevant loss of activity for unopened human insulin at 28.9–37 °C for up to
  four months. Manufacturer data showed a 1.8% loss after three months at 25 °C [R23].
- **Implication.** A 46-minute rise to about 14 °C, which is what the demo's breach
  scenario produces (see [VALIDATION](../VALIDATION.md)), is well within insulin
  glargine's labelled room-temperature allowance. In the real world such an event would be
  documented and assessed, but it would rarely lead to disposal. The demo's story should be
  framed around **loss of evidence and confidence**, not loss of potency.

---

## 3. Monitoring standards and what they mean for the rules

### 3.1 Mean kinetic temperature (MKT)

- **VERIFIED.** USP <1079.2> defines MKT as a single derived temperature that has the same
  total thermal effect as the time-temperature profile actually experienced. It is "not a
  simple arithmetic mean". The default heat of activation is ΔH = 83.144 kJ/mol, with
  R = 8.3144 × 10⁻³ kJ/mol·K, so ΔH/R = 10 000 K [R1]. TempSure's `mkt()` uses exactly
  ΔH/R = 10 000 K. The validation script shows it matches the USP formula to within
  6 × 10⁻¹⁴ °C.
- **VERIFIED.** For CCT products, USP <1079.2> / <659> allow excursions of 8–15 °C, with a
  maximum of 15 °C, for no more than 24 h, and an MKT no more than 8 °C calculated over
  **24 h** [R1]. The chapter warns against "fixing" an excursion by averaging over long
  windows (it gives a 52-week example). It also says that products with their own stability
  data are judged on that data.
- **VERIFIED.** USP says MKT is acceptable for storage and "can be considered" for
  excursions during transit. The patient is outside the chapter's scope [R1].
- **Implication for TempSure.** TempSure computes MKT over the trip (≈ 93 one-minute
  readings), not over the 24 h window USP recommends for CCT. A trip MKT is a fair way to
  summarise exposure, but it cannot be checked directly against the USP "MKT ≤ 8 °C over
  24 h" limit.

### 3.2 Logger alarms

- **VERIFIED.** WHO PQS E006/TR06.4 (30-day electronic refrigerator logger) sets, for
  Type 1 (+2 to +8 °C) devices: low alarm at −0.5 °C or below for **60 minutes**; high alarm
  at +8 °C or above for **10 hours**; measuring interval no more than 10 min and logging
  interval no more than 1 h [R5].
- **Comparison.** TempSure quarantines after **two consecutive one-minute readings**
  outside 2–8 °C. That is far stricter than the PQS alarm thresholds, which are designed to
  avoid alarm fatigue in clinic fridges. Being strict is defensible for a high-value
  last-mile delivery, because a quarantine is a hold for review and not a verdict. But it
  means short excursions like door openings will produce holds that a pharmacist then has
  to clear. Validation shows that a two-minute blip to 8.3 °C triggers quarantine
  ([VALIDATION §5](../VALIDATION.md#5-rule-sensitivity-synthetic-traces)).
- **APPROX (vendor datasheets).** Commercial real-time loggers state an accuracy of about
  ±0.5 °C (for example Controlant Saga [R31]). The demo's simulated noise is uniform
  ±0.06 °C (SD ≈ 0.035 °C), about ten times smaller. Validation shows the predictive warning
  gives false alerts on most steady trips once noise reaches SD 0.25 °C. Real logger noise
  must be characterised before the 0.06 °C/min slope threshold can be trusted.
- **Comparison with simpler alarms (synthetic).** On the demo's feed the trend warning gives
  a median 14 min notice, against 3 min for a guard band 0.5 °C inside the limits and 0 for
  a plain limit alarm. At 0.25 °C added noise, a 1 °C guard band or a 5-minute prediction
  horizon both give about 6 min notice with ≤ 0.5% false alarms, while the default setting
  false-alarms on 98.7% of normal trips
  ([VALIDATION §8](../VALIDATION.md#8-comparison-with-conventional-alarms-and-threshold-sweep)).

### 3.3 Transport

- **VERIFIED.** EU GDP chapter 9 requires a risk assessment of delivery routes, qualified
  equipment for temperature-sensitive products, calibrated temperature-monitoring equipment
  in vehicles, and reporting of excursions [R3]. WHO TRS 961 Annex 9 covers
  temperature-controlled road vehicles, their qualification and transport alarm
  verification [R2].
- **VERIFIED.** Door openings during unloading heat the inside of refrigerated vehicles in
  ways that depend on door geometry. A CFD study (*J Food Process Eng* 2017) quantifies the
  effect [R24]. This is the physical basis for the demo's "loading-dock near-miss".
- **Inference.** The demo's scenarios are hand-tuned curves, not the output of a vehicle
  thermal model (see [MODEL §2](../MODEL.md#2-temperature-generator)).

---

## 4. Integrity, audit trail and identity

### 4.1 What regulators mean by an audit trail

- **VERIFIED.** WHO TRS 1033 Annex 4 (data integrity) requires ALCOA+ data (attributable,
  legible, contemporaneous, original, accurate, plus complete, consistent, enduring and
  available) and audit trails that are enabled and cannot be switched off by users [R27].
- **VERIFIED.** US 21 CFR 11.10(e) requires "secure, computer-generated, time-stamped audit
  trails" where changes do not hide the previous entries [R28]. EU GMP Annex 11 §9 requires
  an audit trail of GMP-relevant changes and deletions, with the reason recorded [R29].
- **VERIFIED.** RFC 3161 defines trusted timestamping by a third-party Time-Stamp
  Authority [R30a]. RFC 6962 (Certificate Transparency) defines public, append-only
  Merkle-tree logs that independent parties can audit [R30b].

### 4.2 How TempSure's hash chain compares

TempSure seals each event as `hash = SHA-256(prev + '|' + JSON([seq, min, type, actor, text]))`,
starting from `GENESIS`. The validation script shows:

- **Detected:** editing an event's text or minute, and reordering events.
- **Not detected** (in the demo's design):
  - editing sensor readings, which are not hashed;
  - editing the clock string, the shipment status or quarantine flags, or the decision
    object shown in the report;
  - truncating the newest events;
  - rewriting an event and recomputing every hash after it.

The chain proves the stored log is **internally consistent**. Without a signature, a trusted
timestamp or an externally held head hash, it cannot prove that the log is **original** or
**complete**. It also runs entirely in one browser's `localStorage`, with no user identity.
It is therefore a good demonstration of tamper evidence, but it is **not** a Part 11/Annex 11
audit trail. The production path is in [`../ARCHITECTURE.md`](../ARCHITECTURE.md#production-path).

### 4.3 QR passport and serialisation

- **VERIFIED.** The UAE's national medicine track-and-trace system, Tatmeen, serialises
  packs with GS1 2D DataMatrix codes [R33]. The EU Falsified Medicines Directive delegated
  regulation (EU) 2016/161 also uses a 2D DataMatrix unique identifier [R35].
- **VERIFIED.** GS1 states that GS1 Digital Link is not used in 2D barcodes for healthcare
  applications, where GS1 DataMatrix is used [R34].
- **TempSure today.** The QR encodes a self-contained URL:
  `…#/v/<base64url(JSON snapshot)>`. The validation script measured these at 586–1190
  characters, which needs QR versions 16–25 at error-correction level L. The payload is
  **unsigned**: a hand-edited snapshot that says "Released" decodes and displays normally.
  It is a convenient demo of a "passport on any phone", not a way to identify a product.
- **Production direction (inference).** Read the pack's existing GS1 DataMatrix (GTIN,
  batch, expiry, serial) to look up the passport on a server. Use signed snapshots, or
  short-URL lookups, instead of embedding the data in the QR. Do not replace the
  regulatory barcode.

---

## 5. UAE context

- **VERIFIED.** Federal Decree-Law No. 28 of 2023 created the Emirates Drug Establishment
  (EDE) as the federal regulator of medical products [R36].
- **VERIFIED.** MOHAP publishes *Good Pharmaceutical Storage and Distribution Practices*
  (2017) [R37] and certifies compliance for pharmaceutical warehouses [R38]. Ministerial
  Decree No. 227 of 2023 regulates the transport, storage and distribution of medical
  products, and Dubai Health Authority circulated it to all facilities (circular
  CIR-2023-00000159) [R39].
- **VERIFIED.** In Abu Dhabi, DoH's delivery standard (§1.3 above) and a DoH circular on
  medicine delivery apps both apply. Prescription-only medicines may only be delivered
  after the prescription has been verified, and DoH approval is needed before running a
  delivery service (citing Federal Decree-Law No. 38 of 2024 on Medical Products) [R26,
  R40].
- **VERIFIED.** Tatmeen tracks serialised packs across the UAE supply chain [R33]. A
  TempSure pilot would sit alongside Tatmeen and add temperature and custody events to an
  identity that already exists. It would not replace Tatmeen.
- **APPROX (secondary, citing NCM).** Dubai summers are extreme. News reports citing the
  National Centre of Meteorology recorded 51.8 °C at Sweihan (Al Ain) on 1 Aug 2025 and
  6 Jun 2021 [R41]. Long-term Dubai Airport records put the August mean around 35.5 °C,
  with the highest monthly mean maximum around 44 °C [R42]. The story's "44 °C outside" is
  therefore a plausible summer afternoon value, not an average. The demo's temperature model
  does not use the ambient temperature at all.
- **VERIFIED.** The Fish Tank by Devin × Hub71 event (Abu Dhabi) lists Healthtech among its
  tracks [R43].

---

## 6. Existing products and how TempSure differs

| Product | What it does | Source |
|---|---|---|
| Controlant Saga | Real-time cellular loggers (Saga-P −20 to +50 °C, ±0.5 °C), cloud platform | [R31] **APPROX** (vendor) |
| Sensitech TempTale GEO APX | Real-time location + temperature monitors for pharma shipments | [R44] **APPROX** (vendor) |
| Tive Solo Pro | Real-time multi-sensor shipment tracker | [R45] **APPROX** (vendor) |
| ELPRO LIBERO | Pharma data loggers, including single-use PDF loggers | [R46] **APPROX** (vendor) |
| Berlinger Fridge-tag 2 L | WHO PQS-prequalified 30-day fridge logger | [R5b] **VERIFIED** (PQS listing) |
| Nexleaf ColdTrace | Bluetooth sensors plus phone app for immunisation fridges, with alerts and GPS | [R32] **APPROX** (vendor) |

**Where TempSure differs (as a concept).** Real-time logging, location and alerting already
exist and are mature. TempSure does not claim to invent them. Its proposition is the
*passport*: one record per lot that holds temperature, custody at each handoff, the response,
the quarantine and a recorded human decision, readable by anyone through a QR code. Whether
existing platforms already provide equivalent per-lot custody and decision records has
**not** been checked feature by feature (**UNVERIFIED**). Claims such as "first" or "only"
should be avoided.

---

## 7. Open items to verify

| # | Item | Why it matters |
|---|---|---|
| 1 | Read the IQVIA 2019 survey directly | The US$35 bn figure is only secondary |
| 2 | Download MOHAP GSDP 2017 PDF and Decree 227/2023 text (the MOHAP server reset the connection during this research) | UAE transport temperature-monitoring specifics |
| 3 | Characterise real logger noise and sampling interval | Determines the false-alarm rate of the predictive warning |
| 4 | Obtain UAE-registered product labels (EDE) for the four products | UAE labels may differ from EU/US labels |
| 5 | Check NCM primary climate data for Dubai | Replace the secondary 44 °C / 51.8 °C sources |
| 6 | Compare competitor feature sets for lot-level custody + decision records | Supports or refutes the differentiation claim |
| 7 | Read the CDC Vaccine Storage & Handling Toolkit section on excursions | The README's "see CDC guidance" pointer |
