import { ProviderCreatorMessages } from "@/model";
import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Button, Column, Text } from "@expo/ui";
import React from "react";
import BottomUtility from "./bottom-utility";

export default function TotalEpisodesLearner() {
  const ctx = useProviderCreator();
  const [target, setTarget] = React.useState<{
    textContent?: string;
    selector: string;
  } | null>(null);

  const [targetSelectedCount, setTargetSelectedCount] = React.useState(0);

  React.useEffect(() => {
    if (!ctx?.webViewEvents?.current) return;
    const returns: (() => void)[] = [];
    returns.push(
      ctx.webViewEvents.current.on("targetChange", (data) => {
        setTarget({
          textContent: data.targetContent,
          selector: data.targetTree?.replaceAll(/:nth-child\(\d+\)/g, '') ?? "",
        });
        ctx.webView.current?.postMessage(
          ProviderCreatorMessages.testTargetSelector(data.targetTree),
        );
      }),
    );
    returns.push(
      ctx.webViewEvents.current.on("targetSelectorResultCount", (data) => {
        setTargetSelectedCount(data.count);
      }),
    );
    return () => {
      returns.forEach((fn) => fn());
    };
  }, [ctx?.webView, ctx?.webViewEvents]);

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
      canGoNext={
        !!providerDraft.totalEpisodesSelector || targetSelectedCount === 1
      }
      onGoNext={() => {
        updateProviderDraft((prev) => ({
          ...prev,
          totalEpisodesSelector:
            target?.selector ?? providerDraft.totalEpisodesSelector ?? "",
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
