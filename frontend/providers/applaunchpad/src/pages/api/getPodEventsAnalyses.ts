import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  res.on('error', (err) => {
    console.log('error: ', err);
    res.end();
  });
  res.on('close', () => {
    console.log('error: ', 'request error');
    res.end();
  });

  try {
    const events = req.body;

    if (!events) {
      throw new Error('events is empty');
    }

    await getK8s({
      kubeconfig: await authSession(req.headers)
    });

    res.setHeader('Content-Type', 'text/event-stream;charset-utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    await streamFetch(res, events);

    res.end();
  } catch (err: any) {
    res.end(err);
  }
}

export class SSEParseData {
  storeReadData = '';
  storeEventName = '';

  parse(item: { event: string; data: string }) {
    if (item.data === '[DONE]') return { eventName: item.event, data: item.data };

    if (item.event) {
      this.storeEventName = item.event;
    }

    try {
      const formatData = this.storeReadData + item.data;
      const parseData = JSON.parse(formatData);
      const eventName = this.storeEventName;

      this.storeReadData = '';
      this.storeEventName = '';

      return {
        eventName,
        data: parseData
      };
    } catch (error) {
      if (typeof item.data === 'string') {
        this.storeReadData += item.data;
      } else {
        this.storeReadData = '';
      }
    }
    return {};
  }
}
function parseStreamChunk(value: BufferSource) {
  const decoder = new TextDecoder();

  const chunk = decoder.decode(value);
  const chunkLines = chunk.split('\n\n').filter((item) => item);
  const chunkResponse = chunkLines.map((item) => {
    const splitEvent = item.split('\n');
    if (splitEvent.length === 2) {
      return {
        event: splitEvent[0].replace('event: ', ''),
        data: splitEvent[1].replace('data: ', '')
      };
    }
    return {
      event: '',
      data: splitEvent[0].replace('data: ', '')
    };
  });

  return chunkResponse;
}
function streamFetch(res: NextApiResponse<ApiResp>, events: any) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch('https://fastgpt.run/api/openapi/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${global.AppConfig.launchpad.eventAnalyze.fastGPTKey}`
        },
        body: JSON.stringify({
          stream: true,
          messages: [
            {
              role: 'user',
              content: JSON.stringify(events)
            }
          ]
        })
      });

      if (!response?.body) {
        throw new Error('Request Error');
      }

      const reader = response.body?.getReader();

      const parseData = new SSEParseData();

      const read = async () => {
        try {
          const { done, value } = await reader.read();
          if (done) {
            return resolve('');
          }

          const chunkResponse = parseStreamChunk(value);

          chunkResponse.forEach((item) => {
            const { eventName, data } = parseData.parse(item);

            if (!eventName || !data) return;

            if (eventName === 'answer' && data !== '[DONE]') {
              const answer: string = data?.choices?.[0].delta.content || '';
              res.write(answer);
            }
          });
          read();
        } catch (err: any) {
          reject('Analyses error');
        }
      };
      read();
    } catch (err: any) {
      console.log(err, 'fetch error');

      reject('Analyses error');
    }
  });
}
