import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/services/backend/db/init';
import { verifyGlobalJwt, ensureGlobalTokenClaims } from '@/services/backend/auth';
import { JoinStatus } from 'prisma/region/generated/client';
import { applyOAuth2NoStoreHeaders } from './utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. 禁用缓存
  applyOAuth2NoStoreHeaders(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // 2. 提取并校验 OAuth2 Bearer Token (使用 Global JWT 签名验证)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    res.setHeader(
      'WWW-Authenticate',
      'Bearer error="invalid_token", error_description="Missing bearer token"'
    );
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Missing bearer token'
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    res.setHeader(
      'WWW-Authenticate',
      'Bearer error="invalid_token", error_description="Missing bearer token"'
    );
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Missing bearer token'
    });
  }

  const rawClaims = await verifyGlobalJwt(token);
  const claims = ensureGlobalTokenClaims(rawClaims);

  if (!claims || !claims.sub) {
    res.setHeader(
      'WWW-Authenticate',
      'Bearer error="invalid_token", error_description="The access token expired or is invalid"'
    );
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'The access token expired or is invalid'
    });
  }

  // 3. 校验 Scope (如果 token 声明了 scope，必须包含 workspaces 或 read:workspaces；若无 scope 则兼容放行)
  if (claims.scope) {
    const scopes = claims.scope.trim().split(/\s+/);
    if (!scopes.includes('workspaces') && !scopes.includes('read:workspaces')) {
      res.setHeader('WWW-Authenticate', 'Bearer error="insufficient_scope", scope="workspaces"');
      return res.status(403).json({
        error: 'insufficient_scope',
        error_description: "The request requires the 'workspaces' scope"
      });
    }
  }

  const userUid = claims.sub;

  try {
    // 4. 在 Region 数据库中查找对应的 UserCr
    const userCr = await prisma.userCr.findUnique({
      where: { userUid }
    });

    if (!userCr) {
      return res.status(404).json({
        error: 'user_not_found',
        error_description: 'No corresponding regional user resource found'
      });
    }

    // 5. 解析可选过滤参数
    const rawStatus = Array.isArray(req.query.status) ? req.query.status[0] : req.query.status;
    const statusParam =
      typeof rawStatus === 'string' && rawStatus ? rawStatus.toUpperCase() : 'IN_WORKSPACE';

    const rawType = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;
    const typeParam = typeof rawType === 'string' && rawType ? rawType.toLowerCase() : 'all';

    const statusFilter =
      statusParam === 'ALL'
        ? undefined
        : JoinStatus[statusParam as keyof typeof JoinStatus] || JoinStatus.IN_WORKSPACE;

    // 6. 查询该用户所属的所有 Workspaces
    const records = await prisma.userWorkspace.findMany({
      where: {
        userCrUid: userCr.uid,
        ...(statusFilter ? { status: statusFilter } : {})
      },
      include: {
        workspace: true
      },
      orderBy: [
        { isPrivate: 'desc' }, // 个人空间排在首位
        { createdAt: 'asc' }
      ]
    });

    // 7. 过滤与排序
    const validRecords = records.filter((item) => Boolean(item.workspace));
    const filteredRecords = validRecords.filter((item) => {
      if (typeParam === 'personal') return item.isPrivate;
      if (typeParam === 'team') return !item.isPrivate;
      return true;
    });

    filteredRecords.sort((a, b) => {
      if (a.isPrivate !== b.isPrivate) {
        return a.isPrivate ? -1 : 1;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    // 8. 组装标准响应
    const workspaces = filteredRecords.map((item) => ({
      uid: item.workspace.uid,
      id: item.workspace.id,
      display_name: item.workspace.displayName,
      role: item.role,
      is_personal: item.isPrivate,
      status: item.status,
      created_at: item.workspace.createdAt.toISOString(),
      joined_at: item.joinAt ? item.joinAt.toISOString() : null
    }));

    return res.status(200).json({
      workspaces,
      total: workspaces.length
    });
  } catch (error) {
    console.error('[OAuth2 Workspaces API Error]:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error while retrieving workspaces'
    });
  }
}
