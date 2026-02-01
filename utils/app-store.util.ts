import { AppState } from "@/model";
import { File, Paths } from "expo-file-system";
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

  public static async Get(): Promise<AppState> {
    return Storage.getItem<AppState>(this.STATE_KEY).then((res) => res ?? {});
  }

  public static async Update(
    updater: (prev: AppState) => AppState,
  ): Promise<void> {
    return this.Get().then((prev) =>
      Storage.setItem(this.STATE_KEY, updater(prev)),
    );
  }

  public static async Backup(): Promise<void> {
    return await this.Get().then((res) => {
      this.BACKUP.create({
        overwrite: true,
        intermediates: true,
      });
      this.BACKUP.write(JSON.stringify(res));
    });
  }

  public static async RestoreBackup(): Promise<void> {
    if (!this.BACKUP.exists) return;
    return await this.Update(() => JSON.parse(this.BACKUP.textSync()));
  }
}
