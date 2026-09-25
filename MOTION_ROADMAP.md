# Daily Motion — GSAP Motion Roadmap

Status: **v161 motion architecture plan · M1 implemented**. This document defines where GSAP plugins are useful in the current Daily Motion UI and, equally important, where they are not.

The goal is not to add animation for its own sake. Daily Motion is iPhone/PWA-first, calm, app-like and timing-sensitive. New motion must make state changes easier to understand, improve polish, or remove fragile custom animation code.

## Current motion ownership

The current product already has several different motion mechanisms:

- **GSAP Core** — Swup page transitions and mobile bottom-sheet physics.
- **CSS animations/transitions** — completion choreography, execution-stage entrance/exit, timer urgency, button/press feedback and small visual states.
- **Web Animations API** — countdown number changes, accordion/detail height transitions and a few local value updates.
- **Browser View Transition** — theme switching only.

This split is acceptable today, but future motion work must avoid adding another owner for the same interaction. When a GSAP timeline replaces an existing CSS/WAAPI animation, the old animation must be removed in the same change.

## Plugin decision matrix

| Plugin | Current Daily Motion use | Decision |
| --- | --- | --- |
| DrawSVG | completion success stroke only | **P1 — use narrowly** |
| SplitText | completion title only | **P1 — use narrowly** |
| Flip | no strong current use | **P2 — wait for a real layout transition** |
| Observer | no current need | **P2 — reserve for new gesture UI** |
| Draggable + Inertia | no current need | **P2 — new components only** |
| ScrollTrigger | no current need | **P2/P3 — wait until Progress becomes richer** |
| MorphSVG | no justified target | **No for current UI** |
| MotionPath | no justified target | **No for current UI** |
| ScrambleText/TextPlugin | conflicts with calm product language | **No** |
| Physics2D | current completion burst does not justify it | **No** |
| CustomEase | possible later, but current GSAP eases are sufficient | **Not now** |
| GSDevTools | tuning aid only | **Dev-only optional** |

---

# P1 — Completion motion pack

This is the highest-value place for GSAP plugins because completion is a discrete emotional state, it happens infrequently, and the current UI already has a staged success choreography.

## Existing structure

The completion screen already contains:

- `.completion-check`
- `.completion-burst`
- eyebrow
- `#completionTitle`
- `#completionMeta`
- optional `#completionHighlight`
- `.completion-stats`
- `.completion-effort`
- `.completion-button`

Today the success icon and content sequence are driven mainly by CSS keyframes. That works, but it means completion motion is separate from the GSAP motion system that already owns page and sheet choreography.

## DrawSVG: exact use

### Use it for

A dedicated inline SVG success mark inside `.completion-check`.

Recommended structure:

```html
<svg class="completion-mark" viewBox="0 0 48 48" aria-hidden="true">
  <circle class="completion-mark__ring" ... />
  <path class="completion-mark__check" ... />
</svg>
```

Animate the ring and check path with DrawSVG in a short one-shot sequence.

### Do not use it for

- the main FLOW logo;
- routine Heroicons across the product;
- the current timer ring;
- decorative loops.

### Why not the current Heroicon directly

Current Heroicons are rendered through CSS masks (`.hi-check-circle` points to the local SVG asset). DrawSVG animates actual SVG stroke elements; it cannot progressively draw the internal path of a CSS mask. Using DrawSVG therefore requires a dedicated inline/local completion SVG target rather than attempting to animate the existing masked icon.

This does **not** change the global Heroicons system. The completion mark is an isolated motion asset and should retain the established 1.7px visual stroke language where applicable.

### Why not convert the timer ring

The timer ring currently uses a CSS custom property plus `conic-gradient`. It is simple, cheap and updates continuously. Rebuilding it as SVG only to use DrawSVG would increase DOM/code complexity without improving the timing model. Keep the timer ring as-is.

## SplitText: exact use

### Use it for

`#completionTitle` only, e.g. “Утро готово”.

Recommended mode:

- `type: "words"`
- no character splitting;
- small stagger;
- automatic accessibility behavior left enabled;
- revert/cleanup after animation or during page unmount.

Word-level animation is enough to make the title feel authored without turning a health utility into a promo landing page.

### Do not use it for

- exercise instructions;
- timer digits;
- countdown `3 → 2 → 1 → Старт`;
- settings labels;
- Home headings on every visit;
- history rows.

The current countdown works better as one semantic value replacing another. Splitting digits/letters would add DOM churn with no UX benefit.

## Proposed completion choreography

Target total visual sequence: roughly **650–800 ms**, while interaction remains available as soon as the modal is visible.

1. Completion surface becomes visible.
2. Success ring draws.
3. Check stroke draws immediately after / slightly overlapping the ring.
4. `#completionTitle` reveals by words.
5. Meta and optional streak highlight settle in.
6. Stats reveal together, not as a long cascade.
7. Effort choice and Home CTA appear last.

Keep the existing haptic/audio success cue synchronized near the beginning of the mark draw, not at the end of the entire sequence.

## Completion fallback

If DrawSVG/SplitText are not available:

- the completion screen must still render fully;
- the existing static icon/text remains visible;
- no action is blocked;
- CSS may provide a minimal fallback fade/settle, but it must not run in parallel with the GSAP plugin timeline when the plugins are active.

For `prefers-reduced-motion: reduce`, show the final state immediately and skip split/draw choreography.

---

# P1 — Core GSAP cleanup without new plugins

Several current animations can be improved by GSAP Core alone. This is more valuable than installing plugins everywhere.

## Countdown

Current number changes use the Web Animations API. The existing effect is already appropriate: one compact scale/y/opacity settle for each value and a slightly stronger launch state for “Старт”.

Recommended future cleanup:

- move `animateCountdownValue()` to GSAP Core;
- keep exactly one tween per value change;
- `gsap.killTweensOf(node)` before starting the next value;
- preserve the current visual amplitude and timing unless a dedicated motion-tuning task changes it.

No plugin is needed.

## Timer entrance and early finish

The timer’s staged entrance and early-finish exit are better represented as explicit GSAP timelines than as a growing set of CSS animation classes.

Recommended ownership:

- `showExecution('timer')` triggers one GSAP timeline;
- “Завершить раньше” triggers one reverse/exit timeline;
- normal workout state changes remain in existing logic;
- callback to workout logic happens only after the exit timeline finishes, exactly as the current behavior requires.

No plugin is needed.

## Exercise change

Current exercise switching uses direction classes (`enter-forward` / `enter-back`) and a progress-badge update class.

Keep this simple. A small GSAP Core x/opacity transition can replace the class choreography later, but Flip is not justified: the same container remains in the same layout and only its content changes.

---

# P2 — Flip

Flip is valuable only when the same conceptual element truly changes layout/position/size.

## Good future cases

- a Progress metric expands into a detailed panel;
- a future routine card expands into an editor while visually preserving identity;
- a future customizable routine allows reorder/reflow;
- a compact control physically moves into an expanded state.

## Bad current cases

- Swup page transitions;
- Home → Workout navigation;
- changing exercise text inside the existing workout container;
- opening the current bottom sheet;
- completion overlay entrance.

Using Flip for those would add abstraction without solving a real layout-jump problem.

---

# P2 — Observer

Observer is the preferred future gesture abstraction if Daily Motion gains a new gesture-heavy component.

## Good future cases

- a dedicated horizontal technique carousel;
- a future scrub/selector that needs normalized touch/pointer/wheel intent;
- a contained swipe interaction where native scrolling is not the interaction itself.

## Explicit exclusions

- do not replace current bottom-sheet drag/snap/dismiss physics;
- do not intercept global vertical scrolling;
- do not add swipe navigation between Home / Workout / Progress;
- do not disable native iOS page scrolling for decorative motion.

If ScrollTrigger is already loaded for another justified feature, use its built-in Observer integration rather than loading a second Observer runtime.

---

# P2 — Draggable + Inertia

These plugins are appropriate only for **new direct-manipulation components**.

Potential future features:

- draggable intensity/range control;
- custom routine reordering;
- horizontal card strip with physical inertia;
- timeline/scrubber if Daily Motion ever gains media technique demos.

Do not migrate the existing bottom-sheet implementation merely to standardize APIs. Its physics are an established product contract.

---

# P2/P3 — ScrollTrigger

The current Home and Progress pages do not justify another scroll runtime. Swup already provides page entry motion, and the pages are short enough that a second animation layer would mostly be decoration.

Reconsider ScrollTrigger when Progress becomes substantially richer, for example:

- 30/90-day charts;
- long history sections;
- multiple analytics blocks;
- educational sections that benefit from one-time reveal.

If adopted:

- prefer `once: true` viewport reveals;
- avoid long `scrub` timelines;
- avoid pinning on iPhone;
- do not hijack scroll;
- destroy all page-owned ScrollTriggers during `DailyMotionPages.progress` unmount;
- disable nonessential effects for reduced motion.

---

# Plugins not justified in the current product

## MorphSVG

No current UI state needs shape morphing. The FLOW logo is immutable, so it must never become a MorphSVG experiment.

## MotionPath

There is no meaningful UI object that needs to travel along an authored path. Completion particles do not justify a plugin.

## ScrambleText / TextPlugin

Typing/scramble/replacement effects do not fit the calm, clear workout UI and can reduce readability.

## Physics2D

The completion burst is small and deterministic. A physics plugin would add complexity for a decorative effect already achievable with ordinary GSAP transforms.

## CustomEase

Daily Motion already uses coherent `power2/power3` GSAP eases and established CSS cubic-beziers. A custom curve should only be introduced if a later motion audit deliberately standardizes the whole application around one signature ease.

---

# Recommended runtime architecture

## Keep GSAP Core local

`gsap.min.js` remains a local production dependency.

## Vendor plugin files locally

When P1 is implemented, use local pinned files such as:

```text
/vendor/gsap/DrawSVGPlugin.min.js
/vendor/gsap/SplitText.min.js
```

Do not make the completion screen depend on a CDN.

## Lazy capability, not startup dependency

DrawSVG and SplitText are only needed on the workout completion path, which occurs well after app startup. They should not become a reason to delay Home rendering.

Preferred strategy:

1. page starts with GSAP Core only;
2. when Session mounts, optional motion plugins may be loaded from same-origin local files in the background;
3. completion code checks whether the plugins are available;
4. if available, run the enhanced GSAP completion timeline;
5. if unavailable, show the fully functional static/minimal fallback state.

This keeps the feature progressive rather than mandatory.

## Suggested motion boundary

Create one small motion layer instead of scattering plugin-specific code through workout logic:

```text
motion.js
  reducedMotion()
  ensureCompletionPlugins()
  playCompletion(...)
  playCountdownValue(...)
  playTimerEntrance(...)
  playTimerEarlyExit(...)
  cleanupSessionMotion()
```

The motion layer may know about DOM animation targets, but it must not own workout state, timers, progress, localStorage, audio decisions or navigation.

`session.js` remains the product/state controller and only calls motion functions at state boundaries.

---

# Cleanup contract

Any GSAP plugin integration must support page lifecycle cleanup.

On Session unmount:

- kill active completion/countdown/timer tweens;
- revert active SplitText instances;
- clear transient inline GSAP transforms/opacities where necessary;
- remove plugin-owned listeners/observers if any are introduced later;
- never leave the next Swup page with stale animation state.

A `gsap.context()` scoped to the current page/session is preferred for groups of local tweens because `context.revert()` provides a narrow cleanup boundary.

---

# Recommended implementation order

## Phase M1 — Completion only · implemented in v161

Implemented:

- DrawSVG 3.15.0;
- SplitText 3.15.0;
- local `/vendor/gsap/` delivery;
- lazy Session warm-up;
- one completion GSAP timeline;
- dedicated inline SVG success mark;
- reduced-motion/static fallback;
- Session lifecycle cleanup;
- removal of overlapping CSS completion entrance keyframes.

Countdown, timer, sheets, page transitions and Progress remain unchanged in M1.

## Phase M2 — Core GSAP consolidation

Without adding plugins:

- migrate countdown value animation from WAAPI to GSAP Core;
- migrate timer staged entrance to an explicit GSAP timeline;
- migrate early-finish exit to an explicit GSAP timeline;
- remove replaced CSS keyframes/classes.

The visual output should initially match the approved behavior; this phase is primarily about ownership and interruption safety.

## Phase M3 — Exercise/detail motion cleanup

Evaluate whether the current CSS/WAAPI exercise and accordion transitions have actual bugs or interruption issues.

Only migrate the parts where GSAP clearly improves cancellation, sequencing or consistency. Do not rewrite working native/CSS animation just for uniformity.

## Phase M4 — Future feature plugins

Only after a matching feature exists:

- Flip for real layout continuity;
- Observer for contained gesture UI;
- Draggable/Inertia for new physical controls;
- ScrollTrigger for a materially richer Progress experience.

---

# Final recommendation

For the current Daily Motion product, the practical GSAP plugin pack is intentionally small:

```text
NOW / P1
- GSAP Core (already present)
- DrawSVG
- SplitText

WAIT FOR A FEATURE
- Flip
- Observer
- Draggable
- Inertia
- ScrollTrigger

DO NOT ADD FOR CURRENT UI
- MorphSVG
- MotionPath
- ScrambleText
- TextPlugin
- Physics2D
- CustomEase
```

The first implementation should therefore be **Completion Motion M1**, not a broad “install every GSAP plugin” release.
