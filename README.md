# Daily Motion

Личный статический сайт ежедневной разминки.

## Source of truth

- GitHub: `Vantikus/daily-motion`
- рабочая ветка: `main`
- перед любой правкой сначала читать актуальные файлы из `main`
- после проверки изменения сразу commit/push в `main`
- Cloudflare автоматически деплоит `main`

## Стек

Чистые HTML / CSS / JavaScript. Без React, npm, backend и БД. Прогресс, текущий шаг и таймеры хранятся в `localStorage`.

## Файлы

- `index.html` + `app.js` — главная
- `session.html` + `session.js` — экран комплекса
- `styles.css` — общие стили
- `manifest.webmanifest` + `icons/` — Home Screen / PWA
- `_headers` — Cloudflare headers

## Текущее состояние

Утренний комплекс полностью рабочий: 8 упражнений, переходы, сохранение прогресса, таймер, Wake Lock, accordion-подсказки и нижняя навигация.

Верхний блок `← / Утро / 1 из 8` находится внутри прокручиваемого контента. Отдельного видимого sticky-header нет.

Для iPhone верхняя safe-area перекрывается непрозрачным `.ios-safe-zone-bar`; `.exercise-scroll` начинается ниже `env(safe-area-inset-top)`. Blur на этих элементах принудительно отключён.

День и вечер пока отображают заглушку и не считаются готовыми комплексами.
