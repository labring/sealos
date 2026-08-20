export type InitialAppTargetSource = 'autolaunch' | 'query' | 'restore' | 'default';

export type InitialAppLaunchState =
  | { status: 'resolving' }
  | { status: 'loading'; appKey: string }
  | { status: 'ready' };

export type InitialAppTarget =
  | {
      kind: 'app';
      appKey: string;
      source: InitialAppTargetSource;
    }
  | {
      kind: 'desktop';
      source: 'explicit-desktop' | 'explicit-unavailable' | 'fallback';
    };

export type ResolveInitialAppTargetOptions = {
  installedAppKeys: readonly string[];
  autolaunchAppKey?: string;
  hasOpenAppQuery: boolean;
  queryAppKey?: string;
  restoreAppKeys: readonly (string | undefined)[];
  defaultAppKey: string;
  allowedAppKeys?: readonly string[];
};

/**
 * Resolve the first surface shown at `/`.
 *
 * Explicit navigation always wins, including an empty `openapp` query, which is
 * the Desktop entry used by Brain. A restorable app wins over the environment
 * default, and the default app is only used when neither intent exists.
 */
export const resolveInitialAppTarget = ({
  installedAppKeys,
  autolaunchAppKey,
  hasOpenAppQuery,
  queryAppKey,
  restoreAppKeys,
  defaultAppKey,
  allowedAppKeys
}: ResolveInitialAppTargetOptions): InitialAppTarget => {
  const installedApps = new Set(installedAppKeys);
  const allowedApps = allowedAppKeys ? new Set(allowedAppKeys) : undefined;
  const isAvailable = (appKey: string) =>
    installedApps.has(appKey) && (!allowedApps || allowedApps.has(appKey));

  if (autolaunchAppKey) {
    return isAvailable(autolaunchAppKey)
      ? { kind: 'app', appKey: autolaunchAppKey, source: 'autolaunch' }
      : { kind: 'desktop', source: 'explicit-unavailable' };
  }

  if (hasOpenAppQuery) {
    if (!queryAppKey) {
      return { kind: 'desktop', source: 'explicit-desktop' };
    }

    return isAvailable(queryAppKey)
      ? { kind: 'app', appKey: queryAppKey, source: 'query' }
      : { kind: 'desktop', source: 'explicit-unavailable' };
  }

  const restoreAppKey = restoreAppKeys.find(
    (appKey): appKey is string => !!appKey && isAvailable(appKey)
  );
  if (restoreAppKey) {
    return { kind: 'app', appKey: restoreAppKey, source: 'restore' };
  }

  if (isAvailable(defaultAppKey)) {
    return { kind: 'app', appKey: defaultAppKey, source: 'default' };
  }

  return { kind: 'desktop', source: 'fallback' };
};
