import React from "react";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
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
