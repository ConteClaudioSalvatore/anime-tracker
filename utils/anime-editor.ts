/** Keep empty numeric input editable without interpreting it as episode zero. */
export function parseAnimeEpisode(value: string): number | undefined {
  if (!/^\d+$/.test(value.trim())) return undefined;
  const episode = Number(value);
  return Number.isSafeInteger(episode) && episode >= 0 ? episode : undefined;
}

/** Null explicitly clears a known total; undefined represents invalid input. */
export function parseAnimeTotal(value: string): number | null | undefined {
  if (value.trim() === "?") return null;
  const total = parseAnimeEpisode(value);
  return total !== undefined && total > 0 ? total : undefined;
}
