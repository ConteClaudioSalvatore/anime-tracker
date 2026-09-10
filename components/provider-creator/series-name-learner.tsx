import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Column, Text } from "@expo/ui";
import React from "react";
import BottomUtility from "./bottom-utility";
import { ProviderCreatorMessages } from "@/model";

export default function EpisodeNameLearner() {
  const ctx = useProviderCreator();
  const [target, setTarget] = React.useState<{
    textContent?: string;
    selector: string;
  } | null>(null);

  React.useEffect(() => {
    if (!ctx?.webViewEvents?.current) return;
    return ctx.webViewEvents.current.on("targetChange", (data) => {
      setTarget({
        textContent: data.targetContent,
        selector: data.targetTree ?? "",
      });
    });
  }, [ctx?.webViewEvents]);

  if (!ctx) return null;
  const { providerDraft, updateProviderDraft } = ctx;

  return (
    <BottomUtility
      stepTitle="Series Name"
      stepInfo={
        <Column spacing={8}>
          <Text textStyle={{ color: "white", fontSize: 18, textAlign: "left" }}>
            Now we need to learn how to identify the series name from the page.
          </Text>
          <Text textStyle={{ color: "white", fontSize: 18, textAlign: "left" }}>
            Select the name of the series in the page, it will be highlighted
            with a red border, we will extract the content, once that matches
            the title, go to the next step.
          </Text>
        </Column>
      }
      canGoNext={
        providerDraft.seriesNameSelector !== null || !!target?.textContent
      }
      onGoNext={() => {
        updateProviderDraft((prev) => ({
          ...prev,
          seriesNameSelector: target?.selector ?? prev.seriesNameSelector,
        }));
        ctx.webView.current?.postMessage(ProviderCreatorMessages.untarget());
      }}
    >
      <Text>{`Current Target: ${target?.textContent}`}</Text>
    </BottomUtility>
  );
}
