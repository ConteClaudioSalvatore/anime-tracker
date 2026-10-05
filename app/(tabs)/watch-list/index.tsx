import WatchListHeader from "@/components/watch-list/header";
import WatchListRow from "@/components/watch-list/row";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useWatchList } from "@/hooks/use-watch-list";
import { Button, Column, Host, ScrollView, Text } from "@expo/ui";
import { HorizontalDivider } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";
import { Stack } from "expo-router";
import { useHeaderHeight } from "expo-router/build/react-navigation";
import { Platform } from "react-native";

export default function WatchListScreen() {
  const list = useWatchList();
  const { t } = list;
  const headerHeight = useHeaderHeight();
  const backgroundColor = useThemeColor(
    { light: "#ffffff", dark: "#1c1c1e" },
    "background",
  );
  const textColor = useThemeColor({}, "text");
  const secondaryColor = useThemeColor(
    { light: "#62626a", dark: "#b0b0b8" },
    "text",
  );

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
          position: "absolute",
          top: headerHeight,
          bottom: 0,
          insetInline: 0,
        }}
      >
        <Column
          spacing={16}
          style={{ padding: 16, height: "100%", width: "100%" }}
        >
          <WatchListHeader {...list} />
          <ScrollView style={{ width: "100%" }} modifiers={[weight(1)]}>
            {list.items.length ? (
              <Column
                spacing={0}
                style={{ backgroundColor, borderRadius: 20, width: "100%" }}
              >
                {list.items.map(([name, data], index) => {
                  const anime = { ...data, name: data.name ?? name };
                  return (
                    <Column key={name} modifiers={[fillMaxWidth()]}>
                      {index > 0 && Platform.OS === "android" && (
                        <HorizontalDivider />
                      )}
                      <WatchListRow
                        name={name}
                        anime={anime}
                        providerName={list.providerName(anime)}
                        onOpen={() => list.onOpen(anime)}
                        onEdit={() => list.onEdit(anime)}
                        onToggleFinished={() => list.onToggleFinished(anime)}
                        onRemove={() => list.onRemove(anime)}
                      />
                    </Column>
                  );
                })}
              </Column>
            ) : (
              <Column
                alignment="center"
                spacing={12}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 48,
                  width: "100%",
                }}
              >
                <Text
                  textStyle={{
                    fontSize: 20,
                    fontWeight: "600",
                    color: textColor,
                    textAlign: "center",
                  }}
                >
                  {list.emptyTitle}
                </Text>
                <Text
                  textStyle={{
                    fontSize: 16,
                    color: secondaryColor,
                    textAlign: "center",
                  }}
                >
                  {list.emptyDetail}
                </Text>
                {list.emptyKind === "history" && (
                  <Button
                    variant="outlined"
                    label={t("watch.addManually")}
                    onPress={list.onAdd}
                  />
                )}
                {list.emptyKind === "watching" && (
                  <Button
                    variant="outlined"
                    label={t("watch.all")}
                    onPress={() => list.setOnlyInProgress(false)}
                  />
                )}
              </Column>
            )}
          </ScrollView>
        </Column>
      </Host>
    </>
  );
}
