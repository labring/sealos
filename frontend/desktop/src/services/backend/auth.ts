import { IncomingHttpHeaders } from 'http';
import { sign, verify } from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { K8sApi } from './kubernetes/user';
const jwtSecret = process.env.JWT_SECRET as string
export const authSession = async (header: IncomingHttpHeaders) => {
  try {
    if (!header?.authorization) {
      return Promise.reject('缺少凭证')
    }

    const kubeconfig = decodeURIComponent(header.authorization)
    const kc = K8sApi(kubeconfig)

    return Promise.resolve(kc)
  } catch (err) {
    return Promise.reject('凭证错误')
  }

};
export const verifyJWT: (token: string) => Promise<string | JwtPayload> = (token: string) => new Promise((resolve, reject) => {
  verify(token, jwtSecret, (err, payload) => {
    if (err) {
      reject(err);
    } else if (!payload) {
      reject('无效凭证');
    } else {
      resolve(payload);
    }
  });
});
export const generateJWT = (
  uid: string
) => {
  // console.log('generateJWT', jwtSecret, uid)
  return sign({ uid }, jwtSecret, {
    expiresIn: '7d'
  })
};
