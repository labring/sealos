import { _persistImage } from '@/services/backend/persistImage';
import { Client } from 'minio';
import process from 'process';

describe('persist image', () => {
  const persistImage = _persistImage(
    new Client({
      endPoint: process.env.OS_URL!,
      port: Number(process.env.OS_PORT)!,
      accessKey: process.env.OS_ACCESS_KEY!,
      secretKey: process.env.OS_SECRET_KEY!
    }),
    process.env.OS_BUCKET_NAME!
  );
  console.log(process.env);
  it('accessable', async () => {
    const result = await persistImage(
      'https://objectstorageapi.dev.sealos.top/612knpkd-test/logo.svg',
      'github/bun'
    );
    expect(result).not.toBeNull();
    console.log(result);
  }, 10000);

  it('null', async () => {
    const result = await persistImage('https://avatars', 'xxx');
    expect(result).toBeNull();
  }, 10000);
});
