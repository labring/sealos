import { Md5 } from 'ts-md5';

export const hashAny = (...data: any[]): string => {
  const json_str = JSON.stringify(data);
  return Md5.hashStr(json_str);
};
