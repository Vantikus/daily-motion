# Daily Motion — Library & Plugin Registry

Status: **architecture decision register for v168+**.

Detailed selector-level motion decisions and rollout order are documented in `MOTION_ROADMAP.md`.

This document records which libraries Daily Motion already depends on, which additions are approved for future work, which are conditional, and which should not be introduced without a concrete product requirement.

The goal is not to maximize the number of libraries. The goal is to keep Daily Motion small, stable, iPhone/PWA-first and easy to reason about while using a library when it clearly removes fragile custom code or enables a feature we actually need.

## Core dependency policy

1. **One owner per responsibility.** Do not introduce a second library for navigation, page motion, bottom-sheet physics, state persistence or service-worker routing unless the existing owner is intentionally being replaced.
2. **No required CDN dependency.** Production-critical runtime code should ultimately be self-hosted under `/vendor/`. A CDN may be used only as a non-blocking temporary delivery path with a native fallback.
3. **Pinned versions only.** No floating `latest`, major-only or unversioned runtime URLs.
4. **No npm runtime.** npm/Node may be used for development, validation and vendoring, but production remains static HTML/CSS/JS.
5. **iOS Safari/PWA first.** A library must not compromise safe-area handling, touch behavior, back/forward navigation, offline startup or standalone PWA behavior.
6. **Reduced motion is mandatory.** New animation features must have a settled or near-immediate `prefers-reduced-motion` path.
7. **No duplicate motion engines.** GSAP remains the primary animation engine. Rive/Lottie may be used only for isolated authored animation assets, never as a replacement for general UI motion.
8. **No dependency for a one-line platform feature.** Prefer native APIs when they are stable enough and simpler than the library.
9. **Offline packaging is part of adoption.** A new runtime library is not considered integrated until its local asset, cache policy and failure mode are defined.
10. **Every dependency needs a removal story.** The integration point must be narrow enough to roll back without rewriting the product.

## Current production stack

| Dependency | Current role | Delivery | Status |
| --- | --- | --- | --- |
| GSAP `3.15.0` | UI motion, workout motion, page-transition timelines, sheet motion | local `gsap.min.js` | **Core / keep** |
| Swup `4.10.0` | cross-page navigation, history, cache/lifecycle | pinned guarded runtime | **Core / keep** |
| Swup Preload `3.2.12` | touch/hover/focus preloading | pinned guarded runtime | **Keep** |
| Swup Head `2.3.1` | title/meta/canonical synchronization | pinned guarded runtime | **Keep** |
| Swup Body Class `3.3.0` | body class synchronization | pinned guarded runtime | **Keep** |
| Swup A11y `5.2.1` | navigation focus, announcements, reduced motion | pinned guarded runtime | **Keep** |
| Swup JS `3.2.0` | GSAP page transition contract | pinned guarded runtime | **Keep** |
| Swup Scroll `4.0.0` | history scroll restoration | pinned guarded runtime | **Keep for current architecture** |
| Heroicons Outline | primary UI icon language | local `/vendor/heroicons/` | **Core / immutable style** |
| localStorage | current settings/progress/session persistence | native browser API | **Keep until data volume justifies IndexedDB** |
| Service Worker + Cache Storage | app-shell/offline/update flow | local `sw.js` | **Core / keep** |

### Current ownership map

| Concern | Owner |
| --- | --- |
| Cross-page navigation/history/cache | Swup Core |
| Head metadata/canonical | Swup Head Plugin |
| Body classes | Swup Body Class Plugin |
| Navigation accessibility | Swup A11y Plugin |
| Page transition sequencing | Swup JS Plugin |
| Page animation timelines | GSAP |
| Bottom-sheet drag/snap/dismiss | existing GSAP implementation |
| Theme transition | dedicated theme View Transition only |
| State/settings/history | `state.js` + localStorage |
| Offline/update lifecycle | `sw.js` + `pwa.js` |
| Audio cues | `audio.js` + native audio APIs |

Do not let a new dependency silently take over any of these responsibilities.

---

# Approved candidates

These libraries/plugins are approved for a future implementation **when a matching feature exists**. Approval means "safe to prototype", not "install now".

## GSAP DrawSVG — removed in v168

**Use for:** completion checkmark drawing, timer-ring strokes, small branded SVG reveals, technique-path highlights.

**Why it fits:** Daily Motion already uses GSAP, so this adds capability without introducing a second animation runtime. It is especially appropriate for the completion state and other line-based SVG motion.

**Rules:**
- use only on local SVG assets we control;
- do not alter immutable FLOW logo artwork just to create an effect;
- reduced-motion path must show the completed stroke immediately;
- prefer one-shot motion, not continuous decorative loops.

**Decision:** **approved for targeted UI polish**.

## GSAP SplitText — P1

**Use for:** staged completion headings, short onboarding/explanatory text reveals, premium title choreography.

**Why it fits:** supports word/line/character splitting while remaining inside the existing GSAP motion system. Modern SplitText also supports responsive re-splitting, which matters for iPhone text reflow.

**Rules:**
- only for short display text, never long exercise instructions;
- preserve semantic source text and accessibility;
- revert/cleanup SplitText on page unmount when needed;
- reduced-motion must skip split choreography.

**Decision:** **approved, but use sparingly**.

## GSAP Flip — P1/P2

**Use for:** a real element that changes layout/state and should visually travel between those states without manually calculating geometry.

Potential Daily Motion examples:
- compact-to-expanded progress metric;
- workout UI element moving between two approved states;
- future reorderable/custom routine UI.

**Rules:**
- not for Swup cross-page navigation;
- do not use Flip to create parallel old/new page UI;
- use only where the same conceptual element changes layout.

**Decision:** **approved conditionally**.

## GSAP Observer — P2

**Use for:** future gesture-heavy controls that need normalized wheel/touch/pointer intent.

**Why it fits:** if a gesture abstraction is needed, keeping it inside GSAP is preferable to adding Hammer.js.

**Rules:**
- do not replace the existing bottom-sheet drag implementation without a separate task;
- do not intercept native page scroll globally;
- do not create swipe navigation between main pages unless product behavior explicitly changes.

**Decision:** **preferred gesture abstraction for new features**.

## GSAP Draggable + Inertia — P2

**Use for:** future draggable controls, carousels, sliders or physical direct-manipulation components.

**Rules:**
- current bottom-sheet physics are frozen and must not be migrated merely for consistency;
- integrate only for a new component with a clear drag requirement;
- preserve iOS scroll/touch-action behavior and 44px+ targets.

**Decision:** **approved for new draggable components only**.

## GSAP ScrollTrigger — P2

**Use for:** light reveal/progress-linked effects on Home or Progress if the page becomes richer.

**Rules:**
- avoid heavy `pin`, long `scrub` timelines and scroll hijacking on iPhone;
- never use it to animate the workout player while timing-critical UI is active;
- prefer `once`/simple viewport reveals over always-running scroll effects;
- reduced-motion path must disable nonessential scroll animation.

**Decision:** **conditional; do not add yet**.

## web-vitals — P1 observability

**Use for:** real-user performance measurement: LCP, INP, CLS, and optionally FCP/TTFB.

**Why it fits:** small and can be loaded after user-critical code because it uses buffered performance entries. It is useful for validating whether Swup and motion changes actually improve perceived performance.

**Important limitation for Daily Motion:** the current project has no backend/analytics endpoint. Adding the library without a destination only gives local/debug data. Therefore telemetry architecture and privacy policy must be defined before production reporting.

**Rules:**
- defer loading;
- no blocking startup dependency;
- no user-identifying payloads;
- add only after deciding where metrics are stored/sent;
- account for Swup soft navigation behavior when interpreting results.

**Decision:** **approved for a future diagnostics/telemetry phase**.

## idb-keyval — P2 data layer

**Use for:** larger workout history, blobs/offline assets, richer analytics datasets, or data that no longer fits comfortably in synchronous localStorage.

**Why it fits:** tiny Promise-based IndexedDB wrapper; keeps persistence simple without introducing a database framework.

**Current decision:** localStorage remains the correct storage layer for current state size and synchronization model.

**Migration trigger:** adopt only when one of these becomes true:
- history becomes large enough that synchronous localStorage work is measurable;
- we store structured data/blobs unsuitable for localStorage;
- future features need atomic async persistence;
- quota/size pressure is observed.

**Rules:**
- settings/theme may remain in localStorage even if history moves to IndexedDB;
- migration must be one-way safe and preserve existing history;
- backup/import format must remain explicit and versioned.

**Decision:** **approved migration target, not current dependency**.

---

# Conditional visual/media runtimes

## Rive — P3

**Use only for:** one highly interactive flagship animation that genuinely needs authored vector state machines/interactivity.

Potential example: a future interactive technique illustration or premium completion scene.

**Do not use for:** buttons, page transitions, settings, routine lists, timer controls, or ordinary UI motion.

**Decision:** **research/prototype only**. GSAP + SVG remains the default.

## Lottie / lottie-web — P3

**Use only for:** authored After Effects animation assets exported specifically for the app.

This is relevant if Daily Motion starts producing motion assets in After Effects. It should not become a general UI animation layer.

**Rules:**
- local player + local JSON/assets;
- avoid large continuous looping animations;
- verify CPU/battery impact on iPhone Safari/PWA;
- provide a static/reduced-motion fallback.

**Decision:** **conditional on an actual AE asset pipeline**.

## Chart.js — P3

**Use for:** a future analytics-heavy Progress page requiring interactive time-series, bar or doughnut charts.

**Do not add for:** the current 28-day calendar, simple streak counters or a few metrics that CSS/SVG can render more cheaply.

**Decision:** **conditional on Progress becoming a real analytics dashboard**.

## focus-trap — P3 / caution

**Use for:** a future complex modal where native focus management plus `inert`/dialog semantics are not sufficient.

**Caution:** focus-trap does not officially test mobile browsers. Daily Motion is iPhone-first, so adoption requires explicit Safari/PWA validation rather than assuming desktop behavior transfers.

**Decision:** **not a default dependency**.

---

# Libraries deliberately not planned

## Hammer.js — No

Reason: if gesture abstraction becomes necessary, GSAP Observer/Draggable or native Pointer Events fit the existing stack better. Adding a separate gesture framework would duplicate responsibility.

## Animate.css — No

Reason: GSAP already owns nontrivial motion and existing CSS transitions cover tiny state changes. A preset animation library would add a second visual language and make motion timing less coherent.

## Workbox — Not now

Workbox is a strong service-worker toolkit, but Daily Motion currently has a small explicit `sw.js` with understandable cache and update behavior. Introducing Workbox today would add an abstraction/build/vendor layer without solving a current limitation.

**Reconsider Workbox only if** service-worker routing grows substantially, Background Sync is introduced, complex expiration policies appear, or precache manifest maintenance becomes error-prone.

## Howler.js — Not now

Current audio requirements are small countdown/completion cues. Native audio handling is sufficient. Reconsider only if the product gains layered audio, complex sprite management, persistent music/ambience or cross-browser audio behavior becomes a recurring problem.

## Swup Fragment Plugin — Reserved

Do not install until Daily Motion has a genuine fragment route where only a defined fragment should be replaced.

## Swup Parallel Plugin — No

Conflicts with the deliberate sequential transition contract where old UI exits, content swaps, then new UI enters. Parallel old/new UI can reintroduce ghosting and overlapping interactive states.

## Swup Scripts Plugin — No

Page lifecycle is explicit through `DailyMotionPages.home/progress/session`. Re-executing page scripts would create duplicate listeners/state and undermine predictable cleanup.

## Swup Route Name Plugin — Not needed

There are only a few explicit pages/motion profiles. Existing navigation metadata is easier to understand than an additional route naming abstraction.

## Swup Progress Bar Plugin — Not needed

A cached/preloaded three-page PWA should feel immediate. A progress bar would usually add visual noise and expose tiny waits that should instead be removed.

## GSAP ScrollSmoother — No current need

Do not replace native scrolling with a smoothed scroll layer in an iPhone-first workout PWA. Native scroll semantics, accessibility and battery/performance are more important than decorative smooth scrolling.

---

# Adoption sequence

This is the order to consider new dependencies. It is **not** a schedule to install everything.

### Phase A — finish current runtime packaging

1. Self-host exact Swup Core/plugins under `/vendor/swup/` when the exact pinned UMD assets are available.
2. Move them into the normal app-shell precache.
3. Remove cross-origin Swup cache handling and the temporary CDN runtime loader.

No new feature library should take priority over completing this packaging cleanup.

### Phase B — motion quality pack

Prototype in isolation, one feature at a time:

1. DrawSVG for completion/check/ring effects.
2. SplitText for completion title choreography.
3. Flip only if a real same-element layout transition exists.
4. Observer/Draggable only for a new gesture component.

Do **not** load every GSAP plugin globally by default. Vendor and load only the plugin actually used.

### Phase C — performance observability

Add `web-vitals` only when a destination/telemetry policy exists. Start with LCP/INP/CLS and defer the library until after critical UI boot.

### Phase D — persistence evolution

Keep localStorage until real data volume or async/atomic persistence needs justify migration. If that point is reached, prototype `idb-keyval` for history while keeping simple preferences local.

### Phase E — feature-specific heavy runtimes

Rive, Lottie and Chart.js require a product feature first. They are never platform dependencies by default.

---

# Dependency admission checklist

Before adding any runtime library/plugin, answer all of the following:

- [ ] What exact user-visible or reliability problem does it solve?
- [ ] Is that problem already owned by an existing library/native API?
- [ ] Can it be self-hosted and pinned?
- [ ] What is the local fallback if it fails to initialize?
- [ ] Does the app still start offline?
- [ ] Does it preserve iOS Safari/PWA safe-area, history and touch behavior?
- [ ] Does it support or allow `prefers-reduced-motion`?
- [ ] Does it require continuous RAF/scroll work?
- [ ] Does it increase memory/battery use during workout execution?
- [ ] Can page `mount/unmount` clean it up completely?
- [ ] Is its license acceptable for the project?
- [ ] Is its runtime weight justified by the feature?
- [ ] Can it be removed without changing core workout state/progress logic?
- [ ] Is there exactly one owner for the responsibility after adoption?

If the answer to the last item is "no", do not add the dependency until ownership is redesigned explicitly.

# Decision summary

### Core / keep

GSAP, Swup Core, Preload, Head, Body Class, A11y, JS, Scroll, Heroicons, localStorage, native Service Worker/Cache Storage.

### Best next candidates

1. **SplitText** — selective title/completion choreography.
2. **Flip** — only when a real shared-element/layout transition appears.
3. **web-vitals** — once real telemetry storage is defined.
4. **Flip** — when a real layout-state transition appears.
5. **idb-keyval** — when persistence actually outgrows localStorage.

### Conditional

Observer, Draggable/Inertia, ScrollTrigger, Rive, Lottie, Chart.js, focus-trap.

### Not planned now

Hammer.js, Animate.css, Workbox, Howler.js, ScrollSmoother, Swup Scripts, Parallel, Route Name and Progress Bar.


## Implemented in v161 — Completion Motion M1

- `GSAP 3.15.0` remains the core motion engine.
- DrawSVG was retired in v168 after the completion mark moved to deterministic native CSS stroke animation.
- `SplitText 3.15.0` is vendored at `/vendor/gsap/SplitText.min.js` and is used only for word-level completion-title reveal.
- `motion.js` is the plugin-aware motion boundary. Session state/timers/localStorage remain in `session.js`.
- Both plugins load lazily from same-origin local files when Session mounts and are precached by the Service Worker for offline completion.
- Plugin failure is non-blocking: completion falls back to a GSAP Core/static settled state.


## v168 — Runtime simplification

- `DrawSVGPlugin` is removed from the shipped runtime because no current UI needs it.
- `SplitText` remains the only optional GSAP plugin currently used.
- `window.DailyMotionMotion` is a shared namespace; `motion.js` and `pwa.js` extend it instead of overwriting each other.
