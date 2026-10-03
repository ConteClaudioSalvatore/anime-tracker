export type AppState = {
  providerId?: number;
  url?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
  reload?: boolean;
  browserSheet?: 'providers' | 'status';
};
