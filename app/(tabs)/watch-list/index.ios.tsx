import WatchListRow from "@/components/watch-list/row";
import { useWatchListContext } from "@/hooks/use-watch-list";
import {
  Button,
  Divider,
  Host,
  LazyVStack,
  Mask,
  Picker,
  Rectangle,
  ScrollView,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  cornerRadius,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  multilineTextAlignment,
  padding,
  pickerStyle,
  tag,
} from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/build/react-navigation";
import { useState } from "react";
import { Platform, PlatformColor } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WatchListScreen() {
  const list = useWatchListContext();
  const { t } = list;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const edgeFadeHeight = 24;
  const iosVersion = Number.parseInt(String(Platform.Version), 10);
  const [searchFocused, setSearchFocused] = useState(false);
  const removeBottomPadding = iosVersion >= 27 && searchFocused;
  const bottomInset = removeBottomPadding ? 0 : insets.bottom;
  const bottomFadeHeight = removeBottomPadding ? 0 : edgeFadeHeight;

  return (
    <>
      <Stack.Screen
        options={{ title: t("watch.title"), headerTransparent: true }}
      />
      <Stack.SearchBar
        placement={iosVersion >= 26 ? "integrated" : "automatic"}
        placeholder={t("watch.search")}
        hideNavigationBar
        onFocus={() => setSearchFocused(true)}
        onBlur={() => setSearchFocused(false)}
        onCancelButtonPress={() => setSearchFocused(false)}
        onChangeText={(event) => list.setSearchValue(event.nativeEvent.text)}
      />
      <Host
        ignoreSafeArea="container"
        style={{
          flex: 1,
          backgroundColor: PlatformColor("systemGroupedBackgroundColor"),
        }}
      >
        <VStack
          spacing={0}
          modifiers={[
            // Host padding does not inset its SwiftUI children. Reserve the native header here.
            padding({ horizontal: 16, top: headerHeight + 8 }),
            frame({
              maxWidth: Infinity,
              maxHeight: Infinity,
              alignment: "top",
            }),
          ]}
        >
          <Picker
            label={t("watch.filter")}
            selection={list.onlyInProgress ? "watching" : "all"}
            onSelectionChange={(value) =>
              list.setOnlyInProgress(value === "watching")
            }
            modifiers={[pickerStyle("segmented")]}
          >
            <Text modifiers={[tag("watching")]}>{t("watch.watching")}</Text>
            <Text modifiers={[tag("all")]}>{t("watch.all")}</Text>
          </Picker>
          <Mask
            alignment="top"
            modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}
          >
            <Mask.Content>
              <VStack spacing={0}>
                <Rectangle
                  modifiers={[
                    frame({ height: edgeFadeHeight }),
                    foregroundStyle({
                      type: "linearGradient",
                      colors: ["transparent", "black"],
                      startPoint: { x: 0.5, y: 0 },
                      endPoint: { x: 0.5, y: 1 },
                    }),
                  ]}
                />
                <Rectangle
                  modifiers={[
                    foregroundStyle("black"),
                    frame({ maxWidth: Infinity, maxHeight: Infinity }),
                  ]}
                />
                <Rectangle
                  modifiers={[
                    frame({ height: bottomFadeHeight }),
                    foregroundStyle({
                      type: "linearGradient",
                      colors: ["black", "transparent"],
                      startPoint: { x: 0.5, y: 0 },
                      endPoint: { x: 0.5, y: 1 },
                    }),
                  ]}
                />
                <Rectangle
                  modifiers={[
                    frame({ height: bottomInset }),
                    foregroundStyle("transparent"),
                  ]}
                />
              </VStack>
            </Mask.Content>
            <ScrollView
              modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}
            >
              <VStack
                modifiers={[
                  padding({
                    top: edgeFadeHeight,
                    bottom: bottomInset + bottomFadeHeight,
                  }),
                  frame({ maxWidth: Infinity }),
                ]}
              >
                {list.items.length ? (
                  <LazyVStack
                    spacing={0}
                    modifiers={[
                      background(
                        PlatformColor("secondarySystemGroupedBackgroundColor"),
                      ),
                      cornerRadius(20),
                    ]}
                  >
                    {list.items.map(([name, data], index) => {
                      const anime = { ...data, name: data.name ?? name };
                      return (
                        <VStack key={name} spacing={0}>
                          {index > 0 && (
                            <Divider
                              modifiers={[padding({ horizontal: 16 })]}
                            />
                          )}
                          <WatchListRow
                            name={name}
                            anime={anime}
                            providerName={list.providerName(anime)}
                            onOpen={() => list.onOpen(anime)}
                            onEdit={() => list.onEdit(anime)}
                            onToggleFinished={() =>
                              list.onToggleFinished(anime)
                            }
                            onRemove={() => list.onRemove(anime)}
                          />
                        </VStack>
                      );
                    })}
                  </LazyVStack>
                ) : (
                  <VStack
                    spacing={12}
                    modifiers={[
                      padding({ horizontal: 16, vertical: 48 }),
                      frame({ maxWidth: Infinity }),
                    ]}
                  >
                    <Text
                      modifiers={[
                        font({ textStyle: "title3", weight: "semibold" }),
                        multilineTextAlignment("center"),
                        fixedSize({ horizontal: false, vertical: true }),
                      ]}
                    >
                      {list.emptyTitle}
                    </Text>
                    <Text
                      modifiers={[
                        font({ textStyle: "body" }),
                        foregroundStyle({
                          type: "hierarchical",
                          style: "secondary",
                        }),
                        multilineTextAlignment("center"),
                        fixedSize({ horizontal: false, vertical: true }),
                      ]}
                    >
                      {list.emptyDetail}
                    </Text>
                    {list.emptyKind === "history" && (
                      <Button
                        label={t("watch.addManually")}
                        systemImage="plus"
                        onPress={list.onAdd}
                        modifiers={[buttonStyle("glass")]}
                      />
                    )}
                    {list.emptyKind === "watching" && (
                      <Button
                        label={t("watch.all")}
                        onPress={() => list.setOnlyInProgress(false)}
                        modifiers={[buttonStyle("glass")]}
                      />
                    )}
                  </VStack>
                )}
              </VStack>
            </ScrollView>
          </Mask>
        </VStack>
      </Host>
    </>
  );
}
