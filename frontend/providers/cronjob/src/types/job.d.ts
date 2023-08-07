export type CronJobResultType = {
  metadata: {
    annotations: { [key: string, string] };
    creationTimestamp: string;
    generation: string;
    managedFields: unknown[];
    name: string;
    namespace: string;
    resourceVersion: string;
    uid: string;
  };
  spec: {
    concurrencyPolicy: string;
    failedJobsHistoryLimit: number;
    jobTemplate: unknown;
    schedule: string;
    successfulJobsHistoryLimit: number;
    suspend: boolean;
  };
  status: {
    active: CronJobActiveHistoryType[];
    lastScheduleTime: string;
    lastSuccessfulTime: string;
  };
};

export type CronJobActiveHistoryType = {
  apiVersion: string;
  kind: string;
  name: string;
  namespace: string;
  resourceVersion: string;
  uid: string;
};

export type CronJobListItemType = {
  id: string;
  name: string;
  status: string;
  schedule: string;
  createTime: string;
  lastScheduleTime: string;
  lastSuccessfulTime: string;
};
