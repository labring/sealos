import type { GTMEvent } from './types';

interface GTMConfig {
  enabled?: boolean;
  debug?: boolean;
}

class GTMTracker {
  private config: GTMConfig = {
    enabled: true,
    debug: false
  };

  configure(config: GTMConfig) {
    this.config = { ...this.config, ...config };
    return this;
  }

  track(event: string, properties?: Record<string, any>): void;
  track(event: GTMEvent): void;
  track(event: string | GTMEvent, properties?: Record<string, any>): void {
    if (!this.config.enabled) return;

    let gtmEvent: any;

    if (typeof event === 'string') {
      gtmEvent = {
        event,
        context: 'app',
        ...properties
      };
    } else {
      gtmEvent = {
        ...event,
        context: event.context || 'app'
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
