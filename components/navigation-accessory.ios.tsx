import { AccessoryContext, AppStateContext } from "@/utils";
import { Button, Group, Host, HStack, Label, Menu, Spacer } from "@expo/ui/swift-ui";
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
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function NavigationAccessory() {
  const isInline = NativeTabs.BottomAccessory.usePlacement() === "inline";
  const { webViewRef } = React.useContext(AccessoryContext);
  const {
    state: { canGoBack, canGoForward },
    updateState,
  } = React.useContext(AppStateContext);

  return (
    <Host
      style={{
        alignSelf: "center",
        position: "absolute",
        inset: 0,
      }}
    >
      <HStack spacing={isInline ? 4 : 8} modifiers={[padding({ all: isInline ? 4 : 8 })]}>
        <Group>
          {canGoBack && (
            <Button
              modifiers={[
                disabled(!canGoBack),
                buttonStyle("bordered"),
                labelStyle("iconOnly"),
                tint("#000000aa"),
                buttonBorderShape("capsule"),
                controlSize(isInline ? "small" : "regular"),
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
                controlSize(isInline ? "small" : "regular"),
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
        {isInline ? (
          <Menu
            label={<Label title="Website controls" systemImage="ellipsis" modifiers={[padding({ all: 8 })]} />}
            modifiers={[buttonStyle("bordered"), labelStyle("iconOnly"), tint("#000000aa"), controlSize("small"), buttonBorderShape("circle"), foregroundStyle("white")]}
          >
            <Button label="Websites" systemImage="globe" onPress={() => updateState(previous => ({ ...previous, browserSheet: 'providers' }))} />
            <Button label="Playback details" systemImage="info.circle" onPress={() => updateState(previous => ({ ...previous, browserSheet: 'status' }))} />
          </Menu>
        ) : (
          <>
            <Button
              modifiers={[buttonStyle("bordered"), labelStyle("iconOnly"), tint("#000000aa"), controlSize("regular"), buttonBorderShape("circle"), foregroundStyle("white")]}
              systemImage="globe"
              label="Websites"
              onPress={() => updateState(previous => ({ ...previous, browserSheet: 'providers' }))}
            />
            <Button
              modifiers={[buttonStyle("bordered"), labelStyle("iconOnly"), tint("#000000aa"), controlSize("regular"), buttonBorderShape("circle"), foregroundStyle("white")]}
              systemImage="info.circle"
              label="Playback details"
              onPress={() => updateState(previous => ({ ...previous, browserSheet: 'status' }))}
            />
          </>
        )}
        <Button
          modifiers={[
            buttonStyle("bordered"),
            labelStyle(isInline ? "iconOnly" : "titleAndIcon"),
            tint("#000000aa"),
            controlSize(isInline ? "small" : "regular"),
            buttonBorderShape(isInline ? "circle" : "capsule"),
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
