import { APP_SUPPORT_URL, PRIVACY_SECTIONS } from "@/constants/privacy";
import ActionButton from "@/components/provider-creator/action-button";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyScreen() {
  const t = useAppTranslation();
  const colors = useProviderPalette();
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.body, { color: colors.muted }]}>
          {t("privacy.updated")}
        </Text>
        {PRIVACY_SECTIONS.map((section) => (
          <View key={section} style={styles.section}>
            <Text
              accessibilityRole="header"
              style={[styles.heading, { color: colors.text }]}
            >
              {t(`privacy.${section}Title`)}
            </Text>
            <Text selectable style={[styles.body, { color: colors.text }]}>
              {t(`privacy.${section}Body`)}
            </Text>
          </View>
        ))}
        <ActionButton
          label={t("privacy.support")}
          onPress={() => {
            void Linking.openURL(APP_SUPPORT_URL).catch(() =>
              Alert.alert(t("privacy.linkFailed")),
            );
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 32 },
  section: { gap: 8 },
  heading: { fontSize: 20, fontWeight: "600" },
  body: { fontSize: 16, lineHeight: 24 },
});
