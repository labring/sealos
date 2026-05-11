import { decode, JwtPayload, sign, verify } from 'jsonwebtoken';
import { ERROR_ENUM } from '../error';

interface CustomJwtPayload extends JwtPayload {
  namespace: string;
  devboxName: string;
}

const k8sNamePattern = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

const isValidK8sName = (value: unknown): value is string =>
  typeof value === 'string' && k8sNamePattern.test(value);

const isCustomJwtPayload = (payload: unknown): payload is CustomJwtPayload => {
  if (!payload || typeof payload !== 'object') return false;
  const { namespace, devboxName } = payload as Partial<CustomJwtPayload>;
  return isValidK8sName(namespace) && isValidK8sName(devboxName);
};

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
  const payload = verifyToken<{ workspaceId: string }>(token, process.env.JWT_SECRET as string);
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
  const payload = verifyToken<{
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
}) =>
  sign(payload, process.env.JWT_SECRET as string, {
    algorithm: 'HS256',
    expiresIn: '7d'
  });

export const getPayloadWithoutVerification = (
  headers: Headers
): { payload: CustomJwtPayload | null; token: string | null } => {
  try {
    const authHeader = headers.get('authorization');
    if (!authHeader) {
      return { payload: null, token: null };
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const decodedToken = decode(token, { complete: true }) as {
      header?: { alg?: string };
      payload?: unknown;
    } | null;
    if (!decodedToken || decodedToken.header?.alg !== 'HS256') {
      return { payload: null, token: null };
    }
    if (!isCustomJwtPayload(decodedToken.payload)) {
      return { payload: null, token: null };
    }
    const payload = decodedToken.payload;
    return { payload, token };
  } catch (err) {
    console.log(err);
    return { payload: null, token: null };
  }
};
export const verifyToken = <TPayload = CustomJwtPayload>(
  token: string,
  secret: string
): TPayload | null => {
  try {
    if (!secret) return null;
    const payload = verify(token, secret, { algorithms: ['HS256'] }) as TPayload;
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
) =>
  sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '365d'
  });
