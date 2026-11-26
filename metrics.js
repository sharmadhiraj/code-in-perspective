export const ASSUMPTIONS = {
  bytesPerLine: 40,
  linesPerPage: 50,
  pagesPerNovel: 300,
  bytesPerFloppy: 1474560,
  linesPerDay: 200,
  metersPerPage: 0.0001,
  metersPerFloppy: 0.0033,
  gramsPerPage: 5,
  readLinesPerSecond: 1,
  typingWordsPerMinute: 40,
  charsPerWord: 5,
};

export const SKIP_LANGUAGES = new Set([
  "Markdown", "JSON", "YAML", "Text", "SVG", "Jupyter Notebook", "CSV", "XML", "reStructuredText",
]);

const DAY_MS = 86400000;
const DAY_SECONDS = 86400;

export function codeLanguages(languages) {
  return Object.fromEntries(Object.entries(languages).filter(([name]) => !SKIP_LANGUAGES.has(name)));
}

export function sumLanguages(list) {
  const total = {};
  for (const languages of list) {
    for (const [name, bytes] of Object.entries(languages)) total[name] = (total[name] ?? 0) + bytes;
  }
  return total;
}

export function totalBytes(languages) {
  return Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
}

export function ageParts(createdAt, now = Date.now()) {
  const months = Math.floor((now - new Date(createdAt)) / DAY_MS / 30.44);
  return { years: Math.floor(months / 12), months: months % 12 };
}

export function compute({ bytes, commits, createdAt }) {
  const a = ASSUMPTIONS;
  const lines = bytes / a.bytesPerLine;
  const pages = lines / a.linesPerPage;
  const result = {
    bytes,
    lines,
    pages,
    novels: pages / a.pagesPerNovel,
    floppies: bytes / a.bytesPerFloppy,
    typingDays: lines / a.linesPerDay,
    paperMeters: pages * a.metersPerPage,
    floppyMeters: (bytes / a.bytesPerFloppy) * a.metersPerFloppy,
    printoutKg: (pages * a.gramsPerPage) / 1000,
    readAloudDays: lines / a.readLinesPerSecond / DAY_SECONDS,
    typedNonstopDays: bytes / (a.typingWordsPerMinute * a.charsPerWord) / 60 / 24,
  };
  if (createdAt) {
    const ageDays = Math.max(1, (Date.now() - new Date(createdAt)) / DAY_MS);
    result.commits = commits;
    result.commitsPerDay = commits / ageDays;
    result.age = ageParts(createdAt);
  }
  return result;
}
