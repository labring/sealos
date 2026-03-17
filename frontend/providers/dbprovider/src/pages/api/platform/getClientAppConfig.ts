import { Config } from '@/config';
import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import {
  isServerMisconfiguredError,
  validateClientAppConfigOrThrow
} from '@sealos/shared/server/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const cfg = Config();
  return validateClientAppConfigOrThrow(ClientAppConfigSchema, {
    domain: cfg.cloud.domain,
    desktopDomain: cfg.cloud.desktopDomain,
    currencySymbol: cfg.dbprovider.ui.currencySymbol,
    guideEnabled: cfg.dbprovider.features.guide,
    showDocument: cfg.dbprovider.features.showDocument,
    fileImportEnabled: cfg.dbprovider.features.fileImport,
    forcedStorageClassName: cfg.dbprovider.storage.forcedClassName,
    storageMaxSize: cfg.dbprovider.storage.maxSize,
    monitoringUrl: cfg.dbprovider.components.monitoring.url,
    migrationJobCpuMillicores: cfg.dbprovider.migration.jobCpuMillicores,
    migrationJobMemoryMiB: cfg.dbprovider.migration.jobMemoryMiB,
    dumpImportJobCpuMillicores: cfg.dbprovider.migration.dumpImportCpuMillicores,
    dumpImportJobMemoryMiB: cfg.dbprovider.migration.dumpImportMemoryMiB,
    backupEnabled: cfg.dbprovider.backup.enabled,
    backupJobCpuMillicores: cfg.dbprovider.backup.jobCpuMillicores,
    backupJobMemoryMiB: cfg.dbprovider.backup.jobMemoryMiB,
    billingUrl: cfg.dbprovider.components.billing.url,
    chat2dbEnabled: cfg.dbprovider.components.chat2db.enabled,
    chat2dbAesKey: cfg.dbprovider.components.chat2db.aesKey,
    chat2dbClientDomainName: cfg.dbprovider.components.chat2db.clientDomainName,
    chat2dbGatewayDomainName: cfg.dbprovider.components.chat2db.gatewayDomainName,
    eventAnalysisEnabled: cfg.dbprovider.components.eventAnalysis.enabled,
    customScripts: cfg.dbprovider.ui.customScripts
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    jsonRes(res, {
      code: 200,
      data: getClientAppConfigServer()
    });
  } catch (error) {
    if (isServerMisconfiguredError(error)) {
      return jsonRes(res, { code: 500, message: 'Server misconfigured' });
    }
    console.error('[Client App Config] Unexpected server error:', error);
    return jsonRes(res, { code: 500, message: 'Internal Server Error' });
  }
}
