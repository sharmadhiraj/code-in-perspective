import { ASSUMPTIONS, codeLanguages, sumLanguages, totalBytes, compute } from "./metrics.js";
import { CURATED, VERSUS } from "./anchors.js";
import { drawCard, drawVersusCard, downloadCard } from "./card.js";
import { fmt, fmtSmall, fmtLength, fmtWeight, fmtDays } from "./format.js";

const API = "https://api.github.com";
const CACHE_MS = 6 * 3600000;
const TOKEN_KEY = "github-token";
const USER_REPO_LIMIT = 10;

const form = document.getElementById("form");
const input = document.getElementById("input");
const message = document.getElementById("message");
const view = document.getElementById("view");

document.documentElement.dataset.bsTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

class AppError extends Error {}

export function parseInput(text) {
  const cleaned = text.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/^github\.com\//, "")
    .replace(/\.git$/, "").replace(/\/+$/, "");
  const parts = cleaned.split("/");
  const valid = /^[\w.-]+$/;
  if (parts.length > 2 || !parts.every((p) => valid.test(p))) return null;
  return parts.join("/");
}

function parseTargets(text, separator) {
  const parts = text.split(separator);
  const targets = parts.map(parseInput);
  return parts.length > 2 || targets.some((t) => !t) ? null : targets;
}

function readStorage(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

async function github(path) {
  const url = API + path;
  let cached = null;
  try { cached = JSON.parse(readStorage(url)); } catch {}
  if (cached && Date.now() - cached.time < CACHE_MS) return cached;

  const token = readStorage(TOKEN_KEY);
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  if (res.status === 404) throw new AppError("Not found. Is it a public GitHub repo or user?");
  if (res.status === 403 || res.status === 429) {
    if (cached) return cached;
    const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
    const minutes = Math.max(1, Math.ceil((reset - Date.now()) / 60000)) || 1;
    throw new AppError(`GitHub rate limit reached, try again in ${minutes} minutes, or add a GitHub token below.`);
  }
  if (!res.ok) throw new AppError(`GitHub returned an error (${res.status}).`);

  const entry = { time: Date.now(), data: await res.json(), link: res.headers.get("link") };
  try { localStorage.setItem(url, JSON.stringify(entry)); } catch {}
  return entry;
}

function lastPage(link) {
  const match = link && link.match(/[?&]page=(\d+)>; rel="last"/);
  return match ? Number(match[1]) : 1;
}

async function loadRepo(path) {
  const [repo, languages, commits] = await Promise.all([
    github(`/repos/${path}`),
    github(`/repos/${path}/languages`),
    github(`/repos/${path}/commits?per_page=1`),
  ]);
  return makeResult(repo.data.full_name, repo.data.description, codeLanguages(languages.data), {
    commits: lastPage(commits.link),
    createdAt: repo.data.created_at,
  });
}

async function loadUser(user) {
  const { data } = await github(`/users/${user}/repos?per_page=100&sort=pushed`);
  const own = data.filter((r) => !r.fork).sort((a, b) => b.size - a.size);
  const top = own.slice(0, USER_REPO_LIMIT);
  const all = await Promise.all(top.map((r) => github(`/repos/${r.full_name}/languages`)));
  const note = `Based on the ${top.length} largest of ${own.length} own repos (forks excluded).`;
  return makeResult(user, note, codeLanguages(sumLanguages(all.map((l) => l.data))), {});
}

function makeResult(title, note, languages, inputs) {
  return { title, note, languages, m: compute({ bytes: totalBytes(languages), ...inputs }) };
}

const load = (target) => (target.includes("/") ? loadRepo(target) : loadUser(target));

function buildCards(m) {
  const a = ASSUMPTIONS;
  const cards = [
    { value: fmt(m.lines), label: "lines of code", assumption: `~${a.bytesPerLine} bytes per line` },
    { value: fmt(m.pages), label: "book pages", assumption: `~${a.linesPerPage} lines per page` },
    { value: fmtSmall(m.novels), label: "novels", assumption: `~${a.pagesPerNovel} pages per novel` },
    { value: fmtLength(m.paperMeters), label: "stack of paper", assumption: `${a.metersPerPage * 1000} mm per printed page` },
    { value: fmtWeight(m.printoutKg), label: "printout weight", assumption: `${a.gramsPerPage} g per page` },
    { value: fmt(m.floppies), label: "floppy disks", assumption: "1.44 MB per disk" },
    { value: fmtLength(m.floppyMeters), label: "floppy tower", assumption: `${a.metersPerFloppy * 1000} mm per disk` },
    { value: fmtDays(m.readAloudDays), label: "to read aloud, nonstop", assumption: `${a.readLinesPerSecond} line per second` },
    {
      value: fmtDays(m.typedNonstopDays),
      label: "to type, nonstop",
      assumption: `${a.typingWordsPerMinute} words per minute, ${a.charsPerWord} chars per word`,
    },
    { value: fmtDays(m.typingDays), label: "of work to write", assumption: `${a.linesPerDay} lines per working day` },
  ];
  if (m.age) {
    cards.push({
      value: fmtSmall(m.commitsPerDay),
      label: "commits per day",
      assumption: `${fmt(m.commits)} commits over ${m.age.years}y ${m.age.months}m since creation`,
    });
  }
  return cards;
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function actionButtons() {
  return `<button class="btn btn-primary me-2" data-act="download">Download card</button>
    <button class="btn btn-outline-secondary" data-act="copy">Copy link</button>`;
}

function wireActions(root, canvas, filename) {
  root.querySelector("[data-act=download]").onclick = () => downloadCard(canvas, filename);
  const copy = root.querySelector("[data-act=copy]");
  copy.onclick = async () => {
    await navigator.clipboard.writeText(location.href);
    copy.textContent = "Copied";
  };
}

const CANVAS_HTML = `<canvas class="border rounded mb-3 d-block" style="max-width:100%; height:auto"></canvas>`;

function renderSingle(result) {
  const { title, note, languages, m } = result;
  const cards = buildCards(m);

  const root = el(`<div>
    <h2 class="h4">${escapeHtml(title)}</h2>
    <p class="text-secondary">${escapeHtml(note)}</p>
    ${CANVAS_HTML}
    ${actionButtons()}
    <div class="row g-3 my-3">${cards.map((c) => `
      <div class="col-6 col-md-4"><div class="card h-100"><div class="card-body">
        <div class="h2 fw-bold">${c.value}</div>
        <div>${c.label}</div>
        <div class="small text-secondary">${escapeHtml(c.assumption)}</div>
      </div></div></div>`).join("")}</div>
  </div>`);

  view.replaceChildren(root);
  const canvas = root.querySelector("canvas");
  drawCard(canvas, { title, m, languages });
  wireActions(root, canvas, `${title.replace("/", "-")}.png`);
}

const VERSUS_ROWS = [
  ["Lines of code", (m) => fmt(m.lines)],
  ["Novels", (m) => fmtSmall(m.novels)],
  ["Stack of paper", (m) => fmtLength(m.paperMeters)],
  ["Floppy tower", (m) => fmtLength(m.floppyMeters)],
  ["Printout weight", (m) => fmtWeight(m.printoutKg)],
  ["Read aloud, nonstop", (m) => fmtDays(m.readAloudDays)],
  ["Typed, nonstop", (m) => fmtDays(m.typedNonstopDays)],
];

function renderVersus(a, b) {
  const root = el(`<div>
    <h2 class="h4">${escapeHtml(a.title)} vs ${escapeHtml(b.title)}</h2>
    ${CANVAS_HTML}
    ${actionButtons()}
    <table class="table my-3">
      <thead><tr><th></th><th>${escapeHtml(a.title)}</th><th>${escapeHtml(b.title)}</th></tr></thead>
      <tbody>${VERSUS_ROWS.map(([label, format]) => `<tr><td>${label}</td><td>${format(a.m)}</td><td>${format(b.m)}</td></tr>`).join("")}</tbody>
    </table>
  </div>`);

  view.replaceChildren(root);
  const canvas = root.querySelector("canvas");
  drawVersusCard(canvas, a, b);
  wireActions(root, canvas, `${a.title.replace("/", "-")}-vs-${b.title.replace("/", "-")}.png`);
}

function renderHome() {
  const chip = (href, label) => `<a class="btn btn-sm btn-outline-secondary" href="#/${href}">${label}</a>`;
  view.replaceChildren(el(`<div>
    <p class="text-secondary mb-2">Try one:</p>
    <div class="d-flex flex-wrap gap-2 mb-3">${CURATED.map((c) => chip(c, c)).join(" ")}</div>
    <p class="text-secondary mb-2">Or compare two:</p>
    <div class="d-flex flex-wrap gap-2 mb-3">${VERSUS.map((v) => chip(v.join("~"), v.join(" vs "))).join(" ")}</div>
    <button class="btn btn-outline-primary" id="surprise">Surprise me</button>
  </div>`));
  document.getElementById("surprise").onclick = () => {
    location.hash = "#/" + CURATED[Math.floor(Math.random() * CURATED.length)];
  };
}

function showMessage(text) {
  message.textContent = text;
  view.replaceChildren();
}

function emptyMessage(result) {
  return result.m.lines < 1 ? `No code languages found for ${result.title}.` : null;
}

let routeId = 0;

async function route() {
  const id = ++routeId;
  message.textContent = "";
  const path = location.hash.replace(/^#\/?/, "");
  input.value = path.split("~").join(" vs ");
  if (!path) return renderHome();

  const targets = parseTargets(path, "~");
  if (!targets) return showMessage("Not a GitHub repo or user.");

  view.replaceChildren(el(`<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading</span></div></div>`));
  try {
    const results = await Promise.all(targets.map(load));
    if (id !== routeId) return;
    const empty = results.map(emptyMessage).find(Boolean);
    if (empty) return showMessage(empty);
    if (results.length === 2) renderVersus(...results);
    else renderSingle(results[0]);
  } catch (e) {
    if (id !== routeId) return;
    showMessage(e instanceof AppError ? e.message : "Something went wrong. Check your connection.");
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const targets = parseTargets(input.value, /\s+vs\s+|\s*~\s*/i);
  if (!targets) {
    message.textContent = "Not a GitHub repo or user.";
    return;
  }
  const hash = "#/" + targets.join("~");
  if (location.hash === hash) route();
  else location.hash = hash;
});

document.getElementById("assumptions").innerHTML = [
  `~${ASSUMPTIONS.bytesPerLine} bytes per line of code`,
  `~${ASSUMPTIONS.linesPerPage} lines per printed page, ${ASSUMPTIONS.metersPerPage * 1000} mm and ${ASSUMPTIONS.gramsPerPage} g per page`,
  `~${ASSUMPTIONS.pagesPerNovel} pages per novel`,
  `1.44 MB per floppy disk, ${ASSUMPTIONS.metersPerFloppy * 1000} mm thick`,
  `${ASSUMPTIONS.linesPerDay} lines per working day`,
  `Reading aloud at ${ASSUMPTIONS.readLinesPerSecond} line per second, typing at ${ASSUMPTIONS.typingWordsPerMinute} words per minute`,
  "Height references: person 1.7 m, door 2 m, house 8 m, Eiffel Tower 330 m, Burj Khalifa 828 m, Everest 8,849 m",
  "Markdown, JSON, YAML, text, SVG, notebooks, CSV, XML and reStructuredText are not counted",
].map((t) => `<li>${t}</li>`).join("");

const tokenInput = document.getElementById("token");
tokenInput.value = readStorage(TOKEN_KEY) ?? "";
tokenInput.addEventListener("change", () => {
  try {
    if (tokenInput.value.trim()) localStorage.setItem(TOKEN_KEY, tokenInput.value.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
});

addEventListener("hashchange", route);
route();
