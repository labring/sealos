import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { openaiResponse } from '@/services/backend/openaiResponse';
import { PassThrough } from 'stream';
import { getOpenAIApi } from '@/services/backend/openai';
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser';

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
      kubeconfig: await authSession(req.headers)
    });

    // chatgpt api
    const openai = getOpenAIApi();
    const chatResponse = await openai.createChatCompletion(
      {
        model: 'gpt-3.5-turbo',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              '以 Kubernetes 专家的身份判断用户的 Events 存在什么问题。列出可能存在的问题:\n可能的原因:\n操作建议:'
          },
          { role: 'user', content: JSON.stringify(events) }
        ],
        stream: true
      },
      {
        timeout: 40000,
        responseType: 'stream'
      }
    );

    // stream response
    res.setHeader('Content-Type', 'text/event-stream;charset-utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    stream.pipe(res);
    step = 1;

    /* parse stream data */
    const onParse = async (event: ParsedEvent | ReconnectInterval) => {
      if (event.type !== 'event') return;
      const data = event.data;
      if (data === '[DONE]') return;
      try {
        const json = JSON.parse(data);
        const content: string = json?.choices?.[0].delta.content || '';
        if (!content) return;

        // console.log('content:', content);
        !stream.destroyed && stream.push(content.replace(/\n/g, '<br/>'));
      } catch (error) {
        error;
      }
    };

    const decoder = new TextDecoder();
    try {
      for await (const chunk of chatResponse.data as any) {
        if (stream.destroyed) {
          // 流被中断了，直接忽略后面的内容
          break;
        }
        const parser = createParser(onParse);
        parser.feed(decoder.decode(chunk));
      }
    } catch (error) {
      console.log('pipe error', error);
    }
    // close stream
    !stream.destroyed && stream.push(null);
    stream.destroy();
  } catch (err: any) {
    if (step === 1) {
      // 直接结束流
      console.log('error，结束');
      stream.destroy();
    } else {
      openaiResponse(res, {
        code: 500,
        error: err
      });
    }
  }
}
