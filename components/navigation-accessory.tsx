import { useAppTranslation } from "@/hooks/use-app-translation";
import { useProviderPalette } from "@/hooks/use-provider-palette";
import { AccessoryContext, AppStateContext } from "@/utils";
import { Button, Host, Icon, Row, Spacer, Text } from "@expo/ui";
import React from "react";
import { Platform } from "react-native";
import { Icon as ComposeIcon, IconButton } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, size } from "@expo/ui/jetpack-compose/modifiers";

export default function NavigationAccessory() {
  const t = useAppTranslation();
  const colors = useProviderPalette();
  const { webViewRef } = React.useContext(AccessoryContext);
  const {
    state: { canGoBack, canGoForward },
    updateState,
  } = React.useContext(AppStateContext);

  function navigate(action: string) {
    if (action === "back") webViewRef?.current?.goBack();
    else if (action === "forward") webViewRef?.current?.goForward();
    else if (action === "reload") webViewRef?.current?.reload();
    else if (action === "providers" || action === "status")
      updateState((previous) => ({ ...previous, browserSheet: action }));
  }

  if (Platform.OS === "android") {
    const actions = [
      {
        id: "back",
        label: t("common.back"),
        icon: require("@expo/material-symbols/chevron_backward.xml"),
        enabled: canGoBack,
      },
      {
        id: "forward",
        label: t("common.forward"),
        icon: require("@expo/material-symbols/chevron_forward.xml"),
        enabled: canGoForward,
      },
      {
        id: "providers",
        label: t("navigation.websites"),
        icon: require("@expo/material-symbols/public.xml"),
        enabled: true,
      },
      {
        id: "status",
        label: t("navigation.playbackDetails"),
        icon: require("@expo/material-symbols/info.xml"),
        enabled: true,
      },
      {
        id: "reload",
        label: t("common.reload"),
        icon: require("@expo/material-symbols/refresh.xml"),
        enabled: true,
      },
    ];
    return (
      <Host style={{ height: 64 }}>
        <Row
          alignment="center"
          spacing={4}
          modifiers={[fillMaxWidth()]}
          style={{ padding: 8 }}
        >
          {actions.map((action, index) => (
            <React.Fragment key={action.id}>
              {index === 2 && <Spacer flexible />}
              <IconButton
                enabled={action.enabled}
                onClick={() => navigate(action.id)}
                modifiers={[size(48, 48)]}
                colors={{ contentColor: colors.text }}
              >
                <ComposeIcon
                  source={action.icon}
                  size={24}
                  tint={action.enabled ? colors.text : colors.muted}
                  contentDescription={action.label}
                />
              </IconButton>
            </React.Fragment>
          ))}
        </Row>
      </Host>
    );
  }

  return (
    // make this take 100% Space
    <Host
      style={{
        alignSelf: "center",
        position: "absolute",
        inset: 0,
      }}
    >
      <Row alignment="center" spacing={8} style={{ padding: 8 }}>
        {(canGoBack || canGoForward) && (
          <Row style={{ backgroundColor: "#2288dd", borderRadius: 32 }}>
            {canGoBack && (
              <Button
                variant="text"
                onPress={() => webViewRef?.current?.goBack()}
              >
                <Text hidden>{t("common.back")}</Text>
                <Icon
                  name={Icon.select({
                    ios: "lessthan",
                    android:
                      import("@expo/material-symbols/chevron_backward.xml"),
                  })}
                ></Icon>
              </Button>
            )}
            {canGoForward && (
              <Button
                variant="text"
                onPress={() => webViewRef?.current?.goForward()}
              >
                <Text hidden>{t("common.forward")}</Text>
                <Icon
                  name={Icon.select({
                    ios: "greaterthan",
                    android:
                      import("@expo/material-symbols/chevron_forward.xml"),
                  })}
                ></Icon>
              </Button>
            )}
          </Row>
        )}
        <Spacer flexible />
        <Button
          variant="text"
          onPress={() =>
            updateState((previous) => ({
              ...previous,
              browserSheet: "providers",
            }))
          }
        >
          <Text hidden>{t("navigation.websites")}</Text>
          <Icon
            name={Icon.select({
              ios: "globe",
              android: import("@expo/material-symbols/public.xml"),
            })}
          />
        </Button>
        <Button
          variant="text"
          onPress={() =>
            updateState((previous) => ({ ...previous, browserSheet: "status" }))
          }
        >
          <Text hidden>{t("navigation.playbackDetails")}</Text>
          <Icon
            name={Icon.select({
              ios: "info.circle",
              android: import("@expo/material-symbols/info.xml"),
            })}
          />
        </Button>
        <Button variant="filled" onPress={() => webViewRef?.current?.reload()}>
          <Text hidden>{t("common.reload")}</Text>
          <Icon
            name={Icon.select({
              ios: "arrow.2.circlepath",
              android: import("@expo/material-symbols/refresh.xml"),
            })}
          ></Icon>
        </Button>
      </Row>
    </Host>
  );
}
