## 2026-09-21 - WAI-ARIA Progressbar & Timer Button Labels

**Learning:** Pure HTML/JS progress elements and icon-heavy timer adjustments are often invisible or ambiguous to screen reader users unless explicitly annotated with `role="progressbar"` and localized `aria-label`/`aria-valuetext` attributes.
**Action:** When adding progress or time adjustment controls, always bind dynamic `aria-valuenow` / `aria-valuetext` attributes in JS and ensure icon/short-text buttons (`-10 сек`, `+10 сек`) have descriptive `aria-label`s.
