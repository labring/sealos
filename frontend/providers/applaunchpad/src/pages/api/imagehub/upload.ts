import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  if (req.method !== 'POST') {
    return jsonRes(res, {
      code: 405,
      error: new Error('Method not allowed')
    });
  }

  try {
    // 验证会话
    await authSession(req.headers);

    // 解析表单数据
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 1000 * 1024 * 1024 // 1000MB limit
    });

    const [fields, files] = await form.parse(req);
    console.log(fields, files);

    // 获取表单字段
    const image_name = fields.image_name?.[0];
    const tag = fields.tag?.[0];
    const namespace = fields.namespace?.[0];
    const imageFile = files.image_file?.[0];

    // 验证必填字段
    if (!image_name || !tag || !namespace || !imageFile) {
      throw new Error('Missing required fields');
    }

    // 创建 FormData 对象
    const formData = new FormData();
    formData.append('image_name', image_name);
    formData.append('tag', tag);
    formData.append('namespace', namespace);

    // 读取文件并添加到 FormData
    formData.append(
      'image_file',
      new Blob([fs.readFileSync(imageFile.filepath)]),
      imageFile.originalFilename || 'image.tar'
    );

    // 发送请求到目标 API
    const response = await fetch('http://192.168.0.134:5002/api/loadAndPushImage', {
      method: 'POST',
      body: formData
    });

    // 清理临时文件
    fs.unlinkSync(imageFile.filepath);

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();

    return jsonRes(res, {
      data: {
        ...result,
        message: 'Image uploaded successfully'
      }
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return jsonRes(res, {
      code: 500,
      error: error
    });
  }
}
