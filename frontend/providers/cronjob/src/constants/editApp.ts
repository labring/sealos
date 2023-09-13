export const editModeMap = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: 'job.Update CronJob',
      applyBtnText: 'Update',
      applyMessage: 'job.Confirm Update CronJob?',
      applySuccess: 'Update Successful',
      applyError: 'Update Failed'
    };
  }

  return {
    title: 'job.Deploy Job',
    applyBtnText: 'Deploy',
    applyMessage: 'job.Confirm Deploy CronJob?',
    applySuccess: 'Deployment Successful',
    applyError: 'Deployment Failed'
  };
};
