import { ApiProxyBackendResp } from '@/types/api.d'
import { TokenInfo } from '@/types/user/token'

type TokenSearchResponse = {
  tokens: TokenInfo[]
  total: number
}

/**
 * Look up a single token by exact (case-sensitive) name within a group.
 *
 * The backend's /search endpoint does fuzzy matching, so this helper fetches
 * up to 100 results and filters for exact equality.
 *
 * Returns null if the token does not exist; throws on transport/config errors.
 */
export async function findTokenByName(name: string, group: string): Promise<TokenInfo | null> {
  const baseUrl = global.AppConfig?.backend.aiproxyInternal || global.AppConfig?.backend.aiproxy
  if (!baseUrl) {
    throw new Error('Backend service URL is not configured')
  }

  const authKey = global.AppConfig?.auth.aiProxyBackendKey
  if (!authKey) {
    throw new Error('Backend auth key is not configured')
  }

  const url = new URL(`/api/token/${group}/search`, baseUrl)
  url.searchParams.append('name', name)
  url.searchParams.append('per_page', '100')

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authKey,
    },
    cache: 'no-store',
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result: ApiProxyBackendResp<TokenSearchResponse> = await response.json()

  if (!result.success) {
    throw new Error(result.message || 'Failed to search token')
  }

  return result.data?.tokens?.find((tokenInfo) => tokenInfo.name === name) ?? null
}
