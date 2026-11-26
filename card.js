import { fmt, fmtSmall, fmtLength, fmtDays } from "./format.js";
import { BG, pickReference, languageSegments, drawLanguageBar, drawStack, drawReference, drawGround } from "./visuals.js";

const W = 1200;
const H = 630;
const STACK_WIDTH = 44;
const CAPTION_HEIGHT = 70;

function text(ctx, value, x, y, { size, color = "#ffffff", bold = false, maxWidth = W - 120 }) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? "bold " : ""}${size}px system-ui, sans-serif`;
  ctx.fillText(value, x, y, maxWidth);
}

function setup(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = "alphabetic";
  text(ctx, "Code in Perspective", 60, 70, { size: 28, color: "#8b949e" });
  return ctx;
}

function drawFooter(ctx) {
  text(ctx, location.host + location.pathname, 60, 608, { size: 22, color: "#8b949e" });
}

function heightRatio(meters, ref) {
  return `about ${fmtSmall(meters / ref.meters)}x the height of ${ref.name}`;
}

function drawPanel(ctx, { x, y, w, h, kind, meters, title, sub }) {
  const ref = pickReference(meters);
  const baseY = y + h - CAPTION_HEIGHT;
  const areaH = h - CAPTION_HEIGHT - 10;
  const refWidthMeters = ref.meters * ref.ratio;
  const scale = Math.min(areaH / Math.max(meters, ref.meters), (w - STACK_WIDTH - 40) / refWidthMeters);
  const stackX = x + 10;

  drawGround(ctx, x, baseY, w - 20);
  drawStack(ctx, kind, stackX, baseY, STACK_WIDTH, meters * scale);
  drawReference(ctx, ref, stackX + STACK_WIDTH + 25 + (refWidthMeters * scale) / 2, baseY, ref.meters * scale);
  text(ctx, title, x + 10, baseY + 32, { size: 28, bold: true, maxWidth: w - 20 });
  text(ctx, sub, x + 10, baseY + 58, { size: 20, color: "#8b949e", maxWidth: w - 20 });
}

function drawStat(ctx, x, y, value, label) {
  text(ctx, value, x, y, { size: 44, bold: true, color: "#58a6ff", maxWidth: 280 });
  text(ctx, label, x, y + 26, { size: 20, color: "#c9d1d9", maxWidth: 280 });
}

export function drawCard(canvas, { title, m, languages }) {
  const ctx = setup(canvas);
  text(ctx, title, 60, 130, { size: 56, bold: true });

  drawPanel(ctx, {
    x: 60, y: 150, w: 400, h: 320, kind: "paper", meters: m.paperMeters,
    title: `${fmtLength(m.paperMeters)} of paper`,
    sub: heightRatio(m.paperMeters, pickReference(m.paperMeters)),
  });
  drawPanel(ctx, {
    x: 480, y: 150, w: 340, h: 320, kind: "floppy", meters: m.floppyMeters,
    title: `${fmtLength(m.floppyMeters)} of floppies`,
    sub: heightRatio(m.floppyMeters, pickReference(m.floppyMeters)),
  });

  drawStat(ctx, 860, 200, fmt(m.lines), "lines of code");
  drawStat(ctx, 860, 285, fmtSmall(m.novels), "novels");
  drawStat(ctx, 860, 370, fmtDays(m.readAloudDays), "to read aloud, nonstop");
  drawStat(ctx, 860, 455, fmtDays(m.typedNonstopDays), "to type, nonstop");

  drawLanguageBar(ctx, 60, 500, W - 120, 26, languageSegments(languages));
  drawFooter(ctx);
}

export function drawVersusCard(canvas, a, b) {
  const ctx = setup(canvas);
  const [big, small] = a.m.lines >= b.m.lines ? [a, b] : [b, a];
  const ratio = big.m.lines / small.m.lines;

  text(ctx, `${a.title} vs ${b.title}`, 60, 130, { size: 48, bold: true });
  drawVersusStacks(ctx, a, b);

  text(ctx, ratio < 1.1 ? "~1x" : `${fmtSmall(ratio)}x`, 860, 215, { size: 88, bold: true, color: "#58a6ff", maxWidth: 280 });
  text(ctx, big.title, 860, 255, { size: 28, bold: true, maxWidth: 280 });
  text(ctx, "has more code than", 860, 285, { size: 22, color: "#8b949e", maxWidth: 280 });
  text(ctx, small.title, 860, 315, { size: 28, bold: true, maxWidth: 280 });
  text(ctx, "Lines of code", 860, 375, { size: 20, color: "#8b949e", maxWidth: 280 });
  text(ctx, `${fmt(a.m.lines)} vs ${fmt(b.m.lines)}`, 860, 405, { size: 30, maxWidth: 280 });
  text(ctx, "Read aloud, nonstop", 860, 445, { size: 20, color: "#8b949e", maxWidth: 280 });
  text(ctx, `${fmtDays(a.m.readAloudDays)} vs ${fmtDays(b.m.readAloudDays)}`, 860, 475, { size: 30, maxWidth: 280 });

  const half = (W - 120 - 40) / 2;
  drawLanguageBar(ctx, 60, 500, half, 26, languageSegments(a.languages, 3));
  drawLanguageBar(ctx, 60 + half + 40, 500, half, 26, languageSegments(b.languages, 3));
  drawFooter(ctx);
}

function drawVersusStacks(ctx, a, b) {
  const x = 60;
  const y = 150;
  const w = 760;
  const baseY = y + 320 - CAPTION_HEIGHT;
  const areaH = 320 - CAPTION_HEIGHT - 10;
  const tallest = Math.max(a.m.paperMeters, b.m.paperMeters);
  const ref = pickReference(tallest);
  const refWidthMeters = ref.meters * ref.ratio;
  const scale = Math.min(areaH / Math.max(tallest, ref.meters), (w - 460) / refWidthMeters);

  drawGround(ctx, x, baseY, w);
  [a, b].forEach((side, i) => {
    const stackX = x + 40 + i * 190;
    drawStack(ctx, "paper", stackX, baseY, STACK_WIDTH, side.m.paperMeters * scale);
    text(ctx, side.title, stackX, baseY + 32, { size: 22, bold: true, maxWidth: 170 });
    text(ctx, `${fmtLength(side.m.paperMeters)} of paper`, stackX, baseY + 58, { size: 20, color: "#8b949e", maxWidth: 170 });
  });
  drawReference(ctx, ref, x + 440 + (refWidthMeters * scale) / 2, baseY, ref.meters * scale);
  text(ctx, ref.name, x + 440, baseY + 32, { size: 22, color: "#8b949e", maxWidth: 300 });
}

export function downloadCard(canvas, filename) {
  canvas.toBlob((blob) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }, "image/png");
}
