import { AccessoryContext, AppStateContext } from "@/utils";
import { Button, Group, Host, HStack, Spacer } from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  foregroundStyle,
  labelStyle,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import React from "react";

export default function NavigationAccessory() {
  const { webViewRef } = React.useContext(AccessoryContext);
  const {
    state: { canGoBack, canGoForward },
  } = React.useContext(AppStateContext);

  return (
    // make this take 100% Space
    <Host
      style={{
        alignSelf: "center",
        position: "absolute",
        inset: 0,
      }}
    >
      <HStack spacing={8} modifiers={[padding({ all: 8 })]}>
        <Group>
          {canGoBack && (
            <Button
              modifiers={[
                disabled(!canGoBack),
                buttonStyle("bordered"),
                labelStyle("iconOnly"),
                tint("#000000aa"),
                buttonBorderShape("capsule"),
                controlSize("regular"),
                buttonBorderShape("circle"),
                foregroundStyle("white"),
              ]}
              label="back"
              onPress={() => webViewRef?.current?.goBack()}
              systemImage="lessthan"
            />
          )}
          {canGoForward && (
            <Button
              modifiers={[
                disabled(!canGoForward),
                buttonStyle("bordered"),
                labelStyle("iconOnly"),
                buttonBorderShape("capsule"),
                tint("#000000aa"),
                controlSize("regular"),
                buttonBorderShape("circle"),
                foregroundStyle("white"),
              ]}
              systemImage="greaterthan"
              label="forward"
              onPress={() => webViewRef?.current?.goForward()}
            />
          )}
        </Group>
        <Spacer />
        <Button
          modifiers={[
            buttonStyle("bordered"),
            labelStyle("titleAndIcon"),
            tint("#000000aa"),
            controlSize("regular"),
            buttonBorderShape("capsule"),
            foregroundStyle("white"),
          ]}
          systemImage="arrow.2.circlepath"
          label="Reload"
          onPress={() => webViewRef?.current?.reload()}
        />
      </HStack>
    </Host>
  );
}
