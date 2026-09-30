# CSS editing map

`styles.css` is the single application stylesheet. `heroicons.css` only maps local
icon assets. Keeping one application stylesheet preserves loading and PWA cache
behavior. Rules remain in their established source order.

| Area | Search selectors | State / responsive variants |
| --- | --- | --- |
| Tokens and typography | `:root`, `--font-size`, `--motion-` | dark theme, readable text scaling |
| Home | `.today-card`, `.routine-card`, `.activity-card`, `.safety-note` | wide layout, compact screens, unavailable routines |
| Exercise | `.session-toolbar`, `.exercise-main`, `.exercise-facts`, `.detail-card` | open panels, compact layouts, sticky navigation |
| Settings | `.settings-sheet`, `.routine-settings-sheet`, `.settings-row` | mobile sheet, desktop modal, reset confirmation |
| Fullscreen workout | `.execution-overlay`, `.execution-shell`, `.timer-ring` | countdown, running, paused, rest, compact/landscape |
| Completion | `.completion-overlay`, `.completion-card`, `.completion-mark` | success state, compact screens, reduced motion |
| Progress | `.history-day`, `.history-row`, `.data-actions` | active/completed days, dark theme |
| Navigation and feedback | `.transition-page`, `.toast`, `.pwa-banner` | Swup-owned motion, safe-area placement |

## Editing a component

1. Search its selector throughout the file, including media queries and state
   selectors. Read the relevant runtime owner before changing motion or visibility.
2. Edit the existing rule for the required state. Add a variant only when the
   selector or media condition describes a real new state.
3. Check shorthand/longhand interactions and important declarations. A rule in a
   different media query is not a duplicate just because its selector repeats.
4. Run static checks and the matching behavior tests, then the visual matrix.
   Inspect pixel differences instead of accepting new reference images blindly.

The v222 cleanup removed declarations with a later winning declaration for the
same selector, property and enclosing conditions. It kept important precedence
and skipped uncertain dynamic-value fallbacks. No rule was reordered. Some
important declarations remain because they describe explicit fullscreen and
responsive states; removing them needs a separate cascade change and coverage.

Motion ownership remains in JS: Swup/native snapshots with GSAP fallback for page transitions, GSAP for sheets,
session.js/WAAPI for fullscreen stage handoffs. CSS describes their stable states.
