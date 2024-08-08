import { jsonRes } from '@/services/backend/response'

export type SystemEnvResponse = {
  domain: string
}

export async function GET() {
  return jsonRes<SystemEnvResponse>({
    data: {
      domain: process.env.SEALOS_DOMAIN || 'cloud.sealos.io'
    }
  })
}
