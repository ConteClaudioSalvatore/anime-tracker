import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Column, Text } from "@expo/ui";
import React from "react";
import BottomUtility from "./bottom-utility";

export default function PlayerLearner() {
  const ctx = useProviderCreator();
  const [playerDiscoverySuccess, setPlayerDiscoverySuccess] =
    React.useState(false);

  React.useEffect(() => {
    if (!ctx?.webViewEvents?.current) return;
    const listeners: (() => void)[] = [];
    ctx?.webView.current?.reload();
    listeners.push(
      ctx.webViewEvents.current.on("playerDiscoverySuccess", () => {
        setPlayerDiscoverySuccess(true);
      }),
      ctx.webViewEvents.current.on("playerDiscoveryFailure", () => {
        setPlayerDiscoverySuccess(false);
      }),
    );
    return () => {
      listeners.forEach((fn) => fn());
    };
  }, [ctx?.webView, ctx?.webViewEvents]);

  if (!ctx) return null;
  const { providerDraft, updateProviderDraft } = ctx;

  return (
    <BottomUtility
      stepTitle="Player Selector"
      stepInfo={
        <Text textStyle={{ color: "white", fontSize: 18, textAlign: "left" }}>
          Now we need to learn how to identify the episode video player.
        </Text>
      }
      canGoNext={
        playerDiscoverySuccess || providerDraft.isPlayerSupported !== null
      }
      onGoNext={() => {
        updateProviderDraft((prev) => ({
          ...prev,
          isPlayerSupported: playerDiscoverySuccess ?? prev.isPlayerSupported,
        }));
      }}
    >
      <Column alignment="center" spacing={8}>
        <Text>
          {playerDiscoverySuccess
            ? "player found"
            : "player might not be supported"}
        </Text>
      </Column>
    </BottomUtility>
  );
}
