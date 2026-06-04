import type { TAppConfig, displayType } from '@/types';

const DISPLAY_TYPE_ORDER: Record<displayType, number> = {
  normal: 0,
  more: 1,
  hidden: 2
};

const getPosition = (position?: number) =>
  typeof position === 'number' && Number.isFinite(position) ? position : 0;

const getCreatedAt = (creationTimestamp?: string) => {
  if (!creationTimestamp) return 0;
  const timestamp = new Date(creationTimestamp).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const compareSystemAppOrder = (left: TAppConfig, right: TAppConfig) => {
  const displayOrder = DISPLAY_TYPE_ORDER[left.displayType] - DISPLAY_TYPE_ORDER[right.displayType];
  if (displayOrder !== 0) return displayOrder;

  const positionOrder = getPosition(left.position) - getPosition(right.position);
  if (positionOrder !== 0) return positionOrder;

  const createdAtOrder =
    getCreatedAt(right.creationTimestamp) - getCreatedAt(left.creationTimestamp);
  if (createdAtOrder !== 0) return createdAtOrder;

  return left.key.localeCompare(right.key, 'en', { sensitivity: 'base' });
};
