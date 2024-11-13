import { execa } from 'execa'
import * as os from 'os'

// File access permission modification
export const ensureFileAccessPermission = async (path: string) => {
  if (os.platform() === 'win32') {
    const username = os.userInfo().username
    await execa('icacls', [path, '/inheritance:r'])
    await execa('icacls', [path, '/grant:r', `${username}:F`])
    await execa('icacls', [path, '/remove:g', 'everyone'])
  } else {
    await execa('chmod', ['600', path])
  }
}
