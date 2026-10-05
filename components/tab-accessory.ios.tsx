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
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { usePathname } from "expo-router";
import { useContext } from "react";

export default function TabAccessory() {
  const pathName = usePathname();
  const t = useAppTranslation();
  const list = useWatchListContext();
  const { stateChanged } = useContext(StoreContext);
  const actionModifiers = [
    buttonStyle("glassProminent"),
    buttonBorderShape("capsule"),
    controlSize("regular"),
    foregroundStyle("white"),
  ];

  if (pathName === "/") return <NavigationAccessory />;

  return (
    <Host style={{ position: "absolute", inset: 0 }}>
      {pathName.startsWith("/watch-list") ? (
        <WatchListHeader {...list} />
      ) : (
        <HStack spacing={8} modifiers={[padding({ all: 8 })]}>
          <Button
            onPress={saveBackup}
            modifiers={[...actionModifiers, tint("#00ff5588")]}
          >
            <Label
              title={t("backup.backup")}
              systemImage="square.and.arrow.up"
              modifiers={[frame({ height: 24 })]}
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
              modifiers={[frame({ height: 24 })]}
            />
          </Button>
        </HStack>
      )}
    </Host>
  );
}
