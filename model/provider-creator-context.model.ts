import { Dispatch } from "react";
import { Provider } from "./provider.model";
import { ProviderCreatorStep } from "./provider-creator-step.model";
import WebView from "react-native-webview";
import { EventEmitter } from "@/utils";

export type ProviderCreatorEvents = {
  targetChange: {
    type: "targetChange";
    targetClass?: string;
    targetContent?: string;
    targetTree: string;
  };
  targetSelectorResultCount: {
    type: "targetSelectorResultCount";
    count: number;
  };
};

export const ProviderCreatorMessages = {
  testTargetSelector: (selector: string) =>
    JSON.stringify({
      type: "testTargetSelector",
      selector,
    }),
  untarget: () =>
    JSON.stringify({
      type: "untarget",
    }),
  targetParent: () =>
    JSON.stringify({
      type: "targetParent",
    }),
} satisfies Record<string, (...arg: any[]) => string>;

export type ProviderCreatorContextType = {
  providerDraft: Provider<false>;
  updateProviderDraft: Dispatch<React.SetStateAction<Provider<false>>>;
  saveProvider: () => void;
  cancelProviderCreation: () => void;
  updateStep: Dispatch<React.SetStateAction<ProviderCreatorStep>>;
  step: ProviderCreatorStep;
  webView: React.RefObject<WebView | null>;
  currentUri: string | null;
  webViewEvents: React.RefObject<EventEmitter<ProviderCreatorEvents>>;
};
