import type { NextApiResponse } from 'next';
import type { ApiResp } from '@/interfaces/api';

const CommonResp = ({ code, message, data }: ApiResp, resp?: NextApiResponse): Response | void => {
  const resp_status = code;
  const resp_data = { code: code, message: message, ...data };
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
const BadAuthResp = (resp?: NextApiResponse) =>
  CommonResp({ code: 401, message: 'authentication required' }, resp);
const NotFoundResp = (resp?: NextApiResponse) =>
  CommonResp({ code: 404, message: 'Method Not Found' }, resp);
const UnprocessableResp = (str: string, resp?: NextApiResponse) =>
  CommonResp({ code: 404, message: 'Not Found: ' + str }, resp);
const MethodNotAllowedResp = (str: string, resp?: NextApiResponse) =>
  CommonResp({ code: 405, message: 'Method Not Allowed: ' + str }, resp);
const InternalErrorResp = (str: string, resp?: NextApiResponse) =>
  CommonResp({ code: 500, message: 'Internal Server Error: ' + str }, resp);

const JsonResp = (data: any, resp?: NextApiResponse) =>
  CommonResp({ code: 200, message: 'ok', data: data }, resp);

const CreatedJsonResp = (data: any, resp?: NextApiResponse) =>
  CommonResp(
    {
      code: 201,
      message: 'the resource has been created and needs to be requested again',
      data: data
    },
    resp
  );

export {
  BadRequestResp,
  BadAuthResp,
  NotFoundResp,
  UnprocessableResp,
  MethodNotAllowedResp,
  InternalErrorResp,
  CommonResp,
  JsonResp,
  CreatedJsonResp
};
