import dns from 'dns'
import { NextRequest } from 'next/server'

import { jsonRes } from '@/services/backend/response'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { publicDomain, customDomain } = (await req.json()) as {
      publicDomain: string
      customDomain: string
    }

    await (async () =>
      new Promise((resolve, reject) => {
        dns.resolveCname(customDomain, (err, address) => {
          console.log(err, address)
          if (err) return reject(err)

          if (address[0] !== publicDomain)
            return reject("Cname auth error: customDomain's cname is not equal to publicDomain")
          resolve('')
        })
      }))()

    return jsonRes({})
  } catch (error) {
    return jsonRes({
      code: 500,
      error
    })
  }
}
