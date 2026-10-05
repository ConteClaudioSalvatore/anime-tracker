import { useAppTranslation } from "@/hooks/use-app-translation";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useProviderCreator } from "@/hooks/provider-creator/use-provider-creator";
import { CreatorHeader } from "@/components/provider-creator/creator-header";
import { CreatorBrowser } from "@/components/provider-creator/creator-browser";
import { CreatorPanel } from "@/components/provider-creator/creator-panel";
import { styles } from "@/components/provider-creator/creator-styles";

export default function ProviderCreatorScreen() {
  const t = useAppTranslation();
  const creator = useProviderCreator();
  const { colors, id, router, state } = creator;
  const { initialized, saving } = state.setup;
  const { step } = state.wizard;
  const { source } = state.browser;
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.screen, { backgroundColor: colors.bg }]}
    >
      <Stack.Screen
        options={{
          title: id ? t("provider.edit") : t("provider.add"),
          gestureEnabled: false,
          headerBackVisible: false,
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          variant="plain"
          accessibilityLabel={t("provider.closeSetup")}
          onPress={() => router.back()}
          disabled={saving}
        >
          {t("common.close")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {!initialized ? (
          <ActivityIndicator accessibilityLabel={t("provider.loading")} />
        ) : (
          <>
            <CreatorHeader creator={creator} />
            {source && step > 0 && <CreatorBrowser creator={creator} />}
            <CreatorPanel creator={creator} />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
