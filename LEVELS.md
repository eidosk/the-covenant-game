# Level progression plan

13 real levels (`level1`-`level13`) plus `level0` as a low-stakes tutorial (the origin story — it now teaches the full move→horn→sun beam→beam→rainbow loop in one small board) — 14 `LEVELS` entries total. Each level should introduce at most one new mechanic, building on everything taught before it. Mirror-unicorn is reserved for the last three levels only.

| Level | Mechanic introduced | Status | Notes |
|---|---|---|---|
| 0 | — (tutorial) | done | Solid ground, not clouds. Origin story: follow the path through the horn pickup (horse→unicorn), grab the sun beam at (15,4), backtrack and fire east from (10,2) to clear 3 storm tiles, cross the rainbow that forms where the beam was. Sun beam and exit share the cell. Resynced from `level0.esx` (2026-09-06). |
| 1 | Rain (S) + horn beam clearing | done | Open hole-bordered room, 1 real ring, entrance-side rain strip. Synced from a fresh `level1.esx` (2026-08-22). |
| 2 | Weighted panels + hidden ring | done | New board (resync 2026-09-06, replaced the T_BSTEEL/purple-block version). 4 marshmallows onto 4 panels: three open a row-7 bridge to the corner, the fourth opens the cell there *and* reveals the lone sun beam. Grab it, one beam clears the full-height rain column, walk it up to the exit. |
| 3 | Marshmallow (M) skewer/carry/place | done | One marshmallow bridges a hole; requires skewering it off the beam's path first to clear rain on both sides. Synced from a fresh `level3.esx` (2026-08-22). |
| 4 | Marshmallow, deepened | done | Two marshmallows bridge a 2-wide hole-wall. This is the *old* level1 board, moved here in the 2026-08-22 resync. |
| 5 | — | done | Was planned as a Cotton Candy (K) contrast level; K/T (cotton candy + temp/pink cloud) were removed from the game entirely (2026-09-12) — level5 is now a second Marshmallow board. |
| 6 | Mirrors (`/` `\`) | planned | Beam reflection + mirror pushing. Builds on the beam skill from 1-3. |
| 7 | Switches (X) | planned | Beam-triggered distant tile swap — the beam does more than clear rain. |
| 8 | Panels/buttons | planned | Weight-triggered ring reveal or floor swap — new paradigm (standing weight, not the beam/horn). |
| 9 | Teleports (P) | planned | Bidirectional portal pairs. |
| 10 | Wind ring (W) | planned | Push rain by walking into it while held — capstone combining rain-pushing with beam sequencing, right before the bot arc. |
| 11 | Mirror-unicorn, intro | planned | New, simplest possible: get comfortable watching a mirrored double move. Low/no puzzle stakes. |
| 12 | Mirror-unicorn | planned | Reuse "the button you can't reach" (currently hand-built `level13`) — bot pushes something you can't reach yourself. |
| 13 | Mirror-unicorn, finale | planned | Reuse "the trick shot you can't set up" (currently hand-built `level14`), ideally extended to exercise the 2026-08-22 dual-beam/hit-stop/ring-pickup additions, which no real level currently tests. |

## Open questions
- Levels 5-10: design as fresh `.esx` files in the Escape editor (like 1-4), or hand-build directly in `index.html`?
- Confirm the 11-13 reuse plan, or swap in different puzzles for those slots.
- Once 11-13 are finalized, retire the standalone test-level slots (current `level13`/`level14`) so `LEVELS` totals exactly 14 entries.
