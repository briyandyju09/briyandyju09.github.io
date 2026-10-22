# The Briyan Archive

> My personal website — a braindump on the internet, styled as a retro desktop OS. Live at [briyan.xyz](https://briyan.xyz/).

## Stack

- **Frontend:** hand-written HTML, CSS, and vanilla JavaScript (no framework, no build step)
- **Map:** [Leaflet](https://leafletjs.com/) 1.9.4 + Esri grey canvas tiles
- **Data:** [Open-Meteo](https://open-meteo.com/) (weather), [GitHub REST API](https://docs.github.com/en/rest) (projects), Spotify embed
- **Fonts:** Instrument Serif, Geist & Geist Mono (Google Fonts)
- **Colours:** greys only, from `tokens.css` (light and dark, follows the OS)
- **Hosting:** GitHub Pages with a custom domain (`CNAME` → briyan.xyz)

## Description

A personal site presented as a draggable desktop operating system. Desktop icons open
"windows" (Home, About, Spotify, Map, Blog, Projects) that you can move and focus, plus an
always-on weather widget. Content — blog posts — lives in `blogs.js`; the window manager, drag
logic, map, projects, and widgets live in `script.js`. Below 768px, windows pin to a fixed
near-full-screen slot instead of being draggable.

## Features

- **Desktop-OS UI** — draggable, focusable windows with a top bar and live clock.
- **Travel map** — Leaflet map of places I've been, with custom markers and popups. Uses Esri's grey basemaps (light and dark), since OpenStreetMap's volunteer tile servers block sites that don't meet their tile usage policy.
- **Blog** — a list view and post viewer (single- and multi-day posts, image carousels), driven from `blogs.js`.
- **Projects** — live list of my public GitHub repos (name, description, language, stars, last pushed), fetched from the GitHub API — stays current automatically as I ship things.
- **Spotify embed** — current playlist rotation.
- **Live weather widget** — current Dubai conditions from Open-Meteo.
- **Lo-fi player** — a widget that invents its own soft lo-fi in the browser (`music.js`, Web Audio, nothing to download), with a random title for every track. It starts on the first tap or click if the browser blocks autoplay.
- **Dock on phones** — below 768px the site opens to an empty desktop with a dock at the bottom; tap an app to open it, drag windows by their title bar.

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
- **Icons:** a monochrome SVG sprite in `index.html` (classes `.ic`, `.ic-s`, `.ic-h` in `style.css`).
- **Wallpaper:** generated in `wallpaper.js` (a dot-matrix contour pattern on a canvas that follows the light/dark colours). Tweak the numbers there for a different landscape.
- **Share card:** replace `og.png` (1200 x 630).

### Vision board (`/vision`)

A separate sub-site at [briyan.xyz/vision](https://briyan.xyz/vision/): a vision board drawn as a celestial atlas, with one constellation per ambition (boards, the Pearson scholarship, a prestigious company, a CS doctorate, a professorship) and one star per milestone. It has its own design and does not share `style.css` or `tokens.css`.

- Static files in `vision/`: `index.html`, `vision.css`, `vision.js`, `data.js`. No build step.
- **Edit the goals, milestones and quotes** in `vision/data.js`. Constellation shapes (`stars`, `edges`) live there too.
- Progress, dates, notes and the letter are saved in the visitor's own browser (`localStorage`, key `vision.v1`). Nothing is sent anywhere, and the page is `noindex`.
- Extras: daily observation log with streak, per-goal horizon dates with countdowns, a random "transmission" for a push, and a phone-wallpaper export of the current sky.
