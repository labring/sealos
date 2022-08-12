import type { NextApiResponse } from 'next';

export type Resp = {
  code: number;
  message: string;
  data?: any;

  statusCode?: number;
};

const CommonResp = (
  { code, message, data, statusCode }: Resp,
  resp?: NextApiResponse
): Response | void => {
  const resp_status = statusCode ? statusCode : code;
  const resp_data = { code: code, message: message, data: data };

  if (resp !== undefined) {
    resp.status(resp_status).json(resp_data);
    return;
  }

  return new Response(JSON.stringify(resp_data), {
    status: resp_status,
    headers: {
      'content-type': 'application/json'
    }
  });
};

const BadRequestResp = (resp?: NextApiResponse) =>
  CommonResp({ code: 400, message: 'Bad Request Method' }, resp);
const NotFoundResp = (resp?: NextApiResponse) =>
  CommonResp({ code: 404, message: 'Method Not Found' }, resp);

const JsonResp = (data: any, resp?: NextApiResponse) =>
  CommonResp({ code: 0, message: 'ok', data: data, statusCode: 200 }, resp);

export { BadRequestResp, NotFoundResp, CommonResp, JsonResp };
