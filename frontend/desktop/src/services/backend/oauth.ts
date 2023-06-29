import { UserInfo } from "@/types"
import { generateJWT } from "./auth"
import { K8s_user, addK8sUser, createUser, queryUser, removeUser, updateUser } from "./db/user"
import { Provider } from "@/types/user"
import { getUserKubeconfig, getUserKubeconfigByuid } from "./kubernetes/admin"
import { hashPassword, verifyPassword } from "@/utils/crypto"

export const getOauthRes = async ({
  provider,
  id,
  name,
  avatar_url,
  password
}: {
  provider: Provider,
  id: string,
  name: string,
  avatar_url: string,
  password?: string
}) => {
  if (provider === 'password_user' && !password) {
    throw new Error('password is required')
  }
  const _user = await queryUser({ id, provider })
  let user = {} as UserInfo
  let k8s_users: K8s_user[] = []
  if (!_user) {
    // sign up
    const result = await createUser({ id: "" + id, provider, name, avatar_url })
    if (provider === 'password_user') {
      await updateUser({ id: "" + id, provider: 'password_user', data: { password: hashPassword(password!) } })
        .catch(async rej => {
          await removeUser({ id: "" + id, provider: 'password_user' })
          throw new Error('Failed to create user by password')
        })
    }
    user = {
      id: result.uid,
      name,
      avatar: result.avatar_url,
    }
    k8s_users = result.k8s_users || []
  } else {
    if (provider === 'password_user') {
      if (!_user.password || !password || !verifyPassword(password, _user.password)) {
        throw new Error('password error')
      }
    }
    user = {
      id: _user.uid,
      name: _user.name,
      avatar: _user.avatar_url,
    }
    k8s_users = _user.k8s_users || []
    // 迁移用户
    if (k8s_users.length === 0 && user.id) {
      const k8s_username = await getUserKubeconfigByuid(user.id)

      if (!!k8s_username) {
        const result = await addK8sUser({ id: "" + id, provider, k8s_user: { name: k8s_username } })
        k8s_users = [result]
      }
    }
  }
  // 确保必然有一个
  if (!k8s_users || k8s_users.length === 0) {
    const result = await addK8sUser({ id: "" + id, provider })
    k8s_users = [result]
  }

  const k8s_username = k8s_users[0].name
  const kubeconfig = await getUserKubeconfig(user.id, k8s_username)
  if (!kubeconfig) {
    throw new Error('Failed to get user config')
  }
  const token = generateJWT(user.id)
  return {
    token,
    user,
    kubeconfig
  }
}
