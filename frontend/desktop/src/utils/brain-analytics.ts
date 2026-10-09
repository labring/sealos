type AnalyticsProperties = Record<string, string | number>;

type RybbitClient = {
  event: (name: string, properties: AnalyticsProperties) => void;
  identify?: (userId: string) => void;
  getUserId?: () => string | null;
};

const BRAIN_EVENTS = new Set([
  'module_view',
  'deployment_start',
  'deployment_create',
  'deployment_delete',
  'deployment_card_action',
  'onboarding_step_view',
  'onboarding_skip',
  'onboarding_complete',
  'subscription_cancel',
  'subscription_cancel_kept'
]);

// These events are absent from the current GTM product-event trigger.
const DIRECT_RYBBIT_EVENTS = new Set([
  'onboarding_step_view',
  'onboarding_skip',
  'onboarding_complete',
  'subscription_cancel',
  'subscription_cancel_kept'
]);
const PROPERTY_KEYS = [
  'method',
  'project_id',
  'view_name',
  'app_name',
  'reason',
  'event_type',
  'step',
  'plan_name',
  'has_feedback'
];

export function createBrainAnalyticsRelay(options: {
  gtmEnabled: () => boolean;
  userId: () => string | undefined;
  properties: () => AnalyticsProperties;
  rybbit: () => RybbitClient | undefined;
  pushGtm: (event: Record<string, unknown>) => void;
}) {
  const sendDirect = (event: string, properties: AnalyticsProperties, attempt = 0): void => {
    const client = options.rybbit();
    if (!client || typeof client.event !== 'function' || typeof client.identify !== 'function') {
      if (attempt < 60) {
        window.setTimeout(() => sendDirect(event, properties, attempt + 1), 250);
      }
      return;
    }
    const userId = options.userId();
    if (userId && client.getUserId?.() !== userId) {
      client.identify(userId);
    }
    const context = options.properties();
    const combined = {
      product_user_id: context.product_user_id || '',
      ...properties,
      ...context
    };
    const limited: AnalyticsProperties = {};
    for (const [key, value] of Object.entries(combined)) {
      const candidate = { ...limited, [key]: value };
      if (new TextEncoder().encode(JSON.stringify(candidate)).byteLength < 1900) {
        limited[key] = value;
      }
    }
    client.event(event, limited);
  };

  return (input: unknown): { accepted: boolean } => {
    if (!input || typeof input !== 'object') return { accepted: false };
    const data = input as Record<string, unknown>;
    if (
      data.module !== 'brain' ||
      typeof data.event !== 'string' ||
      !BRAIN_EVENTS.has(data.event)
    ) {
      return { accepted: false };
    }
    const payload: Record<string, unknown> = {
      event: data.event,
      context: 'app',
      module: 'brain'
    };
    const direct: AnalyticsProperties = { context: 'app', module: 'brain', surface: 'product' };
    for (const key of PROPERTY_KEYS) {
      const value = data[key];
      if (typeof value === 'boolean') {
        payload[key] = value;
        direct[key] = String(value);
      } else if (
        typeof value === 'string' ||
        (typeof value === 'number' && Number.isFinite(value))
      ) {
        const safeValue = typeof value === 'string' ? value.slice(0, 160) : value;
        payload[key] = safeValue;
        direct[key] = safeValue;
      }
    }
    if (Array.isArray(data.reasons)) {
      const reasons = data.reasons.filter((reason): reason is string => typeof reason === 'string');
      payload.reasons = reasons.slice(0, 10).map((reason) => reason.slice(0, 80));
      direct.reasons = JSON.stringify(payload.reasons);
    }
    if (data.config && typeof data.config === 'object') {
      const config = data.config as Record<string, unknown>;
      payload.config = Object.fromEntries(
        ['template_name', 'template_version'].flatMap((key) =>
          typeof config[key] === 'string' ? [[key, config[key].slice(0, 160)]] : []
        )
      );
      for (const [key, value] of Object.entries(payload.config as Record<string, string>)) {
        direct[key] = value;
      }
    }
    if (!options.gtmEnabled() || DIRECT_RYBBIT_EVENTS.has(data.event)) {
      sendDirect(data.event, direct);
    } else {
      options.pushGtm(payload);
    }
    return { accepted: true };
  };
}

export function brainAnalyticsAttribution(storage: Pick<Storage, 'getItem'>): AnalyticsProperties {
  try {
    const state = JSON.parse(storage.getItem('sealos_attr_v2') || 'null');
    if (state?.version !== 2) return {};
    const props: AnalyticsProperties = { attr_version: '2' };
    for (const [prefix, field] of [
      ['first', 'first_touch'],
      ['last', 'last_touch'],
      ['lq', 'last_qualified_touch']
    ]) {
      const touch = state[field];
      for (const key of [
        'source',
        'medium',
        'campaign',
        'channel',
        'landing_hostname',
        'landing_path',
        'ts'
      ]) {
        if (typeof touch?.[key] === 'string') props[`${prefix}_${key}`] = touch[key].slice(0, 160);
      }
    }
    return props;
  } catch {
    return {};
  }
}

/** Check the actual frame window as well as its installed application's origin. */
export function isBrainAnalyticsSender(
  sender: { source: MessageEventSource; origin: string } | undefined,
  frameWindow: Window | null | undefined,
  appUrl: string | undefined
): boolean {
  if (!sender || !frameWindow || sender.source !== frameWindow || !appUrl) return false;
  try {
    return sender.origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
