import type { Provider } from "../model/provider.model";
import { providerNavigation, websiteOrigin } from "./provider-runtime";

type Context = { provider: Provider<false>; pageKey: string };
type Callbacks = {
  current: () => Context | null;
  confirm: (provider: Provider<false>, origin: string) => Promise<boolean>;
  approve: (provider: Provider<false>, origin: string) => Promise<void>;
  navigate: (url: string) => void;
  onError: (message: string) => void;
};

/** Block navigation synchronously, then replay it only after approval succeeds. */
export class ProviderNavigationGuard {
  pending: Promise<void> | null = null;

  constructor(private callbacks: Callbacks) {}

  handle(request: {
    url: string;
    isTopFrame?: boolean;
    hasTargetFrame?: boolean;
  }): boolean {
    const context = this.callbacks.current();
    if (!context) return false;
    const decision = providerNavigation(context.provider, request);
    if (decision === "allow") return true;
    if (decision === "popup") return false;
    const origin = websiteOrigin(request.url);
    if (!origin) {
      this.callbacks.onError(
        "This link is not an HTTP or HTTPS website address.",
      );
      return false;
    }
    if (!this.pending) {
      this.pending = this.request(context, origin, request.url).finally(() => {
        this.pending = null;
      });
    }
    return false;
  }

  private async request(
    context: Context,
    origin: string,
    url: string,
  ): Promise<void> {
    const stillCurrent = () => {
      const current = this.callbacks.current();
      return (
        current?.provider.id === context.provider.id &&
        current.pageKey === context.pageKey
      );
    };
    try {
      const accepted = await this.callbacks.confirm(context.provider, origin);
      if (!stillCurrent()) return;
      if (!accepted) return;
      await this.callbacks.approve(context.provider, origin);
      if (stillCurrent()) this.callbacks.navigate(url);
    } catch {
      if (stillCurrent())
        this.callbacks.onError(
          "Could not save the approved website address. The page stayed blocked. Try again.",
        );
    }
  }
}
