import { ProviderCreatorMessages } from "@/model";
import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Button, Column, Text } from "@expo/ui";
import React from "react";
import BottomUtility from "./bottom-utility";

export default function EpisodeNumberLearner() {
  const ctx = useProviderCreator();
  const [target, setTarget] = React.useState<{
    textContent?: string;
    selector: string;
  } | null>(null);

  const [targetSelectedCount, setTargetSelectedCount] = React.useState(0);

  React.useEffect(() => {
    if (!ctx?.webViewEvents?.current) return;
    const listeners: (() => void)[] = [];
    listeners.push(
      ctx.webViewEvents.current.on("targetChange", (data) => {
        const selector =
          data.targetTree?.replaceAll(/:nth-child\(\d+\)/g, "") ?? "";
        setTarget({
          textContent: data.targetContent,
          selector,
        });
        ctx.webView.current?.postMessage(
          ProviderCreatorMessages.testTargetSelector(selector),
        );
      }),
      ctx.webViewEvents.current.on("targetSelectorResultCount", (data) => {
        setTargetSelectedCount(data.count);
      }),
    );
    return () => {
      listeners.forEach((fn) => fn());
    };
  }, [ctx?.webView, ctx?.webViewEvents]);

  if (!ctx) return null;
  const { providerDraft, updateProviderDraft, webView } = ctx;

  return (
    <BottomUtility
      stepTitle="Episode Number"
      stepInfo={
        <Text textStyle={{ color: "white", fontSize: 18, textAlign: "left" }}>
          Now we need to learn how to identify a single episode in the list of
          available episodes.
        </Text>
      }
      canGoNext={!!providerDraft.episodeNumberSelector || targetSelectedCount > 0}
      onGoNext={() => {
        updateProviderDraft((prev) => ({
          ...prev,
          episodeNumberSelector:
            target?.selector ?? providerDraft.episodeNumberSelector ?? "",
        }));
        ctx.webView.current?.postMessage(ProviderCreatorMessages.untarget());
      }}
    >
      <Column alignment="center" spacing={8}>
        <Text>{`Current Target: ${target?.textContent ?? "No target selected"}`}</Text>
        <Text>{`Target Selected Count: ${targetSelectedCount}`}</Text>
        {target && targetSelectedCount !== 1 && (
          <Button
            onPress={() => {
              webView.current?.postMessage(
                ProviderCreatorMessages.targetParent(),
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
