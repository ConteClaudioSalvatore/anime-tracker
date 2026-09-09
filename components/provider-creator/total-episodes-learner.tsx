import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Text } from "@expo/ui";
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
  const { providerDraft, updateProviderDraft } = ctx;

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
      <Text>{`Current Target: ${target?.textContent ?? "No target selected"}`}</Text>
    </BottomUtility>
  );
}
