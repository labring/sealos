import type { GTMEvent, GTMEventType } from './types';

interface GTMConfig {
  enabled?: boolean;
  debug?: boolean;
}

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
  }
}

export const gtmTracker = new GTMTracker();
export const track = gtmTracker.track.bind(gtmTracker);
export const configureGTM = gtmTracker.configure.bind(gtmTracker);
