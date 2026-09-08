import { useProviderCreator } from "@/utils/provider-creator.utils";
import { BottomSheet, Button, Column, Host, Icon, Row, Text } from "@expo/ui";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AnimePageLearner() {
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const [pages, setPages] = React.useState<string[]>([]);
  const ctx = useProviderCreator();
  if (!ctx) return null;
  const { currentUri, updateStep, updateProviderDraft } = ctx;

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
    <SafeAreaView
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 0,
        insetInline: 16,
        backgroundColor: "transparent",
      }}
    >
      <Host matchContents={{ vertical: true }}>
        <Column
          alignment="center"
          spacing={8}
          style={{ backgroundColor: "gray", borderRadius: 16, padding: 8 }}
          modifiers={[fillMaxWidth()]}
        >
          <Row alignment="center">
            <Text textStyle={{ color: "white", fontSize: 24 }}>Anime Page</Text>
            <Button variant="text" onPress={() => setIsInfoOpen(!isInfoOpen)}>
              <Icon
                name={Icon.select({
                  ios: "info.circle",
                  android: import("@expo/material-symbols/info.xml"),
                })}
              />
            </Button>
          </Row>
          <BottomSheet
            isPresented={isInfoOpen}
            onDismiss={() => setIsInfoOpen(false)}
          >
            <Text
              textStyle={{ color: "white", fontSize: 18, textAlign: "center" }}
            >
              Navigate the website and open at least 2 pages with different
              series
            </Text>
          </BottomSheet>
          <Button
            disabled={currentUri == null}
            onPress={() =>
              setPages((prev) => [...new Set([...prev, currentUri!])])
            }
          >
            <Text>
              {"Select Page" + (pages.length ? ` (${pages.length})` : "")}
            </Text>
          </Button>
          <Row spacing={8}>
            <Button onPress={() => updateStep((prev) => prev - 1)}>
              <Icon
                name={Icon.select({
                  ios: "arrow.left",
                  android: import("@expo/material-symbols/arrow_left.xml"),
                })}
              />
              <Text>Back</Text>
            </Button>
            <Button
              disabled={pages.length < 2}
              onPress={() => {
                updateProviderDraft((prev) => ({
                  ...prev,
                  animePageOrigin: commonPrefix(pages),
                }));
                updateStep((prev) => prev + 1);
              }}
            >
              <Icon
                name={Icon.select({
                  ios: "arrow.right",
                  android: import("@expo/material-symbols/arrow_right.xml"),
                })}
              />
              <Text>Next</Text>
            </Button>
          </Row>
        </Column>
      </Host>
    </SafeAreaView>
  );
}
