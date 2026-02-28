import { NextRequest } from 'next/server';

import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { defaultEnv } from '@/stores/env';
import type { Env } from '@/types/static';
import { normalizeStorageDefaultGi } from '@/utils/storage';

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
        ingressSecret: process.env.INGRESS_SECRET || defaultEnv.ingressSecret,
        registryAddr: process.env.REGISTRY_ADDR || defaultEnv.registryAddr,
        devboxAffinityEnable: process.env.DEVBOX_AFFINITY_ENABLE || defaultEnv.devboxAffinityEnable,
        squashEnable: process.env.SQUASH_ENABLE || defaultEnv.squashEnable,
        namespace: namespace || defaultEnv.namespace,
        rootRuntimeNamespace: process.env.ROOT_RUNTIME_NAMESPACE || defaultEnv.rootRuntimeNamespace,
        ingressDomain: process.env.INGRESS_DOMAIN || defaultEnv.ingressDomain,
        currencySymbol: (process.env.CURRENCY_SYMBOL || defaultEnv.currencySymbol) as
          | 'shellCoin'
          | 'cny'
          | 'usd',
        enableImportFeature: process.env.ENABLE_IMPORT_FEATURE || defaultEnv.enableImportFeature,
        enableWebideFeature: process.env.ENABLE_WEBIDE_FEATURE || defaultEnv.enableWebideFeature,
        enableAdvancedEnvAndConfigmap:
          process.env.ENABLE_ADVANCED_CONFIG === 'true'
            ? 'true'
            : process.env.ENABLE_ADVANCED_ENV_AND_CONFIGMAP ||
              defaultEnv.enableAdvancedEnvAndConfigmap,
        enableAdvancedNfs:
          process.env.ENABLE_ADVANCED_CONFIG === 'true'
            ? 'true'
            : process.env.ENABLE_ADVANCED_NFS || defaultEnv.enableAdvancedNfs,
        enableAdvancedSharedMemory:
          process.env.ENABLE_ADVANCED_CONFIG === 'true'
            ? 'true'
            : process.env.ENABLE_ADVANCED_SHARED_MEMORY || defaultEnv.enableAdvancedSharedMemory,
        cpuSlideMarkList: process.env.CPU_SLIDE_MARK_LIST || defaultEnv.cpuSlideMarkList,
        memorySlideMarkList: process.env.MEMORY_SLIDE_MARK_LIST || defaultEnv.memorySlideMarkList,
        storageDefault: normalizeStorageDefaultGi(
          process.env.STORAGE_DEFAULT,
          defaultEnv.storageDefault
        ),
        nfsStorageClassName: process.env.NFS_STORAGE_CLASS_NAME || defaultEnv.nfsStorageClassName,
        webIdePort: Number(process.env.WEBIDE_PORT) || defaultEnv.webIdePort
      }
    });
  } catch (err: any) {
    return jsonRes({
      code: 500,
      error: err
    });
  }
}
