import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { defaultEnv } from '@/stores/env';
import type { Env } from '@/types/static';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const headerList = req.headers;

    const { namespace } = await getK8s({
      kubeconfig: await authSession(headerList)
    });

    return jsonRes<Env>({
      data: {
        documentUrlZH: process.env.DOCUMENT_URL_ZH || defaultEnv.documentUrlZH,
        documentUrlEN: process.env.DOCUMENT_URL_EN || defaultEnv.documentUrlEN,
        privacyUrlZH: process.env.PRIVACY_URL_ZH || defaultEnv.privacyUrlZH,
        privacyUrlEN: process.env.PRIVACY_URL_EN || defaultEnv.privacyUrlEN,
        sealosDomain: process.env.SEALOS_DOMAIN || defaultEnv.sealosDomain,
        sshDomain: process.env.SSH_DOMAIN || process.env.SEALOS_DOMAIN || defaultEnv.sshDomain,
        ingressSecret: process.env.INGRESS_SECRET || defaultEnv.ingressSecret,
        registryAddr: process.env.REGISTRY_ADDR || defaultEnv.registryAddr,
        devboxAffinityEnable: process.env.DEVBOX_AFFINITY_ENABLE || defaultEnv.devboxAffinityEnable,
        storageLimit: process.env.STORAGE_LIMIT || defaultEnv.storageLimit,
        namespace: namespace || defaultEnv.namespace,
        rootRuntimeNamespace: process.env.ROOT_RUNTIME_NAMESPACE || defaultEnv.rootRuntimeNamespace,
        ingressDomain: process.env.INGRESS_DOMAIN || defaultEnv.ingressDomain,
        currencySymbol: (process.env.CURRENCY_SYMBOL || defaultEnv.currencySymbol) as
          | 'shellCoin'
          | 'cny'
          | 'usd',
        enableImportFeature: process.env.ENABLE_IMPORT_FEATURE || defaultEnv.enableImportFeature,
        enableWebideFeature: process.env.ENABLE_WEBIDE_FEATURE || defaultEnv.enableWebideFeature,
        cpuSlideMarkList: process.env.CPU_SLIDE_MARK_LIST || defaultEnv.cpuSlideMarkList,
        memorySlideMarkList: process.env.MEMORY_SLIDE_MARK_LIST || defaultEnv.memorySlideMarkList
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
