import type { SelectorField } from "@/model/provider-runtime.model";

export const steps = [
  "steps.website",
  "steps.examples",
  "steps.title",
  "steps.episodes",
  "steps.total",
  "steps.playback",
  "steps.review",
] as const;
export const fields: Partial<Record<number, SelectorField>> = {
  2: "seriesNameSelector",
  3: "episodeNumberSelector",
  4: "totalEpisodesSelector",
};
export const instructions = [
  "instructions.website",
  "instructions.examples",
  "instructions.title",
  "instructions.episodes",
  "instructions.total",
  "instructions.playback",
  "instructions.review",
] as const;

export const editSteps = [
  "creator.editWebsite",
  "creator.editExamples",
  "creator.editTitle",
  "creator.editEpisodes",
  "creator.editTotal",
  "creator.editPlayback",
] as const;
