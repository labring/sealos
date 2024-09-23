import { jsonRes } from '@/services/backend/response'

export type SystemEnvResponse = {
  domain: string
  ingressSecret: string
  registryAddr: string
  devboxAffinityEnable: string
  squashEnable: string
}

export const dynamic = 'force-dynamic'

export async function GET() {
  return jsonRes<SystemEnvResponse>({
    data: {
      domain: process.env.SEALOS_DOMAIN || 'dev.sealos.plus',
      ingressSecret: process.env.INGRESS_SECRET || 'wildcard-cert',
      registryAddr: process.env.REGISTRY_ADDR || 'hub.dev.sealos.plus',
      devboxAffinityEnable: process.env.DEVBOX_AFFINITY_ENABLE || 'true',
      squashEnable: process.env.SQUASH_ENABLE || 'true'
    }
  })
}
