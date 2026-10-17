# TempSure QA

## Automated

| Check | Command | Covers |
|---|---|---|
| Logic validation | `node tools/validate.mjs` | SHA-256, MKT, trend slope, 4 scenarios × 1000 seeded runs, rule sensitivity, tamper tests, QR fit and round-trip. See [VALIDATION.md](VALIDATION.md) |
| Syntax | `node --check app.js story.js sim3d.js` | Parse errors in the shipped scripts |

The harness runs the shipped `app.js` itself, not a copy, so changes to the rules show up in
the results straight away. Running `tools/validate.mjs` exits with code 1 if any asserted
check fails. The informational near-miss counterfactual is reported but not asserted.

## Manual browser checklist

1. Load `index.html` from `file://` and from `python -m http.server`. The dashboard should
   show 4 seeded shipments.
2. Open TS-0138 at 2× and Start. A warning should appear at about 12 min and the scripted
   response at about 18 min, ending Delivered.
3. Reset, choose Breach, then Start. Expect a warning at about 34 min and Quarantined at
   about 42 min. The evidence report opens, and recording a decision updates the status.
4. Click Simulate tampering. The chain shows as broken at an event. Undo restores it.
5. Scan the QR from a phone against a deployed URL. The read-only passport should render.
6. Open `#/story` and `#/sim`, try both endings, and check that the 3D fallback appears if
   WebGL is unavailable.
7. Switch light/dark theme. Print the evidence report.

## Not covered

- Cross-browser and mobile-device matrix; QR scanning reliability for versions 22–25.
- Accessibility audit (screen reader, contrast, keyboard).
- `localStorage` quota and private-mode behaviour.
- Performance on low-end phones (3D page).
