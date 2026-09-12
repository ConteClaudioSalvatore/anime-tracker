import { useThemeColor } from "@/hooks/use-theme-color";
import { useProviderCreator } from "@/utils/provider-creator.utils";
import {
  BottomSheet,
  Button,
  HStack,
  Host,
  Image,
  Text,
  TextField,
  VStack,
  useNativeState,
} from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  cornerRadius,
  disabled,
  foregroundStyle,
  frame,
  keyboardType,
  padding,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import React from "react";

export default function Info() {
  const textColor = useThemeColor(
    { dark: "#ffffff", light: "#1a1a1a" },
    "text",
  );

  const inputBg = useThemeColor({ dark: "#2a2a2a", light: "#ffffff" }, "text");

  const [showURLInfo, setShowURLInfo] = React.useState(false);
  const ctx = useProviderCreator();

  const { providerDraft, updateProviderDraft, updateStep } = ctx;
  const origin = useNativeState(providerDraft.origin);
  const name = useNativeState(providerDraft.name);

  const isStepValid = (name: string | null, origin: string | null) => {
    if (!(name && origin)) return false;

    return (
      name.trim().length > 0 &&
      /^http(?:s?):\/\/.+\..{2,}$/i.exec(origin) !== null
    );
  };

  const textChange = (input: "origin" | "name") => (value: string) => {
    "worklet";
    const nativeStates = {
      origin,
      name,
    } as const;
    nativeStates[input].value = value;
  };

  React.useEffect(() => {
    updateProviderDraft((prev) => ({
      ...prev,
      origin: origin.value,
      name: name.value,
    }));
  }, [origin.value, name.value, updateProviderDraft]);

  return (
    <Host style={{ flex: 1 }}>
      <VStack
        spacing={8}
        modifiers={[padding({ vertical: 8, horizontal: 16 })]}
      >
        <Text modifiers={[foregroundStyle(textColor)]}>Info</Text>

        <HStack spacing={8}>
          <Text modifiers={[foregroundStyle(textColor)]}>Name:</Text>

          <TextField
            placeholder="Enter provider name"
            text={name}
            modifiers={[
              frame({ maxWidth: Infinity }),
              padding({ all: 16 }),
              background(inputBg),
              cornerRadius(16),
              foregroundStyle(textColor),
            ]}
            onTextChange={textChange("name")}
          />
        </HStack>

        <HStack spacing={8}>
          <Text modifiers={[foregroundStyle(textColor)]}>URL:</Text>

          <TextField
            placeholder="Enter the website base url"
            text={origin}
            modifiers={[
              keyboardType("url"),
              textInputAutocapitalization("never"),
              frame({ maxWidth: Infinity }),
              padding({ all: 16 }),
              background(inputBg),
              cornerRadius(16),
              foregroundStyle(textColor),
            ]}
            onTextChange={textChange("origin")}
          />

          <Button
            modifiers={[buttonStyle("borderless")]}
            onPress={() => setShowURLInfo(true)}
          >
            <Image systemName="info.circle" size={20} />
          </Button>
        </HStack>

        <Button
          modifiers={[
            disabled(!isStepValid(name.value, origin.value)),
            buttonStyle("glassProminent"),
          ]}
          onPress={() => {
            updateProviderDraft((prev) => ({
              ...prev,
              origin: origin.value,
              name: name.value,
            }));
            updateStep((prev) => prev + 1);
          }}
        >
          <HStack spacing={6}>
            <Image systemName="arrow.right" size={16} />
            <Text>Next</Text>
          </HStack>
        </Button>
      </VStack>

      <BottomSheet
        isPresented={showURLInfo}
        fitToContents
        onIsPresentedChange={(value) => setShowURLInfo(value)}
      >
        <VStack spacing={8} modifiers={[padding({ all: 16 })]}>
          <Text>
            This is the website URL, you can find it in the browser&apos;s
            address bar.
          </Text>
          <Text>Make sure you are on the website&apos;s homepage.</Text>
          <Text>Make sure the URL starts with `https://` or `http://`.</Text>
        </VStack>
      </BottomSheet>
    </Host>
  );
}
