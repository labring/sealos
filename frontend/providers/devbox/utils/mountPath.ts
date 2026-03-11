const MOUNT_PATH_PATTERN = /^[0-9a-zA-Z_/][0-9a-zA-Z_/.-]*[0-9a-zA-Z_/]$/;

const PROTECTED_EXACT_MOUNT_PATHS = new Set<string>([
  '/',
  '/home',
  '/home/devbox',
  '/home/devbox/project',
  '/root',
  '/proc',
  '/sys',
  '/dev',
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/lib',
  '/lib64',
  '/run',
  '/tmp',
  '/var'
]);

const PROTECTED_PREFIX_MOUNT_PATHS = [
  '/proc',
  '/sys',
  '/dev',
  '/etc',
  '/usr',
  '/bin',
  '/sbin',
  '/lib',
  '/lib64',
  '/run',
  '/var/run'
];

export type MountPathValidationError = 'empty' | 'not_absolute' | 'invalid_format' | 'protected_path';

export const normalizeMountPath = (rawPath: string): string => {
  const trimmedPath = rawPath.trim();
  if (!trimmedPath) {
    return '';
  }

  const mergedSlashesPath = trimmedPath.replace(/\/{2,}/g, '/');
  if (mergedSlashesPath === '/') {
    return '/';
  }

  return mergedSlashesPath.replace(/\/+$/g, '');
};

const isProtectedMountPath = (path: string): boolean => {
  if (PROTECTED_EXACT_MOUNT_PATHS.has(path)) {
    return true;
  }

  return PROTECTED_PREFIX_MOUNT_PATHS.some(
    (protectedPrefix) => path === protectedPrefix || path.startsWith(`${protectedPrefix}/`)
  );
};

export const validateMountPath = (
  rawPath: string
): { normalizedPath: string; error: MountPathValidationError | null } => {
  const normalizedPath = normalizeMountPath(rawPath);

  if (!normalizedPath) {
    return { normalizedPath, error: 'empty' };
  }

  if (!normalizedPath.startsWith('/')) {
    return { normalizedPath, error: 'not_absolute' };
  }

  if (isProtectedMountPath(normalizedPath)) {
    return { normalizedPath, error: 'protected_path' };
  }

  const segments = normalizedPath.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return { normalizedPath, error: 'invalid_format' };
  }

  if (!MOUNT_PATH_PATTERN.test(normalizedPath)) {
    return { normalizedPath, error: 'invalid_format' };
  }

  return { normalizedPath, error: null };
};
