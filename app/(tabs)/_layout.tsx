import React from "react";

import NavigationAccessory from "@/components/navigation-accessory";
import { WEBSITE_URI } from "@/constants/website";
import { AppStateContext } from "@/utils/app-state.util";
import { usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

export default function TabLayout() {
  const pathName = usePathname();

  const { updateState } = React.useContext(AppStateContext);

  const isHome = pathName === "/";

  return (
    <NativeTabs
      blurEffect="dark"
      minimizeBehavior={isHome ? "onScrollDown" : "never"}
    >
      {Platform.OS === "ios" && isHome && (
        <NativeTabs.BottomAccessory>
          <NavigationAccessory />
        </NativeTabs.BottomAccessory>
      )}
      <NativeTabs.Trigger
        name="index"
        listeners={{
          tabPress: () => {
            if (!isHome) return;
            updateState({
              url: WEBSITE_URI,
            });
          },
        }}
      >
        <NativeTabs.Trigger.Label>
          {isHome ? "Anime World" : "AW"}
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
