import type { Provider } from './provider.model';

export type SelectorField = 'seriesNameSelector' | 'episodeNumberSelector' | 'totalEpisodesSelector';
export type FieldPreview = { selector: string; count: number; texts: string[]; values: (number | null)[]; valid: boolean; error?: string };
export type ExtractionPreview = { title: string; episode: number; episodeCount: number; listedEpisodes?: number; valid: boolean; errors: string[] };
export type PlayerSample = {
  locator: NonNullable<Provider['player']>; time: number; duration: number;
  progress: boolean; resume: boolean; playing: boolean;
};
export type RuntimeMessage = {
  channel: 'provider-runtime'; sessionId: string; documentId: string; url: string;
} & (
  | { type: 'ready' }
  | { type: 'selection'; requestId: string; field: SelectorField; preview: FieldPreview }
  | { type: 'extraction'; requestId: string; preview: ExtractionPreview }
  | { type: 'players'; players: PlayerSample[]; inaccessibleFrames: number }
  | { type: 'anime-found'; payload: { animeTitle: string; episode: number; episodeCount: number; progress?: number; total?: number; providerId: number; url: string } }
);

export function parseRuntimeMessage(raw: string, sessionId: string): RuntimeMessage | null {
  try {
    const value = JSON.parse(raw);
    if (!value || value.channel !== 'provider-runtime' || value.sessionId !== sessionId ||
        typeof value.documentId !== 'string' || typeof value.url !== 'string') return null;
    if (!['ready', 'selection', 'extraction', 'players', 'anime-found'].includes(value.type)) return null;
    const strings = (items: unknown) => Array.isArray(items) && items.every(item => typeof item === 'string');
    if (value.type === 'selection' && (!value.preview || typeof value.requestId !== 'string' || !['seriesNameSelector', 'episodeNumberSelector', 'totalEpisodesSelector'].includes(value.field) || typeof value.preview.selector !== 'string' || !Array.isArray(value.preview.texts) || !Array.isArray(value.preview.values) || typeof value.preview.valid !== 'boolean')) return null;
    if (value.type === 'extraction' && (!value.preview || typeof value.requestId !== 'string' || typeof value.preview.valid !== 'boolean' || !Array.isArray(value.preview.errors))) return null;
    if (value.type === 'players' && (!Array.isArray(value.players) || value.players.some((item: PlayerSample) => !item?.locator || typeof item.locator.selector !== 'string' || !Array.isArray(item.locator.framePath) || typeof item.progress !== 'boolean' || typeof item.resume !== 'boolean' || typeof item.playing !== 'boolean' || !Number.isFinite(item.time) || !Number.isFinite(item.duration)))) return null;
    if (value.type === 'anime-found' && (!value.payload || typeof value.payload.animeTitle !== 'string' || !value.payload.animeTitle.trim() || !Number.isFinite(value.payload.episode) || value.payload.episode <= 0)) return null;
    if (value.type === 'selection' && (!strings(value.preview.texts) || !Number.isInteger(value.preview.count) || value.preview.count < 0 || value.preview.values.some((item: unknown) => item !== null && (typeof item !== 'number' || !Number.isFinite(item))))) return null;
    if (value.type === 'extraction' && (!strings(value.preview.errors) || typeof value.preview.title !== 'string' || !Number.isFinite(value.preview.episodeCount) || !Number.isFinite(value.preview.episode))) return null;
    if (value.type === 'extraction' && value.preview.listedEpisodes !== undefined && (!Number.isInteger(value.preview.listedEpisodes) || value.preview.listedEpisodes < 0)) return null;
    if (value.type === 'players' && value.players.some((item: PlayerSample) => !strings(item.locator.framePath))) return null;
    return value as RuntimeMessage;
  } catch { return null; }
}

export function runtimeCommand(command: Record<string, unknown>): string {
  return `window.ProviderRuntime?.command(${JSON.stringify(command)}); true;`;
}

/** Retired document messages must never validate a new selection or page test. */
export class RuntimeSession {
  documentId: string | null = null;
  private expectedUrl: string | null = null;
  private retired = new Set<string>();
  begin(url: string) {
    if (this.documentId) this.retired.add(this.documentId);
    this.documentId = null;
    this.expectedUrl = url;
  }
  redirected(url: string) {
    this.expectedUrl = url;
  }
  accept(message: RuntimeMessage): boolean {
    if (message.type === 'ready') {
      if (this.retired.has(message.documentId)) return false;
      if (this.expectedUrl && message.url !== this.expectedUrl) return false;
      this.documentId = message.documentId;
      return true;
    }
    return message.documentId === this.documentId;
  }
}
