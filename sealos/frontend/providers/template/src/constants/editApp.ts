export const editModeMap = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: 'Update Application',
      applyBtnText: 'Update Application',
      applyMessage: 'Confirm Update Application?',
      applySuccess: 'Update Successful',
      applyError: 'Update Failed'
    };
  }

  return {
    title: 'Application Deployment',
    applyBtnText: 'Deploy Application',
    applyMessage: 'Confirm Deploy Application?',
    applySuccess: 'Deployment Successful',
    applyError: 'Deployment Failed'
  };
};
