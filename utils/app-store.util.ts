import { AppState } from "@/model";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React from "react";
import { Storage } from "./storage.util";

export const StoreContext = React.createContext<{
  state: AppState;
  stateChanged: () => void;
}>({ state: {}, stateChanged: () => {} });

export class AppStore {
  private static readonly STATE_KEY = "state";
  private static readonly BACKUP = new File(
    Paths.document,
    "anime-tracker/backup.json",
  );
  private static updateQueue = Promise.resolve();

  public static async Get(): Promise<AppState> {
    return await Storage.getItem<AppState>(this.STATE_KEY).then(
      (res) => res ?? {},
    );
  }

  public static async Update(
    updater: (prev: AppState) => AppState,
  ): Promise<void> {
    this.updateQueue = this.updateQueue.then(async () => {
      const prev = await this.Get();
      return await Storage.setItem(this.STATE_KEY, updater(prev));
    });
    return await this.updateQueue;
  }

  public static async Backup(): Promise<void> {
    const res = await this.Get();
    this.BACKUP.create({
      overwrite: true,
      intermediates: true,
    });
    this.BACKUP.write(JSON.stringify(res));

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("System sharing not available");
    }

    await Sharing.shareAsync(this.BACKUP.uri, {
      mimeType: "application/json",
      dialogTitle: "Export Anime Tracker Backup",
    });
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
