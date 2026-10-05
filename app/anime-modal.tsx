import AnimeEditorForm from "@/components/anime-editor/editor-form";
import { useAnimeEditor } from "@/hooks/use-anime-editor";
import { Stack } from "expo-router";
import { Platform } from "react-native";

export default function AnimeModal() {
  const editor = useAnimeEditor();

  return (
    <>
      <Stack.Screen
        options={{
          title: editor.title,
          headerBackVisible: false,
          gestureEnabled: !editor.saving,
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
          accessibilityLabel={editor.t("common.close")}
          disabled={editor.saving}
          onPress={editor.close}
        >
          {editor.t("common.close")}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <AnimeEditorForm editor={editor} />
    </>
  );
}
