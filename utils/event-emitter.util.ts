export class EventEmitter<E extends Record<string, unknown>> {
  private listeners = new Map<keyof E, Set<(payload: any) => void>>();

  on<K extends keyof E>(
    event: K,
    listener: (payload: E[K]) => void,
  ): () => void {
    let listeners = this.listeners.get(event);

    if (!listeners) {
      listeners = new Set();
      this.listeners.set(event, listeners);
    }

    listeners.add(listener);

    return () => {
      listeners!.delete(listener);
    };
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}
