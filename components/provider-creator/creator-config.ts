import type { SelectorField } from "@/model/provider-runtime.model";

export const steps = [
  "Website",
  "Example pages",
  "Series title",
  "Episodes",
  "Total episodes",
  "Playback tracking",
  "Review",
];
export const fields: Partial<Record<number, SelectorField>> = {
  2: "seriesNameSelector",
  3: "episodeNumberSelector",
  4: "totalEpisodesSelector",
};
export const instructions = [
  "Give this website a name and paste its homepage address.",
  "Open a series page and choose “Use this page”. Repeat with a different series.",
  "Choose Select title, then tap the series title on the website.",
  "Choose Select episodes, then tap an episode number. We will find the other episodes in its list.",
  "Choose Select total, then tap the announced total, such as “12 episodes”, or an unknown marker such as “??” or “TBA”. It can differ from the episodes listed on this page.",
  "Open an episode and press Play. We’ll detect playback, including embedded players. If several players appear, choose the episode’s player below.",
  "We’ll check both example pages automatically. Review the results before saving.",
];
