# Daily Motion: instructions for code changes

Use only the latest ZIP supplied by the user. Do not read, download or compare
GitHub code; use GitHub only for final publication. The user has authorized automatic
publication after required checks; do not ask for confirmation again. Read HANDOFF.md, README.md,
CSS_GUIDE.md and WORKING_WITH_GPT.md before changing the corresponding area.

## Animation rule

Never introduce frame-by-frame JavaScript animation or scroll interpolation. Use browser-owned CSS/WAAPI transitions and native smooth scrolling. Preserve timer accounting and the approved Settings behavior.

## Product contracts

- Static HTML/CSS/JavaScript PWA. No framework, backend or runtime npm dependency.
- Morning has nine exercises. Day and Evening remain unavailable.
- Preserve exercise copy, order, durations, FLOW v97 assets and Heroicons 1.7px.
- Preserve localStorage v3 keys, valid history, migrations and timer accounting.
- Preserve iOS safe areas, offline behavior and GSAP bottom-sheet physics.
- Change visuals or these contracts only when the task explicitly requests it.

## Ownership

- `session.js`: workout state, countdown/timer/rest, persistence and completion.
- `session-view.js`: exercise presentation and next-button state.
- `ui.js`: shared UI primitives and page lifecycle cancellation.
- `navigation.js`: Swup mount/unmount, native page snapshots and GSAP fallback.
- `motion.js`: GSAP sheets, press feedback and completion motion.
- `pwa.js` / `sw.js`: installation, update safety and offline shell.
- `state.js`: data normalization, statistics and migrations.

Use each mounted page's lifecycle for listeners and one-shot frames/timeouts.
Check cancellation after asynchronous work. Keep the timer's endAt-based clock
and smooth ring painting; update text and buttons only when their state changes.

## Validation and release

Run `npm run check` and meaningful Chromium/WebKit regressions. Navigation tests
must prove the document survived a Swup visit. Real service-worker tests require
Chromium; WebKit has no Playwright service-worker support.

Visual references live in `tests/visual-baselines/`. Do not regenerate them merely
to pass a test. Inspect expected/actual/diff images and change a reference only for
an explicitly requested visual change. Preserve CSS source order unless a scoped
change and visual/state coverage demonstrate that moving a rule is safe.

Keep HTML asset versions and the service-worker cache version synchronized.
Validate on a branch before merging into main; Cloudflare deploys main.
Explain visible changes, how to check them, and unresolved limitations in plain language.
Do not show code, logs or commits unless requested. Keep HANDOFF.md current.
