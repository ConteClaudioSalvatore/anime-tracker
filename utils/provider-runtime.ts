import type { Provider } from '../model/provider.model';
import type { Anime } from '../model/anime.model';
import type { EpisodeProgress } from '../model/episode-progress.model';
import type { ExtractionPreview, PlayerSample } from '../model/provider-runtime.model';

export function normalizeWebsite(input: string): string {
  const value = input.trim();
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password)
    throw new Error('Enter a website address, such as https://example.com.');
  url.hash = '';
  return url.href;
}

export function allowedUrl(provider: Provider<false>, value: string): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) &&
      [provider.origin, ...provider.whiteListedOrigins].some(origin => origin && new URL(origin).origin === url.origin);
  } catch { return false; }
}

/** Missing frame metadata on Android still represents ordinary navigation. */
export function providerNavigation(provider: Provider<false>, request: { url: string; isTopFrame?: boolean; hasTargetFrame?: boolean }): 'allow' | 'popup' | 'blocked' {
  if (request.hasTargetFrame === false) return 'popup';
  if (request.isTopFrame === false || request.url === 'about:blank' || allowedUrl(provider, request.url)) return 'allow';
  return 'blocked';
}

export function playbackPhase(player?: PlayerSample): 'waiting' | 'paused' | 'checking' | 'verified' {
  if (!player) return 'waiting';
  if (player.progress) return 'verified';
  return player.playing ? 'checking' : 'paused';
}

export function learnPageRule(pages: string[], website: string): NonNullable<Provider['pageRule']> {
  if (pages.length < 2) throw new Error('Choose two different series pages.');
  const urls = pages.map(value => new URL(value));
  urls.forEach(url => { url.hash = ''; });
  if (new Set(urls.map(url => url.href)).size < 2) throw new Error('Choose two different series pages.');
  if (urls.some(url => url.origin !== new URL(website).origin)) throw new Error('Choose pages on this website.');
  const segments = urls.map(url => url.pathname.split('/').filter(Boolean));
  let common = 0;
  while (common < Math.min(...segments.map(parts => parts.length)) && segments.every(parts => parts[common] === segments[0][common])) common++;
  // A shared full path can identify query-based series pages; otherwise retain whole path segments only.
  const samePath = urls.every(url => url.pathname === urls[0].pathname);
  const pathPrefix = samePath ? urls[0].pathname : '/' + segments[0].slice(0, common).join('/') + (common ? '/' : '');
  const queryKeys = [...urls[0].searchParams.keys()].filter(key => urls.every(url => url.searchParams.has(key)) && new Set(urls.map(url => url.searchParams.get(key))).size > 1);
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
    return url.pathname.startsWith(rule.pathPrefix) && rule.queryKeys.every(key => url.searchParams.has(key));
  } catch { return false; }
}

export function providerForUrl(providers: Provider[], url: string, selected?: number): Provider | undefined {
  const preferred = providers.find(provider => provider.id === selected);
  return preferred && allowedUrl(preferred, url) ? preferred : providers.find(provider => allowedUrl(provider, url));
}

export function providerEpisodeProgress(anime: Record<string, Anime>, providerId: number): Record<string, Record<number, EpisodeProgress>> {
  return Object.fromEntries(Object.entries(anime)
    .filter(([, item]) => item.episodeProgress && (item.providerId === providerId || item.providerId === undefined))
    .map(([title, item]) => [title, item.episodeProgress!]));
}

export function validateProvider(draft: Provider<false>): string | null {
  if (!draft.name?.trim()) return 'Enter a provider name.';
  try { normalizeWebsite(draft.origin ?? ''); } catch { return 'Enter a valid website address.'; }
  if (!draft.seriesPageOrigin) return 'Choose example series pages.';
  for (const [field, label] of [['seriesNameSelector', 'series title'], ['episodeNumberSelector', 'episodes'], ['totalEpisodesSelector', 'total episodes']] as const)
    if (!draft[field]?.trim()) return `Choose the ${label} on the page.`;
  if (draft.isPlayerSupported === null) return 'Run the video test before saving.';
  return null;
}

export function newProviderDraft(): Provider<false> {
  return { id: 0, isDefault: false, whiteListedOrigins: [], name: null, origin: null, seriesPageOrigin: null,
    seriesNameSelector: null, episodeNumberSelector: null, totalEpisodesSelector: null, isPlayerSupported: null };
}

export function providerSaveError(draft: Provider<false>, pages: string[], checks: Record<string, ExtractionPreview>, saveAnyway: boolean): string | null {
  const invalid = validateProvider(draft);
  if (invalid) return invalid;
  if (pages.length < 2) return 'Choose two example pages before saving.';
  for (const [index, page] of pages.entries()) {
    if (!checks[page]) return `Example ${index + 1} still needs to be checked. Choose Test example ${index + 1}.`;
    if (!checks[page].valid) return `Example ${index + 1} did not pass: ${checks[page].errors.join(' ') || 'The page could not be read.'} Retest this example or edit the selections.`;
  }
  if ((!draft.verification?.progress || !draft.verification.resume) && !saveAnyway)
    return 'Return to Video test to verify playback and resume, or acknowledge the limitations before saving.';
  return null;
}

export function normalizeProviders(providers: Provider[] = []): Provider[] {
  return providers.map(provider => ({ ...provider, whiteListedOrigins: provider.whiteListedOrigins ?? [],
    isDefault: providers.length === 1 || provider.isDefault,
    // Legacy player flags are retained for compatibility, but are never treated as a verified test.
    verification: provider.configurationVersion === 2 ? provider.verification : undefined }));
}

export function upsertProviderList(providers: Provider[], provider: Provider): Provider[] {
  if (!provider.id) return [{ ...provider, id: Math.max(0, ...providers.map(item => item.id)) + 1, isDefault: providers.length === 0 || provider.isDefault }, ...providers];
  if (!providers.some(item => item.id === provider.id)) throw new Error('This provider was deleted. Create a new provider instead.');
  return providers.map(item => item.id === provider.id ? { ...provider, isDefault: providers.length === 1 || provider.isDefault } : item);
}
