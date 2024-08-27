import yaml from 'js-yaml';
import { getUserNamespace } from './user';
import { Authority, BucketCR, FormSchema, UserCR } from '@/consts';
export const generateBucketCR = (data: {
  name: string;
  policy: Authority;
  namespace: string;
}): BucketCR['input'] => ({
  apiVersion: 'objectstorage.sealos.io/v1',
  kind: 'ObjectStorageBucket',
  metadata: {
    name: data.name,
    namespace: data.namespace
  },
  spec: {
    policy: data.policy
  }
});
export const generateUserCR = ({
  name,
  namespace,
  version = 0
}: {
  name: string;
  namespace: string;
  version?: number;
}): UserCR['input'] => ({
  apiVersion: 'objectstorage.sealos.io/v1',
  kind: 'ObjectStorageUser',
  metadata: {
    name,
    namespace
  },
  spec: {
    secretKeyVersion: version
  }
});
export const json2Bucket = (data: FormSchema) => {
  const namespace = getUserNamespace();

  const templates = [
    {
      filename: 'bucket.yaml',
      value: generateBucketCR({ name: data.bucketName, policy: data.bucketAuthority, namespace })
    }
  ] as const;
  return templates.map((template) => ({ ...template, value: yaml.dump(template.value) }));
};
