import { useAppTranslation } from "@/hooks/use-app-translation";
import React from "react";

import TabAccessory from "@/components/tab-accessory";
import { useWatchList, WatchListContext } from "@/hooks/use-watch-list";
import { StoreContext } from "@/utils";
import { providerForUrl } from "@/utils/provider-runtime";
import { AppStateContext } from "@/utils/app-state.util";
import { usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

export default function TabLayout() {
  const t = useAppTranslation();
  const pathName = usePathname();

  const { state, updateState } = React.useContext(AppStateContext);
  const { state: store } = React.useContext(StoreContext);
  const provider = state.url
    ? providerForUrl(store.providers, state.url, state.providerId)
    : undefined;

  const isHome = pathName === "/";
  const watchList = useWatchList();

  return (
    <WatchListContext.Provider value={watchList}>
      <NativeTabs blurEffect="dark" minimizeBehavior="onScrollDown">
        {Platform.OS === "ios" && (
          <NativeTabs.BottomAccessory>
            <TabAccessory />
          </NativeTabs.BottomAccessory>
        )}
        <NativeTabs.Trigger
          name="index"
          contentStyle={provider ? { backgroundColor: "#000" } : undefined}
          listeners={{
            tabPress: () => {
              if (!isHome) return;
              updateState({
                url: provider?.origin,
                providerId: provider?.id,
              });
            },
          }}
        >
          <NativeTabs.Trigger.Label>
            {provider?.name ?? t("navigation.websites")}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf="house.fill"
            md="home"
          ></NativeTabs.Trigger.Icon>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="watch-list" role="search">
          <NativeTabs.Trigger.Label>
            {t("navigation.watchList")}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf="eyeglasses"
            md="history"
          ></NativeTabs.Trigger.Icon>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <NativeTabs.Trigger.Label>
            {t("common.settings")}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf="gear.circle.fill"
            md="settings"
          ></NativeTabs.Trigger.Icon>
        </NativeTabs.Trigger>
      </NativeTabs>
    </WatchListContext.Provider>
  );
}
