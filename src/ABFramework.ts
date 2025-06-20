export interface Variant {
  name: string;
  allocation: number;
}

export interface Experiment {
  id: string;
  variants: Variant[];
}

export interface EventData {
  experimentId: string;
  variant: string;
  eventType: 'exposure' | 'interaction';
  timestamp: string;
}

enum STORAGE_KEYS {
  events = 'ab_events',
  assignments = 'ab_assignments',
}

export default class AbFramework {
  experiments: Experiment[];
  eventsQueue: EventData[];
  assignments: Record<string, string>;
  retryIntervalMs = 10_000;
  retryTimer: any = null;

  constructor(experiments: Experiment[]) {
    this.experiments = experiments;
    this.eventsQueue = this.loadDataByKey<EventData[]>(STORAGE_KEYS.events) || [];
    this.assignments = this.loadDataByKey<Record<string, string>>(STORAGE_KEYS.assignments) || {};

    this.assignVariants();
    this.setupRetryMechanism();
    this.clearQueue(); // Перша спроба одразу
  }

  assignVariants(): void {
    for (const experiment of this.experiments) {
      if (!this.assignments[experiment.id]) {
        const assigned = this.selectVariant(experiment);
        this.assignments[experiment.id] = assigned;
        this.saveDataByKey(STORAGE_KEYS.assignments, this.assignments);
      }
    }
  }

  getVariant(experimentId: string): string {
    return this.assignments[experimentId];
  }

  selectVariant(experiment: Experiment): string {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.allocation;
      if (rand <= cumulative) {
        return variant.name;
      }
    }
    return experiment.variants[0].name;
  }

  async logEvent(event: EventData): Promise<boolean> {
    try {
      const res = await fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event }),
      });

      if (res.status !== 200) throw new Error('Bad status');

      const resBody = await res.json();
      const echoed = resBody?.json?.event;

      if (!echoed || echoed.eventType !== event.eventType) {
        throw new Error('Invalid echoed event');
      }

      return true;
    } catch (e) {
      console.error('LogEvent error:', e);
      return false;
    }
  }

  async clearQueue(): Promise<void> {
    if (this.eventsQueue.length === 0) return;

    const remaining: EventData[] = [];

    for (const event of this.eventsQueue) {
      const success = await this.logEvent(event);
      if (!success) remaining.push(event);
    }

    this.eventsQueue = remaining;
    this.saveDataByKey(STORAGE_KEYS.events, this.eventsQueue);
  }

  async trackEvent(event: EventData): Promise<void> {
    const success = await this.logEvent(event);
    if (!success) {
      this.eventsQueue.push(event);
      this.saveDataByKey(STORAGE_KEYS.events, this.eventsQueue);
    }
  }

  setupRetryMechanism(): void {
    window.addEventListener('online', () => this.clearQueue());

    this.retryTimer = setInterval(() => {
      if (navigator.onLine) this.clearQueue();
    }, this.retryIntervalMs);
  }

  loadDataByKey<T>(key: string): T | undefined {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : undefined;
  }

  saveDataByKey<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }
}
