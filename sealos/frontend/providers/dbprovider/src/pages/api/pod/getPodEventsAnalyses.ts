import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { PassThrough } from 'stream';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const stream = new PassThrough();
  stream.on('error', () => {
    console.log('error: ', 'stream error');
    stream.destroy();
  });
  res.on('close', () => {
    stream.destroy();
  });
  res.on('error', () => {
    console.log('error: ', 'request error');
    stream.destroy();
  });
  let step = 0;

  try {
    const events = req.body;

    if (!events) {
      throw new Error('events is empty');
    }

    await getK8s({
      kubeconfig: await authSession(req)
    });

    const response = await axios.post(
      'https://fastgpt.run/api/openapi/chat/chat',
      {
        modelId: '6455c433f437e55c638e630c',
        isStream: true,
        prompts: [
          {
            obj: 'Human',
            value: JSON.stringify(events)
          }
        ]
      },
      {
        headers: {
          apikey: process.env.FASTGPT_KEY
        },
        responseType: 'stream',
        timeout: 30000
      }
    );

    // stream response
    res.setHeader('Content-Type', 'text/event-stream;charset-utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    stream.pipe(res);
    step = 1;

    const decoder = new TextDecoder();
    try {
      for await (const chunk of response.data as any) {
        const text = decoder.decode(chunk);
        if (stream.destroyed) {
          break;
        }
        stream.push(text.replace(/\n/g, '<br/>'));
      }
    } catch (error) {
      console.log('pipe error', error);
    }

    // close stream
    !stream.destroyed && stream.push(null);
    stream.destroy();
  } catch (err: any) {
    console.log(err);
    if (step === 1) {
      if (!stream.destroy) {
        stream.push(typeof err === 'string' ? err : err?.message || 'Pod analyses error');
        stream.push(null);
        stream.destroy();
      }
      return;
    }
    res.json({
      code: 500,
      message: typeof err === 'string' ? err : err?.message || 'Pod analyses error'
    });
  }
}
