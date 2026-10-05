import React from "react";
import { Platform, ScrollView, StyleSheet, Text } from "react-native";
import ActionButton from "@/components/provider-creator/action-button";
import ProviderSurface from "@/components/provider-creator/provider-surface";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import type { Provider } from "@/model";

type ProviderChooserProps = {
  providers: Provider[];
  missingProvider: boolean;
  onOpen: (provider: Provider) => void;
  onAdd: () => void;
};

export default function ProviderChooser({
  providers,
  missingProvider,
  onOpen,
  onAdd,
}: ProviderChooserProps) {
  const colors = useProviderPalette();
  return (
    <ScrollView contentContainerStyle={styles.chooser}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        Your websites
      </Text>
      <Text style={{ color: colors.text }}>
        Choose a provider or teach the app how your website works.
      </Text>
      {missingProvider && (
        <Text style={{ color: colors.text }}>
          The website for this saved episode is not configured. Add it or choose
          another provider.
        </Text>
      )}
      {providers.map((item) => (
        <ProviderSurface key={item.id} style={[styles.item, styles.iosItem]}>
          <ActionButton
            label={"Open " + item.name}
            onPress={() => onOpen(item)}
          />
          <Text style={{ color: colors.text }}>{item.origin}</Text>
          <Text style={{ color: colors.text }}>
            {item.verification?.progress
              ? "Playback tracking ready"
              : "Playback tracking not verified"}
          </Text>
        </ProviderSurface>
      ))}
      <ActionButton label="Add provider" onPress={onAdd} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chooser: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "700" },
  item: { gap: 8, paddingVertical: 8 },
  iosItem: Platform.OS === "ios" ? { padding: 16, borderRadius: 24 } : {},
});
