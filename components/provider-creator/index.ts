import Info from "./info";
import AnimePageLearner from "./anime-page-learner";
import EpisodeNumberLearner from "./episode-number-learner";
import SeriesNameLearner from "./series-name-learner";
import TotalEpisodesLearner from "./total-episodes-learner";
import PlayerLearner from "./player-learner";
import Done from "./done";
import { ProviderCreatorStep } from "../../model";

export const ProviderCreatorRegistry: { [key in ProviderCreatorStep]: React.FC } = {
  [ProviderCreatorStep.Info]: Info,
  [ProviderCreatorStep.AnimePageLearner]: AnimePageLearner,
  [ProviderCreatorStep.SeriesNameLearner]: SeriesNameLearner,
  [ProviderCreatorStep.TotalEpisodesLearner]: TotalEpisodesLearner,
  [ProviderCreatorStep.EpisodeNumberLearner]: EpisodeNumberLearner,
  [ProviderCreatorStep.PlayerLearner]: PlayerLearner,
  [ProviderCreatorStep.Done]: Done,
}
