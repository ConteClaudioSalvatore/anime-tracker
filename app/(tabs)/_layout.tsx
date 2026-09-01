import React from "react";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf="house.fill"></Icon>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="watch-list">
        <Label>Watch List</Label>
        <Icon sf="table.fill"></Icon>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Label>Settings</Label>
        <Icon sf="gear.circle.fill"></Icon>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
