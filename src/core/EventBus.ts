type Listener<T> = (event: T) => void;

export class EventBus {
  private listeners = new Map<string, Listener<unknown>[]>();

  on<T>(event: string, fn: Listener<T>): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(fn as Listener<unknown>);
  }

  emit<T>(event: string, data: T): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }

  off<T>(event: string, fn: Listener<T>): void {
    const arr = this.listeners.get(event);
    if (arr) {
      const idx = arr.indexOf(fn as Listener<unknown>);
      if (idx !== -1) arr.splice(idx, 1);
    }
  }
}
