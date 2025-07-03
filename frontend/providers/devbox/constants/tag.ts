import { TagType } from '@/prisma/generated/client';

export const tagColorMap: Record<TagType, { color: string; bgColor: string }> = {
  [TagType.PROGRAMMING_LANGUAGE]: {
    color: '#0EA5E9',
    bgColor: '#F0F9FF'
  },
  [TagType.USE_CASE]: {
    color: '#8B5CF6',
    bgColor: '#F5F3FF'
  },
  [TagType.OFFICIAL_CONTENT]: {
    color: '#10B981',
    bgColor: '#ECFDF5'
  }
};

export const defaultTagColor = {
  color: '#6B7280',
  bgColor: '#F9FAFB'
};
