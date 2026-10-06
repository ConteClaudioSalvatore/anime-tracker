import { useAppTranslation } from "@/hooks/use-app-translation";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import SettingsActionButton from "./action-button";

export default function SettingsPrivacy() {
  const t = useAppTranslation();
  const colors = useProviderPalette();
  const router = useRouter();
  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={[styles.heading, { color: colors.text }]}
      >
        {t("privacy.section")}
      </Text>
      <Text style={{ color: colors.muted }}>{t("privacy.summary")}</Text>
      <SettingsActionButton
        label={t("privacy.title")}
        icon="privacy-tip"
        onPress={() => router.push("/privacy")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { fontSize: 18, fontWeight: "600" },
});
