import { Dispatch } from "react";
import { Provider } from "./provider.model";
import { ProviderCreatorStep } from "./provider-creator-step.model";
import WebView from "react-native-webview";

export type ProviderCreatorContextType = {
  providerDraft: Provider<false>;
  updateProviderDraft: Dispatch<React.SetStateAction<Provider<false>>>;
  saveProvider: () => void;
  cancelProviderCreation: () => void;
  updateStep: Dispatch<React.SetStateAction<ProviderCreatorStep>>;
  webView: React.RefObject<WebView | null>;
  currentUri: string | null;
};
