import { useAppTranslation } from "@/hooks/use-app-translation";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ActionButton from "@/components/provider-creator/action-button";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import type { AppState, Provider } from "@/model";

type BrowserSheetProps = {
  sheet: AppState["browserSheet"];
  provider?: Provider;
  url?: string;
  loading: boolean;
  status: string;
  error: string;
  notice: string;
  onClose: () => void;
  onChooseWebsite: () => void;
  children: React.ReactNode;
};

export default function BrowserSheet({
  sheet,
  provider,
  url,
  loading,
  status,
  error,
  notice,
  onClose,
  onChooseWebsite,
  children,
}: BrowserSheetProps) {
  const t = useAppTranslation();
  const colors = useProviderPalette();
  return (
    <Modal
      visible={!!sheet}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.bg }]}>
        <View style={styles.sheetClose}>
          <ActionButton
            label={
              sheet === "providers"
                ? t("home.closeWebsites")
                : t("home.closeDetails")
            }
            onPress={onClose}
          />
        </View>
        {sheet === "providers" ? (
          children
        ) : (
          <ScrollView contentContainerStyle={styles.details}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.text }]}
            >
              {provider?.name ?? t("navigation.playbackDetails")}
            </Text>
            <Text selectable style={{ color: colors.muted }}>
              {url}
            </Text>
            {loading && (
              <ActivityIndicator accessibilityLabel={t("browser.loading")} />
            )}
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.text }}
            >
              {status}
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={{ color: colors.error }}>
                {error}
              </Text>
            )}
            {!!notice && <Text style={{ color: colors.text }}>{notice}</Text>}
            <ActionButton
              label={t("home.chooseWebsite")}
              onPress={onChooseWebsite}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheetClose: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: Platform.OS === "ios" ? "flex-end" : "stretch",
  },
  details: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "700" },
});
