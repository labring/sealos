import { verifyAccessToken } from '@/services/backend/auth';
import { AccessTokenPayload } from '@/types/token';
import { NextApiRequest } from 'next';

export const resolveOAuth2AuthUser = async (
  req: NextApiRequest
): Promise<AccessTokenPayload | null> => verifyAccessToken(req.headers);
