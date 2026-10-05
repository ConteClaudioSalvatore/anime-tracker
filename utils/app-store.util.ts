import { translate as t, TranslationError, message } from "@/utils/i18n";
import { Action, AppStoreState, Provider } from "@/model";
import { reducer } from "@/store/app.state";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { StorageAccessFramework } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React from "react";
import { Platform } from "react-native";
import { Storage } from "./storage.util";
import { WriteQueue } from "./write-queue";
import {
  approveProviderOrigin,
  normalizeProviders,
  upsertProviderList,
} from "./provider-runtime";
import { watchListSummary } from "./watch-list";

export const StoreContext = React.createContext<{
  state: AppStoreState;
  stateChanged: () => Promise<void>;
}>({
  state: {
    anime: {},
    providers: [],
  },
  stateChanged: async () => {},
});

export class AppStore {
  private static readonly STATE_KEY = "state";
  private static readonly BACKUP = new File(
    Paths.document,
    "anime-tracker/backup.json",
  );
  private static updateQueue = new WriteQueue();
  private static readonly reducer = reducer;

  public static async Get(): Promise<AppStoreState> {
    return await Storage.getItem<AppStoreState>(this.STATE_KEY).then((res) => {
      if (!res) return { anime: {}, providers: [] };
      //retrocompatibility
      if (!res.anime)
        return {
          anime: res as unknown as AppStoreState["anime"],
          providers: [],
        };
      return { ...res, providers: normalizeProviders(res.providers) };
    });
  }

  public static async Update(
    updater: (prev: AppStoreState) => AppStoreState,
  ): Promise<void> {
    return this.updateQueue.run(async () => {
      const prev = await this.Get();
      const next = updater(prev);
      // Keep startup consistent on every write, including deletion and backup restoration.
      // Older backups contain only history; retain their existing migration path.
      await Storage.setItem(
        this.STATE_KEY,
        Array.isArray(next.providers)
          ? { ...next, providers: normalizeProviders(next.providers) }
          : next,
      );
    });
  }

  public static async Dispatch<TAction extends string, TPayload = never>(
    action: Action<TAction, TPayload>,
  ): Promise<void> {
    await this.Update((prev) => this.reducer(prev, action));
  }

  public static async SaveProvider(provider: Provider): Promise<Provider> {
    let stored: Provider | undefined;
    await this.Update((previous) => {
      const providers = upsertProviderList(previous.providers, provider);
      stored = provider.id
        ? providers.find((item) => item.id === provider.id)
        : providers[0];
      return { ...previous, providers };
    });
    if (!stored) throw new TranslationError(message("provider.storeFailed"));
    return stored;
  }

  public static async ApproveProviderOrigin(
    providerId: number,
    origin: string,
  ): Promise<void> {
    await this.Update((previous) => {
      const provider = previous.providers.find(
        (item) => item.id === providerId,
      );
      if (!provider)
        throw new TranslationError(message("provider.deletedShort"));
      const approved = approveProviderOrigin(provider, origin);
      return {
        ...previous,
        providers: previous.providers.map((item) =>
          item.id === providerId ? approved : item,
        ),
      };
    });
  }

  public static async Backup(): Promise<void> {
    const res = await this.Get();
    if (Platform.OS === "android") {
      await this.SaveAndroidJson(
        "anime-tracker-backup",
        JSON.stringify(res, null, 2),
      );
      return;
    }
    this.BACKUP.create({
      overwrite: true,
      intermediates: true,
    });
    this.BACKUP.write(JSON.stringify(res));

    if (!(await Sharing.isAvailableAsync())) {
      throw new TranslationError(message("backup.sharingUnavailable"));
    }

    await Sharing.shareAsync(this.BACKUP.uri, {
      mimeType: "application/json",
      dialogTitle: t("backup.shareBackup"),
    });
  }

  public static async ExportWatchList(): Promise<void> {
    if (Platform.OS === "android") {
      const state = await this.Get();
      await this.SaveAndroidJson(
        "watch-list",
        JSON.stringify(watchListSummary(state.anime), null, 2),
      );
      return;
    }
    if (!(await Sharing.isAvailableAsync())) {
      throw new TranslationError(message("backup.sharingUnavailable"));
    }
    const state = await this.Get();
    const file = new File(Paths.cache, "anime-tracker/watch-list.json");
    file.create({ overwrite: true, intermediates: true });
    file.write(JSON.stringify(watchListSummary(state.anime), null, 2));
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      dialogTitle: t("backup.shareList"),
    });
  }

  private static async SaveAndroidJson(
    name: string,
    contents: string,
  ): Promise<void> {
    const destination =
      await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!destination.granted) return;
    const uri = await StorageAccessFramework.createFileAsync(
      destination.directoryUri,
      name,
      "application/json",
    );
    try {
      await StorageAccessFramework.writeAsStringAsync(uri, contents);
    } catch (error) {
      try {
        await StorageAccessFramework.deleteAsync(uri);
      } catch {
        // Preserve the original write failure if cleanup is unavailable.
      }
      throw error;
    }
  }

  public static async RestoreBackup(): Promise<void> {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const pickedUri = result.assets[0].uri;

    // read picked file via File handle
    const pickedFile = new File(pickedUri);
    try {
      const jsonString = await pickedFile.text();

      const json = JSON.parse(jsonString);

      return await this.Update(() => json);
    } catch (err) {
      console.error(err);
    }
  }
}
