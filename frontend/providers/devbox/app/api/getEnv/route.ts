import { jsonRes } from '@/services/backend/response'

export type SystemEnvResponse = {
  domain: string
  ingressSecret: string
}

export const dynamic = 'force-dynamic'

export async function GET() {
  return jsonRes<SystemEnvResponse>({
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io',
      ingressSecret: process.env.INGRESS_SECRET || 'wildcard-cert'
    }
  })
}
