export const BG = "#0d1117";
const GREY = "#6e7681";

const REFERENCES = [
  { name: "a person", meters: 1.7, ratio: 0.3, shape: "person" },
  { name: "a door", meters: 2, ratio: 0.5, shape: "door" },
  { name: "a house", meters: 8, ratio: 1.5, shape: "house" },
  { name: "the Eiffel Tower", meters: 330, ratio: 0.33, shape: "tower" },
  { name: "the Burj Khalifa", meters: 828, ratio: 0.12, shape: "skyscraper" },
  { name: "Mount Everest", meters: 8849, ratio: 1.6, shape: "mountain" },
];

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572a5", Dart: "#00b4ab", C: "#555555",
  "C++": "#f34b7d", Java: "#b07219", Go: "#00add8", Rust: "#dea584", Ruby: "#701516", Kotlin: "#a97bff",
  Swift: "#f05138", Shell: "#89e051", HTML: "#e34c26", CSS: "#563d7c", PHP: "#4f5d95", "C#": "#178600",
  "Objective-C": "#438eff", Assembly: "#6e4c13", Lua: "#000080", Scala: "#c22d40", Vue: "#41b883",
};

export function pickReference(meters) {
  const fits = REFERENCES.filter((r) => r.meters <= meters);
  return fits.length ? fits[fits.length - 1] : REFERENCES[0];
}

export function languageSegments(languages, top = 5) {
  const entries = Object.entries(languages).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const segments = entries.slice(0, top).map(([name, bytes]) => ({ name, share: bytes / total, color: languageColor(name) }));
  const rest = entries.slice(top).reduce((sum, [, bytes]) => sum + bytes, 0);
  if (rest > 0) segments.push({ name: "Other", share: rest / total, color: GREY });
  return segments;
}

function languageColor(name) {
  if (LANGUAGE_COLORS[name]) return LANGUAGE_COLORS[name];
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return `hsl(${hash % 360} 50% 55%)`;
}

export function drawLanguageBar(ctx, x, y, w, h, segments) {
  let cursor = x;
  segments.forEach((s) => {
    ctx.fillStyle = s.color;
    ctx.fillRect(cursor, y, Math.max(1, s.share * w), h);
    cursor += s.share * w;
  });
  ctx.font = "20px system-ui, sans-serif";
  let legendX = x;
  const legendY = y + h + 30;
  for (const s of segments) {
    const percent = s.share < 0.005 ? "<1" : Math.round(s.share * 100);
    const label = `${s.name} ${percent}%`;
    const width = ctx.measureText(label).width + 40;
    if (legendX + width > x + w) break;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(legendX + 7, legendY - 7, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9d1d9";
    ctx.fillText(label, legendX + 20, legendY);
    legendX += width;
  }
}

export function drawStack(ctx, kind, x, baseY, w, heightPx) {
  const height = Math.max(3, heightPx);
  const paper = kind === "paper";
  ctx.fillStyle = paper ? "#e6edf3" : "#388bfd";
  ctx.fillRect(x, baseY - height, w, height);
  if (height < 20) return;
  ctx.strokeStyle = paper ? "#b1bac4" : "#0d419d";
  ctx.lineWidth = 1;
  const step = paper ? 4 : 6;
  for (let yy = baseY - height + step; yy < baseY; yy += step) {
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }
}

export function drawReference(ctx, ref, cx, baseY, u) {
  ctx.fillStyle = GREY;
  const shapes = {
    person() {
      ctx.beginPath();
      ctx.arc(cx, baseY - u * 0.92, u * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - u * 0.11, baseY - u * 0.84, u * 0.22, u * 0.42);
      ctx.fillRect(cx - u * 0.09, baseY - u * 0.42, u * 0.07, u * 0.42);
      ctx.fillRect(cx + u * 0.02, baseY - u * 0.42, u * 0.07, u * 0.42);
    },
    door() {
      ctx.fillRect(cx - u * 0.25, baseY - u, u * 0.5, u);
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.arc(cx + u * 0.15, baseY - u * 0.5, u * 0.03, 0, Math.PI * 2);
      ctx.fill();
    },
    house() {
      ctx.fillRect(cx - u * 0.65, baseY - u * 0.6, u * 1.3, u * 0.6);
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.75, baseY - u * 0.6);
      ctx.lineTo(cx, baseY - u);
      ctx.lineTo(cx + u * 0.75, baseY - u * 0.6);
      ctx.fill();
      ctx.fillStyle = BG;
      ctx.fillRect(cx - u * 0.1, baseY - u * 0.35, u * 0.2, u * 0.35);
    },
    tower() {
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.165, baseY);
      ctx.lineTo(cx, baseY - u);
      ctx.lineTo(cx + u * 0.165, baseY);
      ctx.fill();
      ctx.fillStyle = BG;
      ctx.beginPath();
      ctx.arc(cx, baseY, u * 0.07, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - u * 0.1, baseY - u * 0.4, u * 0.2, Math.max(1, u * 0.01));
    },
    skyscraper() {
      [[0.12, 0, 0.4], [0.09, 0.4, 0.7], [0.06, 0.7, 0.9], [0.02, 0.9, 1]].forEach(([w, from, to]) => {
        ctx.fillRect(cx - (w * u) / 2, baseY - to * u, w * u, (to - from) * u);
      });
    },
    mountain() {
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.8, baseY);
      ctx.lineTo(cx, baseY - u);
      ctx.lineTo(cx + u * 0.8, baseY);
      ctx.fill();
      ctx.fillStyle = "#e6edf3";
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.2, baseY - u * 0.75);
      ctx.lineTo(cx, baseY - u);
      ctx.lineTo(cx + u * 0.2, baseY - u * 0.75);
      ctx.fill();
    },
  };
  shapes[ref.shape]();
}

export function drawGround(ctx, x, baseY, w) {
  ctx.strokeStyle = "#30363d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w, baseY);
  ctx.stroke();
}
