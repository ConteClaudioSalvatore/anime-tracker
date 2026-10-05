import { useAppTranslation } from "@/hooks/use-app-translation";
import { AccessoryContext, AppStateContext } from "@/utils";
import {
  Button,
  Group,
  Host,
  HStack,
  Label,
  Menu,
  ProgressView,
  Spacer,
} from "@expo/ui/swift-ui";
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled,
  foregroundStyle,
  frame,
  labelStyle,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function NavigationAccessory() {
  const t = useAppTranslation();
  const isInline = NativeTabs.BottomAccessory.usePlacement() === "inline";
  const labelHeight = 24;
  const iconLabelModifiers = [
    padding({ all: 8 }),
    frame({ width: labelHeight, height: labelHeight }),
  ];
  const { webViewRef } = React.useContext(AccessoryContext);
  const {
    state: { canGoBack, canGoForward, browserLoading },
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
      <HStack spacing={isInline ? 4 : 8} modifiers={[padding({ all: 8 })]}>
        <Group>
          {canGoBack && (
            <Button
              modifiers={[
                disabled(!canGoBack),
                buttonStyle("bordered"),
                labelStyle("iconOnly"),
                tint("#000000aa"),
                controlSize(isInline ? "small" : "regular"),
                buttonBorderShape("circle"),
                foregroundStyle("white"),
              ]}
              onPress={() => webViewRef?.current?.goBack()}
            >
              <Label
                title={t("common.back")}
                systemImage="lessthan"
                modifiers={iconLabelModifiers}
              />
            </Button>
          )}
          {canGoForward && (
            <Button
              modifiers={[
                disabled(!canGoForward),
                buttonStyle("bordered"),
                labelStyle("iconOnly"),
                tint("#000000aa"),
                controlSize(isInline ? "small" : "regular"),
                buttonBorderShape("circle"),
                foregroundStyle("white"),
              ]}
              onPress={() => webViewRef?.current?.goForward()}
            >
              <Label
                title={t("common.forward")}
                systemImage="greaterthan"
                modifiers={iconLabelModifiers}
              />
            </Button>
          )}
        </Group>
        <Spacer />
        {isInline ? (
          <Menu
            label={
              <Label
                title={t("navigation.websiteControls")}
                systemImage="ellipsis"
                modifiers={iconLabelModifiers}
              />
            }
            modifiers={[
              buttonStyle("bordered"),
              labelStyle("iconOnly"),
              tint("#000000aa"),
              controlSize("small"),
              buttonBorderShape("circle"),
              foregroundStyle("white"),
            ]}
          >
            <Button
              label={t("navigation.websites")}
              systemImage="globe"
              onPress={() =>
                updateState((previous) => ({
                  ...previous,
                  browserSheet: "providers",
                }))
              }
            />
            <Button
              label={t("navigation.playbackDetails")}
              systemImage="info.circle"
              onPress={() =>
                updateState((previous) => ({
                  ...previous,
                  browserSheet: "status",
                }))
              }
            />
          </Menu>
        ) : (
          <>
            <Button
              modifiers={[
                buttonStyle("bordered"),
                labelStyle("iconOnly"),
                tint("#000000aa"),
                controlSize("regular"),
                buttonBorderShape("circle"),
                foregroundStyle("white"),
              ]}
              onPress={() =>
                updateState((previous) => ({
                  ...previous,
                  browserSheet: "providers",
                }))
              }
            >
              <Label
                title={t("navigation.websites")}
                systemImage="globe"
                modifiers={iconLabelModifiers}
              />
            </Button>
            <Button
              modifiers={[
                buttonStyle("bordered"),
                labelStyle("iconOnly"),
                tint("#000000aa"),
                controlSize("regular"),
                buttonBorderShape("circle"),
                foregroundStyle("white"),
              ]}
              onPress={() =>
                updateState((previous) => ({
                  ...previous,
                  browserSheet: "status",
                }))
              }
            >
              <Label
                title={t("navigation.playbackDetails")}
                systemImage="info.circle"
                modifiers={iconLabelModifiers}
              />
            </Button>
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
            accessibilityLabel(
              t(browserLoading ? "browser.loading" : "common.reload"),
            ),
          ]}
          onPress={() => webViewRef?.current?.reload()}
        >
          <Label
            title={t("common.reload")}
            systemImage="arrow.2.circlepath"
            icon={
              browserLoading ? (
                <ProgressView
                  modifiers={[...iconLabelModifiers, tint("white")]}
                />
              ) : undefined
            }
            modifiers={
              isInline ? iconLabelModifiers : [frame({ height: labelHeight })]
            }
          />
        </Button>
      </HStack>
    </Host>
  );
}
