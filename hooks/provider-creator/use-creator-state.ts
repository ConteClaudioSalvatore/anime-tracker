import React from "react";
import {
  createProviderCreatorState,
  providerCreatorReducer,
  type ProviderCreatorAction,
} from "@/utils/provider-creator-state";

type Patch<
  Group extends "setup" | "wizard" | "browser" | "selection" | "playback",
> = Extract<ProviderCreatorAction, { type: Group }>["patch"];
export function useCreatorState() {
  const [state, dispatch] = React.useReducer(
    providerCreatorReducer,
    undefined,
    createProviderCreatorState,
  );
  const actions = React.useMemo(
    () => ({
      updateSetup: (patch: Patch<"setup">) =>
        dispatch({ type: "setup", patch }),
      updateWizard: (patch: Patch<"wizard">) =>
        dispatch({ type: "wizard", patch }),
      updateBrowser: (patch: Patch<"browser">) =>
        dispatch({ type: "browser", patch }),
      updateSelection: (patch: Patch<"selection">) =>
        dispatch({ type: "selection", patch }),
      updatePlayback: (patch: Patch<"playback">) =>
        dispatch({ type: "playback", patch }),
      setReviewPage: (page: string | null) =>
        dispatch({ type: "reviewPage", page }),
      dispatch,
    }),
    [],
  );
  return { state, actions };
}
export type CreatorState = ReturnType<typeof useCreatorState>;
