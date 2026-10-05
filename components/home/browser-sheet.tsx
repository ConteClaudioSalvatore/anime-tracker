import React from "react";
import {
  ActivityIndicator,
  Modal,
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
                ? "Close websites"
                : "Close playback details"
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
              {provider?.name ?? "Playback details"}
            </Text>
            <Text selectable style={{ color: colors.muted }}>
              {url}
            </Text>
            {loading && (
              <ActivityIndicator accessibilityLabel="Loading website" />
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
            <ActionButton label="Choose website" onPress={onChooseWebsite} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheetClose: { paddingHorizontal: 24, paddingTop: 12 },
  details: { padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "700" },
});
