import Info from "./info";
import AnimePageLearner from "./anime-page-learner";
import EpisodeNumberLearner from "./episode-number-learner";
import EpisodeNameLearner from "./episode-name-learner";
import TotalEpisodesLearner from "./total-episodes-learner";
import PlayerLearner from "./player-learner";
import Done from "./done";
import { ProviderCreatorStep } from "../../model";

export const ProviderCreatorRegistry: { [key in ProviderCreatorStep]: React.FC } = {
  [ProviderCreatorStep.Info]: Info,
  [ProviderCreatorStep.AnimePageLearner]: AnimePageLearner,
  [ProviderCreatorStep.EpisodeNumberLearner]: EpisodeNumberLearner,
  [ProviderCreatorStep.EpisodeNameLearner]: EpisodeNameLearner,
  [ProviderCreatorStep.TotalEpisodesLearner]: TotalEpisodesLearner,
  [ProviderCreatorStep.PlayerLearner]: PlayerLearner,
  [ProviderCreatorStep.Done]: Done,
}
