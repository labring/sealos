import { UserInfo } from "@/types"
import { generateJWT } from "./auth"
import { createUser, queryUser } from "./db/user"
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
})=>{
  const _user = await queryUser({ id, provider })
  let user = {} as UserInfo
  if (!_user) {
    // sign up
    const result = await createUser({ id: "" + id, provider, name, avatar_url })
    user = {
      id: result.uid,
      name,
      avatar: result.avatar_url,
    }
  } else {
    user = {
      id: _user.uid,
      name: _user.name,
      avatar: _user.avatar_url,
    }
  }
  const kubeconfig = await getUserKubeconfig(user.id)
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