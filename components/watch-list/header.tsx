import {
  Button,
  HStack,
  Menu,
  Overlay,
  Picker,
  Spacer,
  Text,
  Toggle
} from "@expo/ui/swift-ui";
import {
  background,
  buttonStyle,
  clipShape,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  ModifierConfig,
  offset,
  pickerStyle,
  tag,
  tint
} from "@expo/ui/swift-ui/modifiers";
import { SFSymbol } from "expo-symbols";
import React from "react";

export const WatchListHeaderContext = React.createContext<{
  isLandscape: boolean;
  windowWidth: number;
  anyItems: boolean;
  onClear: () => void;
  onlyInProgress: boolean;
  setOnlyInProgress: (value: boolean) => void;
  sortMode: 1 | -1;
  setSortMode: (value: 1 | -1) => void;
} | null>(null);

export default function WatchListHeader({
  modifiers,
}: {
  modifiers?: ModifierConfig[];
}) {
  const contextValue = React.useContext(WatchListHeaderContext);

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
    <HStack modifiers={modifiers}>
      <Text>Watched</Text>
      <Spacer />
      {anyItems && (
        <Button
          modifiers={[tint("#ff000044"), buttonStyle("glassProminent")]}
          onPress={onClear}
        >
          <Text modifiers={[foregroundStyle("white")]}>CLEAR</Text>
        </Button>
      )}
      <Overlay alignment="topTrailing">
        <Menu
          label={"Settings"}
          modifiers={[labelStyle("titleAndIcon")]}
          systemImage={"slider.horizontal.3" satisfies SFSymbol}
        >
          <Picker
            selection={sortMode}
            onSelectionChange={(e) => setSortMode(e)}
            modifiers={[pickerStyle("menu")]}
            label="Sort By"
          >
            {[1, -1].map((sort) => (
              <Text key={`${sort > 0 ? "A-Z" : "Z-A"}`} modifiers={[tag(sort)]}>
                {sort > 0 ? "A-Z" : "Z-A"}
              </Text>
            ))}
          </Picker>
          <Toggle
            isOn={onlyInProgress}
            onIsOnChange={(e) => setOnlyInProgress(e)}
            label="Only show in progress"
          />
        </Menu>
        <Overlay.Content>
          {onlyInProgress && (
            <Text
              modifiers={[
                font({ size: 11, weight: "bold" }),
                foregroundStyle("#FFFFFF"),
                frame({ width: 18, height: 18 }),
                background("#00aaff"),
                clipShape("circle"),
                offset({ x: 8, y: -8 }),
              ]}
            >
              1
            </Text>
          )}
        </Overlay.Content>
      </Overlay>
    </HStack>
  );
}
