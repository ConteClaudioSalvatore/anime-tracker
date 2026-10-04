import { EpisodeProgress } from "./episode-progress.model";

export type Anime = {
  name: string;
  latestWatchedEpisode: number;
  latestVisitedUrl: string;
  providerId?: number;
  /** Last observed playback time, in Unix milliseconds. Absent in older history. */
  lastPlayedAt?: number;
  /** Automatic completion from advancing playback. Absent in legacy history. */
  playbackFinished?: boolean;
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
