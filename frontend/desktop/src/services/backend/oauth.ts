import { UserInfo } from "@/types"
import { generateJWT } from "./auth"
import { K8s_user, addK8sUser, createUser, queryUser, removeK8sUser } from "./db/user"
import { Provider } from "@/types/user"
import { getUserKubeconfig } from "./kubernetes/admin"

export const getOauthRes = async ({
  provider,
  id,
  name,
  avatar_url,
}: {
  provider: Provider,
  id: string,
  name: string,
  avatar_url: string
}) => {
  // console.log('getOauthRes')
  const _user = await queryUser({ id, provider })
  // console.log(_user)
  let user = {} as UserInfo
  let k8s_users: K8s_user[] = []

  if (!_user) {
    // sign up
    const result = await createUser({ id: "" + id, provider, name, avatar_url })
    user = {
      id: result.uid,
      name,
      avatar: result.avatar_url,
    }
    k8s_users = result.k8s_users || []
  } else {
    user = {
      id: _user.uid,
      name: _user.name,
      avatar: _user.avatar_url,
    }
    k8s_users = _user.k8s_users || []
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