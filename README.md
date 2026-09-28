# The Briyan Archive

> My personal website — a braindump on the internet, styled as a retro desktop OS. Live at [briyan.xyz](https://briyan.xyz/).

## Stack

- **Frontend:** hand-written HTML, CSS, and vanilla JavaScript (no framework, no build step)
- **Map:** [Leaflet](https://leafletjs.com/) 1.9.4 + OpenStreetMap tiles
- **Data:** [Open-Meteo](https://open-meteo.com/) (weather), [GitHub REST API](https://docs.github.com/en/rest) (projects), Spotify embed
- **Fonts:** Space Mono & Syne (Google Fonts)
- **Hosting:** GitHub Pages with a custom domain (`CNAME` → briyan.xyz)

## Description

A personal site presented as a draggable desktop operating system. Desktop icons open
"windows" (Home, About, Spotify, Map, Blog, Projects) that you can move and focus, plus an
always-on weather widget. Content — blog posts — lives in `blogs.js`; the window manager, drag
logic, map, projects, and widgets live in `script.js`. Below 768px, windows pin to a fixed
near-full-screen slot instead of being draggable.

## Features

- **Desktop-OS UI** — draggable, focusable windows with a top bar and live clock.
- **Travel map** — Leaflet map of places I've been, with custom markers and popups.
- **Blog** — a list view and post viewer (single- and multi-day posts, image carousels), driven from `blogs.js`.
- **Projects** — live list of my public GitHub repos (name, description, language, stars, last pushed), fetched from the GitHub API — stays current automatically as I ship things.
- **Spotify embed** — current playlist rotation.
- **Live weather widget** — current Dubai conditions from Open-Meteo.

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

- **Blog posts:** edit `blogs.js` (`BLOG_POSTS`).
- **Places on the map:** edit `PLACES_IVE_BEEN` in `script.js`.
- **Projects:** nothing to edit — it pulls straight from `GITHUB_USERNAME`'s public repos in `script.js`. To hide a repo from the list, add its name to `PROJECTS_EXCLUDE`.
- **Wallpaper:** replace `image.png`.
