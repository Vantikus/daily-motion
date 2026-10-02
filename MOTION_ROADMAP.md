# Daily Motion — Motion Ownership

Это не список плагинов «на будущее», а рабочая карта текущей motion-системы.

## Current owners

### GSAP Core
Используется для:
- Swup page transitions in browsers without native View Transitions;
- completion timeline;
- mobile bottom-sheet open/close/drag settling;
- shared press feedback.

### session.js
Владеет fullscreen state choreography:
- countdown;
- timer;
- pause/resume state handoff;
- finish early;
- rest;
- execution close;
- transition to completion.

CSS не должен запускать параллельную entrance/exit анимацию этих стадий.

### session-view.js
Владеет presentation упражнения:
- directional exercise reveal;
- accordion height/content animation;
- step indicator updates;
- exercise view state.

### CSS
Оставлять для:
- static visual states;
- timer urgency pulse;
- simple non-competing transitions;
- reduced-motion settled states.

### Theme
View Transition API используется для theme switch и page snapshots там, где они не отключены платформенным guard.
На iPhone/iPadOS page navigation всегда использует GSAP fallback, чтобы не создавать полноэкранные snapshot layers; theme transition остаётся native.
Навигация выбирает один owner: native snapshots либо GSAP fallback.
Page snapshot длится 280ms; fallback — 80ms exit + 180–200ms enter.
Во время page snapshots внутренний reveal упражнений отключён.

## Frozen motion contracts

Bottom sheet:
- open: 0.38s;
- close: 0.30s;
- dismiss ratio: 0.28;
- dismiss min/max: 110/190;
- fling min Y: 52;
- fling velocity: 700;
- fling projection: 0.12.

Эти значения не менять без отдельной задачи.

Fullscreen workout:
- один visible execution stage;
- уходящая stage очищает свои animations перед handoff;
- finish-early не зависит от бесконечного urgency pulse;
- completion появляется только после закрытия execution surface.

## Rules for future motion work

- сначала определить одного owner;
- replacement означает удаление старого owner в том же изменении;
- не мигрировать working animation на другой engine только ради унификации;
- не добавлять GSAP plugins без реальной функции;
- не использовать motion для FLOW logo;
- не перехватывать native vertical scroll;
- не добавлять global swipe navigation;
- reduced motion обязателен;
- каждый page-owned effect должен иметь cleanup на Swup unmount.

## Candidates

Flip, Observer, Draggable/Inertia и ScrollTrigger не входят в текущий runtime. Рассматривать их только когда появится конкретная функция, которую невозможно проще реализовать текущим стеком.
