import React from "react";

import { WEBSITE_URI } from "@/constants/website";
import { AppStateContext } from "@/utils/app-state.util";
import { usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  const pathName = usePathname();
  const { updateState } = React.useContext(AppStateContext);

  return (
    <NativeTabs blurEffect="dark">
      <NativeTabs.Trigger
        name="index"
        listeners={{
          tabPress: (e) => {
            if (pathName !== "/") return;
            updateState({
              url: WEBSITE_URI,
            });
          },
        }}
      >
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill"></NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="watch-list">
        <NativeTabs.Trigger.Label>Watch List</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="table.fill"></NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear.circle.fill"></NativeTabs.Trigger.Icon>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
