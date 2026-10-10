import { useAppTranslation } from "@/hooks/use-app-translation";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  View,
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
          icon={
            Platform.OS === "android"
              ? require("@expo/material-symbols/close.xml")
              : undefined
          }
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
            {source && (
              <View style={step === 0 ? { display: "none" } : styles.screen}>
                <CreatorBrowser creator={creator} />
              </View>
            )}
            <CreatorPanel creator={creator} />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
