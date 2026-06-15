import { decodeJwt as joseDecodeJwt, jwtVerify, SignJWT, type JWTPayload } from 'jose';

const textEncoder = new TextEncoder();

export type JwtPayload = JWTPayload;
export type JwtExpiresIn = number | string | Date;

export type SignJwtOptions = {
  expiresIn?: JwtExpiresIn;
};

type SignableJwtPayload = JWTPayload & Record<string, unknown>;

const getSecretKey = (secret: string) => textEncoder.encode(secret);

const isNumericString = (value: string) => /^-?\d+$/.test(value);

const toExpirationTime = (expiresIn: JwtExpiresIn) => {
  if (typeof expiresIn === 'string' && isNumericString(expiresIn)) {
    return new Date(Date.now() + Number(expiresIn));
  }

  return expiresIn;
};

export const isJwtToken = (token: string): boolean => token.split('.').length === 3;

export const signJwt = <T extends object>(
  payload: T,
  secret: string,
  options: SignJwtOptions = {}
): Promise<string> => {
  let jwt = new SignJWT(payload as SignableJwtPayload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt();

  if (options.expiresIn !== undefined) {
    jwt = jwt.setExpirationTime(toExpirationTime(options.expiresIn));
  }

  return jwt.sign(getSecretKey(secret));
};

export const verifyJwtOrThrow = async <T extends object>(
  token: string,
  secret: string
): Promise<T & JWTPayload> => {
  const { payload } = await jwtVerify<T & JWTPayload>(token, getSecretKey(secret), {
    algorithms: ['HS256']
  });

  return payload;
};

export const verifyJwt = async <T extends object>(
  token: string | undefined,
  secret: string
): Promise<(T & JWTPayload) | null> => {
  if (!token) return null;

  try {
    return await verifyJwtOrThrow<T>(token, secret);
  } catch {
    return null;
  }
};

export const decodeJwt = <T extends object>(token: string): (T & JWTPayload) | null => {
  try {
    return joseDecodeJwt<T & JWTPayload>(token);
  } catch {
    return null;
  }
};
