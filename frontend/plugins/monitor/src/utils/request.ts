import { Options, get } from 'request';

type Response = {
  code: number;
  error?: Error;
  data?: any;
};

export const getRequest = async (url: string, opts: Options): Promise<Response> => {
  return new Promise((resolve, reject) => {
    try {
      get(url, opts, (error, response, body) => {
        if (error) throw error;
        if (!response || !body) throw new Error('response or body is empty');
        resolve({
          code: response.statusCode,
          data: body
        });
      });
    } catch (err) {
      reject({
        code: 500,
        error: err
      });
    }
  });
};
