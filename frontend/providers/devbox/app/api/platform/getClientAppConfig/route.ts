import { getClientAppConfigServer } from '@/server/getClientAppConfig';
import { jsonRes } from '@/services/backend/response';
import { isServerMisconfiguredError } from '@sealos/shared/server/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return jsonRes({
      data: getClientAppConfigServer()
    });
  } catch (error) {
    if (isServerMisconfiguredError(error)) {
      return jsonRes({ code: 500, message: 'Server misconfigured' });
    }
    console.error('[Client App Config] Unexpected server error:', error);
    return jsonRes({ code: 500, message: 'Internal Server Error' });
  }
}
