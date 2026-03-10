import { getClientAppConfigServer } from '@/src/server/getClientAppConfig';
import { jsonRes } from '@/services/backend/response';

export const dynamic = 'force-dynamic';

export async function GET() {
  return jsonRes({
    data: getClientAppConfigServer()
  });
}
