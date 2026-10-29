import {
  ACQUISITION_COOKIE,
  AcquisitionSchema,
  AppAnalyticsContextSchema
} from '@/schema/app-attribution';

function currentVisitorMatches(context: { realm: string; visitor_id: string }): boolean {
  try {
    const raw = document.cookie
      .split(';')
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${ACQUISITION_COOKIE}=`))
      ?.slice(ACQUISITION_COOKIE.length + 1);
    if (!raw || raw.length > 2400 || !/^[A-Za-z0-9_-]+$/.test(raw)) return false;
    const decoded = Uint8Array.from(atob(raw.replace(/-/g, '+').replace(/_/g, '/')), (value) =>
      value.charCodeAt(0)
    );
    if (decoded.length > 1800) return false;
    const parsed = AcquisitionSchema.safeParse(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded))
    );
    return (
      parsed.success &&
      parsed.data.realm === context.realm &&
      parsed.data.visitor_id === context.visitor_id
    );
  } catch {
    return false;
  }
}

/** Authentication changes must also release the SDK's persisted account identity. */
export function clearWebAnalyticsIdentity(): void {
  if (typeof window === 'undefined') return;
  try {
    window.dataLayer = window.dataLayer || [];
    function gtag(..._args: unknown[]) {
      window.dataLayer.push(arguments);
    }
    gtag('set', { user_id: null });
    window.dataLayer.push({
      user_id: null,
      product_user_id: null,
      visitor_id: null,
      source: null
    });
  } catch {
    /* A third-party SDK must not prevent logout. */
  }
  try {
    (window.rybbit as { clearUserId?: () => void } | undefined)?.clearUserId?.();
  } catch {
    /* A third-party SDK must not prevent logout. */
  }
}

/** Called only with the authenticated, approved OAuth decision response. */
export async function trackWebVisitorLink(value: unknown): Promise<void> {
  const parsed = AppAnalyticsContextSchema.safeParse(value);
  if (!parsed.success || typeof window === 'undefined') return;
  const context = parsed.data;
  if (!currentVisitorMatches(context)) return;
  const host = window.location.hostname;
  const suffix = context.realm === 'global' ? 'sealos.io' : 'sealos.run';
  if (
    window.location.protocol !== 'https:' ||
    host === `www.${suffix}` ||
    !host.endsWith(`.${suffix}`)
  )
    return;
  const properties: Record<string, string | number> = {
    visitor_id: context.visitor_id,
    product_user_id: context.subject_id,
    product_edition: context.realm,
    surface: 'desktop_web'
  };
  for (const key of ['source', 'medium', 'campaign'] as const) {
    if (context.source?.[key]) properties[`acquisition_${key}`] = context.source[key]!;
  }
  if (context.realm === 'global') {
    window.dataLayer = window.dataLayer || [];
    // gtag's command queue uses Arguments, not a plain array/object. Keep the browser's CID.
    function gtag(..._args: unknown[]) {
      window.dataLayer.push(arguments);
    }
    gtag('set', { user_id: context.subject_id });
    window.dataLayer.push({ source: null });
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 500);
      window.dataLayer.push({
        event: 'web_visitor_linked',
        analytics_consent: 'granted',
        ...properties,
        user_id: context.subject_id,
        source: context.source || null,
        eventTimeout: 400,
        eventCallback: () => {
          window.clearTimeout(timer);
          resolve();
        }
      });
    });
  } else {
    const client = window.rybbit as
      | (NonNullable<Window['rybbit']> & {
          identify?: (id: string) => void;
        })
      | undefined;
    // Keep navigation independent of SDK availability; this is a best-effort Web event.
    if (typeof client?.identify === 'function' && typeof client.event === 'function') {
      client.identify(context.subject_id);
      await Promise.race([
        Promise.resolve(client.event('web_visitor_linked', properties)),
        new Promise<void>((resolve) => window.setTimeout(resolve, 500))
      ]);
    }
  }
}
