import AsyncStorage from "@react-native-async-storage/async-storage";

export class Storage {
  public static async setItem<T>(key: string, value: T): Promise<void> {
    console.log(key, value);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error("Error setting item:", e);
    }
  }

  public static async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error("Error getting item:", e);
    }
    return null;
  }

  public static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing item:", error);
    }
  }
}
