export const fmt = (n) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const fmtSmall = (n) => (n >= 10 ? fmt(Math.round(n)) : n >= 1 ? n.toFixed(1) : n.toFixed(2));

export function fmtLength(meters) {
  if (meters < 0.01) return `${(meters * 1000).toFixed(1)} mm`;
  if (meters < 1) return `${Math.round(meters * 100)} cm`;
  if (meters < 1000) return `${fmtSmall(meters)} m`;
  return `${fmtSmall(meters / 1000)} km`;
}

export function fmtWeight(kg) {
  if (kg < 1) return `${Math.round(kg * 1000)} g`;
  if (kg < 1000) return `${fmtSmall(kg)} kg`;
  return `${fmtSmall(kg / 1000)} t`;
}

export function fmtDays(days) {
  if (days < 1) return `${fmtSmall(days * 24)} hours`;
  if (days < 60) return `${fmtSmall(days)} days`;
  if (days < 730) return `${fmtSmall(days / 30.44)} months`;
  return `${fmtSmall(days / 365.25)} years`;
}
