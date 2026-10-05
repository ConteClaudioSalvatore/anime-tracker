import {
  message,
  formatMessage,
  TranslationError,
  type LocalizedMessage,
} from "./i18n";
import { extractionFeedback } from "./runtime-feedback";
import type { Provider } from "../model/provider.model";
import type { Anime } from "../model/anime.model";
import type { EpisodeProgress } from "../model/episode-progress.model";
import type {
  ExtractionPreview,
  PlayerSample,
} from "../model/provider-runtime.model";

export function normalizeWebsite(input: string): string {
  const value = input.trim();
  const url = new URL(
    /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`,
  );
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname.includes(".") ||
    url.username ||
    url.password
  )
    throw new TranslationError(message("validation.websiteAddress"));
  url.hash = "";
  return url.href;
}

export function allowedUrl(provider: Provider<false>, value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      [provider.origin, ...provider.whiteListedOrigins].some(
        (origin) => origin && new URL(origin).origin === url.origin,
      )
    );
  } catch {
    return false;
  }
}

/** Missing frame metadata on Android still represents ordinary navigation. */
export function providerNavigation(
  provider: Provider<false>,
  request: { url: string; isTopFrame?: boolean; hasTargetFrame?: boolean },
): "allow" | "popup" | "blocked" {
  if (request.hasTargetFrame === false) return "popup";
  if (
    request.isTopFrame === false ||
    request.url === "about:blank" ||
    allowedUrl(provider, request.url)
  )
    return "allow";
  return "blocked";
}

export function websiteOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

export function approveProviderOrigin<T extends boolean>(
  provider: Provider<T>,
  value: string,
): Provider<T> {
  const origin = websiteOrigin(value);
  if (!origin) throw new TranslationError(message("validation.httpOnly"));
  return allowedUrl(provider, origin)
    ? provider
    : {
        ...provider,
        whiteListedOrigins: [
          ...new Set([...provider.whiteListedOrigins, origin]),
        ],
      };
}

export function playbackPhase(
  player?: PlayerSample,
): "waiting" | "paused" | "checking" | "verified" {
  if (!player) return "waiting";
  if (player.progress) return "verified";
  return player.playing ? "checking" : "paused";
}

export function learnPageRule(
  pages: string[],
  website: string,
): NonNullable<Provider["pageRule"]> {
  if (pages.length < 2)
    throw new TranslationError(message("validation.differentPages"));
  const urls = pages.map((value) => new URL(value));
  urls.forEach((url) => {
    url.hash = "";
  });
  if (new Set(urls.map((url) => url.href)).size < 2)
    throw new TranslationError(message("validation.differentPages"));
  if (urls.some((url) => url.origin !== new URL(website).origin))
    throw new TranslationError(message("validation.sameWebsite"));
  const segments = urls.map((url) => url.pathname.split("/").filter(Boolean));
  let common = 0;
  while (
    common < Math.min(...segments.map((parts) => parts.length)) &&
    segments.every((parts) => parts[common] === segments[0][common])
  )
    common++;
  // A shared full path can identify query-based series pages; otherwise retain whole path segments only.
  const samePath = urls.every((url) => url.pathname === urls[0].pathname);
  const pathPrefix = samePath
    ? urls[0].pathname
    : "/" + segments[0].slice(0, common).join("/") + (common ? "/" : "");
  const queryKeys = [...urls[0].searchParams.keys()].filter(
    (key) =>
      urls.every((url) => url.searchParams.has(key)) &&
      new Set(urls.map((url) => url.searchParams.get(key))).size > 1,
  );
  return { origin: urls[0].origin, pathPrefix, queryKeys };
}

export function matchesSeries(provider: Provider, value: string): boolean {
  try {
    const url = new URL(value);
    if (!allowedUrl(provider, value)) return false;
    if (!provider.pageRule) {
      const base = new URL(provider.seriesPageOrigin);
      return url.pathname.startsWith(base.pathname);
    }
    const rule = provider.pageRule;
    return (
      url.pathname.startsWith(rule.pathPrefix) &&
      rule.queryKeys.every((key) => url.searchParams.has(key))
    );
  } catch {
    return false;
  }
}

export function providerForUrl(
  providers: Provider[],
  url: string,
  selected?: number,
): Provider | undefined {
  const preferred = providers.find((provider) => provider.id === selected);
  return preferred && allowedUrl(preferred, url)
    ? preferred
    : providers.find((provider) => allowedUrl(provider, url));
}

export function providerEpisodeProgress(
  anime: Record<string, Anime>,
): Record<string, Record<number, EpisodeProgress>> {
  return Object.fromEntries(
    Object.entries(anime)
      .filter(([, item]) => item.episodeProgress)
      .map(([title, item]) => [title, item.episodeProgress!]),
  );
}

export function providerValidationMessage(
  draft: Provider<false>,
): LocalizedMessage | null {
  if (!draft.name?.trim()) return message("validation.name");
  try {
    normalizeWebsite(draft.origin ?? "");
  } catch {
    return message("validation.validWebsite");
  }
  if (!draft.seriesPageOrigin) return message("validation.chooseExamples");
  for (const [field, label] of [
    ["seriesNameSelector", "validation.chooseTitle"],
    ["episodeNumberSelector", "validation.chooseEpisodes"],
    ["totalEpisodesSelector", "validation.chooseTotal"],
  ] as const)
    if (!draft[field]?.trim()) return message(label);
  if (draft.isPlayerSupported === null)
    return message("validation.checkPlayback");
  return null;
}

export function newProviderDraft(): Provider<false> {
  return {
    id: 0,
    isDefault: false,
    whiteListedOrigins: [],
    name: null,
    origin: null,
    seriesPageOrigin: null,
    seriesNameSelector: null,
    episodeNumberSelector: null,
    totalEpisodesSelector: null,
    isPlayerSupported: null,
  };
}

export function providerSaveMessage(
  draft: Provider<false>,
  pages: string[],
  checks: Record<string, ExtractionPreview>,
  saveAnyway: boolean,
): LocalizedMessage | null {
  const invalid = providerValidationMessage(draft);
  if (invalid) return invalid;
  if (pages.length < 2) return message("validation.saveExamples");
  for (const [index, page] of pages.entries()) {
    if (!checks[page])
      return message("validation.exampleUnchecked", { index: index + 1 });
    if (!checks[page].valid)
      return message("validation.exampleFailed", {
        index: index + 1,
        reason: checks[page].errors.length
          ? extractionFeedback(checks[page])
          : message("validation.readFailed"),
      });
  }
  if (!draft.verification?.progress && !saveAnyway)
    return message("validation.verifyOrAcknowledge");
  return null;
}

export function normalizeProviders(providers: Provider[] = []): Provider[] {
  return providers.map((provider) => ({
    ...provider,
    whiteListedOrigins: provider.whiteListedOrigins ?? [],
    isDefault: providers.length === 1 || provider.isDefault,
    // Legacy player flags are retained for compatibility, but are never treated as a verified test.
    verification:
      provider.configurationVersion === 2 ? provider.verification : undefined,
  }));
}

export function upsertProviderList(
  providers: Provider[],
  provider: Provider,
): Provider[] {
  if (!provider.id)
    return [
      {
        ...provider,
        id: Math.max(0, ...providers.map((item) => item.id)) + 1,
        isDefault: providers.length === 0 || provider.isDefault,
      },
      ...providers,
    ];
  if (!providers.some((item) => item.id === provider.id))
    throw new TranslationError(message("provider.deleted"));
  return providers.map((item) =>
    item.id === provider.id
      ? { ...provider, isDefault: providers.length === 1 || provider.isDefault }
      : item,
  );
}

/** String APIs remain available for existing consumers. UI state uses descriptors. */
export function validateProvider(draft: Provider<false>): string | null {
  const invalid = providerValidationMessage(draft);
  return invalid ? formatMessage(invalid) : null;
}
export function providerSaveError(
  draft: Provider<false>,
  pages: string[],
  checks: Record<string, ExtractionPreview>,
  saveAnyway: boolean,
): string | null {
  const invalid = providerSaveMessage(draft, pages, checks, saveAnyway);
  return invalid ? formatMessage(invalid) : null;
}
