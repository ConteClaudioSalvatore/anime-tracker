import { useAppTranslation } from "@/hooks/use-app-translation";
import type { Provider } from "@/model";
import { removeProvider } from "@/store/app.actions";
import { AppStateContext, AppStore, StoreContext } from "@/utils";
import {
  Button,
  HStack,
  Label,
  Section,
  Spacer,
  Text,
  Toggle,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  controlSize,
  disabled,
  font,
  foregroundStyle,
  padding,
  toggleStyle,
} from "@expo/ui/swift-ui/modifiers";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import React from "react";
import { Alert } from "react-native";

function websiteAddress(provider: Provider) {
  try {
    return new URL(provider.origin).host;
  } catch {
    return provider.origin;
  }
}

export default function SettingsProviders() {
  const t = useAppTranslation();
  const { state, stateChanged } = React.useContext(StoreContext);
  const { updateState } = React.useContext(AppStateContext);
  const [savingStartup, setSavingStartup] = React.useState(false);
  const router = useRouter();
  const onlyWebsite = state.providers.length === 1;
  const glass = isLiquidGlassAvailable();
  const secondary = { type: "hierarchical", style: "secondary" } as const;
  const actionModifiers = [
    buttonStyle(glass ? "glass" : "bordered"),
    controlSize("small"),
    font({ textStyle: "subheadline" }),
  ];

  async function setStartup(provider: Provider, isOn: boolean) {
    if (onlyWebsite) return;
    setSavingStartup(true);
    try {
      await AppStore.Update((previous) => ({
        ...previous,
        providers: previous.providers.map((item) => ({
          ...item,
          isDefault: isOn && item.id === provider.id,
        })),
      }));
      stateChanged();
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
              stateChanged();
            } catch {
              Alert.alert(t("provider.deleteFailed"), t("common.retry"));
            }
          },
        },
      ],
    );
  }

  return (
    <Section
      title={t("navigation.websites")}
      footer={
        <Text>
          {onlyWebsite
            ? t("provider.onlyStartupHelp")
            : t("provider.startupHelp")}
        </Text>
      }
    >
      {state.providers.map((provider) => (
        <VStack
          key={provider.id}
          alignment="leading"
          spacing={12}
          modifiers={[padding({ vertical: 4 })]}
        >
          <HStack spacing={12}>
            <VStack alignment="leading" spacing={3}>
              <Text modifiers={[font({ textStyle: "headline" })]}>
                {provider.name}
              </Text>
              <Text
                modifiers={[
                  font({ textStyle: "caption" }),
                  foregroundStyle(secondary),
                ]}
              >
                {websiteAddress(provider)}
              </Text>
            </VStack>
            <Spacer />
            <Button
              label={t("common.open")}
              systemImage="arrow.up.right"
              modifiers={[
                ...actionModifiers,
                accessibilityLabel(
                  t("provider.openNamed", { name: provider.name }),
                ),
              ]}
              onPress={() => {
                updateState({ url: provider.origin, providerId: provider.id });
                router.navigate("/");
              }}
            />
          </HStack>
          <Label
            title={
              provider.verification?.progress
                ? t("provider.trackingReady")
                : t("provider.trackingUnverified")
            }
            systemImage={
              provider.verification?.progress
                ? "checkmark.circle"
                : "info.circle"
            }
            modifiers={[
              font({ textStyle: "footnote" }),
              foregroundStyle(secondary),
            ]}
          />
          <Toggle
            label={t("provider.openStartup")}
            isOn={onlyWebsite || provider.isDefault}
            onIsOnChange={(isOn) => setStartup(provider, isOn)}
            modifiers={[
              toggleStyle("switch"),
              font({ textStyle: "subheadline" }),
              disabled(savingStartup || onlyWebsite),
              accessibilityLabel(
                t("provider.startupNamed", { name: provider.name }),
              ),
            ]}
          />
          <HStack spacing={12}>
            <Button
              label={t("common.edit")}
              systemImage="pencil"
              modifiers={[
                ...actionModifiers,
                accessibilityLabel(
                  t("provider.editNamed", { name: provider.name }),
                ),
              ]}
              onPress={() =>
                router.navigate({
                  pathname: "/provider-creator",
                  params: { id: String(provider.id) },
                })
              }
            />
            <Spacer />
            <Button
              label={t("common.delete")}
              systemImage="trash"
              role="destructive"
              modifiers={[
                ...actionModifiers,
                accessibilityLabel(
                  t("provider.deleteNamed", { name: provider.name }),
                ),
              ]}
              onPress={() => deleteWebsite(provider)}
            />
          </HStack>
        </VStack>
      ))}
      {state.providers.length === 0 && (
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ textStyle: "headline" })]}>
            {t("provider.none")}
          </Text>
          <Text
            modifiers={[
              font({ textStyle: "subheadline" }),
              foregroundStyle(secondary),
            ]}
          >
            {t("provider.noneHelp")}
          </Text>
        </VStack>
      )}
      <Button
        label={t("provider.addWebsite")}
        systemImage="plus"
        modifiers={actionModifiers}
        onPress={() => router.navigate("/provider-creator")}
      />
    </Section>
  );
}
