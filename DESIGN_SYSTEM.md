# Daily Motion Design System v1

Status: **P0 baseline contract**. Established on the v105 migration from the approved v104 Quiet Motion UI.

This file is the design-system source of truth for changes that can affect visual consistency. P0 freezes the current successful UI rather than redesigning it. Future normalization belongs to later phases and must be deliberate.

## Immutable product contracts

- FLOW app icon assets are immutable. Do not redraw, recolor, re-round, rename for ordinary releases, or regenerate them.
- Heroicons Outline is the primary UI icon system. Local SVG stroke width remains exactly `1.7`.
- Morning, Day and Evening remain immediately visible on Home.
- Personal goals remain absent.
- Workout copy, timers, progress, localStorage/state schema and program logic are outside visual token migrations.
- iOS Safari/PWA safe-area and offline behavior must remain intact.
- GSAP owns bottom-sheet transform/backdrop motion. Existing drag, velocity dismiss and damped snap-back physics are preserved.
- User-facing typography remains rem-based.

## P0 foundation baseline

| Role | Value |
| --- | --- |
| Canvas | `#f4f5f1` |
| Surface | `#ffffff` |
| Surface muted | `#edf1ec` |
| Primary ink | `#171917` |
| Muted ink | `#687169` |
| Strong muted ink | `#535c54` |
| Accent | `#2f6b55` |
| Accent soft | `#dfece5` |
| Structural line | `rgba(23,25,23,.09)` |
| Danger text baseline | `#8a5b57` |
| Focus | `2px #2f6b55`, offset `2px`, halo `4px rgba(47,107,85,.18)` |

The page canvas, HTML `theme-color`, manifest `theme_color` and manifest `background_color` must remain synchronized at `#f4f5f1`.

The light theme remains the immutable visual baseline. The optional dark theme is a semantic-token override selected through `settings.theme`; `system` follows `prefers-color-scheme`. The runtime HTML `theme-color` changes to `#101612` in dark mode while the manifest install baseline remains `#f4f5f1`.

## Typography baseline

System stack:
`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, system-ui, sans-serif`.

| Token | Value |
| --- | --- |
| XS | `.75rem` |
| SM | `.8125rem` |
| MD | `.875rem` |
| Body | `.9375rem` |
| Base | `1rem` |

Text must reflow when root font size increases. Do not replace user-facing font sizes with fixed px values.

## Mobile component baseline — 390×844

These values are regression contracts, not a command to normalize unrelated components to the same number.

| Component | Contract |
| --- | --- |
| Home settings control | 44×44px |
| Home routine list radius | 18px |
| Home routine row min-height | 74px |
| Session shell | viewport minus 24px at ≤390px |
| Technique accordion row | min-height 56px |
| Workout bottom-nav control | height 54px |
| Progress main card radius | 18px |
| Settings sheet | radius 26px |
| Sheet drag target | 96px wide, min-height 44px |

## Accessibility baseline

- Normal meaningful text targets WCAG AA contrast.
- Calendar microcopy uses `#687169` rather than the old low-contrast `#8a918b`.
- Reset microcopy uses `#8a5b57` rather than `#9b6b68`.
- Keyboard focus remains the existing high-contrast green perimeter plus halo.
- Critical touch actions should preserve at least the current hit area; Apple-style 44×44 targets remain the preferred mobile target.
- `prefers-reduced-motion` must keep immediate/near-immediate settled states.

## Motion baseline

- Fast: 140ms
- Base: 220ms
- Slow: 320ms
- Press-in: 120ms
- Press-out/content: 220ms
- Stage: 280ms
- Sheet open: 0.38s, power3.out
- Sheet close: 0.30s, power2.inOut
- Sheet drag dismiss ratio and velocity thresholds remain unchanged.

## Change rule

Tokenization may replace a literal with a token of the **same computed value** without visual approval. Changing the value itself is a visual design change and must be isolated from compatibility/token migrations.

## R1 — layout and spacing normalization

R1 converts the P0 baseline into a shared geometry system.

### Spacing scale

| Token | Value |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |

Use the scale for section gaps, card padding and component internals. One-off values are reserved for geometry that has a functional reason.

### Layout contract

- Main content max-width: 760px.
- Mobile inline gutter at ≤520px: 16px per side.
- Standard inline gutter: 20px per side.
- Wide Home/Progress desktop canvas may use the existing 24px-per-side wide layout.
- Home, Workout and Progress use the same mobile gutter.
- Fullscreen execution also keeps 16px side padding down to the compact mobile breakpoint.

### Radius contract

- Control: 14px.
- Regular standalone card or grouped-list container: 18px. Rows inside a grouped list stay flat at 0px radius.
- Hero surface: 24px.
- Bottom sheet: 26px.
- Pill: fully rounded.

### Control contract

- Icon/touch controls: 44×44px.
- Secondary action: 48px minimum.
- Primary action: 52px minimum.
- Workout bottom navigation: 54px.
- Settings rows with title + supporting copy: 68px minimum.

### R1 page rhythm

- Home: 24px between major sections, 12px inside section groups, 16px regular-card padding on mobile.
- Workout: 16px page gutters, 12px toolbar/detail rhythm, 20px technique separation.
- Progress: 16px stack gap, 12px metric gap, 16px card padding on mobile and 20px above mobile.
- Settings: Home and Workout sheets share the same 16px horizontal content padding and 68px row height.


## R2 — component contracts and regression hardening

R2 hardens the established visual system without changing product hierarchy or bottom-sheet physics.

### Semantic component aliases

- Component hit target: 44px minimum.
- Secondary action: 48px minimum.
- Primary action: 52px minimum.
- Component surface, muted surface, border, pressed state and selected state are semantic aliases over the P0/R1 palette.
- Icon controls, selects, PWA actions, execution secondary actions and install guidance use the shared component target contracts.
- The off-state switch track uses `#7f8981`, which preserves a visible >3:1 non-text contrast against the white/canvas surfaces. Checked state remains the accent green.

### Motion tokens

The CSS motion scale is semantic and the old `--fast/--base/--slow/--ease` names remain compatibility aliases:

- Press-in: 120ms.
- Fast: 140ms.
- Base/content: 220ms.
- Stage: 280ms.
- Sheet close: 300ms.
- Slow: 320ms.
- Sheet open: 380ms.
- Standard ease: `cubic-bezier(.2,.72,.2,1)`.
- Emphasized/press-out ease: `cubic-bezier(.16,1,.3,1)`.

The JS bottom-sheet durations, drag ratio, fling threshold and snap constants are named but numerically unchanged from the approved motion implementation.

### Accessibility and resilience

- Interactive targets used as direct controls must be at least 44px where layout permits.
- The sheet drag handle keeps the same overall sheet geometry while its interactive height increases from 40px to 44px.
- Text reflow is regression-tested at 150% and 200%.
- Compact, standard and large iPhone-like viewports are checked for horizontal overflow and essential control reachability.
- Chromium visual baselines cover Home, Workout and Progress with reduced motion and deterministic local state. The accepted screenshots are pinned by SHA-256; on mismatch the actual PNG is attached to the CI artifact for visual review.


## R3 — visual hierarchy and surface polish

R3 is the final visual consistency pass. It does not change page structure, workout behavior or motion physics.

### Surface hierarchy

- Canvas remains the milky `#f4f5f1`.
- Raised surfaces use `--surface-raised`; soft controls/metric surfaces use `--surface-soft`.
- Structural separation uses `--line-soft` for ordinary cards/rows and `--line-strong` only where stronger separation is intentionally required.
- Hero and primary content surfaces use `--shadow-hero` or `--shadow-card`; grouped rows remain visually lighter than primary cards.
- Bottom sheets use the shared `--shadow-sheet` while GSAP retains complete ownership of their transforms.

### Page hierarchy

- Home: Today is the strongest surface, routines are a grouped list, Activity is a secondary raised surface.
- Workout: content remains mostly flat; the technique key is the accent-soft anchor, technique rows are one grouped surface, and the bottom navigation is a clearly separated raised surface.
- Progress: metrics are soft surfaces; calendar/history/data are raised content cards with the same border/elevation language as Home.
- Settings: Home and Workout sheets share the same raised surface, divider and control background language.
- Settings controls: short choice lists use intrinsic-width pull-down controls so the current value and chevron read as one compact unit; the control grows only as much as the selected label requires. Trailing controls align to the same edge. The drag handle keeps a 44px hit target while its visual spacing stays compact, and bottom padding uses the safe area itself rather than adding a second large inset. Progress data actions keep the shared control radius in touch, pressed and keyboard-focus states.
- Execution and Completion retain their approved layout; only secondary surfaces and accent treatments are normalized.

### R3 rules

- Elevation communicates hierarchy, not decoration. Avoid stacking multiple strong shadows in one viewport.
- Do not introduce gradients inside cards. The only page-level ambient gradient remains the existing Home canvas treatment.
- Hover/pressed states should change surface/border first and movement second.
- Visual polish must not change R0–R2 geometry, touch targets, text scaling, safe-area behavior or bottom-sheet physics.

- Press feedback must be clipped to the control's own rounded shape; text navigation that receives a filled press state needs an explicit rounded hit surface rather than a rectangular flash.
- Destructive actions never inherit the green secondary-control press state. Their pressed/focus feedback stays destructive-colored and clipped to the same 14px control radius.

## v149 — page navigation ownership

- Cross-page navigation is owned exclusively by Swup 4 and the `#swup` container.
- Home, Progress and Session register explicit mount/unmount lifecycles; page scripts are persistent and are not re-executed after navigation.
- Do not add the Swup Scripts Plugin. Page cleanup must release listeners, timers, RAF work, Wake Lock and GSAP sheet instances before content replacement.
- Do not reintroduce cross-document `@view-transition`, `pageswap`, `pagereveal`, manual page fade masks or parallel old/new page overlays.
- Theme switching may use its separate `theme` View Transition type; it must not own page navigation.
- GSAP remains the owner of mobile bottom-sheet drag/snap/dismiss motion and is independent from Swup page transitions.
- Swup page motion is sequential: old `#swup` content exits completely, DOM is replaced, then new `#swup` content enters. Old and new page UI must never be visible simultaneously.
- If Swup cannot load, normal browser navigation is the required functional fallback.


## v157 — Swup plugin architecture

- Swup is the sole owner of cross-page navigation, history, cache and page lifecycle.
- Preload Plugin owns route prefetching; likely next routes are warmed after each page view.
- Head Plugin owns title/meta/canonical/head updates; manual head parsing is forbidden.
- Body Class Plugin owns page body classes; transient modal classes are cleared during unmount.
- A11y Plugin owns navigation announcements, focus and reduced-motion page skipping.
- JS Plugin + local GSAP own page transition timing. CSS `is-changing/is-animating` page fades are forbidden.
- Scroll Plugin owns scroll restoration/anchors; between-page scroll is not animated.
- `DailyMotionPages.home/progress/session` remain the only page mount/unmount lifecycle. Scripts Plugin and Parallel Plugin remain forbidden.
- Fragment Plugin is reserved for a future real fragment route and must not be loaded until such a route exists.
- Theme View Transition remains isolated to theme switching only.


## v160 — Swup resilience pass

- Page content and page-specific runtimes mount before the optional Swup runtime is available; CDN latency/failure must never block the base application.
- Swup and official plugins stay pinned to exact versions and load through one guarded runtime manifest in `navigation.js`. The Service Worker warms the same pinned assets for repeat/offline sessions.
- Native multi-page navigation is the degradation path until every required Swup global is available. A failed/slow dependency must leave `DailyMotionNavigate` and `DailyMotionBack` functional.
- Swup network visits use an 8s timeout before falling back to full browser navigation.
- Preload keeps only the mobile-friendly concurrency override (`throttle: 3`); plugin defaults own hover/touch/focus and declared-link preload behavior. The JS-only Morning session route is the only manual warm-up.
- Head, Body Class and A11y keep default ownership where defaults are sufficient. Head asset persistence/waiting and a custom heading selector are intentionally not configured.
- Scroll Plugin owns history restoration only; page-scroll animation is disabled so GSAP remains the only page-motion engine.
- CDN-to-local `/vendor/swup/` migration remains the preferred final packaging step once the exact pinned UMD artifacts are available locally; do not downgrade package versions merely to vendor older cached builds.


## v160 — library ownership contract

- `LIBRARIES.md` is the decision register for runtime libraries and plugins. A library is not adopted merely because it is listed as a candidate.
- GSAP remains the primary UI/motion engine. New GSAP plugins must solve a specific approved interaction and must not change bottom-sheet physics implicitly.
- Swup remains the only page-navigation/history owner. New routing/navigation libraries are forbidden unless Swup is explicitly replaced.
- Rive/Lottie are isolated authored-animation runtimes only; they never own general UI transitions.
- New runtime dependencies must be version-pinned, non-blocking on app startup and ultimately self-hosted under `/vendor/`.
- Native APIs are preferred when they are smaller and sufficiently reliable for the exact requirement.
- Any dependency that duplicates an existing responsibility requires an explicit architecture migration instead of coexistence.


## v161 — Completion Motion M1

- Completion is the first isolated GSAP plugin surface. DrawSVG and SplitText are local optional capabilities, not startup dependencies.
- The completion success mark is a dedicated inline SVG. FLOW assets and the global Heroicons system remain unchanged.
- DrawSVG owns only the completion ring/check stroke reveal. SplitText owns only word-level reveal of `#completionTitle`.
- The entire initial completion choreography is one GSAP timeline; the replaced CSS completion keyframes must not run in parallel.
- Completion remains fully functional if the optional plugins fail to load. GSAP Core provides the minimal fallback and reduced-motion settles immediately.
- Session unmount must kill the completion timeline and revert any active SplitText instance.
- Timer, countdown, workout sheets, Swup page motion and exercise state are unchanged by M1.


## v162 — Completion reliability + timer pacing

- Completion success-mark must animate reliably even when optional enhancement plugins finish loading later than the screen.
- The visible ring/check reveal has a GSAP Core stroke fallback and may be enhanced by optional plugins, never blocked by them.
- Timer entrance is slightly shorter and more immediate while preserving the same calm staged hierarchy.
- Early timer exit and fullscreen timer close are slightly faster; no abrupt cut or overshoot is introduced.
- Countdown, bottom-sheet physics, workout logic and Swup navigation remain unchanged.


## v163 — Completion check visibility fix

- The completion mark is hidden before the overlay becomes visible.
- GSAP is the only owner of the completion-check entrance; older CSS check animations are removed.
- The visible sequence is ring first, then check.
- Workout logic, timer behavior, sheets and navigation are unchanged.


## v164 — Completion sequencing fix

- The fullscreen execution layer must finish its exit before Completion becomes visible or starts its success-mark motion.
- Completion motion never runs behind the higher-z-index execution overlay.
- GSAP exclusively owns completion-card entrance transform.


## v165 — Deterministic completion mark

- Completion ring/check drawing is now native CSS and does not depend on DrawSVG timing.
- GSAP still owns the rest of Completion choreography.
- The visible sequence is mark pop → ring draw → check draw.
- Reduced-motion settles the mark immediately.


## v166 — Completion success emphasis

- Success mark is visually dominant before completion copy.
- The sequence is mark presence → ring draw → check draw → soft halo/burst → copy.
- The effect remains restrained: no confetti, no full-screen celebration, no layout changes.


## v167 — Completion mark scale correction

- Completion success motion remains expressive without oversized geometry.
- The success mark returns closer to the established visual scale while keeping ring/check drawing and soft halo.
- No workout logic, navigation or timer changes.


## v168 — Unified motion system

- One shared motion namespace must survive script load order; modules extend `window.DailyMotionMotion` instead of replacing it.
- Standard content/page entrance: ~220ms; standard exit: ~140ms; emphasis: ~280ms.
- Timer, countdown, exercise content swaps, accordions, toast and press feedback use the same timing/easing family.
- Bottom-sheet drag/snap/dismiss physics remain numerically unchanged.
- Completion success mark stays native CSS; SplitText remains optional for the completion title.
- DrawSVG is removed from runtime because it no longer owns any visible motion.
