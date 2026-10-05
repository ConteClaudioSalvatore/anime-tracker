import { useAppTranslation } from "@/hooks/use-app-translation";
import SettingsProviders from "@/components/settings/providers";
import { StoreContext } from "@/utils";
import {
  exportWatchList,
  restoreBackup,
  saveBackup,
} from "@/utils/backup.util";
import {
  Button,
  Form,
  Host,
  HStack,
  Section,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  buttonStyle,
  controlSize,
  disabled,
  frame,
  padding,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useWindowDimensions } from "react-native";

export default function SettingsScreen() {
  const t = useAppTranslation();
  const { stateChanged } = React.useContext(StoreContext);
  const { width } = useWindowDimensions();
  const [exporting, setExporting] = React.useState(false);

  async function exportSummary() {
    setExporting(true);
    try {
      await exportWatchList();
    } finally {
      setExporting(false);
    }
  }

  return (
    <Host
      style={{
        flex: 1,
      }}
    >
      <VStack
        modifiers={[
          frame({
            width,
          }),
          padding({
            vertical: 8,
          }),
        ]}
      >
        <Form>
          <SettingsProviders />
          <Section
            title={t("backup.exportSection")}
            footer={<Text>{t("backup.exportHelp")}</Text>}
          >
            <Button
              label={exporting ? t("backup.exporting") : t("backup.exportList")}
              systemImage="square.and.arrow.up"
              modifiers={[
                buttonStyle(isLiquidGlassAvailable() ? "glass" : "bordered"),
                controlSize("small"),
                disabled(exporting),
              ]}
              onPress={exportSummary}
            />
          </Section>
        </Form>
        <HStack>
          <Button
            label={t("backup.backup")}
            systemImage="square.and.arrow.up"
            modifiers={[
              buttonStyle("glassProminent"),
              tint("#00ff5588"),
              controlSize("large"),
            ]}
            onPress={saveBackup}
          />
          <Button
            modifiers={[
              buttonStyle("glassProminent"),
              tint("#88880088"),
              controlSize("large"),
            ]}
            systemImage="square.and.arrow.down"
            label={t("backup.restore")}
            onPress={() => restoreBackup(stateChanged)}
          />
        </HStack>
      </VStack>
    </Host>
  );
}
