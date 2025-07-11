import { TagType } from '@/prisma/generated/client';

export const tagColorMap: Record<TagType, { color: string }> = {
  [TagType.PROGRAMMING_LANGUAGE]: {
    color: '#84CC16'
  },
  [TagType.USE_CASE]: {
    color: '#60A5FA'
  },
  [TagType.OFFICIAL_CONTENT]: {
    color: '#10B981'
  }
};

export const defaultTagColor = {
  color: '#6B7280',
  bgColor: '#F9FAFB'
};
