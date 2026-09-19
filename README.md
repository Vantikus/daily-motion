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
- Таймеры хранятся внутри конкретного дня.
- Старый `dailyMotionState.v1` автоматически мигрирует в `dailyMotionState.v2`.
- Workout player сохраняет Wake Lock, pause/resume/reset, ±10 сек и навигацию.
- Завершение комплекса — отдельное устойчивое состояние без автоматического редиректа.
- Safe-area учитывается на Home и Workout.

## P1 — текущая итерация

- убрана служебная подпись про Wake Lock из таймера;
- верх таймера уплотнён;
- countdown перед первым запуском таймера;
- настраиваемый отдых между упражнениями;
- звуковые сигналы через Web Audio без внешних файлов;
- опциональный auto-next после завершения таймера;
- настройки сохраняются глобально в `localStorage` и открываются с главного экрана;
- добавлен общий `audio.js` с более заметными сигналами и кнопкой проверки звука;
- настройки убраны из workout screen, чтобы не перегружать выполнение.
