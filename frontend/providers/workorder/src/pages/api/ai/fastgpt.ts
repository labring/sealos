import { verifyAccessToken } from '@/services/backend/auth';
import { jsonRes } from '@/services/backend/response';
import { getOrderByOrderIdAndUserId } from '@/services/db/workorder';
import type { NextApiRequest, NextApiResponse } from 'next';

const fastgpt_url = process.env.FASTGPT_API_URL;
const fastgpt_key = process.env.FASTGPT_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!fastgpt_url || !fastgpt_key) {
      return jsonRes(res, { code: 500, data: 'miss fastgppt key' });
    }
    const { userId } = await verifyAccessToken(req);
    const { orderId } = req.body as { orderId: string };
    const result = await getOrderByOrderIdAndUserId({
      orderId,
      userId: userId
    });

    if (!result || result?.manualHandling.isManuallyHandled) return;

    const userMessages = result?.dialogs
      ?.filter((dialog) => !dialog.isAdmin && dialog.userId === userId)
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
    res.end();
  }
}
