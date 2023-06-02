export const editModeMap = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: '变更集群',
      applyBtnText: '更新集群',
      applyMessage: '确认更新集群?',
      applySuccess: '更新成功',
      applyError: '更新失败'
    };
  }

  return {
    title: '集群部署',
    applyBtnText: '部署集群',
    applyMessage: '确认部署集群?',
    applySuccess: '部署成功',
    applyError: '部署失败'
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
  { label: '3G', value: 3072 },
  { label: '4G', value: 4096 },
  { label: '5G', value: 5120 },
  { label: '6G', value: 6144 },
  { label: '7G', value: 7168 },
  { label: '8G', value: 8192 }
  // { label: '16G', value: 16384 }
];
