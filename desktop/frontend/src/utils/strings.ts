import { Md5 } from 'ts-md5';

const cleanName = (name: string): string => {
  return name.replace(/ /g, '-').toLowerCase();
};

const hashAny = (...data: any[]): string => {
  const json_str = JSON.stringify(data);
  return Md5.hashStr(json_str);
};

export { cleanName, hashAny };
