import { ProviderCreatorStep } from "@/model";
import { useProviderCreator } from "@/utils/provider-creator.utils";
import { BottomSheet, Button, Column, Host, Icon, Row, Text } from "@expo/ui";
import { fillMaxWidth } from "@expo/ui/jetpack-compose/modifiers";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BottomUtility(props: {
  stepTitle: string;
  stepInfo: React.ReactNode;
  children: React.ReactNode;
  canGoBack?: boolean;
  canGoNext?: boolean;
  onGoBack?: () => void;
  onGoNext?: () => void;
}) {
  const { canGoBack = true, canGoNext = true } = props;
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const ctx = useProviderCreator();
  if (!ctx) return null;
  const { updateStep, step } = ctx;

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
            <Text textStyle={{ color: "white", fontSize: 24 }}>
              {props.stepTitle}
            </Text>
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
            {props.stepInfo}
          </BottomSheet>
          {props.children}
          <Row spacing={8}>
            {step > ProviderCreatorStep.Info && (
              <Button
                disabled={!canGoBack}
                onPress={() => {
                  props.onGoBack?.();
                  updateStep((prev) => prev - 1);
                }}
              >
                <Icon
                  name={Icon.select({
                    ios: "arrow.left",
                    android: import("@expo/material-symbols/arrow_left.xml"),
                  })}
                />
                <Text>Back</Text>
              </Button>
            )}
            {step < ProviderCreatorStep.Done && (
              <Button
                disabled={!canGoNext}
                onPress={() => {
                  props.onGoNext?.();
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
            )}
          </Row>
        </Column>
      </Host>
    </SafeAreaView>
  );
}
