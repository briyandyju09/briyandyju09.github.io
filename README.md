# The Briyan Archive

> My personal website — a braindump on the internet, styled as a retro desktop OS. Live at [briyan.xyz](https://briyan.xyz/).

## Stack

- **Frontend:** hand-written HTML, CSS, and vanilla JavaScript (no framework, no build step)
- **Map:** [Leaflet](https://leafletjs.com/) 1.9.4 + OpenStreetMap tiles
- **Data:** [Open-Meteo](https://open-meteo.com/) (weather), Spotify embed
- **Fonts:** Space Mono & Syne (Google Fonts)
- **Hosting:** GitHub Pages with a custom domain (`CNAME` → briyan.xyz)

## Description

A personal site presented as a draggable desktop operating system. Desktop icons open
"windows" (Home, About, Spotify, Map, Blog) that you can move and focus, plus always-on
widgets. Content — blog posts and the rotating photo widget — lives in `blogs.js`; the window
manager, drag logic, map, and widgets live in `script.js`.

## Features

- **Desktop-OS UI** — draggable, focusable windows with a top bar and live clock.
- **Travel map** — Leaflet map of places I've been, with custom markers and popups.
- **Blog** — a list view and post viewer (single- and multi-day posts, image carousels), driven from `blogs.js`.
- **Spotify embed** — current playlist rotation.
- **Live weather widget** — current Dubai conditions from Open-Meteo.
- **Photo-of-the-day widget** — auto-rotating photo carousel.

## How to Build / Run

No build step — it's a static site.

```bash
# Serve locally (any static server works)
python -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` in a browser. Pushing to `main` deploys automatically via GitHub
Pages to the domain in `CNAME`.

### Editing content

- **Blog posts / photos:** edit `blogs.js` (`BLOG_POSTS` and `PHOTO_OF_DAY`).
- **Places on the map:** edit `PLACES_IVE_BEEN` in `script.js`.
- **Wallpaper:** replace `image.png`.
