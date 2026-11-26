# Code in Perspective

Paste a GitHub repo or user URL, get the code translated into real-world comparisons, share it as a card.
Tagline: "Your code is bigger than you think. See it in perspective."

## Scope

- Static site on GitHub Pages. No backend, no build step, no token, no npm dependencies.
- Vanilla JS (ES modules) plus Bootstrap 5 CSS vendored into the repo as `vendor/bootstrap.min.css` (CSS only, no
  Bootstrap JS, no CDN).
- Public repos and users only, unauthenticated GitHub REST API called from the browser.

Out of scope for v1: tokens, private repos, history charts, CLI, trending API, per-line accuracy.

## Files

```
index.html     page shell, Bootstrap link, input, results container
vendor/        bootstrap.min.css (pinned version, copied in step 1)
app.js         routing, fetching, rendering
metrics.js     pure functions: bytes -> comparisons (no DOM, easy to test)
anchors.js     hardcoded famous-project sizes and the curated home list
card.js        canvas share card -> PNG download
README.md      what it is, screenshot, assumptions
```

## Routing

Hash based, so results are linkable and Pages needs no config.

- `#/` home
- `#/owner/repo` repo result
- `#/owner` user result

Input parsing accepts `https://github.com/owner/repo`, `github.com/owner`, `owner/repo`, or `owner`. Strip trailing
`.git` and `/`. Anything else shows an inline "not a GitHub repo or user" message.

## Data (GitHub REST, unauthenticated, 60 requests per hour per IP)

Repo mode (3 calls):

1. `GET /repos/{o}/{r}` -> `created_at`, `pushed_at`, `stargazers_count`, `description`
2. `GET /repos/{o}/{r}/languages` -> bytes per language
3. `GET /repos/{o}/{r}/commits?per_page=1` -> read the `Link` header `rel="last"` page number as commit count
   (no `Link` header means 1 commit)

User mode (about 11 calls): `GET /users/{u}/repos?per_page=100&sort=pushed`, drop forks, take the top 10 by `size`,
fetch `/languages` for each, sum the bytes. Show "based on the 10 largest of N repos".

Cache each response in `localStorage` for 1 hour (key = URL). On 403/429 show "GitHub rate limit reached, try again
in N minutes" using the `x-ratelimit-reset` header.

## Metrics (all in `metrics.js`, every constant visible and shown to the user)

| Metric | Formula | Assumption shown on the card |
|---|---|---|
| Lines | bytes / 40 | ~40 bytes per line of code |
| Book pages | lines / 50 | ~50 lines per printed page |
| Novels | pages / 300 | ~300 pages per novel |
| Floppy disks | bytes / 1,474,560 | 1.44 MB per disk |
| Typing days | lines / 200 | 200 lines per working day |
| Commits per day | commits / age in days | since repo creation |
| Age | now - created_at | years and months |

Count only code languages: ignore a short skip list (Markdown, JSON, YAML, Text, SVG, Jupyter Notebook, HTML-only
data blobs) so docs and data do not inflate the numbers. The list lives in `metrics.js`.

## Famous anchors (`anchors.js`)

A small table `{ name, lines, source }` used for lines like "About 3% of the Linux kernel". Start with 5 to 6 entries.
Every entry needs a source link and is marked approximate. Verify each number before shipping, drop any that cannot be
sourced. A wrong anchor is the one thing that would hurt credibility.

## UI (minimal, Bootstrap grid and cards)

- Header: title, tagline.
- One input with a "Compare" button.
- Home: "Try one" chips from the curated list (about 20 repos and users) plus a "Surprise me" button (random pick, no
  API call to render the chips).
- Result: title (repo or user), 5 to 6 Bootstrap cards in a responsive grid: big number, label, small grey assumption
  line. Below: anchor comparison line, "Download card" and "Copy link" buttons.
- Footer: "Estimates based on language bytes, not a measure of effort or quality." plus the assumptions list.
- States: loading spinner, not found, rate limited, empty (no code languages).
- Dark/light follows the system via Bootstrap's `data-bs-theme` set from `prefers-color-scheme`.

## Share card

`card.js` draws 1200x630 on a `<canvas>`: name, the 3 best numbers, anchor line, footer with the site URL. Download as
PNG via `canvas.toBlob`. No libraries.

## Steps

1. Skeleton: `index.html`, vendored Bootstrap CSS, input, hash routing, input parsing.
2. Repo fetch with caching and the error states, render raw numbers.
3. `metrics.js` plus the cards.
4. User mode.
5. Home chips, Surprise me, anchors.
6. Share card and copy link.
7. README with screenshot, enable GitHub Pages (main branch, root), test with 5 repos and 2 users of very different
   sizes (tiny, Flutter, Linux).

Estimate: 3 to 4 days at 1 to 2 hours a day.

## Checks before ship

- Rate limit message works (clear the cache, spam reload).
- Repo with a single language, a repo with zero code languages, a renamed repo, a 404.
- Mobile width.
- Every number on screen has its assumption visible.
- Confirm current GitHub REST rate-limit and terms pages still allow unauthenticated browser use.

## Open questions

- Anchors: source and verify each famous-project number in step 5, drop any that cannot be confirmed.
- Domain: default `sharmadhiraj.github.io/code-in-perspective` is fine for v1.
- Repo name: `code-in-perspective`.
