// @vitest-environment node
import type { NextApiRequest, NextApiResponse } from 'next';
import { describe, expect, it, vi } from 'vitest';

import handler from '@/pages/api/v2alpha/docs';

const createResponse = () =>
  ({
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn()
  } as unknown as NextApiResponse & {
    setHeader: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  });

describe('/api/v2alpha/docs', () => {
  it('returns a standalone Scalar docs page', async () => {
    const req = { method: 'GET' } as NextApiRequest;
    const res = createResponse();

    await handler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send.mock.calls[0][0]).toContain('id="api-reference"');
    expect(res.send.mock.calls[0][0]).toContain('data-url="/api/v2alpha/openapi.json"');
    expect(res.send.mock.calls[0][0]).toContain('@scalar/api-reference@1.43.17');
  });
});
