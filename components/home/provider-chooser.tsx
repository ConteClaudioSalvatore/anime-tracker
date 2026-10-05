import { useAppTranslation } from "@/hooks/use-app-translation";
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
  const t = useAppTranslation();
  const colors = useProviderPalette();
  return (
    <ScrollView contentContainerStyle={styles.chooser}>
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: colors.text }]}
      >
        {t("home.websites")}
      </Text>
      <Text style={{ color: colors.text }}>{t("home.chooseProvider")}</Text>
      {missingProvider && (
        <Text style={{ color: colors.text }}>{t("home.missingProvider")}</Text>
      )}
      {providers.map((item) => (
        <ProviderSurface key={item.id} style={[styles.item, styles.iosItem]}>
          <ActionButton
            label={t("provider.openNamed", { name: item.name })}
            onPress={() => onOpen(item)}
          />
          <Text style={{ color: colors.text }}>{item.origin}</Text>
          <Text style={{ color: colors.text }}>
            {item.verification?.progress
              ? t("provider.trackingReady")
              : t("provider.trackingUnverified")}
          </Text>
        </ProviderSurface>
      ))}
      <ActionButton label={t("provider.add")} onPress={onAdd} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chooser: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "700" },
  item: { gap: 8, paddingVertical: 8 },
  iosItem: Platform.OS === "ios" ? { padding: 16, borderRadius: 24 } : {},
});
