import path from 'path';
import * as Minio from 'minio';
import sharp from 'sharp';
import { enablePersistImage } from '@/services/enable';

// todo change env to configs
const endPoint = process.env.OS_URL!;
const bucketName = process.env.OS_BUCKET_NAME!;
const port = Number(process.env.OS_PORT)!;
const accessKey = process.env.OS_ACCESS_KEY!;
const secretKey = process.env.OS_SECRET_KEY!;

export const _persistImage =
  (minioClient: Minio.Client, bucketName: string) => async (url: string, id: string) => {
    if (!url) return null;
    const promise1 = fetch(url);
    const response = await Promise.race([
      promise1,
      new Promise<null>((res) => {
        setTimeout(() => res(null), 5000);
      })
    ]);
    // timeout

    if (!response || !response.ok) {
      return null;
    }
    const buffer = await response.arrayBuffer();
    if (!buffer) return null;
    const transformer = sharp(buffer).resize(200).webp({
      quality: 80
    });
    const metaData = {
      'Content-Type': 'image/webp'
    };
    const objectName = id + '.webp';
    const result = await minioClient.putObject(bucketName, objectName, transformer, metaData);
    if (result) return `https://${endPoint}:${port}/${bucketName}/${objectName}`;
    else return null;
  };
export const persistImage = enablePersistImage()
  ? _persistImage(
      new Minio.Client({
        endPoint,
        port,
        useSSL: true,
        accessKey,
        secretKey
      }),
      bucketName
    )
  : async (url: string) => url;
