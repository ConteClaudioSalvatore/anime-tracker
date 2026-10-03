import type { Provider } from "@/model";
import { removeProvider } from "@/store/app.actions";
import { AppStateContext, AppStore, StoreContext } from "@/utils";
import { Button, HStack, Label, Section, Spacer, Text, Toggle, VStack } from "@expo/ui/swift-ui";
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
  try { return new URL(provider.origin).host; }
  catch { return provider.origin; }
}

export default function SettingsProviders() {
  const { state, stateChanged } = React.useContext(StoreContext);
  const { updateState } = React.useContext(AppStateContext);
  const [savingStartup, setSavingStartup] = React.useState(false);
  const router = useRouter();
  const onlyWebsite = state.providers.length === 1;
  const glass = isLiquidGlassAvailable();
  const secondary = { type: "hierarchical", style: "secondary" } as const;
  const actionModifiers = [buttonStyle(glass ? "glass" : "bordered"), controlSize("small"), font({ textStyle: "subheadline" })];

  async function setStartup(provider: Provider, isOn: boolean) {
    if (onlyWebsite) return;
    setSavingStartup(true);
    try {
      await AppStore.Update(previous => ({
        ...previous,
        providers: previous.providers.map(item => ({ ...item, isDefault: isOn && item.id === provider.id })),
      }));
      stateChanged();
    } catch {
      Alert.alert("Could not save preference", "Try again.");
    } finally {
      setSavingStartup(false);
    }
  }

  function deleteWebsite(provider: Provider) {
    Alert.alert("Delete " + provider.name + "?", "Your watch history will be kept.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await AppStore.Dispatch(removeProvider(provider.id));
            stateChanged();
          } catch {
            Alert.alert("Could not delete website", "Try again.");
          }
        },
      },
    ]);
  }

  return (
    <Section
      title="Websites"
      footer={<Text>{onlyWebsite ? "Your only website opens automatically. Add another website to choose a startup preference." : "Open on startup chooses the website shown when the app launches."}</Text>}
    >
      {state.providers.map(provider => (
        <VStack key={provider.id} alignment="leading" spacing={12} modifiers={[padding({ vertical: 4 })]}>
          <HStack spacing={12}>
            <VStack alignment="leading" spacing={3}>
              <Text modifiers={[font({ textStyle: "headline" })]}>{provider.name}</Text>
              <Text modifiers={[font({ textStyle: "caption" }), foregroundStyle(secondary)]}>{websiteAddress(provider)}</Text>
            </VStack>
            <Spacer />
            <Button
              label="Open"
              systemImage="arrow.up.right"
              modifiers={[...actionModifiers, accessibilityLabel("Open " + provider.name)]}
              onPress={() => {
                updateState({ url: provider.origin, providerId: provider.id });
                router.navigate("/");
              }}
            />
          </HStack>
          <Label
            title={provider.verification?.progress && provider.verification.resume ? "Playback tracking ready" : "Playback tracking not fully verified"}
            systemImage={provider.verification?.progress && provider.verification.resume ? "checkmark.circle" : "info.circle"}
            modifiers={[font({ textStyle: "footnote" }), foregroundStyle(secondary)]}
          />
          <Toggle
            label="Open on startup"
            isOn={onlyWebsite || provider.isDefault}
            onIsOnChange={isOn => setStartup(provider, isOn)}
            modifiers={[toggleStyle("switch"), font({ textStyle: "subheadline" }), disabled(savingStartup || onlyWebsite), accessibilityLabel("Open " + provider.name + " on startup")]}
          />
          <HStack spacing={12}>
            <Button
              label="Edit"
              systemImage="pencil"
              modifiers={[...actionModifiers, accessibilityLabel("Edit " + provider.name)]}
              onPress={() => router.navigate({ pathname: "/provider-creator", params: { id: String(provider.id) } })}
            />
            <Spacer />
            <Button
              label="Delete"
              systemImage="trash"
              role="destructive"
              modifiers={[...actionModifiers, accessibilityLabel("Delete " + provider.name)]}
              onPress={() => deleteWebsite(provider)}
            />
          </HStack>
        </VStack>
      ))}
      {state.providers.length === 0 && (
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[font({ textStyle: "headline" })]}>No websites added</Text>
          <Text modifiers={[font({ textStyle: "subheadline" }), foregroundStyle(secondary)]}>Add a website to set up playback tracking.</Text>
        </VStack>
      )}
      <Button
        label="Add website"
        systemImage="plus"
        modifiers={actionModifiers}
        onPress={() => router.navigate("/provider-creator")}
      />
    </Section>
  );
}
