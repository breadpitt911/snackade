# SEO notes for snackbar.games

Two audits so far: one before launch (first table) and one against the live site on 15 October 2026 (second table). Everything marked **Fixed** is in the code. The rest is for you to do in Cloudflare or Search Console.

## Live-site audit, 15 October 2026

Checked on the live site: status codes, response headers, titles, descriptions, canonicals, robots tags, structured data, robots.txt, sitemap, the www and play hostnames, and load timing.

**Already good:** every page has its own title, description and canonical. Missing pages return a real 404 with `noindex`. robots.txt and sitemap.xml are correct. `play.` and `/api/` are kept out of search. HTTPS with HSTS, HTTP/3, zstd compression, about 150 ms to first byte, and the HTML shell is under 2 KB on the wire.

| Issue | Severity | Status |
|---|---|---|
| Cloudflare was overriding cache headers on the site's code (4-hour browser cache), so after a deploy visitors could run old scripts against the new server. That's one way to end up with the bare, unstyled fallback page. | High | **Fixed in code.** Code and styles are now served from versioned URLs (`/v/<hash>/…`) that change on every deploy and are cached for a year. Also set Cloudflare → Caching → Configuration → **Browser Cache TTL: Respect Existing Headers**. |
| `www.snackbar.games` showed a blank page. | High | **You:** Cloudflare → Rules → Redirect Rules → template "Redirect from WWW to root". The app now also redirects `www.` itself if that traffic ever reaches it. |
| The font loaded from Google Fonts: an extra render-blocking third-party request, and visitors' IPs shared with Google (a known GDPR problem in the EU). | Medium | **Fixed.** The font is self-hosted (`/fonts`, SIL Open Font License) and preloaded. CSP no longer allows Google Fonts. |
| Game pages had no review signal and no user-written content. | Medium | **Fixed.** New Snack Score ratings feed `aggregateRating` into the `VideoGame` structured data (eligible for star snippets in search). The latest 10 comments are in the crawlable HTML. |
| Low contrast in dark mode (and a few light-mode captions). Accessibility issues also hurt quality signals. | Medium | **Fixed.** Every page now passes WCAG AA contrast in both themes, on desktop and mobile. |
| New page worth indexing: monthly winners. | n/a | **Added.** `/hall-of-fame` with its own title, description, `ItemList` structured data, and a sitemap entry. "Game of the Month" pages tend to pick up links from game makers. |

## Pre-launch audit

## What was wrong and what changed

| Issue | Severity | Status |
|---|---|---|
| Every URL returned the same empty page with the same title and description (pure client-side app). Link previews and most crawlers saw nothing. | Critical | **Fixed.** The server now renders each page's title, description, canonical, Open Graph/Twitter tags, structured data and a plain-HTML version of the content. The app takes over once it loads. |
| Missing games, players and pages returned `200` (soft 404s). | Critical | **Fixed.** Real `404` status with a `noindex`. |
| No `robots.txt` or `sitemap.xml`. | High | **Fixed.** `/robots.txt` points at `/sitemap.xml`, which lists the home page, category pages, every live game and every player with a live game. It refreshes every 10 minutes. |
| `play.` subdomain (raw game files) was indexable, so it would compete with the real game pages as thin duplicates. | High | **Fixed.** Everything on `play.` sends `X-Robots-Tag: noindex, nofollow`. |
| Category pages were `/games?category=puzzle` with a generic heading and no copy. | High | **Fixed.** Clean URLs (`/games/puzzle`), "Free puzzle games" headings, a short intro per category, breadcrumbs. Old URLs `301` to the new ones. |
| Search results, sort and filter variants of `/games` would be indexed as duplicates. | Medium | **Fixed.** `noindex, follow` with a canonical to the clean page. |
| Duplicate URLs: `/games/` vs `/games`, `/index.html` vs `/`. | Medium | **Fixed.** `301` to one version. |
| No social share image. | Medium | **Fixed.** `/img/og.png` (1200×630). Games with an uploaded cover use their cover instead. |
| No structured data. | Medium | **Fixed.** `WebSite` + `Organization` on the home page, `VideoGame` + `BreadcrumbList` on game pages, `BreadcrumbList` on category pages. |
| Homepage H1 didn't say what the site is. | Medium | **Fixed.** "Free browser games. Hit play, you're in." |
| No PNG icons or web manifest (Apple touch icon, Android, some search result favicons). | Low | **Fixed.** |
| Login, sign-up, settings, upload, and player profiles with no games are thin pages. | Low | **Fixed.** `noindex, follow`. |
| `/api/` responses could get crawled. | Low | **Fixed.** `Disallow` in robots plus `X-Robots-Tag: noindex`. |
| Brand font loads from Google Fonts (one extra connection). | Low | Left as is. It's preconnected and uses `display=swap`. Self-host it later if you want to shave a bit off first load. |

## Page titles

| Page | Title |
|---|---|
| Home | Snackbar · Free browser games, no downloads |
| All games | All free browser games · Snackbar |
| Category | Free puzzle games, play online · Snackbar |
| Game | Gobble Grid · Play free online · Snackbar |
| Player | Pixel Paula (@pixelpaula) · Snackbar |

Game descriptions come from the description the uploader writes, so a good first sentence matters. Tell uploaders that, or edit the official games' `game.json`.

## Keywords worth going after

The site isn't live, so there's no ranking data yet. These are judgment calls based on how the big portals (Poki, CrazyGames, Miniclip, itch.io) get found.

| Keyword | Competition | Chance | Page that targets it |
|---|---|---|---|
| free browser games | Very high | Low at first | Home |
| games like miniclip / old miniclip games | Medium | **Good**, it's your whole pitch | A blog-style page (see below) |
| free [category] games online | High | Medium | `/games/<category>` |
| [game name] / [game name] online | Low | **High** | Each game page |
| browser FPS / fps games no download | Medium | Medium | `/games/shooter` |
| pacman style games online | Medium | Medium | Gobble Grid page |
| one button games | Low | **High** | Cave Hopper page, `/games/casual` |
| upload your html5 game / where to publish browser games | Low | **High** | `/upload` (currently noindex, flip it if you want this) |
| host unity webgl game free | Low | **High** | A short guide page |

The honest picture: you won't outrank Poki for "free browser games" any time soon. Realistic early traffic comes from **game names**, **long-tail category searches** and **game makers** looking for somewhere to host their stuff.

## To do after launch

1. **Cloudflare cache setting:** Caching → Configuration → Browser Cache TTL → **Respect Existing Headers**.
2. **www redirect:** Rules → Redirect Rules → "Redirect from WWW to root".
3. **Google Search Console:** add `snackbar.games` as a Domain property (verify with a DNS TXT record in Cloudflare), then submit `https://snackbar.games/sitemap.xml`.
4. **Bing Webmaster Tools:** import from Search Console. One click, and it covers DuckDuckGo and ChatGPT search too.
5. Check a game page with ratings in Google's Rich Results Test and a share preview with opengraph.xyz.
6. **Content that can rank:** a "Games like old Miniclip" page, a "How to put your Unity/HTML5 game online for free" guide, and real descriptions on every official game. Each new good game is a new page that can rank.
7. **Links:** tell winning makers to link to their Hall of Fame spot. Also post your own games on itch.io, r/WebGames and Newgrounds with a link back. Game makers who upload will link to their own game pages.
