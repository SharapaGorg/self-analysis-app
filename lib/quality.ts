// Shared quality → color mapping (1..10 → red → amber → green).
// Used by the calendar heat cells and any quality chips.

export function qualityColor(q: number | null): string {
  if (q === null) return "#1e293b"; // slate-800 (no data)
  // Hue from 0 (red) at q=1 to 130 (green) at q=10.
  const hue = ((q - 1) / 9) * 130;
  return `hsl(${hue}, 65%, 45%)`;
}

export function qualityTextColor(q: number | null): string {
  if (q === null) return "#64748b"; // slate-500
  return "#f8fafc"; // slate-50 — readable on the saturated cells
}
