import yaml from 'js-yaml';
import { getUserNamespace } from './user';
import { Authority, BucketCR, FormSchema, UserCR } from '@/consts';
export const generateBucketCR = (data: {
  name: string;
  policy: Authority;
  namespace: string;
}): BucketCR['input'] => ({
  apiVersion: 'minio.sealos.io/v1',
  kind: 'Bucket',
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
  namespace
}: {
  name: string;
  namespace: string;
}): UserCR['input'] => ({
  apiVersion: 'minio.sealos.io/v1',
  kind: 'MinioUser',
  metadata: {
    name,
    namespace
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
