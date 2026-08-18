import type { GTMEvent, GTMEventType } from './types';

interface GTMConfig {
  enabled?: boolean;
  debug?: boolean;
}

// Rybbit event properties are limited to 2KB in total and primitive values only.
const MAX_RYBBIT_PROPERTY_LENGTH = 512;

type ExtractEventByType<T extends GTMEventType> = Extract<GTMEvent, { event: T }>;

type EventProperties<T extends GTMEventType> = Omit<ExtractEventByType<T>, 'event' | 'context'>;

class GTMTracker {
  private config: GTMConfig = {
    enabled: true,
    debug: false
  };

  configure(config: GTMConfig) {
    this.config = { ...this.config, ...config };
    return this;
  }

  track(event: Readonly<GTMEvent>): void;
  track<T extends GTMEventType>(eventType: T, properties?: Readonly<EventProperties<T>>): void;
  track<T extends GTMEventType>(
    eventOrType: Readonly<GTMEvent> | T,
    properties?: Readonly<EventProperties<T>>
  ): void {
    if (!this.config.enabled) return;

    let gtmEvent: GTMEvent;

    if (typeof eventOrType === 'string') {
      gtmEvent = {
        event: eventOrType,
        context: 'app' as const,
        ...properties
      } as unknown as ExtractEventByType<T>;
    } else {
      gtmEvent = {
        ...eventOrType,
        context: eventOrType.context || 'app'
      };
    }

    if (this.config.debug) {
      console.log('[Sealos GTM]', gtmEvent);
    }

    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push(gtmEvent);
    } else if (this.config.debug) {
      console.warn('[Sealos GTM] dataLayer not found');
    }

    this.forwardToRybbit(gtmEvent);
  }

  private forwardToRybbit(gtmEvent: GTMEvent): void {
    if (typeof window === 'undefined' || typeof window.rybbit?.event !== 'function') return;

    const { event, ...payload } = gtmEvent;
    const properties: Record<string, string | number> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue;
      const serialized =
        typeof value === 'string' || typeof value === 'number' ? value : JSON.stringify(value);
      properties[key] =
        typeof serialized === 'string' && serialized.length > MAX_RYBBIT_PROPERTY_LENGTH
          ? serialized.slice(0, MAX_RYBBIT_PROPERTY_LENGTH)
          : serialized;
    }

    if (this.config.debug) {
      console.log('[Sealos Rybbit] event forwarded:', event, properties);
    }

    window.rybbit.event(event, properties);
  }
}

export const gtmTracker = new GTMTracker();
export const track = gtmTracker.track.bind(gtmTracker);
export const configureGTM = gtmTracker.configure.bind(gtmTracker);
