import WatchListHeader from "@/components/watch-list/header";
import WatchListRow from "@/components/watch-list/row";
import { useWatchList } from "@/hooks/use-watch-list";
import {
  Button,
  Divider,
  Host,
  LazyVStack,
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
} from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import { PlatformColor } from "react-native";

export default function WatchListScreen() {
  const list = useWatchList();
  const { t } = list;

  return (
    <>
      <Stack.Screen
        options={{ title: t("watch.title"), headerTransparent: true }}
      />
      <Stack.SearchBar
        placement="automatic"
        placeholder={t("watch.search")}
        hideNavigationBar
        onChangeText={(event) => list.setSearchValue(event.nativeEvent.text)}
      />
      <Host
        style={{
          flex: 1,
          backgroundColor: PlatformColor("systemGroupedBackgroundColor"),
        }}
      >
        <ScrollView>
          <VStack
            spacing={16}
            modifiers={[
              padding({ horizontal: 16, top: 8, bottom: 24 }),
              frame({ maxWidth: Infinity }),
            ]}
          >
            <WatchListHeader {...list} />
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
                        <Divider modifiers={[padding({ horizontal: 16 })]} />
                      )}
                      <WatchListRow
                        name={name}
                        anime={anime}
                        onOpen={() => list.onOpen(anime)}
                        onEdit={() => list.onEdit(anime)}
                        onToggleFinished={() => list.onToggleFinished(anime)}
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
      </Host>
    </>
  );
}
