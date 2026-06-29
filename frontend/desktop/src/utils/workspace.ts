const DEFAULT_PRIVATE_WORKSPACE_PLACEHOLDER_NAMES = new Set([
  'private team',
  'Private Team',
  'My Workspace',
  'Personal Workspace',
  '个人空间'
]);

export function getPrivateWorkspaceDisplayName({
  teamName,
  defaultName
}: {
  teamName?: string | null;
  defaultName: string;
}) {
  const normalizedName = teamName?.trim();
  if (!normalizedName || DEFAULT_PRIVATE_WORKSPACE_PLACEHOLDER_NAMES.has(normalizedName)) {
    return defaultName;
  }
  return normalizedName;
}
