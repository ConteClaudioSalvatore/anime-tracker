import { useProviderCreator } from "@/utils/provider-creator.utils";
import { Button, Text } from "@expo/ui";
import React from "react";
import BottomUtility from "./bottom-utility";

export default function AnimePageLearner() {
  const [pages, setPages] = React.useState<string[]>([]);
  const ctx = useProviderCreator();
  if (!ctx) return null;
  const { currentUri, updateProviderDraft, providerDraft } = ctx;

  const commonPrefix = (strings: string[]): string | null => {
    if (!strings.length) return null;

    let prefix = strings[0];

    for (const str of strings.slice(1)) {
      while (!str.startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
        if (!prefix) return "";
      }
    }

    return prefix;
  };

  return (
    <BottomUtility
      stepTitle="Series Page Learner"
      stepInfo={
        <Text textStyle={{ color: "white", fontSize: 18, textAlign: "center" }}>
          Navigate the website and open at least 2 pages with different series
        </Text>
      }
      canGoNext={pages.length >= 2 || !!providerDraft.seriesPageOrigin}
      onGoBack={() => {
        updateProviderDraft((prev) => ({
          ...prev,
          seriesPageOrigin: commonPrefix(pages) ?? prev.seriesPageOrigin,
        }));
      }}
    >
      <Button
        disabled={currentUri == null}
        onPress={() => setPages((prev) => [...new Set([...prev, currentUri!])])}
      >
        <Text>
          {"Select Page" + (pages.length ? ` (${pages.length})` : "")}
        </Text>
      </Button>
    </BottomUtility>
  );
}
