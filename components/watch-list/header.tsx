import {
  BottomSheet,
  Button,
  Column,
  Icon,
  Picker,
  Row,
  Spacer,
  Switch,
  Text,
} from "@expo/ui";
import {
  Button as AndroidButton,
  Badge,
  BadgedBox,
} from "@expo/ui/jetpack-compose";

import React from "react";
import { Platform } from "react-native";

export const WatchListHeaderContext = React.createContext<{
  isLandscape: boolean;
  windowWidth: number;
  anyItems: boolean;
  onClear: () => void;
  onlyInProgress: boolean;
  setOnlyInProgress: (value: boolean) => void;
  sortMode: 1 | -1;
  setSortMode: (value: 1 | -1) => void;
  setMenuOpen?: (value: boolean) => void;
} | null>(null);

export default function WatchListHeader() {
  const contextValue = React.useContext(WatchListHeaderContext);
  const [menuOpen, setMenuOpen] = React.useState(false);

  if (!contextValue) return null;

  const {
    anyItems,
    onClear,
    onlyInProgress,
    setOnlyInProgress,
    sortMode,
    setSortMode,
  } = contextValue;

  return (
    <Row>
      <Spacer flexible />
      {anyItems && (
        <AndroidButton
          colors={{
            containerColor: "#dd3333",
            contentColor: "#ffffff",
          }}
          onClick={onClear}
        >
          <Icon
            name={Icon.select({
              ios: "bin.xmark",
              android: import("@expo/material-symbols/delete.xml"),
            })}
          ></Icon>
          <Text>CLEAR</Text>
        </AndroidButton>
      )}
      {Platform.OS === "android" ? (
        <BadgedBox>
          <BadgedBox.Badge>
            {onlyInProgress && (
              <Badge containerColor="#00aaff" contentColor="#ffffff">
                <Text>1</Text>
              </Badge>
            )}
          </BadgedBox.Badge>

          <Button variant="text" onPress={() => setMenuOpen(true)}>
            <Text>Settings</Text>
            <Icon
              name={Icon.select({
                ios: "slider.horizontal.3",
                android: import("@expo/material-symbols/filter_list.xml"),
              })}
            />
          </Button>
        </BadgedBox>
      ) : (
        <Button variant="text" onPress={() => setMenuOpen(true)}>
          <Text>Settings</Text>
          <Icon
            name={Icon.select({
              ios: "slider.horizontal.3",
              android: import("@expo/material-symbols/filter_list.xml"),
            })}
          />
        </Button>
      )}
      <BottomSheet isPresented={menuOpen} onDismiss={() => setMenuOpen(false)}>
        <Column spacing={8}>
          <Row alignment="center">
            <Text>Sort By</Text>
            <Spacer flexible />
            <Picker
              appearance="menu"
              selectedValue={sortMode}
              onValueChange={(e) => setSortMode(e)}
            >
              <Picker.Item value={1} label="A-Z" />
              <Picker.Item value={-1} label="Z-A" />
            </Picker>
          </Row>
          <Switch
            label="Only show in progress"
            value={onlyInProgress}
            onValueChange={(e) => setOnlyInProgress(e)}
          />
        </Column>
      </BottomSheet>
    </Row>
  );
}
