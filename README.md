# Vera Napalkova — 3D portfolio

Статический сайт-портфолио 3D-художника (Stylized Props & Environments). HTML + CSS + vanilla JS, без сборки. Два языка: EN по умолчанию, кнопка RU в шапке (или ссылка `?lang=ru`).

## Структура
- `index.html` — главная: hero, 5 проектов, навыки, 2D-база, обо мне, контакты
- `project-shop.html`, `project-weapon.html`, `project-island.html`, `project-characters.html` — кейсы
- `art.html` — 2D-альбом
- `cv.html` — резюме (превью + PDF EN/RU в `assets/docs/`)
- `assets/css/styles.css` — весь дизайн, `assets/css/fonts.css` — шрифты (лежат локально, без Google Fonts)
- `assets/js/main.js` — меню, язык, анимации, лайтбокс
- `assets/images/` — WebP

## Как добавлять
- **Технический разбор** (сетка, UV, карты, параметры): в каждом кейсе внизу есть закомментированный блок `TECH BREAKDOWN SLOT`. Положить картинки в `assets/images/`, поменять имена, убрать `<!--` и `-->`.
- **2D**: в `art.html` есть комментарий с форматом карточки.
- Новый кейс: скопировать любой `project-*.html`, добавить карточку в `index.html` (блок `work-grid`).
- Текст на двух языках: `<span class="en">…</span><span class="ru">…</span>`.
