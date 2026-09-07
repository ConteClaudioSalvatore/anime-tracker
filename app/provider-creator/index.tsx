import { useThemeColor } from "@/hooks/use-theme-color";
import {
  BottomSheet,
  Button,
  Column,
  Host,
  Icon,
  Row,
  Text,
  TextInput,
} from "@expo/ui";
import { TooltipBox } from "@expo/ui/jetpack-compose";
import { weight } from "@expo/ui/jetpack-compose/modifiers";
import React from "react";
import { Platform } from "react-native";

export default function ProviderCreator_Info_Screen() {
  const textColor = useThemeColor(
    { dark: "#ffffff", light: "#1a1a1a" },
    "text",
  );
  const inputBg = useThemeColor({ dark: "#2a2a2a", light: "#ffffff" }, "text");
  const [showURLInfo, setShowURLInfo] = React.useState(false);

  return (
    <Host style={{ flex: 1 }}>
      <Column
        alignment="center"
        spacing={8}
        style={{ paddingVertical: 8, paddingHorizontal: 16 }}
      >
        <Text textStyle={{ color: textColor, fontSize: 20 }}>Info</Text>
        <Row alignment="center" spacing={8}>
          <Text modifiers={[]} textStyle={{ color: textColor }}>
            Name:
          </Text>
          <TextInput
            autoCapitalize="words"
            placeholder="Enter provider name"
            autoFocus
            style={{ backgroundColor: inputBg, padding: 16, borderRadius: 16 }}
            textStyle={{ color: textColor }}
            placeholderTextColor={`${textColor}aa`}
          ></TextInput>
        </Row>
        <Row alignment="center" spacing={8}>
          <Text textStyle={{ color: textColor }}>URL: </Text>
          <TextInput
            placeholder="Enter the website base url"
            style={{ backgroundColor: inputBg, padding: 16, borderRadius: 16 }}
            textStyle={{ color: textColor }}
            placeholderTextColor={`${textColor}aa`}
            keyboardType="url"
            modifiers={[weight(1)]}
          ></TextInput>
          <Button
            variant="text"
            onPress={() => setShowURLInfo(true)}
          >
            <Icon
              name={Icon.select({
                ios: "info.circle",
                android: import("@expo/material-symbols/info.xml"),
              })}
            />
          </Button>
          <BottomSheet
            isPresented={showURLInfo}
            onDismiss={() => setShowURLInfo(false)}
          >
            <Column spacing={8}>
              <Text>
                This is the website URL, you can find it in the browser&apos;s
                address bar.
              </Text>
              <Text>Make sure you are on the website&apos;s homepage.</Text>
              <Text>
                Make sure the URL starts with `https://` or `http://`.
              </Text>
            </Column>
          </BottomSheet>
        </Row>
      </Column>
    </Host>
  );
}
