import {
  DeleteObjectsCommandInput,
  HeadObjectCommandInput,
  ListObjectsV2CommandInput,
  PutObjectCommandInput,
  S3
} from '@aws-sdk/client-s3';

export const listObjects = (client: S3) => (data: ListObjectsV2CommandInput) =>
  client.listObjectsV2({ ...data });
export const putObject = (client: S3) => (data: PutObjectCommandInput) =>
  client.putObject({ ...data });
export const deleteObject = (client: S3) => (data: DeleteObjectsCommandInput) =>
  client.deleteObjects({ ...data });
export const getBucketInfo = (client: S3) => (data: HeadObjectCommandInput) =>
  client.headObject(data);
