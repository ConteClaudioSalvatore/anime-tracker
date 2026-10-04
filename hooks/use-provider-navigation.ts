import React from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import type { Provider } from "../model/provider.model";
import { ProviderNavigationGuard } from "../utils/provider-navigation";

export function useProviderNavigation(options: {
  provider?: Provider<false>;
  pageKey: () => string;
  approve: (provider: Provider<false>, origin: string) => Promise<void>;
  navigate: (url: string) => void;
  onError: (message: string) => void;
}) {
  const latest = React.useRef(options);
  const guard = React.useRef<ProviderNavigationGuard | null>(null);
  const active = React.useRef(true);
  useFocusEffect(
    React.useCallback(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, []),
  );
  React.useLayoutEffect(() => {
    latest.current = options;
    if (guard.current) return;
    guard.current = new ProviderNavigationGuard({
      current: () =>
        active.current && latest.current.provider
          ? {
              provider: latest.current.provider,
              pageKey: latest.current.pageKey(),
            }
          : null,
      confirm: (provider, origin) =>
        new Promise((resolve) => {
          Alert.alert(
            "Allow another website?",
            `${provider.name ?? "This provider"} wants to open:\n${origin}\n\nAdd this address to its approved websites and continue?`,
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              { text: "Add and continue", onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
          );
        }),
      approve: (provider, origin) => latest.current.approve(provider, origin),
      navigate: (url) => latest.current.navigate(url),
      onError: (message) => latest.current.onError(message),
    });
  }, [options]);
  return React.useCallback(
    (request: {
      url: string;
      isTopFrame?: boolean;
      hasTargetFrame?: boolean;
    }) => guard.current?.handle(request) ?? false,
    [],
  );
}
