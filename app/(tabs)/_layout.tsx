import React from "react";

import NavigationAccessory from '@/components/navigation-accessory';
import { StoreContext } from '@/utils';
import { providerForUrl } from '@/utils/provider-runtime';
import { AppStateContext } from "@/utils/app-state.util";
import { usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from 'react-native';

export default function TabLayout() {
  const pathName = usePathname();

  const { state, updateState } = React.useContext(AppStateContext);
  const { state: store } = React.useContext(StoreContext);
  const provider = state.url ? providerForUrl(store.providers, state.url, state.providerId) : undefined;

  const isHome = pathName === "/";

  return (
    <NativeTabs
      blurEffect="dark"
      minimizeBehavior={isHome ? "onScrollDown" : "never"}
    >
      {Platform.OS === 'ios' && isHome && provider && (
        <NativeTabs.BottomAccessory>
          <NavigationAccessory />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger
        name="index"
        contentStyle={provider ? { backgroundColor: '#000' } : undefined}
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
          {provider?.name ?? "Websites"}
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home"></NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="watch-list" role="search">
        <NativeTabs.Trigger.Label>Watch List</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="eyeglasses" md="history"></NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear.circle.fill" md="settings"></NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
