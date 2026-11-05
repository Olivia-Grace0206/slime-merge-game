# Phase4A recovery checkpoint
Base main 582b99c1920b4a27a7313dfa22a3926c734e1296; PR16 confirmed merged via connector and local clone.
Branch feature/phase04a-land-expansion-bigint-economy. Work in progress, not delivery-ready.
Currency now bigint, schema8 codec and historical reward1/2; new reward3 tracks new base prices.
Bounds8x8 with plots A/B/C/D; inBounds excludes locked cells, emptyCells shares gate.
Purchase checks expected plot count; SessionStore Web Locks/queue/CAS publish-after-write unchanged.
Fixed 175-unit normal cells, world1400, initial camera unchanged; land panel plus world locks.
Typecheck succeeded once after test fixture conversion. Core test first run: 873 passed/59 failures,
mainly old price/cap/schema assumptions; still updating expected contract and checking actual defects.
Node22.23.4/npm10.9.9 installed through npm exec outside repo; npm ci success (178 packages).
Browser151 download corrupt; Playwright1.51.1 Chromium134 fallback downloaded successfully.
Remaining: meaningful new tests, all regression fixes/runs, land economy simulation, browser/screenshot/perf,
complete spec/docs, final validation, push/Draft PR/CI. Do not merge or deploy main.
