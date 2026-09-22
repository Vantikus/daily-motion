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
| Sheet drag target | 96px wide, min-height 40px |

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
