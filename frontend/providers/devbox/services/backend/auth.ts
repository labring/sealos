import { decode, JwtPayload, sign, verify } from 'jsonwebtoken';
import { ERROR_ENUM } from '../error';
import { IncomingHttpHeaders } from 'http';

interface CustomJwtPayload extends JwtPayload {
  namespace: string;
  devboxName: string;
}

export const authSession = async (headers: Headers) => {
  if (!headers) return Promise.reject(ERROR_ENUM.unAuthorization);

  const authorization = headers.get('Authorization') || null;

  if (!authorization) return Promise.reject(ERROR_ENUM.unAuthorization);

  try {
    const kubeConfig = decodeURIComponent(authorization);
    return Promise.resolve(kubeConfig);
  } catch (err) {
    return Promise.reject(ERROR_ENUM.unAuthorization);
  }
};
export const authSessionWithDesktopJWT = async (headers: Headers) => {
  const kubeConfig = await authSession(headers);
  const token = headers.get('Authorization-Bearer');
  if (!token) return Promise.reject(ERROR_ENUM.unAuthorization);
  const payload = await verifyToken<{ workspaceId: string }>(
    token,
    process.env.JWT_SECRET as string
  );
  if (!payload) return Promise.reject(ERROR_ENUM.unAuthorization);
  return {
    kubeConfig,
    payload,
    token
  };
};
export const authSessionWithJWT = async (headers: Headers) => {
  const kubeConfig = await authSession(headers);
  const token = headers.get('Authorization-Bearer');
  if (!token) return Promise.reject(ERROR_ENUM.unAuthorization);
  const payload = await verifyToken<{
    workspaceId: string;
    organizationUid: string;
    userUid: string;
    regionUid: string;
  }>(token, process.env.JWT_SECRET as string);
  if (!payload) return Promise.reject(ERROR_ENUM.unAuthorization);
  return {
    kubeConfig,
    payload,
    token
  };
};
export const generateDevboxToken = (payload: {
  workspaceId: string;
  organizationUid: string;
  userUid: string;
  regionUid: string;
}) => sign(payload, process.env.JWT_SECRET as string, { expiresIn: '7d' });

export const getPayloadWithoutVerification = <T = CustomJwtPayload>(
  headers: Headers
): { payload: T | null; token: string | null } => {
  try {
    const authHeader = headers.get('authorization');
    if (!authHeader) {
      return { payload: null, token: null };
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const payload = decode(token) as T;
    return { payload, token };
  } catch (err) {
    console.log(err);
    return { payload: null, token: null };
  }
};
export const verifyToken = async <TPayload = CustomJwtPayload>(
  token: string,
  secret: string
): Promise<TPayload | null> => {
  try {
    const payload = verify(token, secret) as TPayload;
    return payload;
  } catch (err) {
    return null;
  }
};

export const generateAccessToken = (
  payload: {
    namespace: string;
    devboxName: string;
  },
  secret: string
) => sign(payload, secret, { expiresIn: '365d' });
