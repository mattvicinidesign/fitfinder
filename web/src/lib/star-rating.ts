/** Half-star aware display (e.g. ⭐⭐⭐⭐½). */
export function formatStarRating(
  /** 0–100 score or 0–10 when scale is "ten". */
  value: number,
  scale: "percent" | "ten" = "percent",
): string {
  const stars =
    scale === "ten"
      ? Math.max(0, Math.min(5, value / 2))
      : Math.max(0, Math.min(5, (value / 100) * 5));
  const rounded = Math.round(stars * 2) / 2;
  const full = Math.floor(rounded);
  const half = rounded - full >= 0.5;
  return "⭐".repeat(full) + (half ? "½" : "");
}
