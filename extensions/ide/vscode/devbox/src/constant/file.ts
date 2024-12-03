import path from 'path'
import * as os from 'os'

export const defaultSSHConfigPath = path.resolve(os.homedir(), '.ssh/config')
export const defaultDevboxSSHConfigPath = path.resolve(
  os.homedir(),
  '.ssh/sealos/devbox_config'
)
export const defaultSSHKeyPath = path.resolve(os.homedir(), '.ssh/sealos')
