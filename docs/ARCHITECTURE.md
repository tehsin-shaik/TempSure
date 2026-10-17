# TempSure architecture

## Source layout

| File | Lines | Role |
|---|---|---|
| `index.html` | 48 | Shell: header, nav, `#app` mount, footer (Reset demo data, theme). Loads Google Fonts (Inter) and the scripts below |
| `app.js` | 822 | Everything else: constants, SHA-256, MKT, state, simulation, rules, router, pages, evidence report, QR snapshot, seed data |
| `story.js` | 379 | 2D canvas story (`#/story`), with two endings |
| `sim3d.js` | 644 | Three.js story (`#/sim`), with two endings, orbit camera and a 2D fallback |
| `styles.css` | 502 | Light/dark theme, layout, print styles for the report |
| `vendor/qrcode.js` | – | qrcode-generator (Kazuhiko Arase, MIT) |
| `vendor/three.min.js` | – | Three.js r149 (MIT) |
| `tools/validate.mjs` | – | Validation harness (Node only, not loaded by the app) |

There is no build step, no package manager and no backend. It runs from `file://` or any
static host.

## Runtime

- **State.** A single `state = { seq, shipments[] }` object is held in memory and persisted
  as JSON in `localStorage['tempsure.v1']`. The theme is stored in `localStorage['tempsure.theme']`.
  On first load, or after "Reset demo data", `seed()` creates three finished shipments
  (breach → disposed, freeze → quarantined, normal → delivered) and one near-miss shipment
  ready to start (TS-0138).
- **Simulation.** `startSim()` runs `setInterval(tick, TICK_MS[speed])`. Each tick adds one
  simulated minute (`targetFor` → new reading → `evaluate`), saves every 5 minutes and
  refreshes the visible page.
- **Router.** The hash routes are `#/` (dashboard), `#/new`, `#/p/<id>` (passport),
  `#/v/<base64url>` (shared read-only snapshot), `#/how`, `#/story` and `#/sim`.
- **Integrity.** `addEvent()` appends `{seq, min, clock, type, actor, text, prev, hash}`.
  `verifyChain()` recomputes every hash. "Simulate tampering" edits one event's text in
  memory and keeps a backup so it can be undone.
- **Sharing.** `shareUrl()` = current page URL + `#/v/` + base64url(JSON snapshot). Because
  the data is in the fragment, it is never sent to a server. A phone needs a deployed URL
  (for example GitHub Pages) to open it.

## Data flow

```
targetFor ─▶ tick (reading) ─▶ evaluate ─┬─▶ warning / quarantine / freeze events ─▶ addEvent (hash chain)
                                         └─▶ peak, low, minutesOut, MKT
human: Respond ─▶ logAction (correctedAt) ─▶ addEvent
human: Decide  ─▶ decide ─▶ addEvent
passport ─▶ snapshot ─▶ base64url ─▶ QR  ─▶  #/v/… ─▶ renderShared (read-only, no re-verification)
```

## Production path

What would have to change to turn this demo into a pilot (from
[research notes §3–5](research/research-notes.md)):

| Demo | Pilot need | Driver |
|---|---|---|
| Simulated feed | Logger integrations (vendor API / BLE / NFC). Characterise noise. Retune or smooth the warning | VALIDATION §5 |
| One 2–8 °C profile | Product/presentation profiles (range, freeze sensitivity, label excursion allowances), keyed by GTIN | Research §2 |
| `localStorage`, single browser | Server-side append-only store, user accounts, roles, e-signature for decisions | WHO TRS 1033 A4, 21 CFR 11, Annex 11 [R27–R29] |
| Unanchored hash chain over events only | Hash readings and decision fields too. Sign entries. Anchor the head with RFC 3161 timestamps or a transparency log | VALIDATION §6, [R30a/b] |
| Unsigned QR snapshot | Read the pack's GS1 DataMatrix and look up the passport, or sign the snapshot | Tatmeen / GS1 [R33, R34] |
| Alerts are log entries | Push/SMS to the custodian and supervisor, with escalation | DoH delivery standard [R26] |
| Google Fonts from CDN | Self-host the font for offline use and privacy | `index.html` |
