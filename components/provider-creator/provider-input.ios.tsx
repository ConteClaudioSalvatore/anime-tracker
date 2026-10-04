import React from "react";
import { Host, TextField, useNativeState } from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  autocorrectionDisabled,
  frame,
  keyboardType,
  padding,
  textFieldStyle,
  textInputAutocapitalization,
} from "@expo/ui/swift-ui/modifiers";
import type { TextInputProps } from "react-native";

export default function ProviderInput({
  value = "",
  onChangeText,
  placeholder,
  accessibilityLabel: label,
  keyboardType: keyboard,
  autoCorrect,
  autoCapitalize,
}: TextInputProps) {
  const text = useNativeState(value);
  React.useEffect(() => {
    text.set(value);
  }, [text, value]);

  return (
    <Host matchContents={{ vertical: true }} style={{ alignSelf: "stretch" }}>
      <TextField
        text={text}
        placeholder={placeholder}
        onTextChange={onChangeText}
        modifiers={[
          frame({ maxWidth: Infinity }),
          textFieldStyle("roundedBorder"),
          padding({ vertical: 8 }),
          keyboardType(keyboard === "url" ? "url" : "default"),
          textInputAutocapitalization(
            autoCapitalize === "none" ? "never" : "sentences",
          ),
          autocorrectionDisabled(autoCorrect === false),
          accessibilityLabel(label ?? placeholder ?? "Text input"),
        ]}
      />
    </Host>
  );
}
