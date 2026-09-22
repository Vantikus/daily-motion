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
- Chromium visual baselines cover Home, Workout and Progress with reduced motion and deterministic local state.

