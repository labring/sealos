export enum Authority {
  readonly = 'publicRead',
  private = 'private',
  readwrite = 'publicReadwrite'
}
export const FolderPlaceholder = '_#';
export enum QueryKey {
  bucketList = 'bucketList',
  bucketInfo = 'bucketInfo',
  bucketUser = 'bucketUser',
  minioFileList = 'minioFileList',
  HostStatus = 'hostStatus',
  openHost = 'openHost',
  closeHost = 'closeHost',
  minioBucketDetial = 'minioBucketDetial'
}
export type FormSchema = {
  bucketAuthority: Authority;
  bucketName: string;
};
export enum TabId {
  Form = 'Form',
  Yaml = 'Yaml'
}
export type TFile = {
  Key: string;
  LastModified: string;
  ETag: string;
  ChecksumAlgorithm: any[];
  Size: number;
  StorageClass: string;
  Owner: {
    DisplayName: string;
    ID: string;
  };
  Prefix?: string;
};
export enum FileType {
  Regular,
  Directory,
  Symlink,
  CharDevice,
  BlockDevice,
  Fifo,
  Socket
}
type MinioGroup<
  Kind extends string,
  TMetadata extends Record<string, unknown> | undefined,
  Tspec extends Record<string, unknown> | undefined,
  Tstatus extends Record<string, unknown> | undefined
> = {
  input: Omit<
    {
      apiVersion: 'objectstorage.sealos.io/v1';
      kind: Kind;
      metadata: TMetadata;
      spec: Tspec;
    },
    ([Tspec] extends [never] ? 'spec' : never) | ([TMetadata] extends [never] ? 'metadata' : never)
  >;
  output: Omit<
    {
      apiVersion: 'objectstorage.sealos.io/v1';
      kind: Kind;
      metadata: {
        annotations?: unknown;
        creationTimestamp?: string;
        generation?: number;
        managedFields?: unknown[];
        resourceVersion?: string;
        uid?: string;
      } & TMetadata;
      spec: Tspec;
      status: Tstatus;
    },
    [Tstatus] extends [never] ? 'status' : never
  >;
};
export type BucketCR = MinioGroup<
  'ObjectStorageBucket',
  {
    name: string;
    namespace: string;
  },
  {
    policy: Authority;
  },
  | {
      name: string;
    }
  | undefined
>;
export type UserCR = MinioGroup<
  'ObjectStorageUser',
  {
    name: string;
    namespace: string;
  },
  never,
  {
    quota: number;
    size: number;
    objectsCount: number;
    accessKey: string;
    external: string;
    internal: string;
    secretKey: string;
  }
>;

export type TBucket = {
  name: string;
  crName: string;
  policy: Authority;
  isComplete: boolean;
};
export type bucketConfigQueryParam = { bucketName?: string; bucketPolicy?: Authority };
export type UserSecretData = {
  CONSOLE_ACCESS_KEY: string;
  CONSOLE_SECRET_KEY: string;
  external: string;
  internal: string;
};
export type QuotaData = {
  total: number;
  used: number;
  count: number;
};

// {
// 	"data": {
// 		"status": "success",
// 		"data": {
// 			"resultType": "vector",
// 			"result": [
// 				{
// 					"metric": {
// 						"__name__": "minio_bucket_usage_total_bytes",
// 						"bucket": "admin-hello-world",
// 						"instance": "minio.minio-system.svc.cluster.local:80",
// 						"job": "minio-job",
// 						"namespace": "minio-system",
// 						"server": "minio-sealos-pool-0-3.minio-sealos-hl.minio-system.svc.cluster.local:9000"
// 					},
// 					"value": [
// 						1698907758.363,
// 						"4845"
// 					]
// 				},
// 				{
// 					"metric": {
// 						"__name__": "minio_bucket_usage_total_bytes",
// 						"bucket": "admin-world-hello",
// 						"instance": "minio.minio-system.svc.cluster.local:80",
// 						"job": "minio-job",
// 						"namespace": "minio-system",
// 						"server": "minio-sealos-pool-0-3.minio-sealos-hl.minio-system.svc.cluster.local:9000"
// 					},
// 					"value": [
// 						1698907758.363,
// 						"23"
// 					]
// 				},
// 				{
// 					"metric": {
// 						"__name__": "minio_bucket_usage_total_bytes",
// 						"bucket": "test",
// 						"instance": "minio.minio-system.svc.cluster.local:80",
// 						"job": "minio-job",
// 						"namespace": "minio-system",
// 						"server": "minio-sealos-pool-0-3.minio-sealos-hl.minio-system.svc.cluster.local:9000"
// 					},
// 					"value": [
// 						1698907758.363,
// 						"8816"
// 					]
// 				}
// 			]
// 		}
// 	}
// }
export type MonitorData = {
  resultType: 'vector';
  result: {
    metric: {
      __name__: string;
      bucket: string;
      instance: string;
      job: string;
      namespace: string;
      server: string;
    };
    values: [number, string][];
    value: null;
  }[];
};
