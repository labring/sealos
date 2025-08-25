import { NextApiResponse } from 'next';
import { ApiResp } from '@/types';

const showStatus = (status: number) => {
  let message = '';
  switch (status) {
    case 400:
      message = '请求错误(400)';
      break;
    case 401:
      message = '未授权，请重新登录(401)';
      break;
    case 403:
      message = '拒绝访问(403)';
      break;
    case 404:
      message = '请求出错(404)';
      break;
    case 405:
      message = '不支持的请求方法';
      break;
    case 408:
      message = '请求超时(408)';
      break;
    case 500:
      message = '服务器错误(500)';
      break;
    case 501:
      message = '服务未实现(501)';
      break;
    case 502:
      message = '网络错误(502)';
      break;
    case 503:
      message = '服务不可用(503)';
      break;
    case 504:
      message = '网络超时(504)';
      break;
    case 505:
      message = 'HTTP版本不受支持(505)';
      break;
    default:
      message = `连接出错(${status})!`;
  }
  return `${message}，请检查网络或联系管理员！`;
};

export const jsonRes = <Tdata = any>(res: NextApiResponse, props: ApiResp<Tdata>) => {
  const { code = 200, message = '', data = null } = props || {};
  let msg = message;

  if (code < 200 || code >= 300) {
    msg = message || showStatus(code);
  }

  res.json({
    code,
    message: msg,
    data: data
  });
};
