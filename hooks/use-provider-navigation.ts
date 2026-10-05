import { type AppMessage, translate as t } from "@/utils/i18n";
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
  onError: (message: AppMessage) => void;
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
            t("navigation.approveTitle"),
            t("navigation.approveMessage", {
              name: provider.name ?? t("navigation.providerFallback"),
              origin,
            }),
            [
              {
                text: t("common.cancel"),
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: t("navigation.approveAction"),
                onPress: () => resolve(true),
              },
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
