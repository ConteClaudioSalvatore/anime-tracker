import { useAppTranslation } from "@/hooks/use-app-translation";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import SettingsProviders from "@/components/settings/providers";
import SettingsActionButton from "@/components/settings/action-button";
import { StoreContext } from "@/utils";
import { restoreBackup, saveBackup } from "@/utils/backup.util";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const t = useAppTranslation();
  const colors = useProviderPalette();
  const { stateChanged } = React.useContext(StoreContext);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {t("common.settings")}
        </Text>
        <SettingsProviders />
        <View style={styles.backup}>
          <Text style={[styles.heading, { color: colors.text }]}>
            {t("backup.backup")}
          </Text>
          <View
            style={[styles.backupActions, { backgroundColor: colors.card }]}
          >
            <SettingsActionButton
              label={t("backup.backup")}
              icon="file-upload"
              onPress={saveBackup}
            />
            <SettingsActionButton
              label={t("backup.restore")}
              icon="file-download"
              onPress={() => restoreBackup(stateChanged)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: "700" },
  heading: { fontSize: 18, fontWeight: "600" },
  backup: { gap: 12 },
  backupActions: {
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
