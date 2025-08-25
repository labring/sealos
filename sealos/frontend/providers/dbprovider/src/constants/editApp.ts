import { I18nCommonKey } from '@/types/i18next';

export const editModeMap: (isEdit: boolean) => {
  [key: string]: I18nCommonKey;
} = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: 'update_database',
      applyBtnText: 'update',
      applyMessage: 'confirm_update_database',
      applySuccess: 'update_successful',
      applyError: 'update_failed'
    };
  }

  return {
    title: 'deploy_database',
    applyBtnText: 'deploy',
    applyMessage: 'confirm_deploy_database',
    applySuccess: 'deployment_successful',
    applyError: 'deployment_failed'
  };
};

export const CpuSlideMarkList = [
  // The unit of value is m
  { label: 0.5, value: 500 },
  { label: 1, value: 1000 },
  { label: 2, value: 2000 },
  { label: 3, value: 3000 },
  { label: 4, value: 4000 },
  { label: 5, value: 5000 },
  { label: 6, value: 6000 },
  { label: 7, value: 7000 },
  { label: 8, value: 8000 }
];

export const MemorySlideMarkList = [
  { label: '512Mi', value: 512 },
  { label: '1G', value: 1024 },
  { label: '2G', value: 2048 },
  { label: '4G', value: 4096 },
  { label: '6G', value: 6144 },
  { label: '8G', value: 8192 },
  { label: '12G', value: 12288 },
  { label: '16G', value: 16384 },
  { label: '32G', value: 32768 }
];
