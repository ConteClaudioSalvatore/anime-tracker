import { useThemeColor } from "@/hooks/use-theme-color";
import { useProviderCreator } from "@/utils/provider-creator.utils";
import {
    BottomSheet,
    Button,
    Column,
    Host,
    Icon,
    Row,
    Text,
    TextInput
} from "@expo/ui";
import { weight } from "@expo/ui/jetpack-compose/modifiers";
import React from "react";

export default function Info() {
  const textColor = useThemeColor(
    { dark: "#ffffff", light: "#1a1a1a" },
    "text",
  );
  const inputBg = useThemeColor({ dark: "#2a2a2a", light: "#ffffff" }, "text");
  const [showURLInfo, setShowURLInfo] = React.useState(false);
  const ctx = useProviderCreator();
  if (!ctx) return null;

  const { providerDraft, updateProviderDraft, updateStep } = ctx;

  const isStepValid = (name: string | null, origin: string | null) => {
    if (!(name && origin)) return false;
    return (
      name.trim().length > 0 &&
      /^http(?:s?):\/\/.+\..{2,}$/.exec(origin) !== null
    );
  };

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
            onChangeText={(e) =>
              updateProviderDraft((prev) => ({ ...prev, name: e }))
            }
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
            onChangeText={(e) =>
              updateProviderDraft((prev) => ({ ...prev, origin: e }))
            }
          ></TextInput>
          <Button variant="text" onPress={() => setShowURLInfo(true)}>
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
        <Button
          disabled={!isStepValid(providerDraft.name, providerDraft.origin)}
          onPress={() => updateStep((prev) => prev + 1)}
        >
          <Icon
            name={Icon.select({
              ios: "arrow.right",
              android: import("@expo/material-symbols/arrow_right.xml"),
            })}
          />
          <Text>Next</Text>
        </Button>
      </Column>
    </Host>
  );
}
