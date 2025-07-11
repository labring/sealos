/**
 * Chat2DB – AI Chat / 自然语言问答接口封装
 *
 * - 单次请求：restChatOnce   -> 返回 Promise<string>
 * - 流式请求：restChatStream -> onMessage(data), onError(err), abort()
 *
 * 放置位置：frontend/providers/dbprovider/src/services/chat2db/chat.ts
 */

import { POST } from '@/services/request';
import { RestChatPayload, StreamHandlers } from '@/constants/chat2db';

/* ---------- 1. 一次性返回（适合普通 Q&A） ---------- */
export function restChatOnce(payload: RestChatPayload & { stream?: false }) {
  return POST<string>('/api/open/enterprise/rest_chat_a', {
    ...payload,
    stream: false
  });
}

export function restChatStream(
  payload: RestChatPayload & { stream?: true },
  { onMessage, onError }: StreamHandlers
) {
  const controller = new AbortController();

  fetch('/api/open/enterprise/rest_chat_a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
      // Authorization / Time-Zone 已由 nginx 或前端代理添加，若需显式可在这里追加
    },
    body: JSON.stringify({ ...payload, stream: true }),
    signal: controller.signal
  })
    .then(async (res) => {
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split by SSE “\n\n” or custom 'id:TEXT\ndata:...'
        const lines = buffer.split(/\n\n/);
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          // Remove the /s flag for compatibility with ES2017 and earlier
          const match = chunk.match(/data:(.*)/);
          if (!match) continue;
          const raw = match[1].trim();
          if (raw === '[DONE]') {
            controller.abort();
            break;
          }
          try {
            onMessage(JSON.parse(raw));
          } catch (err) {
            console.warn('JSON parse error', raw);
          }
        }
      }
    })
    .catch((err) => {
      if (err.name === 'AbortError') return; // 主动中止
      onError?.(err);
    });

  /** 返回对象：外层可随时调用 abort() 停止流 */
  return {
    abort: () => controller.abort()
  };
}
