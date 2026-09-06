import { AccessoryContext, AppStateContext } from "@/utils";
import { Button, Host, Icon, Row, Spacer, Text } from "@expo/ui";
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
      <Row alignment="center" spacing={8} style={{ padding: 8 }}>
        {(canGoBack || canGoForward) && (
          <Row style={{ backgroundColor: "#2288dd", borderRadius: 32 }}>
            {canGoBack && (
              <Button
                variant="text"
                onPress={() => webViewRef?.current?.goBack()}
              >
                <Text hidden>back</Text>
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
                <Text hidden>forward</Text>
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
          variant="filled"
          onPress={() => webViewRef?.current?.reload()}
        >
          <Text hidden>Reload</Text>
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
