export const editModeMap: (isEdit: boolean) => {
  [key: string]: string
} = (isEdit: boolean) => {
  if (isEdit) {
    return {
      title: 'update_devbox',
      applyBtnText: 'update',
      applyMessage: 'confirm_update_devbox',
      applySuccess: 'update_successful',
      applyError: 'update_failed'
    }
  }

  return {
    title: 'deploy_devbox',
    applyBtnText: 'deploy',
    applyMessage: 'confirm_deploy_devbox',
    applySuccess: 'deployment_successful',
    applyError: 'deployment_failed'
  }
}
