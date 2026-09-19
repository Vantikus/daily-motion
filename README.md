# Daily Motion

Личное mobile-first приложение ежедневной разминки на чистых HTML / CSS / JavaScript.

## Source of truth

- GitHub: `Vantikus/daily-motion`
- рабочая ветка: `main`
- перед каждой серией изменений читать актуальный `main`
- после проверки commit/push в `main`
- Cloudflare автоматически деплоит `main`

## Стек

Без React, npm, backend и БД. Состояние хранится локально в `localStorage`. PWA metadata — через `manifest.webmanifest`.

## Файлы

- `index.html` + `app.js` — Today/Home
- `session.html` + `session.js` — workout player
- `state.js` — единое localStorage-состояние и миграция старой v1-модели
- `styles.css` — единая mobile-first визуальная система
- `manifest.webmanifest` + `icons/` — Home Screen / PWA
- `_headers` — Cloudflare cache headers

## P0 baseline

- Home ориентирован на один главный сценарий: начать или продолжить текущий комплекс.
- Прогресс, step и completion восстанавливаются после reload/повторного открытия.
- Таймеры теперь хранятся внутри конкретного дня и больше не перетекают на следующий день.
- Старый `dailyMotionState.v1` автоматически мигрирует в `dailyMotionState.v2`.
- Workout player сохраняет Wake Lock, pause/resume/reset, ±10 сек и навигацию по упражнениям.
- Завершение комплекса — отдельное устойчивое состояние с явной кнопкой возврата, без автоматического редиректа.
- Safe-area учитывается на Home и Workout; нижняя навигация учитывает `safe-area-inset-bottom`.
- Верхний системный safe-area слой остаётся непрозрачным и без blur.
- День и вечер пока остаются отдельными фрагментами и не перерабатываются в этом P0.
