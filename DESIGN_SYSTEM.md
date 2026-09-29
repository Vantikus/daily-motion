# Daily Motion — Design System

Этот файл описывает только действующие правила интерфейса и архитектуры. История изменений находится в `CHANGELOG.md`.

## Visual foundation

Основной язык: Quiet Motion — спокойный app-like интерфейс, нейтральный фон, одна акцентная зелёная система и умеренная глубина.

Основные токены:
- background: `#f4f5f1`;
- surface: `#fff`;
- text: `#171917`;
- muted: `#687169`;
- accent: `#2f6b55`;
- accent-soft: `#dfece5`;
- base layout max-width: 760px;
- mobile inline gutter: 16px;
- minimum touch target: 44px;
- primary control: 52px;
- bottom navigation control: 54px.

Home: Today остаётся главной elevated surface. Routine list и Activity визуально спокойнее и не конкурируют с Today.

Workout: техника, факты, timer и navigation образуют один непрерывный player, без лишней card-density.

Progress: метрики, календарь и history используют ту же типографику, радиусы и spacing family.

## Typography

- user-facing базовые размеры задаются через rem tokens;
- микрокопия не должна уходить в нечитаемые 10–11px;
- текст должен выдерживать увеличение root font-size без горизонтального overflow;
- заголовки и microcopy сохраняют семантическую иерархию.

## Icons

- FLOW assets неизменяемы без отдельной задачи;
- основной UI pack — локальный Heroicons Outline;
- SVG stroke-width строго 1.7px;
- не возвращать Phosphor;
- inline SVG допустим только для изолированного completion mark.

## Components

Settings:
- rows: 68px family;
- close/touch targets: минимум 44px;
- segmented timing/theme controls используют shared `ui.js`;
- reset confirmation не меняет footprint исходной строки.

Bottom sheets:
- GSAP engine принадлежит `motion.js`;
- drag/snap/dismiss physics frozen;
- Home и Workout используют один engine;
- Progress bottom sheet не использует.

Workout:
- fullscreen execution close target 44px;
- compact secondary actions сохраняют текущую геометрию;
- timer urgency не меняет геометрию ring;
- accordion держит максимум одну открытую секцию;
- semantic heading → button → labelled region структура обязательна.

## Motion

Authoritative ownership:
- `motion.js` — GSAP/shared motion;
- `session.js` — fullscreen execution state choreography;
- `session-view.js` — exercise/accordion presentation motion;
- CSS — только состояния и не конкурирующие transitions.

Ключевые timing families:
- contact ≈ 105–120ms;
- quick exit ≈ 140ms;
- content/stage ≈ 220ms;
- emphasis ≈ 280ms;
- sheet close 300ms;
- sheet open 380ms.

`prefers-reduced-motion` всегда получает settled/near-immediate состояние.

## Architecture ownership

- `state.js` — состояние, статистика, migrations;
- `ui.js` — toast, segmented sync, focus trap, confirm-flow;
- `motion.js` — motion tokens, press feedback, sheets, completion;
- `pwa.js` — только install/update/offline UI;
- `navigation.js` — только cross-page navigation lifecycle;
- `session.js` — workout state/timer/rest/completion;
- `session-view.js` — presentation упражнения;
- `audio.js` — lazy audio generation/playback.

Нельзя возвращать одну и ту же ответственность в несколько runtime-файлов.

## PWA / iOS

- safe-area обязателен;
- offline app shell должен включать все persistent runtimes;
- release query version и Service Worker cache version должны совпадать;
- update/reload не должен прерывать активную тренировку;
- audio synthesis остаётся lazy и создаётся только при первом реальном audio use.

## Regression contract

Static `check.mjs` защищает структуру и frozen architecture. Поведение, accessibility, layout, motion и visual baseline проверяются Playwright.


## Final audit contract

- Frozen FLOW source assets сохраняются даже без runtime reference; удалять или перерисовывать их без отдельного product-решения нельзя.
- Public `window.DailyMotion*` API содержит только реальные межмодульные зависимости. Internal helpers не экспортируются ради тестов.
- CSS custom properties, selectors и keyframes без runtime/markup consumer удаляются только после reference audit.
- Static checks запрещают возвращение доказанно мёртвых assets/tokens; поведенческие контракты остаются в Playwright.
