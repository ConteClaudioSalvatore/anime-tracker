import { useThemeColor } from "@/hooks/use-theme-color";
import { removeProvider } from "@/store/app.actions";
import { AppStore, StoreContext } from "@/utils";
import { Button, Column, Icon, Row, Spacer, Text } from "@expo/ui";
import {
  Button as AndroidButton,
  HorizontalDivider,
} from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Divider, Button as IOSButton } from "@expo/ui/swift-ui";
import { buttonStyle, tint } from "@expo/ui/swift-ui/modifiers";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform } from "react-native";

export default function SettingsProviders() {
  const { state, stateChanged } = React.useContext(StoreContext);
  const providers = state.providers;

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
        Select Default Provider
      </Text>
      {Platform.OS === "android" && <HorizontalDivider />}
      {Platform.OS === "ios" && <Divider />}
      <Column alignment="center">
        {providers.length > 0 ? (
          providers.map((provider, i) => (
            <Row key={provider.id + i}>
              <Button variant="text" key={provider.id + i}>
                <Text textStyle={{ textAlign: "left" }}>{provider.name}</Text>
              </Button>
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
                      ios: "bin.xmark",
                      android: import("@expo/material-symbols/delete.xml"),
                    })}
                  />
                </AndroidButton>
              )}
              {Platform.OS === "ios" && (
                <IOSButton
                  modifiers={[tint("#ff0000aa"), buttonStyle("glass")]}
                  systemImage="bin.xmark"
                  onPress={() => onProviderDelete(provider.id)}
                />
              )}
            </Row>
          ))
        ) : (
          <Text textStyle={{ color: textColor }}>No Providers found</Text>
        )}
        <Spacer flexible />
        {Platform.OS === "ios" && (
          <IOSButton
            modifiers={[buttonStyle("glassProminent"), tint("#0044aa")]}
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
