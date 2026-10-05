import { useAppTranslation } from "@/hooks/use-app-translation";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import type { Provider } from "@/model";
import { removeProvider } from "@/store/app.actions";
import { AppStateContext, AppStore, StoreContext } from "@/utils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import SettingsActionButton from "./action-button";

function websiteAddress(provider: Provider) {
  try {
    return new URL(provider.origin).host;
  } catch {
    return provider.origin;
  }
}

export default function SettingsProviders() {
  const t = useAppTranslation();
  const colors = useProviderPalette();
  const { state, stateChanged } = React.useContext(StoreContext);
  const { updateState } = React.useContext(AppStateContext);
  const [savingStartup, setSavingStartup] = React.useState(false);
  const router = useRouter();
  const onlyWebsite = state.providers.length === 1;

  async function setStartup(provider: Provider, isOn: boolean) {
    if (onlyWebsite || savingStartup) return;
    setSavingStartup(true);
    try {
      await AppStore.Update((previous) => ({
        ...previous,
        providers: previous.providers.map((item) => ({
          ...item,
          isDefault: isOn && item.id === provider.id,
        })),
      }));
      await stateChanged();
    } catch {
      Alert.alert(t("provider.startupFailed"), t("common.retry"));
    } finally {
      setSavingStartup(false);
    }
  }

  function deleteWebsite(provider: Provider) {
    Alert.alert(
      t("provider.deleteQuestion", { name: provider.name }),
      t("provider.historyKept"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await AppStore.Dispatch(removeProvider(provider.id));
              await stateChanged();
            } catch {
              Alert.alert(t("provider.deleteFailed"), t("common.retry"));
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: colors.text }]}>
        {t("home.websites")}
      </Text>
      {state.providers.map((provider) => (
        <View
          key={provider.id}
          style={[styles.card, { backgroundColor: colors.card }]}
        >
          <Text style={[styles.name, { color: colors.text }]}>
            {provider.name}
          </Text>
          <Text style={[styles.detail, { color: colors.muted }]}>
            {websiteAddress(provider)}
          </Text>
          <View style={styles.status}>
            <MaterialIcons
              name={
                provider.verification?.progress
                  ? "check-circle-outline"
                  : "info-outline"
              }
              size={18}
              color={colors.muted}
            />
            <Text style={[styles.detail, { color: colors.muted, flex: 1 }]}>
              {provider.verification?.progress
                ? t("provider.trackingReady")
                : t("provider.trackingUnverified")}
            </Text>
          </View>
          <View style={styles.actions}>
            <SettingsActionButton
              label={t("common.open")}
              icon="open-in-new"
              accessibilityLabel={t("provider.openNamed", {
                name: provider.name,
              })}
              onPress={() => {
                updateState({ url: provider.origin, providerId: provider.id });
                router.navigate("/");
              }}
            />
            <SettingsActionButton
              label={t("common.edit")}
              icon="edit"
              accessibilityLabel={t("provider.editNamed", {
                name: provider.name,
              })}
              onPress={() =>
                router.navigate({
                  pathname: "/provider-creator",
                  params: { id: String(provider.id) },
                })
              }
            />
            <SettingsActionButton
              label={t("common.delete")}
              icon="delete-outline"
              destructive
              accessibilityLabel={t("provider.deleteNamed", {
                name: provider.name,
              })}
              onPress={() => deleteWebsite(provider)}
            />
          </View>
          <View style={[styles.startup, { borderTopColor: colors.border }]}>
            <Text style={[styles.detail, { color: colors.text, flex: 1 }]}>
              {t("provider.openStartup")}
            </Text>
            <Switch
              accessibilityLabel={t("provider.startupNamed", {
                name: provider.name,
              })}
              value={onlyWebsite || provider.isDefault}
              disabled={onlyWebsite || savingStartup}
              onValueChange={(isOn) => setStartup(provider, isOn)}
              trackColor={{ true: "#2463dc" }}
            />
          </View>
        </View>
      ))}
      {state.providers.length === 0 && (
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.name, { color: colors.text }]}>
            {t("provider.none")}
          </Text>
          <Text style={[styles.detail, { color: colors.muted }]}>
            {t("provider.noneHelp")}
          </Text>
        </View>
      )}
      <Text style={[styles.detail, { color: colors.muted }]}>
        {onlyWebsite
          ? t("provider.onlyStartupHelp")
          : t("provider.startupHelp")}
      </Text>
      <SettingsActionButton
        label={t("provider.addWebsite")}
        icon="add"
        primary
        onPress={() => router.navigate("/provider-creator")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { fontSize: 18, fontWeight: "600" },
  card: { borderRadius: 18, padding: 16, gap: 8 },
  name: { fontSize: 18, fontWeight: "600" },
  detail: { fontSize: 14, lineHeight: 20 },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginVertical: 4,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  startup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 4,
  },
});
