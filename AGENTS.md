# Daily Motion: instructions for code changes

In a new chat, clone the current main of Vantikus/daily-motion once. Continue all
work from that local copy, including after deployment; do not download GitHub code
again or compare against it. Read current instructions and HANDOFF.md once, then
only inspect relevant code. Historical notes are not current behavior.
The user authorizes automatic publication to main after necessary checks. Do not
ask again, create ZIPs, or run a full audit unless requested. Preserve working UI,
animations and product behavior; clean only related code and files.

## Animation rule

Never introduce frame-by-frame JavaScript animation or scroll interpolation. Use browser-owned CSS/WAAPI transitions and native smooth scrolling. Preserve timer accounting and the approved Settings behavior.
For the technique list, do not animate height, grid-template-rows or clip-path. Keep text unscaled, animate transform/opacity endpoints, and preserve current geometry and opacity on interruption.

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
