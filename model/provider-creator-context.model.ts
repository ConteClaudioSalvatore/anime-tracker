import { Provider } from "./provider.model";

export type ProviderCreatorContextType = {
  providerDraft: Provider<false>;
  updateProviderDraft: (draft: Provider<false>) => void;
  saveProvider: () => void;
  cancelProviderCreation: () => void;
};
