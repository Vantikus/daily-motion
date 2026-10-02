# Daily Motion — Changelog

## v243
- iPhone/iPadOS page transitions снова получили выраженное плавное направление без возврата к тяжёлым snapshot/fade-эффектам;
- forward navigation: старый экран коротко уходит на 5px влево, новый входит с 14px справа; back navigation зеркальна;
- оба этапа остаются browser-native WAAPI и transform-only: 90мс выход + 220мс вход, без opacity/scale и без GSAP frame-loop.

## v242
- iPhone/iPadOS ordinary UI motion переведён с покадровых GSAP updates на browser-native Web Animations для transform-only переходов страниц и open/close нижних панелей;
- затемнение Settings возвращено как статичный фон: оно появляется вместе с панелью, но не анимирует opacity;
- workout fullscreen на Apple mobile упрощён до одного transform-анимируемого stage без каскада opacity/stagger, а countdown/timer micro-motion на iPhone оставлен transform-only;
- sheet drag/snap/dismiss physics, дизайн, размеры, тексты, safe-area и desktop motion не менялись.

## v241
- iPhone/iPadOS motion облегчён для 60 Гц: page navigation использует только короткий входящий transform без fade/out-animation, а смена упражнения не запускает каскад нескольких opacity-анимаций;
- мобильные настройки больше не затемняют весь экран и не анимируют backdrop opacity; sheet открывается/закрывается только transform-анимацией;
- open/close bottom-sheet tween теперь двигает сам sheet напрямую без покадрового JS repaint; drag/snap/dismiss physics не менялась.

## v240
- iPhone/iPadOS page navigation переведена с полноэкранных View Transition snapshots на существующий GSAP `transform + opacity` fallback, сохраняя Swup и тот же document;
- page timing возвращён к быстрому ритму до v239: 80 мс exit + 180–200 мс enter; native snapshots на остальных поддерживаемых платформах остаются 280 мс;
- добавлена навигационная регрессия, запрещающая page snapshots для iPhone-пути; sheets, дизайн, размеры, тексты и safe-area не менялись.

## v225
- убрана задержка прокрутки при раскрытии «Техники»: экран получает мгновенный начальный сдвиг и затем синхронно продолжает плавное движение вместе с раскрытием карточки;
- позиция рассчитывается по будущей высоте раскрываемой инструкции и учитывает закрытие предыдущего пункта;
- логика упражнений, навигация, размеры, типографика и таймеры не изменялись.

## v224
- раскрытая инструкция «Техника» после открытия автоматически остаётся целиком выше нижней навигации, если помещается на экране;
- поведение проверено на компактной высоте для первого и девятого упражнений, включая длинные инструкции;
- навигация, размеры кнопок, типографика, тексты и логика прохождения не изменялись.

## v223
- локальные закреплённые Swup-файлы входят в обязательный офлайн-кеш;
- непрерывные направленные page snapshots (240ms) с GSAP fallback;
- ожидание загрузки сохраняет старый экран видимым;
- прерванный GSAP transition завершает promise; повторная кнопка Назад защищена;
- регрессии быстрых переходов, отсутствия внешней загрузки и reduced motion;
- инструкции обновлены под работу с ZIP, добавлена краткая HANDOFF.md.

## v222
- реальные Swup-переходы подтверждаются сохранением документа, включая history и offline;
- добавлена регрессия обновления настоящего Service Worker;
- PNG visual matrix для Chromium/WebKit, тем, геометрии и основных fullscreen-состояний;
- общий lifecycle отменяет обработчики и отложенные задачи; async продолжения и Wake Lock защищены при уходе со страницы;
- таймер кеширует DOM, обновляет тексты по изменению состояния и прекращает рисование в фоне;
- удалены доказанно перекрытые CSS declarations без перестановки каскада;
- добавлены карта CSS, инструкции для агентов и руководство по промптам GPT.

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
