import WatchListHeader, {
  WatchListHeaderContext,
} from "@/components/watch-list/header";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  isAnimeFinished,
  onAnimeAction,
  onClearHistory,
  StoreContext,
} from "@/utils";
import { AppStateContext } from "@/utils/app-state.util";
import {
  Button,
  Column,
  Host,
  Icon,
  Row,
  ScrollView,
  Spacer,
  Text,
} from "@expo/ui";
import { HorizontalDivider } from "@expo/ui/jetpack-compose";
import { fillMaxWidth, weight } from "@expo/ui/jetpack-compose/modifiers";

import { Stack, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/build/react-navigation";
import React from "react";
import { Platform, useWindowDimensions } from "react-native";

export default function WatchListScreen() {
  const { state: storeState, stateChanged } = React.useContext(StoreContext);
  const { updateState } = React.useContext(AppStateContext);
  const [searchValue, setSearchValue] = React.useState("");
  const [onlyInProgress, setOnlyInProgress] = React.useState(true);
  const [sortMode, setSortMode] = React.useState<1 | -1>(1);
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const listBackgroundColor = useThemeColor(
    { dark: "#1a1a1a", light: "#ffffff" },
    "background",
  );
  const listTextColor = useThemeColor(
    { dark: "#ffffff", light: "#1a1a1a" },
    "text",
  );

  const isLandscape = width > height;

  const filteredState = React.useMemo(
    () =>
      Object.entries(storeState).filter(
        ([k, v]) =>
          k.toLowerCase().includes(searchValue.toLowerCase()) &&
          (onlyInProgress ? !(isAnimeFinished(v) || v.finished) : true),
      ),
    [storeState, searchValue, onlyInProgress],
  );

  const anyItems = React.useMemo(
    () => filteredState.length > 0,
    [filteredState],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Watch History",
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTransparent: true,
        }}
      />
      <Stack.SearchBar
        placement="automatic"
        placeholder="Search Watch List"
        hideNavigationBar
        onChangeText={(e) => setSearchValue(e.nativeEvent.text)}
      />
      <Host
        style={{
          position: "absolute",
          top: headerHeight,
          bottom: 0,
          insetInline: 0,
        }}
      >
        <Column alignment="center" spacing={8} style={{ padding: 8 }}>
          <WatchListHeaderContext.Provider
            value={{
              isLandscape,
              windowWidth: width,
              anyItems,
              onClear: () => onClearHistory(stateChanged),
              onlyInProgress,
              setOnlyInProgress,
              sortMode,
              setSortMode,
            }}
          >
            <WatchListHeader />
          </WatchListHeaderContext.Provider>
          <Column
            alignment="center"
            spacing={8}
            style={{
              padding: 8,
              backgroundColor: listBackgroundColor,
              borderRadius: 16,
            }}
            modifiers={[weight(1)]}
          >
            <Row spacing={8}>
              <Text textStyle={{ color: "white" }}>Anime</Text>
              <Spacer flexible />
              <Text textStyle={{ color: "white" }}>Episode</Text>
              <Text textStyle={{ color: "white" }}>Action</Text>
            </Row>
            {Platform.OS === "android" && <HorizontalDivider />}
            <ScrollView>
              <Column spacing={0}>
                {anyItems ? (
                  <>
                    {filteredState
                      .sort(([a], [b]) =>
                        sortMode > 0 ? a.localeCompare(b) : b.localeCompare(a),
                      )
                      .map(([animeName, data]) => (
                        <Row
                          alignment="center"
                          spacing={8}
                          style={{ padding: 0 }}
                          key={animeName}
                        >
                          {data.latestVisitedUrl ? (
                            <Button
                              variant="text"
                              modifiers={[weight(1)]}
                              onPress={() => {
                                updateState(
                                  data.latestVisitedUrl
                                    ? {
                                        url: data.latestVisitedUrl,
                                        reload: true,
                                      }
                                    : {},
                                );
                                router.navigate("/");
                              }}
                            >
                              <Text
                                modifiers={[fillMaxWidth()]}
                                textStyle={{ textAlign: "left" }}
                              >
                                {animeName}
                              </Text>
                            </Button>
                          ) : (
                            <Text
                              style={{ padding: 8 }}
                              modifiers={[weight(1)]}
                              textStyle={{ color: listTextColor }}
                            >
                              {animeName}
                            </Text>
                          )}
                          <Text
                            textStyle={{
                              color: isAnimeFinished(data)
                                ? "green"
                                : data.finished
                                  ? "orange"
                                  : "white",
                            }}
                          >
                            {`${data.highestWatchedEpisode} / ${data.total ?? "?"}`}
                          </Text>
                          <Button
                            variant="text"
                            onPress={() =>
                              onAnimeAction(data, router, stateChanged)
                            }
                            label="⛓️"
                          />
                        </Row>
                      ))}
                  </>
                ) : (
                  <Text>nothing to see here 👁️👄👁️</Text>
                )}
              </Column>
            </ScrollView>
          </Column>
          <Button
            onPress={() =>
              router.navigate({
                pathname: "/anime-modal",
                params: {},
              })
            }
            label="Add manually"
          >
            <Icon
              name={Icon.select({
                ios: "plus",
                android: import("@expo/material-symbols/add.xml"),
              })}
            />
            <Text>Add manually</Text>
          </Button>
        </Column>
      </Host>
    </>
  );
}
