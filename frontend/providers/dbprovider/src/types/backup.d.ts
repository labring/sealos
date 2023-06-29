import { DBStatusEnum, DBTypeEnum, PodStatusEnum } from '@/constants/db';
import { BackupStatusEnum } from '@/constants/backup';

export interface BackupPolicyType {
  apiVersion: 'dataprotection.kubeblocks.io/v1alpha1';
  kind: 'BackupPolicy';
  metadata: {
    annotations: Record<string, string>;
    labels: {
      'app.kubernetes.io/instance': string;
      'app.kubernetes.io/managed-by': 'kubeblocks';
      'apps.kubeblocks.io/component-def-ref': `${DBTypeEnum}`;
    };
    name: string;
    namespace: string;
  };
  spec: {
    datafile: {
      backupToolName: string;
      backupsHistoryLimit: number;
      persistentVolumeClaim: {
        createPolicy: 'IfNotPresent';
        initCapacity: string;
        name: string;
      };
    };
  };
  status: {
    phase: 'Available';
  };
}

export interface BackupCRItemType {
  kind: 'Backup';
  metadata: {
    annotations: Record<string, string>;
    creationTimestamp: Date;
    labels: Record<string, string>;
    name: string;
    uid: string;
  };
  spec: {
    backupPolicyName: string;
    backupType: string;
  };
  status: {
    backupToolName: string;
    completionTimestamp: Date;
    duration: string;
    expiration: Date;
    persistentVolumeClaimName: string;
    phase: `${BackupStatusEnum}`;
    startTimestamp?: Date;
    failureReason?: string;
  };
}
