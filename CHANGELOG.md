# Daily Motion — Changelog

## v221
- нормализация повреждённых вложенных данных и некорректных дат без потери валидной истории;
- сохранение nullable timer fields без ложного времени активности;
- явный результат записи, сообщение при отказе localStorage и экспорт несохранённого прогресса;
- импорт заменяет текущее состояние только после успешного сохранения;
- регрессии миграции v2, повреждённого состояния, save/reload и отказа записи в Chromium/WebKit.

## v220
- Stage 8 завершён: финальный dependency/orphan/runtime audit без изменения workout-flow и sheet physics;
- восстановлены точные frozen FLOW SVG и добавлена hash-защита от случайного удаления/перерисовки;
- удалены доказанно мёртвые `setProgramVersion`, `DailyMotionSwup` и transfer handoff;
- WebKit long-drag regression переведён на прямой touch PointerEvent contract вместо нестабильной mouse-emulation;
- добавлен отдельный regression legacy v1 → v3 timer migration.

## v219
- финальный dependency/orphan/runtime/style audit;
- восстановлены и hash-защищены frozen FLOW SVG; удалены только доказанно мёртвые CSS tokens/classes/keyframes;
- сокращён публичный `DailyMotion*` API до реально используемых межмодульных контрактов; удалены мёртвые `DailyMotionSwup` и `setProgramVersion`;
- полный acceptance regression закрепляет итоговую оптимизированную архитектуру.

Здесь хранится история ключевых архитектурных и motion-релизов. Текущие правила находятся в README, DESIGN_SYSTEM, LIBRARIES и MOTION_ROADMAP.

## v218
- тесты разделены по ответственности;
- static checker сокращён до structural invariants;
- документация очищена от смешения current-state и истории.

## v217
- presentation упражнения вынесен в `session-view.js`;
- `session.js` оставлен владельцем workout state/timer/rest/completion;
- удалён неиспользуемый dev-completion branch.

## v216
- audio synthesis и media players переведены на lazy initialization;
- повторный unlock переиспользует созданный media runtime.

## v215
- завершена архитектурная консолидация shared UI/motion;
- Chromium/WebKit regression приведён к зелёному текущему контракту.

## v214
- финализирована shared UI/motion architecture;
- стабилизированы finish-early и sheet close fallbacks;
- PWA cache синхронизирован с runtime.

## v213
- создан `ui.js`;
- bottom-sheet/press ownership перенесён из `pwa.js` в `motion.js`;
- `pwa.js` оставлен только для PWA lifecycle.

## v212
- SplitText и старый completion burst удалены;
- completion оставлен на GSAP Core + inline SVG;
- начата CSS/dependency cleanup.

## v170
- Swup стал единственным page-transition owner;
- accordion получил единый WAAPI owner;
- toast/PWA feedback избавлены от конкурирующих animation layers.

## v169
- унифицирован press-feedback timing;
- крупные поверхности перестали менять footprint при нажатии.

## v168
- унифицирован motion rhythm;
- DrawSVG удалён;
- shared motion namespace стабилизирован.

## v167
- completion mark уменьшен до компактного масштаба.

## v166
- усилен, но оставлен спокойным success moment completion.

## v165
- completion ring/check перестали зависеть от дополнительного plugin runtime.

## v163
- исправлена видимость completion check и конфликт старой animation.

## v162
- ускорены timer fullscreen enter/exit;
- completion check получил безопасный fallback.

## v161
- первый GSAP completion timeline с локальными экспериментальными DrawSVG/SplitText plugins.

Промежуточные версии между перечисленными релизами содержали небольшие визуальные, motion и regression-исправления и не определяют текущую архитектуру.
