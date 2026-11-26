# Code in Perspective

See how big a GitHub project really is: its code as a stack of paper next to a house or the Eiffel Tower, a tower of
floppy disks, a language breakdown, and how long it takes to read or type.

**Live app: https://sharmadhiraj.github.io/code-in-perspective/**

## Try it

1. Open the link above.
2. Enter `owner/repo`, a GitHub URL, or just `owner` for a user.
3. To compare two, write `a vs b` (for example `facebook/react vs vuejs/vue`).
4. Share the link or the card image.

Public repos and users only. Sizes are rough estimates (language bytes / 40 per line), not a measure of effort or
quality.
If you hit the rate limit, add a free GitHub token in the page footer.

## Run locally

No build step, no dependencies. Serve the folder over `http://` (ES modules do not work from `file://`):

```
git clone https://github.com/sharmadhiraj/code-in-perspective.git
cd code-in-perspective
python3 -m http.server
```

Open http://localhost:8000.

Pushes to `main` deploy to GitHub Pages automatically (`.github/workflows/pages.yml`).

### Code map

- `metrics.js`: every constant (bytes per line, lines per page, ...)
- `app.js`: UI and GitHub API calls (cached in `localStorage`)
- `visuals.js`, `card.js`: drawing and the share card
- `format.js`, `anchors.js`: number formatting and example lists
