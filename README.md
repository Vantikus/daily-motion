# Daily Motion

Личный статический сайт ежедневной разминки.

## Стек

- HTML
- CSS
- JavaScript
- localStorage
- без npm, backend и базы данных

## Основные файлы

- `index.html` + `app.js` — главная
- `session.html` + `session.js` — экран комплекса
- `styles.css` — общие стили
- `manifest.webmanifest` + `icons/` — Home Screen / PWA metadata
- `_headers` — cache headers для Cloudflare

## Deploy

Source of truth: ветка `main`.

После push в `main` Cloudflare автоматически публикует статические assets.
