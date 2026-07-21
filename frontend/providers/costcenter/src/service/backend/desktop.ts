import type { AppConfig } from '@/types/config';
import { z } from 'zod';

type CloudEndpoint = Pick<AppConfig['cloud'], 'domain' | 'port'>;

const DEFAULT_DESKTOP_TIMEOUT_MS = 30_000;

const WorkspaceResponseSchema = z.object({
  code: z.number().int(),
  message: z.string().optional(),
  data: z
    .object({
      namespace: z.object({
        id: z.string().min(1)
      })
    })
    .nullish()
});

type CreateWorkspaceInput = {
  origin: string;
  internalToken: string;
  teamName: string;
  userType: 'subscription' | 'payg';
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export class DesktopRequestError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
    this.name = 'DesktopRequestError';
  }
}

function upstreamErrorCode(code: number): number {
  return code >= 400 && code <= 504 ? code : 502;
}

export function getDesktopPublicOrigin({ domain, port }: CloudEndpoint): string {
  const url = new URL(`https://${domain}`);
  url.port = String(port);
  return url.origin;
}

export async function createWorkspaceViaDesktop({
  origin,
  internalToken,
  teamName,
  userType,
  timeoutMs = DEFAULT_DESKTOP_TIMEOUT_MS,
  fetchImpl = fetch
}: CreateWorkspaceInput): Promise<string> {
  const url = new URL('/api/auth/namespace/create', origin);
  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: internalToken
      },
      body: JSON.stringify({ teamName, userType }),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error) {
    if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
      throw new DesktopRequestError(504, 'Desktop request timed out');
    }
    throw new DesktopRequestError(502, 'Failed to reach Desktop service');
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch {
    throw new DesktopRequestError(
      upstreamErrorCode(response.status),
      response.ok ? 'Desktop returned an invalid response' : 'Desktop service unavailable'
    );
  }

  const parsedResponse = WorkspaceResponseSchema.safeParse(responseBody);
  if (!parsedResponse.success) {
    throw new DesktopRequestError(
      upstreamErrorCode(response.status),
      response.ok ? 'Desktop returned an invalid response' : 'Desktop service unavailable'
    );
  }

  const workspaceResponse = parsedResponse.data;
  if (!response.ok || workspaceResponse.code !== 200) {
    const code = upstreamErrorCode(response.ok ? workspaceResponse.code : response.status);
    throw new DesktopRequestError(code, workspaceResponse.message || 'Failed to create workspace');
  }

  const workspaceId = workspaceResponse.data?.namespace.id;
  if (!workspaceId) {
    throw new DesktopRequestError(502, 'Desktop returned an invalid response');
  }

  return workspaceId;
}
