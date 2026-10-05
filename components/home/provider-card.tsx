import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import type { Provider } from "@/model";

export type ProviderCardProps = {
  provider: Provider;
  onPress: () => void;
};

export default function ProviderCard({ provider, onPress }: ProviderCardProps) {
  const t = useAppTranslation();
  const colors = useProviderPalette();
  const verified = !!provider.verification?.progress;
  const status = t(
    verified ? "provider.trackingReady" : "provider.trackingUnverified",
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("provider.openNamed", { name: provider.name })}, ${provider.origin}, ${status}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name="globe-outline" size={32} color={colors.accent} />
      <View style={styles.details}>
        <Text style={[styles.name, { color: colors.text }]}>
          {provider.name}
        </Text>
        <Text style={[styles.domain, { color: colors.muted }]}>
          {provider.origin.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </Text>
        <View style={styles.status}>
          <Ionicons
            name={verified ? "checkmark-circle" : "information-circle-outline"}
            size={15}
            color={colors.muted}
          />
          <Text style={[styles.statusText, { color: colors.muted }]}>
            {status}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 24,
    minHeight: 100,
  },
  details: { flex: 1, gap: 6 },
  name: { fontSize: 19, fontWeight: "600" },
  domain: { fontSize: 14 },
  status: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusText: { fontSize: 12, flexShrink: 1 },
});
