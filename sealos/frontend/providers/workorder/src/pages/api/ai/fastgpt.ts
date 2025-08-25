import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { getOrderByOrderIdAndUserId } from '@/services/db/workorder';
import type { NextApiRequest, NextApiResponse } from 'next';
const fastgpt_url = process.env.FASTGPT_API_URL;
const fastgpt_key = process.env.FASTGPT_API_KEY;
const fastgpt_limit = parseInt(process.env.FASTGPT_API_LIMIT || '50');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!fastgpt_url || !fastgpt_key) {
      return jsonRes(res, { code: 500, data: 'miss fastgppt key' });
    }
    const payload = await verifyAccessToken(req);
    if (!payload) {
      return jsonRes(res, {
        code: 401,
        message: "'token is invaild'"
      });
    }
    const { orderId } = req.body as { orderId: string };
    const result = await getOrderByOrderIdAndUserId({
      orderId,
      userId: payload.userId
    });
    if (!result || result?.manualHandling.isManuallyHandled) return;

    const robotMessages =
      result?.dialogs?.filter((dialog) => !dialog.isAdmin && dialog.userId === 'robot') || [];

    const userMessages = result?.dialogs
      ?.filter((dialog) => !dialog.isAdmin && dialog.userId === payload.userId)
      .map((item) => {
        return {
          content: item.content,
          role: 'user'
        };
      });

    const data = {
      chatId: orderId,
      stream: true,
      detail: false,
      messages: userMessages
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');

    if (robotMessages.length > fastgpt_limit) {
      const message = 'If the call limit is exceeded, please transfer it to manual processing.';
      const eventStream = `event: [LIMIT]\ndata: ${message}\n\n`;
      res.setHeader('Content-Length', Buffer.byteLength(eventStream, 'utf-8'));
      res.write(eventStream);
      res.end();
      return;
    }

    const response = await fetch(fastgpt_url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${fastgpt_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const reader = response.body?.getReader();
    if (!reader) return res.end();

    req.socket.on('close', () => {
      res.end();
    });

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        res.end();
      }
      res.write(value);
    }
  } catch (error) {
    console.log(error);
    res.end();
  }
}
