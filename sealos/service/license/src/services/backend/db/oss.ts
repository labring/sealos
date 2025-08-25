const OSS = require('ali-oss');

export function getOssUrl({
  fileName,
  bucket = 'sealos-io',
  region = 'oss-cn-hangzhou',
  expires = 30 * 60
}: {
  fileName: string;
  expires?: number;
  bucket?: string;
  region?: string;
}) {
  const client = new OSS({
    region: region,
    accessKeyId: process.env.ALI_OSS_KEY_ID,
    accessKeySecret: process.env.ALI_OSS_KEY_SECRET,
    bucket: bucket,
    secure: true
  });
  // 生成用于下载文件的签名URL。
  const url = client.signatureUrl(fileName, {
    expires: expires // 默认30分钟 最长60分钟
  });

  return url;
}
