import { jsonRes } from '@/services/backend/response'

export type SystemEnvResponse = {
  domain: string
  ingressSecret: string
  registryAddr: string
}

export const dynamic = 'force-dynamic'

export async function GET() {
  return jsonRes<SystemEnvResponse>({
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      ingressSecret: process.env.INGRESS_SECRET || 'wildcard-cert',
      registryAddr: process.env.REGISTRY_ADDR || 'hub.dev.sealos.plus'
    }
  })
}
