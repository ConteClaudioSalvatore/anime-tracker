import NavigationAccessory from "@/components/navigation-accessory";
import WatchListHeader from "@/components/watch-list/header";
import { useAppTranslation } from "@/hooks/use-app-translation";
import { useWatchListContext } from "@/hooks/use-watch-list";
import { StoreContext } from "@/utils";
import { restoreBackup, saveBackup } from "@/utils/backup.util";
import { Button, Host, HStack, Label, Spacer } from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  foregroundStyle,
  frame,
  labelStyle,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useContext } from "react";

export default function TabAccessory() {
  const pathName = usePathname();
  const isInline = NativeTabs.BottomAccessory.usePlacement() === "inline";
  const t = useAppTranslation();
  const list = useWatchListContext();
  const { stateChanged } = useContext(StoreContext);
  const actionModifiers = [
    buttonStyle("glassProminent"),
    buttonBorderShape(isInline ? "circle" : "capsule"),
    controlSize(isInline ? "small" : "regular"),
    labelStyle(isInline ? "iconOnly" : "titleAndIcon"),
    foregroundStyle("white"),
  ];

  if (pathName === "/") return <NavigationAccessory />;

  return (
    <Host style={{ position: "absolute", inset: 0 }}>
      {pathName.startsWith("/watch-list") ? (
        <WatchListHeader {...list} />
      ) : (
        <HStack spacing={isInline ? 4 : 8} modifiers={[padding({ all: 8 })]}>
          <Button
            onPress={saveBackup}
            modifiers={[...actionModifiers, tint("#00ff5588")]}
          >
            <Label
              title={t("backup.backup")}
              systemImage="square.and.arrow.up"
              modifiers={[
                frame({ width: isInline ? 24 : undefined, height: 24 }),
              ]}
            />
          </Button>
          <Spacer />
          <Button
            onPress={() => restoreBackup(stateChanged)}
            modifiers={[...actionModifiers, tint("#88880088")]}
          >
            <Label
              title={t("backup.restore")}
              systemImage="square.and.arrow.down"
              modifiers={[
                frame({ width: isInline ? 24 : undefined, height: 24 }),
              ]}
            />
          </Button>
        </HStack>
      )}
    </Host>
  );
}
