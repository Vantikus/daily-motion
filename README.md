# Daily Motion

Daily Motion — mobile-first PWA для ежедневной полнотелой разминки. Production остаётся статическим: чистые HTML/CSS/JavaScript, без React, backend и runtime npm.

## Текущий продукт

- полностью доступен утренний комплекс из 9 упражнений;
- День и Вечер видимы, но пока недоступны;
- основной flow: Home → упражнение → countdown → fullscreen timer → rest → следующее упражнение → completion;
- состояние, прогресс, настройки и история хранятся локально;
- PWA работает офлайн после первого успешного открытия;
- интерфейс и motion оптимизированы под iPhone/Safari/PWA.

## Runtime

- `index.html` + `app.js` — Home;
- `session.html` + `session.js` — workout state, timer/countdown/rest, persistence и completion;
- `session-view.js` — presentation упражнения, accordion, step indicator и next-button state;
- `progress.html` + `progress.js` — история, статистика, import/export;
- `state.js` — единая модель localStorage, статистика и миграции;
- `ui.js` — общие UI-примитивы;
- `UI.createLifecycle()` — общая отмена page listeners, отложенных задач и кадров при unmount;
- `motion.js` — GSAP motion, press feedback и bottom-sheet engine;
- `navigation.js` — Swup lifecycle/navigation;
- `audio.js` — lazy audio runtime;
- `theme.js` — system/light/dark theme;
- `pwa.js` + `sw.js` — install/update/offline lifecycle;
- `program.js` — состав упражнений.

Swup меняет только `#swup`, поэтому page runtimes загружаются во всех HTML shell и самостоятельно mount/unmount нужную страницу.

Все HTML shell заранее подключают одинаковые `heroicons.css` и `styles.css`
в этом порядке: переход к упражнению не ждёт новой таблицы стилей.
Стили нижней панели и типографики упражнения находятся в конце `styles.css`;
действие завершённого комплекса принадлежит `session-view.js` и `session.js`.
Swup предзагружает `/session.html` и использует этот путь как ключ HTML-кэша
для всех параметров тренировки. Параметры `routine` и `resume` сохраняются в
адресе визита и читаются runtime при mount, даже если Service Worker вернул
офлайн-оболочку с URL без query. Перед fallback slide нет ожидания двух кадров.

## Сохранение данных

Ключ состояния остаётся `dailyMotionState.v3`. При загрузке проверяются вложенные поля и календарные даты; валидная история и настройки сохраняются, данные v1/v2 мигрируют в текущую модель. Отсутствующие числовые значения таймера остаются `null` до применения длительности упражнения.

`DailyMotionState.save()` возвращает `true` при успешной записи и `false` при отказе localStorage. `getPersistenceStatus()` сообщает последний результат записи; изменение статуса публикуется событием `daily-motion-storage-status-change`. При отказе пользователь получает сообщение, а несохранённый прогресс остаётся доступен для экспорта. Импорт заменяет состояние в памяти только после успешной записи.

## Frozen contracts

Без отдельной задачи не менять:

- FLOW assets и форму логотипа;
- Heroicons Outline: локальные SVG, stroke-width 1.7px;
- тексты, порядок и длительности упражнений;
- localStorage/progress semantics;
- mobile bottom-sheet drag/snap/dismiss physics;
- iOS safe-area/PWA поведение;
- День/Вечер не превращать в доступные комплексы;
- fullscreen timer/rest state machine не смешивать с CSS-анимациями.

## Motion ownership

- GSAP Core — page/completion/sheet motion и press feedback;
- WAAPI — локальные workout/content transitions, где это остаётся единственным владельцем;
- Раскрытие «Техники» — session-view.js/WAAPI, 420 мс с мягким ease; прерывания не короче 252 мс: раскладка рассчитывается при нажатии, после чего строки двигаются только через transform, а контент мягко проявляется через opacity в том же ритме, что и шеврон. Фиксированное окно отсечения и обратный translate содержимого постепенно открывают текст без масштабирования, а отдельные части пустой поверхности сохраняют радиус. Height/grid/clip-path не интерполируются, JS frame loop отсутствует. Прерывание считывает текущие позиции/открытую область/opacity; одновременно открыт максимум один пункт. Автопрокрутка — native scrollTo(smooth), ручной жест её отменяет. В конце сохраняется лишь необходимый запас диапазона до scrollend. Reduced motion, keyboard, Settings и lifecycle сохранены.
- CSS — статические состояния, urgency pulse и простые transitions;
- View Transition API — смена темы и page snapshots на поддерживаемых платформах, включая мобильные браузеры. Мобильная навигация и standalone PWA сдвигают непрозрачные снимки страниц край к краю за 280 мс, без cross-fade и изменения размера. Нижняя панель комплекса имеет отдельный неподвижный снимок. Если native capture недоступен, WAAPI двигает старую копию с зафиксированными вычисленными стилями и новое содержимое; fixed-панель и safe-area не трансформируются. Закрытие fullscreen workout управляется session.js/WAAPI: 180 мс затухания и сдвиг вверх на 12px.

Один interaction не должен иметь двух независимых motion-owner.

## Зависимости

Production:
- GSAP 3.15.0 — локально;
- Swup 4.10.0 и используемые Swup plugins — локальные закреплённые файлы;
- Heroicons Outline — локально.

Development only:
- Playwright 1.63.0;
- Wrangler 4.143.0;
- Node 22.16.0 в CI.

Подробнее: `LIBRARIES.md`.

## Проверки

```bash
npm run check
npm run test:e2e
```

`npm run check` проверяет только статическую целостность: синтаксис, release/cache version, обязательные assets/DOM anchors, PWA shell, Heroicons и критические архитектурные запреты.

Поведение проверяет Playwright:
- `state.spec.js`;
- `pwa.spec.js`;
- `navigation.spec.js`;
- `session-flow.spec.js`;
- `settings.spec.js`;
- `accessibility.spec.js`;
- `layout.spec.js`;
- `motion.spec.js`;
- `visual.spec.js`.
- `visual-matrix.spec.js` — PNG-эталоны Chromium/WebKit для тем, размеров экрана и основных состояний;
- `lifecycle.spec.js` — повторные переходы, отмена async work, Wake Lock и частота обновления таймера.

Тесты используют те же локальные Swup-файлы, что и приложение. Тестовый HTTP
server позволяет проверять обновление настоящего Service Worker через
waiting/activation. Для передачи работы сначала читать HANDOFF.md.

## Документы

- `DESIGN_SYSTEM.md` — только действующие UI/architecture contracts;
- `LIBRARIES.md` — только реально используемые зависимости;
- `MOTION_ROADMAP.md` — текущий motion ownership и правила будущих изменений;
- `CHANGELOG.md` — история ключевых прошлых релизов.
- `AGENTS.md` — ограничения и инструкции для работы с кодом;
- `CSS_GUIDE.md` — карта стилей и правила изменения каскада;
- `WORKING_WITH_GPT.md` — шаблоны задач и промптов.

## Deploy

Рабочая ветка — `main`. Cloudflare автоматически разворачивает `main`. Production не требует build-step.
Тесты, PNG-эталоны, документация и инструменты разработки исключены из публичных assets.
