import { IncomingHttpHeaders } from 'http';
import { sign, verify } from 'jsonwebtoken';
import { K8sApi } from './kubernetes/user';
import { JWTPayload } from '@/types';
import { queryUTN } from './db/userToNamespace';

const jwtSecret = (process.env.JWT_SECRET as string) || '123456789';
export const authSession = async (header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      throw new Error('缺少凭证');
    }
    const token = decodeURIComponent(header.authorization);
    const payload = await verifyJWT(token);
    if (
      !payload ||
      !payload.kubeconfig ||
      !payload?.user?.uid ||
      !payload?.user?.nsid ||
      !payload?.user?.ns_uid ||
      !payload?.user?.k8s_username
    )
      throw new Error('token is null');
    // console.log('jwt:', payload.kubeconfig)
    const kc = K8sApi(payload.kubeconfig);
    const username = kc.getCurrentUser()?.name;
    const user = payload.user;
    if (!username || user.k8s_username !== username) throw new Error('user is invaild');
    // console.log('user',user)
    const utn = await queryUTN({
      userId: user.uid,
      k8s_username: user.k8s_username,
      namespaceId: user.ns_uid
    });
    if (!utn) return Promise.resolve(null);
    return Promise.resolve({ kc, user });
  } catch (err) {
    console.error(err);
    return Promise.resolve(null);
  }
};
export const verifyJWT: (token: string) => Promise<JWTPayload | null> = (token: string) =>
  new Promise((resolve) => {
    verify(token, jwtSecret, (err, payload) => {
      if (err) {
        console.log(err);
        resolve(null);
      } else if (!payload) {
        console.log('payload is null');
        resolve(null);
      } else {
        resolve(payload as JWTPayload);
      }
    });
  });
export const generateJWT = (props: JWTPayload) => {
  console.log('jwt: ', props);
  return sign(props, jwtSecret, {
    expiresIn: '7d'
  });
};
