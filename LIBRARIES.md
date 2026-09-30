# Daily Motion — Runtime Dependencies

В production используются только зависимости, которые реально нужны текущему продукту.

| Dependency | Version | Delivery | Owner |
| --- | --- | --- | --- |
| GSAP Core | 3.15.0 | local `gsap.min.js` | UI/page/completion/sheet motion |
| Swup Core | 4.10.0 | local versioned files + Service Worker cache | navigation/history/cache |
| Swup Preload | 3.2.12 | local versioned files + Service Worker cache | route preload |
| Swup Head | 2.3.1 | local versioned files + Service Worker cache | head/meta synchronization |
| Swup Body Class | 3.3.0 | local versioned files + Service Worker cache | body class synchronization |
| Swup A11y | 5.2.1 | local versioned files + Service Worker cache | navigation accessibility |
| Swup JS | 3.2.0 | local versioned files + Service Worker cache | page animation integration |
| Swup Scroll | 4.0.0 | local versioned files + Service Worker cache | scroll restoration |
| Heroicons Outline | local snapshot | local `vendor/heroicons/` | UI icons |

Native platform dependencies:
- localStorage — state/settings/history;
- Service Worker + Cache Storage — offline/update;
- Web Audio / HTMLAudioElement — audio;
- Wake Lock — active workout;
- Vibration API — optional haptics;
- View Transition API — theme transition when supported;
- WAAPI — narrow local transitions.

Development only:
- `@playwright/test` 1.63.0;
- `wrangler` 4.143.0;
- Node 22.16.0 in CI.

## Dependency rules

1. Production remains static HTML/CSS/JS.
2. No floating runtime versions.
3. Do not add a library without a concrete current feature.
4. A responsibility has one owner.
5. iOS/PWA fallback is mandatory.
6. Bottom-sheet physics cannot be replaced implicitly.
7. New motion must respect reduced motion.
8. Removed GSAP plugins DrawSVG/SplitText must not return without a separate product decision.
9. FLOW assets are not a motion-plugin target.
