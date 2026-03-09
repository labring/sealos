import { Config } from '@/config';
import { jsonRes } from '@/services/backend/response';
import { ClientAppConfigSchema } from '@/types/config';
import type { NextApiRequest, NextApiResponse } from 'next';

export function getClientAppConfigServer() {
  const cfg = Config();
  return ClientAppConfigSchema.parse({
    domain: cfg.cloud.domain,
    desktopDomain: cfg.cloud.desktopDomain,
    currencySymbol: cfg.dbprovider.ui.currencySymbol,
    guideEnabled: cfg.dbprovider.ui.guideEnabled,
    showDocument: cfg.dbprovider.ui.showDocument,
    storageClassName: cfg.dbprovider.storage.className,
    storageMaxSize: cfg.dbprovider.storage.maxSize,
    monitoringUrl: cfg.dbprovider.monitoring.url,
    migrationJobCpu: cfg.dbprovider.migration.jobCpuRequirement,
    migrationJobMemory: cfg.dbprovider.migration.jobMemoryRequirement,
    dumpImportJobCpu: cfg.dbprovider.migration.dumpImportCpuRequirement,
    dumpImportJobMemory: cfg.dbprovider.migration.dumpImportMemoryRequirement,
    minioEnabled: cfg.dbprovider.minio.enabled,
    backupEnabled: cfg.dbprovider.backup.enabled,
    backupJobCpu: cfg.dbprovider.backup.jobCpuRequirement,
    backupJobMemory: cfg.dbprovider.backup.jobMemoryRequirement,
    billingUrl: cfg.dbprovider.billing.url,
    chat2dbEnabled: cfg.dbprovider.chat2db.enabled,
    chat2dbAesKey: cfg.dbprovider.chat2db.aesKey,
    chat2dbClientDomainName: cfg.dbprovider.chat2db.clientDomainName,
    chat2dbGatewayDomainName: cfg.dbprovider.chat2db.gatewayDomainName,
    customScripts: cfg.dbprovider.ui.customScripts
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  jsonRes(res, {
    code: 200,
    data: getClientAppConfigServer()
  });
}
