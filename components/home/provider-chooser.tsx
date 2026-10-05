import { useAppTranslation } from "@/hooks/use-app-translation";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import ActionButton from "@/components/provider-creator/action-button";
import ProviderCard from "./provider-card";
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
      <View style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {t("home.websites")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {t("home.chooseProvider")}
        </Text>
      </View>
      {missingProvider && (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {t("home.missingProvider")}
        </Text>
      )}
      {providers.map((item) => (
        <ProviderCard
          key={item.id}
          provider={item}
          onPress={() => onOpen(item)}
        />
      ))}
      <View style={styles.add}>
        <ActionButton
          label={t("provider.addWebsite")}
          onPress={onAdd}
          primary
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chooser: { padding: 24, gap: 12 },
  heading: { gap: 8, marginBottom: 12 },
  title: { fontSize: 30, fontWeight: "700" },
  subtitle: { fontSize: 16, lineHeight: 23 },
  add: { alignItems: "center", paddingTop: 12 },
});
