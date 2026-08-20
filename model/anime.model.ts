import { EpisodeProgress } from "./episode-progress.model";

export type Anime = {
  name: string;
  latestWatchedEpisode: number;
  latestVisitedUrl: string;
  /**
   * The number of the highest episode watched of a series
   */
  highestWatchedEpisode: number;
  episodeProgress?: Record<number, EpisodeProgress>;
  /**
   * Marks the anime as finished (can be set to true if dropped)
   */
  finished?: boolean;
  /**
   * The total number of episodes
   */
  total?: number;
};
