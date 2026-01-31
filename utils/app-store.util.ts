import { AppState } from "@/model";
import { Storage } from "./storage.util";

export class AppStore {
  private static readonly STATE_KEY = "state";

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
}
