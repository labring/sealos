import jwt from 'jsonwebtoken';

interface AppTokenPayload {
  workspaceUid: string;
  workspaceId: string;
  regionUid: string;
  userCrUid: string;
  userCrName: string;
  userId: string;
  userUid: string;
  iat: number;
  exp: number;
}

type RealNameInfoResponse = {
  data: {
    userID: string;
    isRealName: boolean;
  };
  error?: string;
  message: string;
};

export async function checkSealosUserIsRealName(token: string): Promise<boolean> {
  const sealosAccountServer = process.env.SEALOS_ACCOUNT_SERVER;
  const sealosAccountServerTokenJwtKey = process.env.SEALOS_ACCOUNT_SERVER_TOKEN_JWT_KEY;
  const sealosAppTokenJwtKey = process.env.SEALOS_APP_TOKEN_JWT_KEY;

  if (!sealosAccountServer) {
    console.warn('CheckSealosUserIsRealName: Account server is not set');
    return true;
  }

  if (!sealosAccountServerTokenJwtKey) {
    console.warn('CheckSealosUserIsRealName: Account server token jwt key is not set');
    return true;
  }

  if (!sealosAppTokenJwtKey) {
    console.warn('CheckSealosUserIsRealName: App token jwt key is not set');
    return true;
  }

  try {
    if (!token) {
      console.error('CheckSealosUserIsRealName: Token is missing');
      return false;
    }

    const decoded = jwt.verify(token, sealosAppTokenJwtKey) as AppTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.error('CheckSealosUserIsRealName: Token expired');
      return false;
    }

    if (!decoded.userUid && !decoded.userId) {
      console.error('CheckSealosUserIsRealName: User uid or user id is missing, token is invalid');
      return false;
    }

    const accountServerToken = jwt.sign(
      {
        userUid: decoded.userUid,
        userId: decoded.userId
      },
      sealosAccountServerTokenJwtKey,
      { expiresIn: '1d' }
    );

    const response = await fetch(`${sealosAccountServer}/account/v1alpha1/real-name-info`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accountServerToken}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip,deflate,compress'
      },
      cache: 'no-store'
    });
    const result: RealNameInfoResponse = await response.json();
    if (result.error) {
      console.error(result.error);
      return false;
    }

    return result.data.isRealName;
  } catch (error) {
    console.error('CheckSealosUserIsRealName: ', error);
    return false;
  }
}
