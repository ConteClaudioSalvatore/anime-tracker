import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Button, Column, Text } from "@expo/ui";
import React from "react";
import BottomUtility from "./bottom-utility";

export default function TotalEpisodesLearner() {
  const ctx = useProviderCreator();
  const [target, setTarget] = React.useState<{
    textContent?: string;
    className: string;
  } | null>(null);

  React.useEffect(() => {
    if (!ctx?.webViewEvents?.current) return;
    return ctx.webViewEvents.current.on("targetChange", (data) => {
      setTarget({
        textContent: data.targetContent,
        className: data.targetClass ?? "",
      });
    });
  }, [ctx?.webViewEvents]);

  if (!ctx) return null;
  const { providerDraft, updateProviderDraft, webView } = ctx;

  return (
    <BottomUtility
      stepTitle="Total Series Episodes"
      stepInfo={
        <Text textStyle={{ color: "white", fontSize: 18, textAlign: "left" }}>
          Now we need to learn how to get the series total episodes from the
          page.
        </Text>
      }
      onGoNext={() => {
        updateProviderDraft((prev) => ({
          ...prev,
          totalEpisodesSelector: null,
        }));
      }}
    >
      <Column alignment="center" spacing={8}>
        <Text>{`Current Target: ${target?.textContent ?? "No target selected"}`}</Text>
        {target && (
          <Button
            onPress={() => {
              webView.current?.postMessage(
                JSON.stringify({ type: "targetParent" }),
              );
            }}
          >
            <Text>Get surroundings</Text>
          </Button>
        )}
      </Column>
    </BottomUtility>
  );
}
