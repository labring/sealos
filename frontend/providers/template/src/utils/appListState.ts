export type AppListContentState = 'loading' | 'empty' | 'grid';

export function getAppListContentState({
  hasLoadedData,
  filteredTemplates
}: {
  hasLoadedData: boolean;
  filteredTemplates?: readonly unknown[] | null;
}): AppListContentState {
  if (!hasLoadedData) return 'loading';
  return (filteredTemplates?.length ?? 0) > 0 ? 'grid' : 'empty';
}

export function hasAppListTemplates(templates?: readonly unknown[] | null) {
  return (templates?.length ?? 0) > 0;
}
