import * as os from 'os'
import path from 'path'
import * as fs from 'fs'
import { execa } from 'execa'

// File access permission modification
export const ensureFileAccessPermission = async (path: string) => {
  if (os.platform() === 'win32') {
    try {
      const username = os.userInfo().username
      if (!username) {
        throw new Error('can not get username')
      }
      await execa('icacls', [path, '/inheritance:r'])
      await execa('icacls', [path, '/grant:r', `${username}:F`])
      await execa('icacls', [path, '/remove:g', 'everyone'])
    } catch (error) {
      console.error('set file access permission failed:', error)
      throw new Error(`set file access permission failed: ${error.message}`)
    }
  } else {
    await execa('chmod', ['600', path])
  }
}

export function ensureFileExists(filePath: string, parentDir: string) {
  if (filePath.indexOf('\0') !== -1 || parentDir.indexOf('\0') !== -1) {
    throw new Error('Invalid path')
  }
  const safeFilePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '')
  const safeParentDir = path
    .normalize(parentDir)
    .replace(/^(\.\.(\/|\\|$))+/, '')

  if (!fs.existsSync(safeFilePath)) {
    fs.mkdirSync(path.resolve(os.homedir(), safeParentDir), {
      recursive: true,
    })
    fs.writeFileSync(filePath, '', 'utf8')
    // .ssh/config authority
    ensureFileAccessPermission(filePath)
  }
}
