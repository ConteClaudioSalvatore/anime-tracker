export type AppState = {
  providerId?: number;
  url?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  browserLoading?: boolean;
  reload?: boolean;
  browserSheet?: "providers" | "status";
};
