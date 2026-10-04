import { useThemeColor } from "@/hooks/use-theme-color";
import { removeProvider } from "@/store/app.actions";
import { AppStateContext, AppStore, StoreContext } from "@/utils";
import { Button, Column, Icon, Row, Spacer, Text } from "@expo/ui";
import {
  Button as AndroidButton,
  HorizontalDivider,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Divider, Button as IOSButton } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  labelStyle,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform } from "react-native";

function ProviderAction({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  if (Platform.OS === "ios") {
    return (
      <IOSButton
        label={label}
        onPress={onPress}
        modifiers={[
          buttonStyle("glass"),
          controlSize("small"),
          disabledModifier(disabled),
        ]}
      />
    );
  }
  return (
    <Button variant="text" disabled={disabled} onPress={onPress}>
      <Text>{label}</Text>
    </Button>
  );
}

export default function SettingsProviders() {
  const { state, stateChanged } = React.useContext(StoreContext);
  const providers = state.providers;
  const { updateState } = React.useContext(AppStateContext);

  const router = useRouter();
  const textColor = useThemeColor(
    {
      dark: "white",
      light: "black",
    },
    "text",
  );
  const listBackgroundColor = useThemeColor(
    { dark: "#1a1a1a", light: "#ffffff" },
    "background",
  );

  const onProviderDelete = async (providerId: number) => {
    Alert.alert(
      "Delete Provider",
      "Are you sure you want to delete this provider?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await AppStore.Dispatch(removeProvider(providerId));
            stateChanged();
          },
        },
      ],
    );
  };

  return (
    <Column
      alignment="center"
      style={{
        padding: 8,
        backgroundColor: listBackgroundColor,
        borderRadius: 32,
      }}
      spacing={8}
      modifiers={[weight(1), fillMaxWidth()]}
    >
      <Text textStyle={{ color: textColor, fontWeight: "bold", fontSize: 18 }}>
        Your Websites
      </Text>
      {Platform.OS === "android" && <HorizontalDivider />}
      {Platform.OS === "ios" && <Divider />}
      <Column alignment="center">
        {providers.length > 0 ? (
          providers.map((provider) => (
            <Column key={provider.id} spacing={8}>
              <Row>
                <ProviderAction
                  label={"Open " + provider.name}
                  onPress={() => {
                    updateState({
                      url: provider.origin,
                      providerId: provider.id,
                    });
                    router.navigate("/");
                  }}
                />
                <Spacer flexible />
                {Platform.OS === "android" && (
                  <AndroidButton
                    colors={{
                      containerColor: "#dd0000",
                      contentColor: "#ffffff",
                    }}
                    modifiers={[]}
                    onClick={() => onProviderDelete(provider.id)}
                  >
                    <Icon
                      name={Icon.select({
                        ios: "trash",
                        android: import("@expo/material-symbols/delete.xml"),
                      })}
                    />
                  </AndroidButton>
                )}
                {Platform.OS === "ios" && (
                  <IOSButton
                    modifiers={[
                      tint("#ff0000aa"),
                      buttonStyle("glass"),
                      controlSize("small"),
                      labelStyle("iconOnly"),
                      accessibilityLabel("Delete " + provider.name),
                    ]}
                    label="Delete provider"
                    systemImage="trash"
                    role="destructive"
                    onPress={() => onProviderDelete(provider.id)}
                  />
                )}
              </Row>
              <Text textStyle={{ color: textColor }}>
                {provider.verification?.progress
                  ? "Playback tracking ready"
                  : "Playback tracking not verified"}
              </Text>
              <Row spacing={8}>
                <ProviderAction
                  label="Edit setup"
                  onPress={() =>
                    router.navigate({
                      pathname: "/provider-creator",
                      params: { id: String(provider.id) },
                    })
                  }
                />
                <ProviderAction
                  disabled={providers.length === 1}
                  label={
                    providers.length === 1
                      ? "Opens on startup"
                      : provider.isDefault
                        ? "Clear startup website"
                        : "Use on startup"
                  }
                  onPress={async () => {
                    try {
                      await AppStore.Update((previous) => ({
                        ...previous,
                        providers: previous.providers.map((item) => ({
                          ...item,
                          isDefault:
                            !provider.isDefault && item.id === provider.id,
                        })),
                      }));
                      stateChanged();
                    } catch {
                      Alert.alert("Could not save preference", "Try again.");
                    }
                  }}
                />
              </Row>
            </Column>
          ))
        ) : (
          <Text textStyle={{ color: textColor }}>No Providers found</Text>
        )}
        <Spacer flexible />
        {Platform.OS === "ios" && (
          <IOSButton
            modifiers={[
              buttonStyle("glassProminent"),
              controlSize("small"),
              tint("#0044aa"),
            ]}
            onPress={() => {
              router.navigate("/provider-creator");
            }}
            systemImage="plus"
            label="Add Provider"
          />
        )}
        {Platform.OS === "android" && (
          <Button
            onPress={() => {
              router.navigate("/provider-creator");
            }}
          >
            <Icon
              name={Icon.select({
                ios: "plus",
                android: import("@expo/material-symbols/add.xml"),
              })}
            />
            <Text>Add Provider</Text>
          </Button>
        )}
      </Column>
    </Column>
  );
}
