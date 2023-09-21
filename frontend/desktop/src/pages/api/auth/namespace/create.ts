import { authSession } from '@/services/backend/auth';
import { createNS, queryNSByUid } from '@/services/backend/db/namespace';
import { get_k8s_username, queryUser } from '@/services/backend/db/user';
import { queryNamespacesByUser } from '@/services/backend/db/userToNamespace';
import { getUserKubeconfig, setUserTeamCreate } from '@/services/backend/kubernetes/admin';
import { GetUserDefaultNameSpace } from '@/services/backend/kubernetes/user';
import { jsonRes } from '@/services/backend/response';
import { bindingRole, modifyTeamRole } from '@/services/backend/team';
import { NSType, NamespaceDto, UserRole } from '@/types/team';
import { NextApiRequest, NextApiResponse } from 'next';
const TEAM_LIMIT = 5;
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await authSession(req.headers);
    if (!payload) return jsonRes(res, { code: 401, message: 'token verify error' });
    const { user: tokenUser } = payload;
    const { teamName } = req.body as { teamName?: string };
    if (!teamName) return jsonRes(res, { code: 400, message: 'teamName is required' });
    const currentNamespaces = await queryNamespacesByUser({
      userId: tokenUser.uid,
      k8s_username: tokenUser.k8s_username
    });
    if (currentNamespaces.length >= TEAM_LIMIT)
      return jsonRes(res, { code: 403, message: 'The number of teams created is too many' });
    const alreadyNamespace = currentNamespaces.findIndex((utn) => {
      const res = utn.namespace.teamName === teamName;
      return res;
    });
    if (alreadyNamespace > -1)
      return jsonRes(res, { code: 409, message: 'The team is already exist' });
    const user = await queryUser({ id: tokenUser.uid, provider: 'uid' });
    if (!user) throw new Error('fail to get user');
    const ns_creater = await get_k8s_username();
    if (!ns_creater) throw new Error('fail to get ns_creater');
    const nsid = GetUserDefaultNameSpace(ns_creater);
    // 创建伪user
    await getUserKubeconfig(user.uid, ns_creater);
    const creater_kc_str = await setUserTeamCreate(ns_creater);
    if (!creater_kc_str) throw new Error('fail to get kubeconfig');
    const namespace = await createNS({
      namespace: nsid,
      nstype: NSType.Team,
      teamName
    });
    if (!namespace) throw new Error(`failed to create namespace: ${nsid}`);
    const k8s_username = tokenUser.k8s_username;
    // 分配owner权限
    const utnResult = await bindingRole({
      userId: user.uid,
      k8s_username,
      ns_uid: namespace?.uid,
      role: UserRole.Owner,
      direct: true
    });
    if (!utnResult) throw new Error(`fail to binding namesapce: ${nsid}`);
    await modifyTeamRole({
      k8s_username,
      userId: user.uid,
      role: UserRole.Owner,
      action: 'Create',
      namespace
    });
    jsonRes<{ namespace: NamespaceDto }>(res, {
      code: 200,
      message: 'Successfully',
      data: {
        namespace: {
          createTime: namespace.createTime,
          uid: namespace.uid,
          id: namespace.id,
          nstype: namespace.nstype,
          teamName: namespace.teamName
        }
      }
    });
  } catch (e) {
    console.log(e);
    jsonRes(res, { code: 500, message: 'failed to create team' });
  }
}
